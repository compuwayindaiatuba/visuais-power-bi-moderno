"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import * as d3 from "d3";
import "./../style/visual.less";

import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { VisualFormattingSettingsModel } from "./settings";
import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";

type SortMode = "valueDesc" | "valueAsc" | "table" | "sortDesc" | "sortAsc";
type ValueFormat = "number" | "currency" | "percent" | "percentFraction";

interface ColumnIndexes {
    categoryIndex: number;
    menuIndex?: number;
    sortIndex?: number;
    tooltipIndexes: number[];
    valueIndex: number;
}

interface MapItemDraft {
    firstOrder: number;
    label: string;
    sortNumber?: number;
    sortText: string;
    tooltipText: string;
    value: number;
}

interface MapItem {
    color: string;
    label: string;
    percent: number;
    tooltipText: string;
    value: number;
}

interface MapModel {
    items: MapItem[];
    total: number;
}

interface TreemapDatum {
    children?: TreemapDatum[];
    item?: MapItem;
    value?: number;
}

const DEFAULT_COLORS = [
    "#2F6BFF",
    "#2DBFB3",
    "#FFBF2F",
    "#895CF6",
    "#5AB7F3",
    "#F06F5B",
    "#5F7AEA",
    "#98A2B3",
    "#E14F8F",
    "#14B8A6"
];

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
let visualInstanceCounter = 0;

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly root: HTMLElement;
    private readonly visualId: string;
    private formattingSettings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.visualId = `mmv-${Date.now().toString(36)}-${visualInstanceCounter++}`;
        this.root = document.createElement("div");
        this.root.className = "mmv-root";
        options.element.classList.add("modern-mapaview-host");
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
            this.render(dataView, options);
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

    private render(dataView: powerbi.DataView | undefined, options: VisualUpdateOptions): void {
        this.clearRoot();
        this.applyRootStyles();

        const model = this.buildModel(dataView?.table);
        const card = document.createElement("div");
        card.className = "mmv-card";
        card.appendChild(this.renderHeader(model?.total || 0));

        if (!model || model.items.length === 0) {
            card.appendChild(this.renderEmpty("Adicione Categoria e Valores para montar o mapa de arvore."));
            this.root.appendChild(card);
            return;
        }

        const chart = document.createElement("div");
        chart.className = "mmv-chart";
        card.appendChild(chart);

        if (this.formattingSettings.footer.show.value) {
            card.appendChild(this.renderFooter());
        }

        this.root.appendChild(card);
        this.renderTreemap(chart, model, options);
    }

    private renderHeader(total: number): HTMLElement {
        const headerSettings = this.formattingSettings.header;
        const header = document.createElement("div");
        header.className = "mmv-header";

        const titleArea = document.createElement("div");
        titleArea.className = "mmv-heading";

        if (headerSettings.showIcon.value) {
            const iconBox = document.createElement("div");
            iconBox.className = "mmv-header-icon";
            iconBox.style.background = this.color(headerSettings.iconBackground.value.value, "#EEF3FF");
            iconBox.appendChild(this.renderBlocksIcon(this.color(headerSettings.iconColor.value.value, "#2F6BFF")));
            titleArea.appendChild(iconBox);
        }

        const text = document.createElement("div");
        text.className = "mmv-heading-text";

        const title = document.createElement("div");
        title.className = "mmv-title";
        title.style.color = this.color(headerSettings.titleColor.value.value, "#101828");
        title.style.fontSize = `${this.clampNumber(headerSettings.titleFontSize.value, 12, 44)}px`;
        title.textContent = this.safeText(headerSettings.title.value, "Vendas por Categoria");
        text.appendChild(title);

        const subtitle = document.createElement("div");
        subtitle.className = "mmv-subtitle";
        subtitle.style.color = this.color(headerSettings.subtitleColor.value.value, "#667085");
        subtitle.style.fontSize = `${this.clampNumber(headerSettings.subtitleFontSize.value, 8, 28)}px`;
        subtitle.textContent = this.safeText(headerSettings.subtitle.value, "Distribuicao do valor de vendas por categoria");
        text.appendChild(subtitle);

        titleArea.appendChild(text);
        header.appendChild(titleArea);

        if (this.formattingSettings.totalCard.show.value) {
            header.appendChild(this.renderTotalCard(total));
        }

        return header;
    }

    private renderTotalCard(total: number): HTMLElement {
        const settings = this.formattingSettings.totalCard;
        const card = document.createElement("div");
        card.className = "mmv-total-card";
        card.style.background = this.color(settings.backgroundColor.value.value, "#FFFFFF");
        card.style.borderColor = this.color(settings.borderColor.value.value, "#E2E7F0");

        const content = document.createElement("div");
        content.className = "mmv-total-content";

        const title = document.createElement("div");
        title.className = "mmv-total-title";
        title.style.color = this.color(settings.titleColor.value.value, "#667085");
        title.style.fontSize = `${this.clampNumber(settings.titleFontSize.value, 8, 24)}px`;
        title.textContent = this.safeText(settings.title.value, "Total de Vendas");
        content.appendChild(title);

        const value = document.createElement("div");
        value.className = "mmv-total-value";
        value.style.color = this.color(settings.valueColor.value.value, "#101828");
        value.style.fontSize = `${this.clampNumber(settings.valueFontSize.value, 12, 38)}px`;
        value.textContent = this.formatValue(total);
        content.appendChild(value);

        card.appendChild(content);

        if (settings.showMenuDots.value) {
            const dots = document.createElement("div");
            dots.className = "mmv-dots";
            dots.setAttribute("aria-hidden", "true");
            dots.appendChild(this.renderDotsIcon());
            card.appendChild(dots);
        }

        return card;
    }

    private renderTreemap(container: HTMLElement, model: MapModel, options: VisualUpdateOptions): void {
        const settings = this.formattingSettings.treemap;
        const rect = container.getBoundingClientRect();
        const fallbackWidth = Math.max(1, options.viewport.width - 48);
        const fallbackHeight = Math.max(1, options.viewport.height - 170);
        const width = Math.max(1, Math.floor(rect.width || container.clientWidth || fallbackWidth));
        const height = Math.max(1, Math.floor(rect.height || container.clientHeight || fallbackHeight));
        const gap = this.clampNumber(settings.blockGap.value, 0, 24);
        const outerPadding = this.clampNumber(settings.outerPadding.value, 0, 40);

        const rootData: TreemapDatum = {
            children: model.items.map((item) => ({
                item,
                value: item.value
            }))
        };
        const root = d3.hierarchy(rootData).sum((datum) => datum.value || 0);
        const layout = d3.treemap<TreemapDatum>()
            .size([width, height])
            .paddingInner(gap)
            .paddingOuter(outerPadding)
            .round(true)
            .tile(d3.treemapSquarify.ratio(1.2));

        const treemapRoot = layout(root);

        const svg = document.createElementNS(SVG_NAMESPACE, "svg");
        svg.setAttribute("class", "mmv-svg");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("role", "img");
        container.appendChild(svg);

        const defs = document.createElementNS(SVG_NAMESPACE, "defs");
        svg.appendChild(defs);

        treemapRoot.leaves().forEach((leaf, index) => {
            const item = leaf.data.item;

            if (!item) {
                return;
            }

            const x = leaf.x0;
            const y = leaf.y0;
            const blockWidth = Math.max(0, leaf.x1 - leaf.x0);
            const blockHeight = Math.max(0, leaf.y1 - leaf.y0);

            if (blockWidth <= 0 || blockHeight <= 0) {
                return;
            }

            this.renderTreemapBlock(svg, defs, item, index, x, y, blockWidth, blockHeight);
        });
    }

    private renderTreemapBlock(
        svg: SVGSVGElement,
        defs: SVGDefsElement,
        item: MapItem,
        index: number,
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        const settings = this.formattingSettings.treemap;
        const radius = this.clampNumber(settings.blockRadius.value, 0, 30);
        const gradientId = `${this.visualId}-gradient-${index}`;
        const clipId = `${this.visualId}-clip-${index}`;

        const gradient = document.createElementNS(SVG_NAMESPACE, "linearGradient");
        gradient.setAttribute("id", gradientId);
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("y2", "100%");
        this.appendStop(gradient, "0%", this.mixWithWhite(item.color, 0.12));
        this.appendStop(gradient, "58%", item.color);
        this.appendStop(gradient, "100%", this.mixWithBlack(item.color, 0.08));
        defs.appendChild(gradient);

        const clipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
        clipPath.setAttribute("id", clipId);
        const clipRect = document.createElementNS(SVG_NAMESPACE, "rect");
        clipRect.setAttribute("x", "0");
        clipRect.setAttribute("y", "0");
        clipRect.setAttribute("width", String(width));
        clipRect.setAttribute("height", String(height));
        clipRect.setAttribute("rx", String(radius));
        clipRect.setAttribute("ry", String(radius));
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);

        const group = document.createElementNS(SVG_NAMESPACE, "g");
        group.setAttribute("class", "mmv-block");
        group.setAttribute("transform", `translate(${x}, ${y})`);
        svg.appendChild(group);

        const title = document.createElementNS(SVG_NAMESPACE, "title");
        title.textContent = this.getTooltipTitle(item);
        group.appendChild(title);

        const rect = document.createElementNS(SVG_NAMESPACE, "rect");
        rect.setAttribute("width", String(width));
        rect.setAttribute("height", String(height));
        rect.setAttribute("rx", String(radius));
        rect.setAttribute("ry", String(radius));
        rect.setAttribute("fill", `url(#${gradientId})`);
        group.appendChild(rect);

        const shine = document.createElementNS(SVG_NAMESPACE, "rect");
        shine.setAttribute("width", String(width));
        shine.setAttribute("height", String(height));
        shine.setAttribute("rx", String(radius));
        shine.setAttribute("ry", String(radius));
        shine.setAttribute("fill", "rgba(255,255,255,0.08)");
        shine.setAttribute("clip-path", `url(#${clipId})`);
        group.appendChild(shine);

        this.renderBlockLabels(group, item, width, height, clipId);
    }

    private renderBlockLabels(group: SVGGElement, item: MapItem, width: number, height: number, clipId: string): void {
        const settings = this.formattingSettings.treemap;
        const area = width * height;
        const minArea = this.clampNumber(settings.hideLabelsBelowArea.value, 0, 30000);

        if (area < minArea) {
            return;
        }

        const lines: { text: string; size: number; weight: string }[] = [];

        if (settings.showCategory.value) {
            lines.push({
                text: item.label,
                size: this.clampNumber(settings.categoryFontSize.value, 8, 40),
                weight: "750"
            });
        }

        if (settings.showValue.value) {
            lines.push({
                text: this.formatValue(item.value),
                size: this.clampNumber(settings.valueFontSize.value, 8, 44),
                weight: "800"
            });
        }

        if (settings.showPercent.value) {
            lines.push({
                text: this.formatPercent(item.percent),
                size: this.clampNumber(settings.percentFontSize.value, 8, 36),
                weight: "500"
            });
        }

        if (lines.length === 0) {
            return;
        }

        const text = document.createElementNS(SVG_NAMESPACE, "text");
        text.setAttribute("class", "mmv-block-text");
        text.setAttribute("x", String(width / 2));
        text.setAttribute("y", String(height / 2));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("clip-path", `url(#${clipId})`);
        text.setAttribute("fill", this.color(settings.labelColor.value.value, "#FFFFFF"));
        group.appendChild(text);

        const lineGap = 7;
        const totalHeight = lines.reduce((sum, line) => sum + line.size, 0) + Math.max(0, lines.length - 1) * lineGap;
        let offset = -totalHeight / 2;

        lines.forEach((line) => {
            const tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
            const size = this.getFittedFontSize(line.size, width, line.text);
            tspan.setAttribute("x", String(width / 2));
            tspan.setAttribute("dy", String(offset === -totalHeight / 2 ? size * 0.72 : size + lineGap));
            tspan.setAttribute("font-size", String(size));
            tspan.setAttribute("font-weight", line.weight);
            tspan.textContent = this.truncateText(line.text, width, size);
            text.appendChild(tspan);
            offset += size + lineGap;
        });
    }

    private renderFooter(): HTMLElement {
        const settings = this.formattingSettings.footer;
        const footer = document.createElement("div");
        footer.className = "mmv-footer";
        footer.style.color = this.color(settings.color.value.value, "#667085");
        footer.style.fontSize = `${this.clampNumber(settings.fontSize.value, 8, 26)}px`;

        const icon = document.createElement("span");
        icon.className = "mmv-info";
        icon.textContent = "i";
        footer.appendChild(icon);

        const text = document.createElement("span");
        text.textContent = this.safeText(
            settings.text.value,
            "Tamanho do bloco representa o valor de vendas. Percentual baseado no total."
        );
        footer.appendChild(text);
        return footer;
    }

    private buildModel(table?: powerbi.DataViewTable): MapModel | undefined {
        if (!table || !table.rows || table.rows.length === 0) {
            return undefined;
        }

        const indexes = this.getColumnIndexes(table);

        if (!indexes) {
            return undefined;
        }

        const grouped = new Map<string, MapItemDraft>();

        table.rows.forEach((row, rowIndex) => {
            const label = this.safeText(this.formatPrimitive(row[indexes.categoryIndex]), "");
            const value = this.parseNumber(row[indexes.valueIndex]);

            if (!label || value === undefined || value <= 0) {
                return;
            }

            const sortPrimitive = indexes.sortIndex === undefined ? undefined : row[indexes.sortIndex];
            const sortNumber = sortPrimitive === undefined ? undefined : this.parseNumber(sortPrimitive);
            const sortText = sortPrimitive === undefined ? "" : this.safeText(this.formatPrimitive(sortPrimitive), "");
            const tooltipText = this.getTooltipText(row, indexes, table);
            const key = this.normalizeKey(label);
            const existing = grouped.get(key);

            if (existing) {
                existing.value += value;
                existing.tooltipText = this.mergeText(existing.tooltipText, tooltipText);

                if (existing.sortNumber === undefined && sortNumber !== undefined) {
                    existing.sortNumber = sortNumber;
                }

                if (!existing.sortText && sortText) {
                    existing.sortText = sortText;
                }
            } else {
                grouped.set(key, {
                    firstOrder: rowIndex,
                    label,
                    sortNumber,
                    sortText,
                    tooltipText,
                    value
                });
            }
        });

        const allDrafts = this.sortDrafts(Array.from(grouped.values()));
        const total = allDrafts.reduce((sum, item) => sum + item.value, 0);

        if (total <= 0) {
            return undefined;
        }

        const maxItems = Math.floor(this.clampNumber(this.formattingSettings.ranking.maxItems.value, 1, 40));
        const visibleDrafts = this.getVisibleDrafts(allDrafts, maxItems);
        const items = visibleDrafts.map((item, index) => ({
            color: this.getBlockColor(index),
            label: item.label,
            percent: item.value / total * 100,
            tooltipText: item.tooltipText,
            value: item.value
        }));

        return {
            items,
            total
        };
    }

    private getColumnIndexes(table: powerbi.DataViewTable): ColumnIndexes | undefined {
        const categoryIndex = this.getFirstIndexForRole(table, "category");
        const valueIndex = this.getFirstIndexForRole(table, "values");

        if (categoryIndex === undefined || valueIndex === undefined) {
            return undefined;
        }

        return {
            categoryIndex,
            menuIndex: this.getFirstIndexForRole(table, "menu"),
            sortIndex: this.getFirstIndexForRole(table, "sortOrder"),
            tooltipIndexes: this.getIndexesForRole(table, "tooltips"),
            valueIndex
        };
    }

    private getVisibleDrafts(items: MapItemDraft[], maxItems: number): MapItemDraft[] {
        if (items.length <= maxItems) {
            return items;
        }

        if (!this.formattingSettings.ranking.showOthers.value || maxItems <= 1) {
            return items.slice(0, maxItems);
        }

        const visible = items.slice(0, maxItems - 1);
        const rest = items.slice(maxItems - 1);
        const othersLabel = this.safeText(this.formattingSettings.ranking.othersLabel.value, "Outros");
        const others = rest.reduce<MapItemDraft>((accumulator, item, index) => {
            accumulator.value += item.value;
            accumulator.tooltipText = this.mergeText(accumulator.tooltipText, `${item.label}: ${this.formatValue(item.value)}`);
            accumulator.firstOrder = Math.min(accumulator.firstOrder, item.firstOrder);

            if (index === 0) {
                accumulator.sortNumber = item.sortNumber;
                accumulator.sortText = item.sortText;
            }

            return accumulator;
        }, {
            firstOrder: rest[0]?.firstOrder || 0,
            label: othersLabel,
            sortText: "",
            tooltipText: "",
            value: 0
        });

        return [...visible, others];
    }

    private sortDrafts(drafts: MapItemDraft[]): MapItemDraft[] {
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

    private compareSortValues(first: MapItemDraft, second: MapItemDraft): number {
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

    private renderBlocksIcon(color: string): SVGSVGElement {
        const svg = document.createElementNS(SVG_NAMESPACE, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("aria-hidden", "true");

        [
            { x: 9, y: 4, w: 6, h: 6 },
            { x: 4, y: 13, w: 7, h: 7 },
            { x: 13, y: 13, w: 7, h: 7 }
        ].forEach((block) => {
            const rect = document.createElementNS(SVG_NAMESPACE, "rect");
            rect.setAttribute("x", String(block.x));
            rect.setAttribute("y", String(block.y));
            rect.setAttribute("width", String(block.w));
            rect.setAttribute("height", String(block.h));
            rect.setAttribute("rx", "2");
            rect.setAttribute("fill", color);
            svg.appendChild(rect);
        });

        return svg;
    }

    private renderDotsIcon(): SVGSVGElement {
        const svg = document.createElementNS(SVG_NAMESPACE, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "#667085");
        svg.setAttribute("stroke-width", "2.5");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("aria-hidden", "true");

        [6, 12, 18].forEach((cy) => {
            const circle = document.createElementNS(SVG_NAMESPACE, "circle");
            circle.setAttribute("cx", "12");
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", "1");
            svg.appendChild(circle);
        });

        return svg;
    }

    private appendStop(gradient: SVGLinearGradientElement, offset: string, color: string): void {
        const stop = document.createElementNS(SVG_NAMESPACE, "stop");
        stop.setAttribute("offset", offset);
        stop.setAttribute("stop-color", color);
        gradient.appendChild(stop);
    }

    private getTooltipText(row: PrimitiveValue[], indexes: ColumnIndexes, table: powerbi.DataViewTable): string {
        return indexes.tooltipIndexes
            .map((index) => `${table.columns[index].displayName}: ${this.formatPrimitive(row[index])}`)
            .join("\n");
    }

    private getTooltipTitle(item: MapItem): string {
        const parts = [
            item.label,
            `Valor: ${this.formatValue(item.value)}`,
            `Participacao: ${this.formatPercent(item.percent)}`
        ];

        if (item.tooltipText) {
            parts.push(item.tooltipText);
        }

        return parts.join("\n");
    }

    private getBlockColor(index: number): string {
        const colors = this.formattingSettings.colors;
        const palette = [
            colors.color1.value.value,
            colors.color2.value.value,
            colors.color3.value.value,
            colors.color4.value.value,
            colors.color5.value.value,
            colors.color6.value.value,
            colors.color7.value.value,
            colors.color8.value.value,
            colors.color9.value.value,
            colors.color10.value.value
        ].map((color, colorIndex) => this.color(color, DEFAULT_COLORS[colorIndex]));

        return palette[index % palette.length];
    }

    private formatValue(value: number): string {
        const settings = this.formattingSettings.numberFormat;
        const format = String(settings.valueFormat.value.value) as ValueFormat;
        const prefix = typeof settings.prefix.value === "string" ? settings.prefix.value : "";
        const suffix = typeof settings.suffix.value === "string" ? settings.suffix.value : "";

        if (format === "percent") {
            return `${prefix}${this.formatNumber(value)}${suffix || "%"}`;
        }

        if (format === "percentFraction") {
            return `${prefix}${this.formatNumber(value * 100)}${suffix || "%"}`;
        }

        return `${prefix}${this.formatNumber(value)}${suffix}`;
    }

    private formatPercent(value: number): string {
        const decimals = this.clampNumber(this.formattingSettings.numberFormat.percentDecimalPlaces.value, 0, 4);
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
        this.root.style.setProperty("--mmv-bg", this.color(layout.backgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mmv-border", this.color(layout.borderColor.value.value, "#E6EAF2"));
        this.root.style.setProperty("--mmv-radius", `${this.clampNumber(layout.borderRadius.value, 0, 48)}px`);
        this.root.style.setProperty("--mmv-padding", `${this.clampNumber(layout.padding.value, 8, 64)}px`);
        this.root.style.setProperty("--mmv-font", this.safeText(layout.fontFamily.value, "Segoe UI"));
        this.root.style.setProperty("--mmv-shadow", layout.showShadow.value ? "0 18px 44px rgba(15, 23, 42, 0.10)" : "none");
    }

    private renderEmpty(message: string): HTMLElement {
        const empty = document.createElement("div");
        empty.className = "mmv-empty";
        empty.textContent = message;
        return empty;
    }

    private renderError(): void {
        this.clearRoot();
        this.applyRootStyles();
        const card = document.createElement("div");
        card.className = "mmv-card";
        card.appendChild(this.renderEmpty("Nao foi possivel renderizar o mapa de arvore."));
        this.root.appendChild(card);
    }

    private clearRoot(): void {
        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }
    }

    private getFittedFontSize(baseSize: number, width: number, text: string): number {
        if (!text) {
            return baseSize;
        }

        const approximateWidth = text.length * baseSize * 0.54;

        if (approximateWidth <= width * 0.86) {
            return baseSize;
        }

        return Math.max(8, Math.floor(width * 0.86 / Math.max(1, text.length * 0.54)));
    }

    private truncateText(text: string, width: number, fontSize: number): string {
        const maxChars = Math.max(3, Math.floor(width / Math.max(1, fontSize * 0.58)));

        if (text.length <= maxChars) {
            return text;
        }

        return `${text.slice(0, Math.max(1, maxChars - 1))}...`;
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

    private safeText(value: string | undefined, fallback: string): string {
        const text = typeof value === "string" ? value.trim() : "";
        return text || fallback;
    }

    private clampNumber(value: number, min: number, max: number): number {
        if (!Number.isFinite(value)) {
            return min;
        }

        return Math.min(Math.max(value, min), max);
    }
}
