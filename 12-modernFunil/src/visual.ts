"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { VisualFormattingSettingsModel } from "./settings";
import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";

type ValueFormat = "number" | "currency" | "percent" | "percentFraction";
type SortMode = "valueDesc" | "valueAsc" | "table" | "sortDesc" | "sortAsc";

interface ColumnIndexes {
    averageIndex?: number;
    menuIndex?: number;
    revenueIndex?: number;
    sortIndex?: number;
    stageIndex: number;
    stageSubtitleIndex?: number;
    tooltipIndexes: number[];
    valueIndex: number;
}

interface FunnelStageDraft {
    averageCount: number;
    averageSum: number;
    color: string;
    firstOrder: number;
    label: string;
    revenue: number;
    sortNumber?: number;
    sortText: string;
    subtitle: string;
    tooltipText: string;
    value: number;
}

interface FunnelStage {
    average?: number;
    color: string;
    conversion: number;
    label: string;
    percentOfMax: number;
    revenue: number;
    subtitle: string;
    tooltipText: string;
    value: number;
}

interface FunnelModel {
    averageValue: number;
    conversionRate: number;
    finalValue: number;
    maxValue: number;
    revenueTotal: number;
    stages: FunnelStage[];
    totalValue: number;
}

interface SummaryCard {
    accent: string;
    footer: string;
    icon: string;
    title: string;
    value: string;
}

