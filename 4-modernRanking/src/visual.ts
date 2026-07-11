"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewTable = powerbi.DataViewTable;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ITooltipService = powerbi.extensibility.ITooltipService;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";
import { VisualFormattingSettingsModel } from "./settings";

type DisplayUnit = "none" | "thousand" | "million" | "billion";
type FormatType = "auto" | "number" | "currency" | "percent" | "percentFraction";
type HighlightPosition = "first" | "last";
type SortMode = "top" | "bottom" | "table";

interface RoleIndexes {
    iconIndex: number;
    labelIndex: number;
    valueIndex: number;
    tooltipIndexes: number[];
}

interface RankItem {
    color: string;
    icon: string;
    label: string;
    rawValue: PrimitiveValue;
    rowIndex: number;
    selectionId: ISelectionId;
    tooltipItems: VisualTooltipDataItem[];
    value: number;
    valueSource: DataViewMetadataColumn;
}

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly host: IVisualHost;
    private readonly root: HTMLElement;
    private readonly selectionManager: ISelectionManager;
    private readonly tooltipService: ITooltipService;
    private dataView?: powerbi.DataView;
    private formattingSettings: VisualFormattingSettingsModel;
    private activeSortMode?: SortMode;
    private selectedKeys: Set<string>;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.selectedKeys = new Set<string>();
        this.root = document.createElement("div");
        this.root.className = "modern-rank";
        options.element.classList.add("modern-rank-host");
        options.element.appendChild(this.root);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews && options.dataViews[0];
            this.dataView = dataView;
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
            this.renderEmpty("Nao foi possivel renderizar o ranking.");
            this.events.renderingFailed(options, error instanceof Error ? error.message : String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private render(dataView?: powerbi.DataView): void {
        this.clearRoot();
        this.applyRootStyles();

        const table = dataView?.table;

        if (!table || !table.columns || !table.rows) {
            this.renderEmpty("Adicione Icone, Texto e Numero.");
            return;
        }

        const roleIndexes = this.getRoleIndexes(table);

        if (roleIndexes.labelIndex < 0 || roleIndexes.valueIndex < 0) {
            this.renderEmpty("Adicione pelo menos Texto e Numero.");
            return;
        }

        const items = this.buildRankItems(table, roleIndexes);
        const visibleItems = this.getVisibleItems(items);

        if (visibleItems.length === 0) {
            this.renderEmpty("Sem dados para exibir.");
            return;
        }

        const card = document.createElement("section");
        card.className = this.formattingSettings.layout.showShadow.value ? "mr-card mr-card-shadow" : "mr-card";

        if (this.formattingSettings.layout.showHeader.value) {
            card.appendChild(this.renderHeader());
        }

        card.appendChild(this.renderList(visibleItems));

        const highlightedItem = this.getHighlightedItem(visibleItems);

        if (highlightedItem) {
            card.appendChild(this.renderHighlight(highlightedItem));
        }

        this.root.appendChild(card);
    }

    private renderHeader(): HTMLElement {
        const header = document.createElement("header");
        header.className = "mr-header";

        const title = document.createElement("div");
        title.className = "mr-title";
        title.textContent = this.safeText(this.formattingSettings.layout.titleText.value, "Titulo do gráfico");
        header.appendChild(title);

        if (this.formattingSettings.ranking.showSortToggle.value) {
            header.appendChild(this.renderSortToggle());
        }

        return header;
    }

    private renderSortToggle(): HTMLElement {
        const currentSortMode = this.getEffectiveSortMode();
        const toggle = document.createElement("div");
        toggle.className = "mr-sort-toggle";
        toggle.setAttribute("aria-label", "Classificacao");

        const label = document.createElement("span");
        label.className = "mr-sort-label";
        label.textContent = "Classificacao";
        toggle.appendChild(label);

        toggle.appendChild(this.renderSortButton("Melhores", "top", currentSortMode));
        toggle.appendChild(this.renderSortButton("Piores", "bottom", currentSortMode));
        return toggle;
    }

    private renderSortButton(label: string, sortMode: SortMode, currentSortMode: SortMode): HTMLElement {
        const button = document.createElement("button");
        button.type = "button";
        button.className = sortMode === currentSortMode ? "mr-sort-option mr-sort-option-active" : "mr-sort-option";
        button.textContent = label;
        button.addEventListener("click", (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            this.activeSortMode = sortMode;
            this.render(this.dataView);
        });

        return button;
    }

    private renderList(items: RankItem[]): HTMLElement {
        const list = document.createElement("div");
        list.className = "mr-list";

        const maxValue = this.getMaxBarValue(items);

        items.forEach((item) => {
            list.appendChild(this.renderRankRow(item, maxValue));
        });

        return list;
    }

    private renderRankRow(item: RankItem, maxValue: number): HTMLElement {
        const row = document.createElement("div");
        row.className = "mr-row";
        row.tabIndex = 0;
        row.setAttribute("data-selection-key", item.selectionId ? item.selectionId.getKey() : String(item.rowIndex));

        if (item.selectionId && this.formattingSettings.behavior.enableSelection.value) {
            this.bindSelection(row, item.selectionId);
        }

        if (item.selectionId && this.formattingSettings.behavior.enableContextMenu.value) {
            this.bindContextMenu(row, item.selectionId);
        }

        this.bindTooltip(row, item);
        row.appendChild(this.renderIcon(item, "mr-icon"));

        const main = document.createElement("div");
        main.className = "mr-row-main";

        const label = document.createElement("div");
        label.className = "mr-label";
        label.textContent = item.label;
        main.appendChild(label);

        if (this.formattingSettings.ranking.showBars.value) {
            main.appendChild(this.renderBar(item, maxValue));
        }

        row.appendChild(main);

        const value = document.createElement("div");
        value.className = "mr-value";
        value.textContent = this.formatValue(item.rawValue, item.valueSource);
        row.appendChild(value);

        return row;
    }

    private renderBar(item: RankItem, maxValue: number): HTMLElement {
        const track = document.createElement("div");
        track.className = "mr-bar-track";

        const fill = document.createElement("div");
        fill.className = "mr-bar-fill";
        fill.style.width = `${this.getBarPercent(item.value, maxValue)}%`;
        fill.style.background = item.color;
        track.appendChild(fill);

        return track;
    }

    private renderHighlight(item: RankItem): HTMLElement {
        const highlight = document.createElement("div");
        highlight.className = "mr-highlight";
        highlight.setAttribute("data-selection-key", item.selectionId ? item.selectionId.getKey() : String(item.rowIndex));

        if (item.selectionId && this.formattingSettings.behavior.enableSelection.value) {
            this.bindSelection(highlight, item.selectionId);
        }

        if (item.selectionId && this.formattingSettings.behavior.enableContextMenu.value) {
            this.bindContextMenu(highlight, item.selectionId);
        }

        this.bindTooltip(highlight, item);
        highlight.appendChild(this.renderIcon(item, "mr-highlight-icon"));

        const text = document.createElement("div");
        text.className = "mr-highlight-text";

        const label = document.createElement("div");
        label.className = "mr-highlight-label";
        label.textContent = this.safeText(this.formattingSettings.ranking.highlightLabel.value, "Melhor desempenho");
        text.appendChild(label);

        const title = document.createElement("div");
        title.className = "mr-highlight-title";
        title.textContent = item.label;
        text.appendChild(title);

        highlight.appendChild(text);
        return highlight;
    }

    private renderIcon(item: RankItem, className: string): HTMLElement {
        const icon = document.createElement("div");
        icon.className = className;
        icon.style.color = item.color;

        if (this.isImageUrl(item.icon)) {
            const image = document.createElement("img");
            image.alt = "";
            image.src = item.icon;
            icon.appendChild(image);
            return icon;
        }

        this.appendSvgIcon(icon, item.icon || item.label, item.color);
        return icon;
    }

    private appendSvgIcon(container: HTMLElement, iconValue: string, color: string): void {
        const iconName = this.normalizeText(iconValue);
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");

        const paths = this.getIconPaths(iconName);

        if (paths.length === 0) {
            const text = document.createElement("span");
            text.className = "mr-icon-fallback";
            text.textContent = this.getInitials(iconValue);
            container.appendChild(text);
            return;
        }

        paths.forEach((pathDefinition) => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathDefinition);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", "1.9");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            svg.appendChild(path);
        });

        container.appendChild(svg);
    }

    private getIconPaths(iconName: string): string[] {
        if (this.includesAny(iconName, ["manha", "morning", "sol", "sun", "dia"])) {
            return [
                "M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z",
                "M12 3.5v2M12 18.5v2M4.5 12h2M17.5 12h2M6.7 6.7l1.4 1.4M15.9 15.9l1.4 1.4M17.3 6.7l-1.4 1.4M8.1 15.9l-1.4 1.4"
            ];
        }

        if (this.includesAny(iconName, ["tarde", "clock", "hora", "tempo", "turno"])) {
            return [
                "M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15Z",
                "M12 8v4.5l3 1.6"
            ];
        }

        if (this.includesAny(iconName, ["noite", "night", "lua", "moon"])) {
            return [
                "M17.8 15.7A7.2 7.2 0 0 1 8.3 6.2a6.7 6.7 0 1 0 9.5 9.5Z"
            ];
        }

        if (this.includesAny(iconName, ["star", "estrela", "favorito"])) {
            return [
                "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8L12 4Z"
            ];
        }

        if (this.includesAny(iconName, ["award", "medal", "trofeu", "premio", "desempenho"])) {
            return [
                "M12 14.5a5 5 0 1 0 0-10a5 5 0 0 0 0 10Z",
                "M9.5 13.6 8.6 21l3.4-2 3.4 2-.9-7.4"
            ];
        }

        if (this.includesAny(iconName, ["user", "pessoa", "cliente", "funcionario"])) {
            return [
                "M12 12a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7Z",
                "M5.5 20a6.5 6.5 0 0 1 13 0"
            ];
        }

        return [];
    }

    private getRoleIndexes(table: DataViewTable): RoleIndexes {
        return {
            iconIndex: this.getFirstIndexForRole(table, "icon"),
            labelIndex: this.getFirstIndexForRole(table, "label"),
            valueIndex: this.getFirstIndexForRole(table, "value"),
            tooltipIndexes: this.getIndexesForRole(table, "tooltips")
        };
    }

    private getFirstIndexForRole(table: DataViewTable, roleName: string): number {
        return this.getIndexesForRole(table, roleName)[0] ?? -1;
    }

    private getIndexesForRole(table: DataViewTable, roleName: string): number[] {
        return table.columns
            .map((column, index) => ({ column, index }))
            .filter((columnInfo) => Boolean(columnInfo.column.roles && columnInfo.column.roles[roleName]))
            .map((columnInfo) => columnInfo.index);
    }

    private buildRankItems(table: DataViewTable, roleIndexes: RoleIndexes): RankItem[] {
        const colors = this.getPalette();
        const valueSource = table.columns[roleIndexes.valueIndex];

        return table.rows
            .map((row, rowIndex) => {
                const label = this.formatPrimitive(row[roleIndexes.labelIndex]);
                const value = this.parseNumber(row[roleIndexes.valueIndex]);

                if (!label || value === undefined) {
                    return undefined;
                }

                const itemColor = colors[rowIndex % colors.length];
                const selectionId = this.host
                    .createSelectionIdBuilder()
                    .withTable(table, rowIndex)
                    .createSelectionId();

                return {
                    color: itemColor,
                    icon: roleIndexes.iconIndex >= 0 ? this.formatPrimitive(row[roleIndexes.iconIndex]) : "",
                    label,
                    rawValue: row[roleIndexes.valueIndex],
                    rowIndex,
                    selectionId,
                    tooltipItems: this.createTooltipItems(table, row, roleIndexes, valueSource),
                    value,
                    valueSource
                };
            })
            .filter((item): item is RankItem => Boolean(item));
    }

    private createTooltipItems(
        table: DataViewTable,
        row: PrimitiveValue[],
        roleIndexes: RoleIndexes,
        valueSource: DataViewMetadataColumn
    ): VisualTooltipDataItem[] {
        const items: VisualTooltipDataItem[] = [
            {
                displayName: this.cleanDisplayName(table.columns[roleIndexes.labelIndex].displayName || "Texto"),
                value: this.formatPrimitive(row[roleIndexes.labelIndex])
            },
            {
                displayName: this.cleanDisplayName(valueSource.displayName || "Numero"),
                value: this.formatValue(row[roleIndexes.valueIndex], valueSource)
            }
        ];

        roleIndexes.tooltipIndexes.forEach((index) => {
            items.push({
                displayName: this.cleanDisplayName(table.columns[index].displayName || "Detalhe"),
                value: this.formatPrimitive(row[index])
            });
        });

        return items;
    }

    private getVisibleItems(items: RankItem[]): RankItem[] {
        const sortMode = this.getEffectiveSortMode();
        const visibleCount = Math.floor(this.clampNumber(this.formattingSettings.ranking.visibleItems.value, 1, 100));
        const sortedItems = [...items];

        if (sortMode === "top") {
            sortedItems.sort((left, right) => right.value - left.value);
        }

        if (sortMode === "bottom") {
            sortedItems.sort((left, right) => left.value - right.value);
        }

        return sortedItems.slice(0, visibleCount);
    }

    private getEffectiveSortMode(): SortMode {
        if (this.activeSortMode === "top" || this.activeSortMode === "bottom") {
            return this.activeSortMode;
        }

        const configuredSortMode = String(this.formattingSettings.ranking.sortMode.value.value) as SortMode;

        if (configuredSortMode === "bottom" || configuredSortMode === "table") {
            return configuredSortMode;
        }

        return "top";
    }

    private getHighlightedItem(items: RankItem[]): RankItem | undefined {
        if (!this.formattingSettings.ranking.showHighlight.value || items.length === 0) {
            return undefined;
        }

        const position = String(this.formattingSettings.ranking.highlightPosition.value.value) as HighlightPosition;
        return position === "last" ? items[items.length - 1] : items[0];
    }

    private getMaxBarValue(items: RankItem[]): number {
        const maxValue = Math.max(...items.map((item) => Math.abs(item.value)));
        return Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
    }

    private getBarPercent(value: number, maxValue: number): number {
        const percent = (Math.abs(value) / maxValue) * 100;
        return this.clampNumber(percent, 4, 100);
    }

    private bindSelection(element: HTMLElement, selectionId: ISelectionId): void {
        element.addEventListener("click", (event: MouseEvent) => {
            const multiSelect = event.ctrlKey || event.metaKey;
            this.selectionManager.select(selectionId, multiSelect).then((selectionIds: ISelectionId[]) => {
                this.selectedKeys = new Set(selectionIds.map((item) => item.getKey()));
                this.updateSelectionStyles();
            });
        });
    }

    private bindContextMenu(element: HTMLElement, selectionId: ISelectionId): void {
        element.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            this.selectionManager.showContextMenu(selectionId, {
                x: event.clientX,
                y: event.clientY
            }, "label");
        });
    }

    private bindTooltip(element: HTMLElement, item: RankItem): void {
        if (!this.tooltipService.enabled()) {
            return;
        }

        const identities = item.selectionId ? [item.selectionId] : [];

        element.addEventListener("mouseover", (event: MouseEvent) => {
            this.tooltipService.show({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems: item.tooltipItems,
                identities
            });
        });

        element.addEventListener("mousemove", (event: MouseEvent) => {
            this.tooltipService.move({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems: item.tooltipItems,
                identities
            });
        });

        element.addEventListener("mouseout", () => {
            this.tooltipService.hide({
                isTouchEvent: false,
                immediately: false
            });
        });
    }

    private updateSelectionStyles(): void {
        const elements = this.root.querySelectorAll<HTMLElement>("[data-selection-key]");
        elements.forEach((element) => {
            const key = element.getAttribute("data-selection-key") || "";
            element.classList.toggle("mr-selected", this.selectedKeys.has(key));
        });
    }

    private formatValue(value: PrimitiveValue, source: DataViewMetadataColumn): string {
        const parsedValue = this.parseNumber(value);

        if (parsedValue === undefined) {
            return this.formatPrimitive(value);
        }

        const formatType = this.getFormatType(source, parsedValue);
        const decimalPlaces = Math.floor(this.clampNumber(this.formattingSettings.valuesFormat.decimalPlaces.value, 0, 8));
        const displayUnit = this.getDisplayUnit();
        const scaledValue = this.scaleValue(parsedValue, displayUnit);
        const valueToFormat = formatType === "percentFraction" ? parsedValue * 100 : scaledValue.value;
        const formatted = new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        }).format(valueToFormat);
        const prefix = this.formattingSettings.valuesFormat.prefix.value;
        const suffix = this.formattingSettings.valuesFormat.suffix.value;

        if (formatType === "currency") {
            return `${this.safeText(prefix, `${this.safeText(this.formattingSettings.valuesFormat.currencySymbol.value, "R$")} `)}${formatted}${scaledValue.suffix}${suffix}`;
        }

        if (formatType === "percent" || formatType === "percentFraction") {
            return `${prefix}${formatted}%${suffix}`;
        }

        return `${prefix}${formatted}${scaledValue.suffix}${suffix}`;
    }

    private getFormatType(source: DataViewMetadataColumn, value: number): FormatType {
        const configured = String(this.formattingSettings.valuesFormat.formatType.value.value) as FormatType;

        if (configured !== "auto") {
            return configured;
        }

        const format = source.format || "";

        if (format.includes("%")) {
            return Math.abs(value) <= 1 ? "percentFraction" : "percent";
        }

        if (format.includes("$") || format.includes("R$")) {
            return "currency";
        }

        return "number";
    }

    private getDisplayUnit(): DisplayUnit {
        const value = String(this.formattingSettings.valuesFormat.displayUnits.value.value);

        if (value === "thousand" || value === "million" || value === "billion") {
            return value;
        }

        return "none";
    }

    private scaleValue(value: number, unit: DisplayUnit): { value: number; suffix: string } {
        if (unit === "thousand") {
            return { value: value / 1000, suffix: " mil" };
        }

        if (unit === "million") {
            return { value: value / 1000000, suffix: " mi" };
        }

        if (unit === "billion") {
            return { value: value / 1000000000, suffix: " bi" };
        }

        return { value, suffix: "" };
    }

    private parseNumber(value: PrimitiveValue): number | undefined {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        if (typeof value !== "string") {
            return undefined;
        }

        const normalized = value
            .replace(/[^\d,.-]/g, "")
            .replace(/\.(?=\d{3}(?:\D|$))/g, "")
            .replace(",", ".");
        const parsed = Number(normalized);

        return Number.isFinite(parsed) ? parsed : undefined;
    }

    private formatPrimitive(value: PrimitiveValue): string {
        if (value === null || value === undefined) {
            return "";
        }

        if (value instanceof Date) {
            return new Intl.DateTimeFormat("pt-BR").format(value);
        }

        return String(value);
    }

    private isImageUrl(value: string): boolean {
        return /^https?:\/\//i.test(value) || /^data:image\//i.test(value);
    }

    private includesAny(value: string, terms: string[]): boolean {
        return terms.some((term) => value.includes(term));
    }

    private getInitials(value: string): string {
        const words = this.safeText(value, "?")
            .split(/\s+/)
            .filter((word) => Boolean(word));

        return words
            .slice(0, 2)
            .map((word) => word.charAt(0).toUpperCase())
            .join("");
    }

    private getPalette(): string[] {
        const colors = this.formattingSettings.colors;
        return [
            colors.color1.value.value,
            colors.color2.value.value,
            colors.color3.value.value,
            colors.color4.value.value,
            colors.color5.value.value,
            colors.color6.value.value
        ].map((color) => this.safeText(color, "#7C3CFF"));
    }

    private applyRootStyles(): void {
        const layout = this.formattingSettings.layout;
        const style = this.formattingSettings.style;
        const ranking = this.formattingSettings.ranking;

        this.root.style.setProperty("--mr-bg", this.color(layout.backgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mr-border", this.color(layout.borderColor.value.value, "#E9ECF5"));
        this.root.style.setProperty("--mr-radius", `${this.clampNumber(layout.borderRadius.value, 0, 40)}px`);
        this.root.style.setProperty("--mr-padding", `${this.clampNumber(layout.padding.value, 8, 48)}px`);
        this.root.style.setProperty("--mr-row-gap", `${this.clampNumber(layout.rowGap.value, 6, 32)}px`);
        this.root.style.setProperty("--mr-font-family", this.safeText(layout.fontFamily.value, "Segoe UI, Arial, sans-serif"));
        this.root.style.setProperty("--mr-title", this.color(style.titleColor.value.value, "#121936"));
        this.root.style.setProperty("--mr-text", this.color(style.textColor.value.value, "#111827"));
        this.root.style.setProperty("--mr-muted", this.color(style.mutedColor.value.value, "#66708F"));
        this.root.style.setProperty("--mr-track", this.color(style.trackColor.value.value, "#ECEEFA"));
        this.root.style.setProperty("--mr-highlight-bg", this.color(style.highlightBackgroundColor.value.value, "#F7F3FF"));
        this.root.style.setProperty("--mr-icon-bg", this.color(style.iconBackgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mr-font-size", `${this.clampNumber(style.fontSize.value, 8, 24)}px`);
        this.root.style.setProperty("--mr-title-font-size", `${this.clampNumber(style.titleFontSize.value, 9, 28)}px`);
        this.root.style.setProperty("--mr-value-font-size", `${this.clampNumber(style.valueFontSize.value, 8, 24)}px`);
        this.root.style.setProperty("--mr-icon-size", `${this.clampNumber(style.iconSize.value, 24, 72)}px`);
        this.root.style.setProperty("--mr-bar-height", `${this.clampNumber(ranking.barHeight.value, 2, 18)}px`);
    }

    private renderEmpty(message: string): void {
        this.clearRoot();
        this.applyRootStyles();

        const empty = document.createElement("div");
        empty.className = "mr-empty";
        empty.textContent = message;
        this.root.appendChild(empty);
    }

    private clearRoot(): void {
        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }
    }

    private cleanDisplayName(displayName: string): string {
        return displayName
            .replace(/^(Soma de|Sum of|Media de|Média de|Average of|Contagem de|Count of|Maximo de|Máximo de|Maximum of|Minimo de|Mínimo de|Minimum of)\s+/i, "")
            .trim();
    }

    private normalizeText(value: string): string {
        return this.safeText(value, "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    private color(value: string | undefined, fallback: string): string {
        return this.safeText(value, fallback);
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