const DEFAULT_COLORS = ["#2F6BFF", "#65BDF5", "#2DBFB3", "#FFBF2F", "#895CF6", "#F06595", "#14B8A6", "#64748B"];
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const ICON_PATHS: { [key: string]: string[] } = {
    chart: [
        "M4 19V5",
        "M4 19h16",
        "M8 15v-4",
        "M12 15V8",
        "M16 15v-7"
    ],
    funnel: [
        "M4 5h16l-6.5 7.4v5.2L10.5 19v-6.6L4 5z"
    ],
    money: [
        "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
        "M14.8 8.7c-.7-.5-1.6-.7-2.7-.7-1.5 0-2.6.7-2.6 1.8 0 1.2 1.2 1.6 2.7 2 1.6.4 2.8.9 2.8 2.2 0 1.2-1.1 2-2.8 2-1.2 0-2.3-.3-3.1-1",
        "M12 6.5v11"
    ],
    target: [
        "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
        "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
        "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
    ],
    trend: [
        "M4 17 10 11l4 4 6-8",
        "M15 7h5v5"
    ],
    users: [
        "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
        "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
        "M22 21v-2a4 4 0 0 0-3-3.8",
        "M16 3.1a4 4 0 0 1 0 7.8"
    ]
};

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly root: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.root = document.createElement("div");
        this.root.className = "mf-root";
        options.element.classList.add("modern-funil-host");
        options.element.appendChild(this.root);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews && options.dataViews[0];
            this.formattingSettings = dataView
                ? this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView)
                : new VisualFormattingSettingsModel();

            if (!shouldShowVisualForMenu(dataView, {
                enabled: this.formattingSettings.menuFilter.enabled.value,
                menuName: this.formattingSettings.menuFilter.menuName.value
            })) {
                this.clearRoot();
                hideVisualElement(this.root);
                this.events.renderingFinished(options);
                return;
            }

            showVisualElement(this.root);
            this.render(dataView);
            this.events.renderingFinished(options);
        } catch (error) {
            showVisualElement(this.root);
            this.renderError();
            this.events.renderingFailed(options, error instanceof Error ? error.message : String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private render(dataView?: powerbi.DataView): void {
        this.clearRoot();
        this.applyRootStyles();

        const card = document.createElement("div");
        card.className = "mf-card";
        card.appendChild(this.renderHeader());

        const model = this.buildModel(dataView?.table);

        if (!model || model.stages.length === 0) {
            card.appendChild(this.renderEmpty("Adicione Etapa e Quantidade para montar o funil."));
            this.root.appendChild(card);
            return;
        }

        const panel = document.createElement("div");
        panel.className = this.formattingSettings.legendStyle.show.value ? "mf-panel" : "mf-panel no-legend";
        panel.appendChild(this.renderFunnel(model));

        if (this.formattingSettings.legendStyle.show.value) {
            panel.appendChild(this.renderLegend(model));
        }

        card.appendChild(panel);

        if (this.formattingSettings.summaryCards.showCards.value) {
            const summary = this.renderSummary(model);

            if (summary) {
                card.appendChild(summary);
            }
        }

        this.root.appendChild(card);
    }

    private renderHeader(): HTMLElement {
        const settings = this.formattingSettings.header;
        const header = document.createElement("div");
        header.className = "mf-header";

        if (settings.showIcon.value) {
            const iconBox = document.createElement("div");
            iconBox.className = "mf-header-icon";
            iconBox.style.background = this.color(settings.iconBackground.value.value, "#EEF3FF");
            iconBox.appendChild(this.renderIcon("funnel", this.color(settings.iconColor.value.value, "#2F6BFF")));
            header.appendChild(iconBox);
        }

        const text = document.createElement("div");
        text.className = "mf-header-text";

        const title = document.createElement("div");
        title.className = "mf-title";
        title.style.color = this.color(settings.titleColor.value.value, "#101828");
        title.style.fontSize = `${this.clampNumber(settings.titleFontSize.value, 12, 42)}px`;
        title.textContent = this.safeText(settings.title.value, "Grafico de Funil");
        text.appendChild(title);

        const subtitle = document.createElement("div");
        subtitle.className = "mf-subtitle";
        subtitle.style.color = this.color(settings.subtitleColor.value.value, "#667085");
        subtitle.style.fontSize = `${this.clampNumber(settings.subtitleFontSize.value, 8, 28)}px`;
        subtitle.textContent = this.safeText(settings.subtitle.value, "Digite aqui seu subtitulo");
        text.appendChild(subtitle);

        header.appendChild(text);
        return header;
    }

    private renderFunnel(model: FunnelModel): HTMLElement {
        const settings = this.formattingSettings.funnel;
        const wrap = document.createElement("div");
        wrap.className = "mf-funnel-wrap";

        model.stages.forEach((stage) => {
            const item = document.createElement("div");
            item.className = "mf-funnel-stage";
            item.style.width = `${stage.percentOfMax}%`;
            item.style.height = `${this.clampNumber(settings.stageHeight.value, 28, 120)}px`;
            item.style.marginBottom = `${this.clampNumber(settings.stageGap.value, 0, 24)}px`;
            item.style.borderRadius = `${this.clampNumber(settings.stageRadius.value, 0, 24)}px`;
            item.style.background = `linear-gradient(135deg, ${this.mixWithWhite(stage.color, 0.08)} 0%, ${stage.color} 54%, ${this.mixWithBlack(stage.color, 0.08)} 100%)`;
            item.style.setProperty("--mf-stage-shadow", this.hexToRgba(stage.color, 0.24));
            item.title = this.getTooltipTitle(stage);

            if (settings.showStageValues.value) {
                const value = document.createElement("span");
                value.className = "mf-stage-value";
                value.style.color = this.color(settings.valueColor.value.value, "#FFFFFF");
                value.style.fontSize = `${this.clampNumber(settings.valueFontSize.value, 10, 42)}px`;
                value.textContent = this.formatValue(stage.value);
                item.appendChild(value);
            }

            wrap.appendChild(item);
        });

        return wrap;
    }

    private renderLegend(model: FunnelModel): HTMLElement {
        const settings = this.formattingSettings.legendStyle;
        const legend = document.createElement("div");
        legend.className = "mf-legend";
        legend.style.setProperty("--mf-legend-header", this.color(settings.headerColor.value.value, "#667085"));
        legend.style.setProperty("--mf-legend-text", this.color(settings.textColor.value.value, "#101828"));
        legend.style.setProperty("--mf-legend-muted", this.color(settings.mutedColor.value.value, "#667085"));
        legend.style.setProperty("--mf-legend-divider", this.color(settings.dividerColor.value.value, "#E7EAF0"));

        const head = document.createElement("div");
        head.className = "mf-legend-head";
        head.appendChild(this.legendCell("Etapa"));

        if (settings.showValues.value) {
            head.appendChild(this.legendCell("Quantidade", "right"));
        }

        if (settings.showConversion.value) {
            head.appendChild(this.legendCell("Conversao", "right"));
        }

        legend.appendChild(head);

        model.stages.forEach((stage) => {
            const row = document.createElement("div");
            row.className = "mf-legend-row";

            const stageCell = document.createElement("div");
            stageCell.className = "mf-legend-stage";
            const dot = document.createElement("span");
            dot.className = "mf-dot";
            dot.style.background = stage.color;
            stageCell.appendChild(dot);

            const stageText = document.createElement("div");
            stageText.className = "mf-stage-text";
            const label = document.createElement("div");
            label.className = "mf-stage-label";
            label.textContent = stage.label;
            stageText.appendChild(label);

            if (settings.showSubtitles.value && stage.subtitle) {
                const subtitle = document.createElement("div");
                subtitle.className = "mf-stage-sub";
                subtitle.textContent = stage.subtitle;
                stageText.appendChild(subtitle);
            }

            stageCell.appendChild(stageText);
            row.appendChild(stageCell);

            if (settings.showValues.value) {
                const value = document.createElement("div");
                value.className = "mf-legend-value";
                value.textContent = this.formatValue(stage.value);
                row.appendChild(value);
            }

            if (settings.showConversion.value) {
                const badge = document.createElement("div");
                badge.className = "mf-badge";
                badge.style.color = stage.color;
                badge.style.borderColor = this.hexToRgba(stage.color, 0.34);
                badge.style.background = this.hexToRgba(stage.color, 0.08);
                badge.textContent = this.formatPercent(stage.conversion);
                row.appendChild(badge);
            }

            legend.appendChild(row);
        });

        return legend;
    }

    private renderSummary(model: FunnelModel): HTMLElement | undefined {
        const settings = this.formattingSettings.summaryCards;
        const cards: SummaryCard[] = [];
        const firstLabel = model.stages[0]?.label || "Inicio";
        const lastLabel = model.stages[model.stages.length - 1]?.label || "Fim";

        if (settings.showConversion.value) {
            cards.push({
                accent: "#2F6BFF",
                footer: this.safeText(settings.conversionFooter.value, `${firstLabel} -> ${lastLabel}`),
                icon: this.safeText(settings.conversionIcon.value, "users"),
                title: this.safeText(settings.conversionTitle.value, "Taxa de Conversao"),
                value: this.optionalText(settings.conversionValueText.value, this.formatPercent(model.conversionRate))
            });
        }

        if (settings.showSales.value) {
            cards.push({
                accent: "#2DBFB3",
                footer: this.safeText(settings.salesFooter.value, "Total"),
                icon: this.safeText(settings.salesIcon.value, "trend"),
                title: this.safeText(settings.salesTitle.value, "Vendas Fechadas"),
                value: this.optionalText(settings.salesValueText.value, this.formatValue(model.totalValue))
            });
        }

        if (settings.showRevenue.value) {
            cards.push({
                accent: "#D99A00",
                footer: this.safeText(settings.revenueFooter.value, "Total"),
                icon: this.safeText(settings.revenueIcon.value, "money"),
                title: this.safeText(settings.revenueTitle.value, "Receita Gerada"),
                value: this.optionalText(
                    settings.revenueValueText.value,
                    this.formatCurrencyLike(model.revenueTotal, this.formattingSettings.numberFormat.revenuePrefix.value)
                )
            });
        }

        if (settings.showAverage.value) {
            cards.push({
                accent: "#895CF6",
                footer: this.safeText(settings.averageFooter.value, "Por venda"),
                icon: this.safeText(settings.averageIcon.value, "chart"),
                title: this.safeText(settings.averageTitle.value, "Ticket Medio"),
                value: this.optionalText(
                    settings.averageValueText.value,
                    this.formatCurrencyLike(model.averageValue, this.formattingSettings.numberFormat.averagePrefix.value)
                )
            });
        }

        if (cards.length === 0) {
            return undefined;
        }

        const wrap = document.createElement("div");
        wrap.className = "mf-summary";
        wrap.style.gridTemplateColumns = `repeat(${Math.min(cards.length, 4)}, minmax(0, 1fr))`;

        cards.slice(0, 4).forEach((card) => {
            wrap.appendChild(this.renderSummaryCard(card));
        });

        return wrap;
    }

    private renderSummaryCard(card: SummaryCard): HTMLElement {
        const settings = this.formattingSettings.summaryCards;
        const item = document.createElement("div");
        item.className = "mf-summary-card";
        item.style.background = this.color(settings.cardBackground.value.value, "#FFFFFF");
        item.style.borderColor = this.color(settings.cardBorderColor.value.value, "#E7EAF0");
        item.style.borderRadius = `${this.clampNumber(settings.cardRadius.value, 0, 36)}px`;
        item.style.fontFamily = this.optionalText(settings.cardFontFamily.value, "inherit");
        item.style.padding = `${this.clampNumber(settings.cardPadding.value, 8, 32)}px`;

        const icon = document.createElement("div");
        icon.className = "mf-summary-icon";
        icon.style.background = this.color(settings.iconBackground.value.value, this.hexToRgba(card.accent, 0.1));
        icon.appendChild(this.renderIcon(card.icon, this.color(settings.iconColor.value.value, card.accent)));
        item.appendChild(icon);

        const body = document.createElement("div");
        body.className = "mf-summary-body";

        const title = document.createElement("div");
        title.className = "mf-summary-title";
        title.style.color = this.color(settings.titleColor.value.value, "#475467");
        title.style.fontSize = `${this.clampNumber(settings.titleFontSize.value, 8, 24)}px`;
        title.style.fontWeight = this.formatWeight(settings.titleWeight.value.value, "650");
        title.textContent = card.title;
        body.appendChild(title);

        const value = document.createElement("div");
        value.className = "mf-summary-value";
        value.style.color = this.color(settings.valueColor.value.value, "#101828");
        value.style.fontSize = `${this.clampNumber(settings.valueFontSize.value, 10, 34)}px`;
        value.style.fontWeight = this.formatWeight(settings.valueWeight.value.value, "750");
        value.textContent = card.value;
        body.appendChild(value);

        const footer = document.createElement("div");
        footer.className = "mf-summary-footer";
        footer.style.color = this.color(settings.footerColor.value.value, "#667085");
        footer.style.fontSize = `${this.clampNumber(settings.footerFontSize.value, 8, 22)}px`;
        footer.style.fontWeight = this.formatWeight(settings.footerWeight.value.value, "500");
        footer.textContent = card.footer;
        body.appendChild(footer);

        item.appendChild(body);
        return item;
    }

    private buildModel(table?: powerbi.DataViewTable): FunnelModel | undefined {
        if (!table || !table.rows || table.rows.length === 0) {
            return undefined;
        }

        const indexes = this.getColumnIndexes(table);

        if (!indexes) {
            return undefined;
        }

        const grouped = new Map<string, FunnelStageDraft>();

        table.rows.forEach((row, rowIndex) => {
            const label = this.safeText(this.formatPrimitive(row[indexes.stageIndex]), "");
            const value = this.parseNumber(row[indexes.valueIndex]);

            if (!label || value === undefined) {
                return;
            }

            const key = this.normalizeKey(label);
            const existing = grouped.get(key);
            const subtitle = indexes.stageSubtitleIndex === undefined ? "" : this.safeText(this.formatPrimitive(row[indexes.stageSubtitleIndex]), "");
            const revenue = indexes.revenueIndex === undefined ? 0 : this.parseNumber(row[indexes.revenueIndex]) || 0;
            const average = indexes.averageIndex === undefined ? undefined : this.parseNumber(row[indexes.averageIndex]);
            const sortPrimitive = indexes.sortIndex === undefined ? undefined : row[indexes.sortIndex];
            const sortNumber = sortPrimitive === undefined ? undefined : this.parseNumber(sortPrimitive);
            const sortText = sortPrimitive === undefined ? "" : this.safeText(this.formatPrimitive(sortPrimitive), "");
            const tooltipText = this.getTooltipText(row, indexes, table);

            if (existing) {
                existing.value += value;
                existing.revenue += revenue;
                existing.tooltipText = this.mergeText(existing.tooltipText, tooltipText);

                if (!existing.subtitle && subtitle) {
                    existing.subtitle = subtitle;
                }

                if (average !== undefined) {
                    existing.averageSum += average;
                    existing.averageCount += 1;
                }

                if (existing.sortNumber === undefined && sortNumber !== undefined) {
                    existing.sortNumber = sortNumber;
                }

                if (!existing.sortText && sortText) {
                    existing.sortText = sortText;
                }
            } else {
                grouped.set(key, {
                    averageCount: average === undefined ? 0 : 1,
                    averageSum: average === undefined ? 0 : average,
                    color: "",
                    firstOrder: rowIndex,
                    label,
                    revenue,
                    sortNumber,
                    sortText,
                    subtitle,
                    tooltipText,
                    value
                });
            }
        });

        const visibleItems = Math.floor(this.clampNumber(this.formattingSettings.ranking.visibleItems.value, 1, 30));
        const drafts = this.sortDrafts(Array.from(grouped.values())).slice(0, visibleItems);

        if (drafts.length === 0) {
            return undefined;
        }

        const maxValue = Math.max(...drafts.map((stage) => stage.value), 1);
        const visibleTotal = drafts.reduce((sum, stage) => sum + Math.max(0, stage.value), 0);
        const minWidth = this.clampNumber(this.formattingSettings.funnel.minStageWidth.value, 18, 80);
        const stages: FunnelStage[] = drafts.map((stage, index) => {
            const conversion = visibleTotal === 0 ? 0 : Math.max(0, stage.value) / visibleTotal * 100;
            const percentOfMax = minWidth + (Math.max(0, stage.value) / maxValue) * (100 - minWidth);

            return {
                average: stage.averageCount === 0 ? undefined : stage.averageSum / stage.averageCount,
                color: this.getStageColor(index),
                conversion,
                label: stage.label,
                percentOfMax,
                revenue: stage.revenue,
                subtitle: stage.subtitle,
                tooltipText: stage.tooltipText,
                value: stage.value
            };
        });
        const finalValue = stages[stages.length - 1].value;
        const revenueTotal = stages.reduce((sum, stage) => sum + stage.revenue, 0);
        const averageFromData = this.getAverageFromStages(stages);
        const averageValue = averageFromData !== undefined
            ? averageFromData
            : finalValue === 0 ? 0 : revenueTotal / finalValue;

        return {
            averageValue,
            conversionRate: stages[0]?.conversion || 0,
            finalValue,
            maxValue,
            revenueTotal,
            stages,
            totalValue: visibleTotal
        };
    }

    private getColumnIndexes(table: powerbi.DataViewTable): ColumnIndexes | undefined {
        const stageIndex = this.getFirstIndexForRole(table, "stage");
        const valueIndex = this.getFirstIndexForRole(table, "value");

        if (stageIndex === undefined || valueIndex === undefined) {
            return undefined;
        }

        return {
            averageIndex: this.getFirstIndexForRole(table, "average"),
            menuIndex: this.getFirstIndexForRole(table, "menu"),
            revenueIndex: this.getFirstIndexForRole(table, "revenue"),
            sortIndex: this.getFirstIndexForRole(table, "sortOrder"),
            stageIndex,
            stageSubtitleIndex: this.getFirstIndexForRole(table, "stageSubtitle"),
            tooltipIndexes: this.getIndexesForRole(table, "tooltips"),
            valueIndex
        };
    }

    private sortDrafts(drafts: FunnelStageDraft[]): FunnelStageDraft[] {
        const sortMode = String(this.formattingSettings.ranking.sortMode.value.value) as SortMode;
        const sorted = [...drafts];

        sorted.sort((first, second) => {
            let comparison = 0;

            if (sortMode === "valueDesc" || sortMode === "valueAsc") {
                comparison = first.value - second.value;
                comparison = sortMode === "valueDesc" ? -comparison : comparison;
            } else if (sortMode === "sortDesc" || sortMode === "sortAsc") {
                comparison = this.compareSortValues(first, second);
                comparison = sortMode === "sortDesc" ? -comparison : comparison;
            }

            return comparison || first.firstOrder - second.firstOrder;
        });

        return sorted;
    }

    private compareSortValues(first: FunnelStageDraft, second: FunnelStageDraft): number {
        if (first.sortNumber !== undefined && second.sortNumber !== undefined) {
            return first.sortNumber - second.sortNumber;
        }

        if (first.sortNumber !== undefined) {
            return -1;
        }

        if (second.sortNumber !== undefined) {
            return 1;
        }

        if (first.sortText || second.sortText) {
            return first.sortText.localeCompare(second.sortText);
        }

        return first.value - second.value;
    }

    private getIndexesForRole(table: powerbi.DataViewTable, roleName: string): number[] {
        return table.columns
            .map((column, index) => ({ column, index }))
            .filter((columnInfo) => Boolean(columnInfo.column.roles && columnInfo.column.roles[roleName]))
            .map((columnInfo) => columnInfo.index);
    }

    private getFirstIndexForRole(table: powerbi.DataViewTable, roleName: string): number | undefined {
        return this.getIndexesForRole(table, roleName)[0];
    }

    private renderIcon(iconName: string, color: string): SVGSVGElement {
        const normalizedName = this.normalizeKey(iconName);
        const paths = ICON_PATHS[normalizedName] || ICON_PATHS.funnel;
        const svg = document.createElementNS(SVG_NAMESPACE, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", color);
        svg.setAttribute("stroke-width", "2.2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");

        paths.forEach((pathValue) => {
            const path = document.createElementNS(SVG_NAMESPACE, "path");
            path.setAttribute("d", pathValue);
            svg.appendChild(path);
        });

        return svg;
    }

    private legendCell(text: string, align: "left" | "right" = "left"): HTMLElement {
        const cell = document.createElement("div");
        cell.className = align === "right" ? "mf-legend-head-cell is-right" : "mf-legend-head-cell";
        cell.textContent = text;
        return cell;
    }

    private getTooltipText(row: PrimitiveValue[], indexes: ColumnIndexes, table: powerbi.DataViewTable): string {
        return indexes.tooltipIndexes
            .map((index) => `${table.columns[index].displayName}: ${this.formatPrimitive(row[index])}`)
            .join("\n");
    }

    private getTooltipTitle(stage: FunnelStage): string {
        const parts = [
            stage.label,
            `Quantidade: ${this.formatValue(stage.value)}`,
            `Conversao: ${this.formatPercent(stage.conversion)}`
        ];

        if (stage.subtitle) {
            parts.push(stage.subtitle);
        }

        if (stage.tooltipText) {
            parts.push(stage.tooltipText);
        }

        return parts.join("\n");
    }

    private getAverageFromStages(stages: FunnelStage[]): number | undefined {
        const values = stages
            .map((stage) => stage.average)
            .filter((value): value is number => value !== undefined && Number.isFinite(value));

        if (values.length === 0) {
            return undefined;
        }

        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    private getStageColor(index: number): string {
        const colors = this.formattingSettings.colors;
        const palette = [
            colors.color1.value.value,
            colors.color2.value.value,
            colors.color3.value.value,
            colors.color4.value.value,
            colors.color5.value.value,
            colors.color6.value.value,
            colors.color7.value.value,
            colors.color8.value.value
        ].map((color, colorIndex) => this.color(color, DEFAULT_COLORS[colorIndex]));

        return palette[index % palette.length];
    }

    private formatValue(value: number): string {
        const settings = this.formattingSettings.numberFormat;
        const format = String(settings.valueFormat.value.value) as ValueFormat;
        const prefix = this.safeText(settings.prefix.value, "");
        const suffix = this.safeText(settings.suffix.value, "");

        if (format === "currency") {
            return this.formatCurrencyLike(value, prefix || "R$ ");
        }

        if (format === "percent") {
            return `${prefix}${this.formatNumber(value)}${suffix || "%"}`;
        }

        if (format === "percentFraction") {
            return `${prefix}${this.formatNumber(value * 100)}${suffix || "%"}`;
        }

        return `${prefix}${this.formatNumber(value)}${suffix}`;
    }

    private formatCurrencyLike(value: number, prefixValue: string): string {
        const prefix = this.safeText(prefixValue, "R$ ");
        return `${prefix}${this.formatNumber(value)}`;
    }

    private formatPercent(value: number): string {
        const decimals = this.clampNumber(this.formattingSettings.numberFormat.decimalPlaces.value, 0, 6);
        return `${value.toLocaleString(undefined, {
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals
        })}%`;
    }

    private formatNumber(value: number): string {
        const decimals = this.clampNumber(this.formattingSettings.numberFormat.decimalPlaces.value, 0, 6);
        return value.toLocaleString(undefined, {
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals
        });
    }

    private parseNumber(value: PrimitiveValue): number | undefined {
        if (value === null || value === undefined || value instanceof Date) {
            return undefined;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    private formatPrimitive(value: PrimitiveValue): string {
        if (value === null || value === undefined) {
            return "";
        }

        if (value instanceof Date) {
            return value.toLocaleDateString();
        }

        return String(value);
    }

    private mergeText(currentText: string, newText: string): string {
        if (!newText) {
            return currentText;
        }

        if (!currentText) {
            return newText;
        }

        return currentText.includes(newText) ? currentText : `${currentText}\n${newText}`;
    }

    private applyRootStyles(): void {
        const layout = this.formattingSettings.layout;
        const legend = this.formattingSettings.legendStyle;
        this.root.style.setProperty("--mf-bg", this.color(layout.backgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mf-border", this.color(layout.borderColor.value.value, "#E6EAF2"));
        this.root.style.setProperty("--mf-radius", `${this.clampNumber(layout.borderRadius.value, 0, 48)}px`);
        this.root.style.setProperty("--mf-padding", `${this.clampNumber(layout.padding.value, 8, 60)}px`);
        this.root.style.setProperty("--mf-font", this.safeText(layout.fontFamily.value, "Segoe UI"));
        this.root.style.setProperty("--mf-shadow", layout.showShadow.value ? "0 18px 44px rgba(15, 23, 42, 0.10)" : "none");
        this.root.style.setProperty("--mf-muted", this.color(legend.mutedColor.value.value, "#667085"));
        this.root.style.setProperty("--mf-text", this.color(legend.textColor.value.value, "#101828"));
    }

    private renderEmpty(message: string): HTMLElement {
        const empty = document.createElement("div");
        empty.className = "mf-empty";
        empty.textContent = message;
        return empty;
    }

    private renderError(): void {
        this.clearRoot();
        this.applyRootStyles();
        const card = document.createElement("div");
        card.className = "mf-card";
        card.appendChild(this.renderEmpty("Nao foi possivel renderizar o funil."));
        this.root.appendChild(card);
    }

    private clearRoot(): void {
        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }
    }

    private hexToRgba(color: string, opacity: number): string {
        const normalized = color.trim();

        if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
            return normalized;
        }

        const red = parseInt(normalized.slice(1, 3), 16);
        const green = parseInt(normalized.slice(3, 5), 16);
        const blue = parseInt(normalized.slice(5, 7), 16);
        return `rgba(${red}, ${green}, ${blue}, ${this.clampNumber(opacity, 0, 1)})`;
    }

    private mixWithWhite(color: string, amount: number): string {
        const normalized = color.trim();

        if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
            return normalized;
        }

        const red = parseInt(normalized.slice(1, 3), 16);
        const green = parseInt(normalized.slice(3, 5), 16);
        const blue = parseInt(normalized.slice(5, 7), 16);
        const mixed = [red, green, blue].map((channel) => Math.round(channel + (255 - channel) * this.clampNumber(amount, 0, 1)));
        return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
    }

    private mixWithBlack(color: string, amount: number): string {
        const normalized = color.trim();

        if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
            return normalized;
        }

        const red = parseInt(normalized.slice(1, 3), 16);
        const green = parseInt(normalized.slice(3, 5), 16);
        const blue = parseInt(normalized.slice(5, 7), 16);
        const mixed = [red, green, blue].map((channel) => Math.round(channel * (1 - this.clampNumber(amount, 0, 1))));
        return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
    }

    private color(value: string | undefined, fallback: string): string {
        return this.safeText(value, fallback);
    }

    private normalizeKey(value: string): string {
        return this.safeText(value, "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    private optionalText(value: string | undefined, fallback: string): string {
        const text = typeof value === "string" ? value.trim() : "";
        return text || fallback;
    }

    private safeText(value: string | undefined, fallback: string): string {
        const text = typeof value === "string" ? value.trim() : "";
        return text || fallback;
    }

    private formatWeight(value: unknown, fallback: string): string {
        const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
        return text || fallback;
    }

    private clampNumber(value: number, min: number, max: number): number {
        if (!Number.isFinite(value)) {
            return min;
        }

        return Math.min(Math.max(value, min), max);
    }
}
