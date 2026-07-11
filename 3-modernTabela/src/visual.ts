"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ITooltipService = powerbi.extensibility.ITooltipService;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { VisualFormattingSettingsModel } from "./settings";
import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";

interface DisplayColumn {
    source: powerbi.DataViewMetadataColumn;
    index: number;
    visibleIndex: number;
    displayName: string;
    isNumeric: boolean;
}

interface ColumnFormatRule {
    type: DataFormatType;
    decimals?: number;
}

interface TableRowModel {
    originalIndex: number;
    values: PrimitiveValue[];
    imageUrl?: string;
    selectionId?: powerbi.visuals.ISelectionId;
}

type SortDirection = "best" | "worst";
type DataFormatType = "auto" | "text" | "number" | "currency" | "percent";

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly host: IVisualHost;
    private readonly root: HTMLElement;
    private readonly selectionManager: ISelectionManager;
    private readonly tooltipService: ITooltipService;
    private formattingSettings: VisualFormattingSettingsModel;
    private lastDataView?: powerbi.DataView;
    private sortDirectionOverride?: SortDirection;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.root = document.createElement("div");
        this.root.className = "tabela-modern";
        options.element.classList.add("tabela-modern-host");
        options.element.appendChild(this.root);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews && options.dataViews[0];
            this.lastDataView = dataView;
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel,
                dataView
            );

            if (!shouldShowVisualForMenu(dataView, {
                enabled: this.formattingSettings.menuFilter.enabled.value,
                menuName: this.formattingSettings.menuFilter.menuName.value
            })) {
                hideVisualElement(this.root);
                this.events.renderingFinished(options);
                return;
            }

            showVisualElement(this.root);
            this.render(dataView);
            this.events.renderingFinished(options);
        } catch (error) {
            showVisualElement(this.root);
            this.renderEmpty("Nao foi possivel renderizar a tabela.");
            this.events.renderingFailed(options, error instanceof Error ? error.message : String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private render(dataView?: powerbi.DataView): void {
        this.clearRoot();

        const table = dataView?.table;

        if (!table || !table.rows || table.rows.length === 0) {
            this.renderEmpty("Adicione campos em Tabela.");
            return;
        }

        const displayColumns = this.getDisplayColumns(table);

        if (displayColumns.length === 0) {
            this.renderEmpty("Adicione pelo menos uma coluna em Tabela.");
            return;
        }

        const rows = this.buildRows(table);
        const sortedRows = this.sortRows(rows, displayColumns);
        const visibleRows = this.limitRows(sortedRows);
        const card = document.createElement("div");

        card.className = "tm-card";
        this.applyCardStyles(card);
        card.appendChild(this.renderTopBar());
        card.appendChild(this.renderTable(table, displayColumns, visibleRows, sortedRows));
        this.root.appendChild(card);
    }

    private renderTopBar(): HTMLElement {
        const topBar = document.createElement("div");
        topBar.className = "tm-topbar";

        const titleWrap = document.createElement("div");
        titleWrap.className = "tm-title-wrap";

        if (this.formattingSettings.ranking.showTitleIcon.value) {
            const icon = document.createElement("span");
            icon.className = "tm-title-icon";
            icon.textContent = "\u{1F3C6}";
            titleWrap.appendChild(icon);
        }

        const title = document.createElement("div");
        title.className = "tm-title";
        title.textContent = this.safeText(this.formattingSettings.layout.titleText.value, "Tabela");
        titleWrap.appendChild(title);
        topBar.appendChild(titleWrap);

        const actions = document.createElement("div");
        actions.className = "tm-actions";

        if (this.formattingSettings.ranking.showRankToggle.value) {
            const toggle = document.createElement("button");
            toggle.className = "tm-icon-button";
            toggle.type = "button";
            toggle.title = "Alternar melhores/piores";
            toggle.textContent = this.getDirection() === "best" ? "↓" : "↑";
            toggle.addEventListener("click", () => {
                this.sortDirectionOverride = this.getDirection() === "best" ? "worst" : "best";

                if (this.lastDataView) {
                    this.render(this.lastDataView);
                }
            });
            actions.appendChild(toggle);
        }

        topBar.appendChild(actions);
        return topBar;
    }

    private renderTable(
        table: powerbi.DataViewTable,
        displayColumns: DisplayColumn[],
        visibleRows: TableRowModel[],
        allRows: TableRowModel[]
    ): HTMLElement {
        const tableWrap = document.createElement("div");
        tableWrap.className = "tm-table-wrap";
        tableWrap.style.setProperty("--tm-row-height", `${this.clampNumber(this.formattingSettings.tableStyle.rowHeight.value, 34, 90)}px`);

        const tableElement = document.createElement("table");
        tableElement.className = "tm-table";
        tableElement.appendChild(this.renderTableHead(displayColumns));
        tableElement.appendChild(this.renderTableBody(table, displayColumns, visibleRows));

        if (this.formattingSettings.footer.showFooter.value) {
            tableElement.appendChild(this.renderFooter(displayColumns, allRows));
        }

        tableWrap.appendChild(tableElement);
        return tableWrap;
    }

    private renderTableHead(displayColumns: DisplayColumn[]): HTMLElement {
        const head = document.createElement("thead");
        const row = document.createElement("tr");

        if (this.formattingSettings.ranking.showPositionColumn.value) {
            row.appendChild(this.createHeaderCell("Posicao", "tm-position-col"));
        }

        if (this.formattingSettings.images.showImages.value) {
            row.appendChild(this.createHeaderCell("", "tm-image-col"));
        }

        displayColumns.forEach((column) => {
            const cell = this.createHeaderCell(column.displayName, column.isNumeric ? "tm-number-col" : "");
            row.appendChild(cell);
        });

        head.appendChild(row);
        return head;
    }

    private renderTableBody(
        table: powerbi.DataViewTable,
        displayColumns: DisplayColumn[],
        rows: TableRowModel[]
    ): HTMLElement {
        const body = document.createElement("tbody");

        rows.forEach((rowModel, rowIndex) => {
            const row = document.createElement("tr");
            row.tabIndex = 0;

            row.addEventListener("click", (event: MouseEvent) => {
                if (rowModel.selectionId) {
                    this.selectionManager.select(rowModel.selectionId, event.ctrlKey || event.metaKey);
                }
            });

            row.addEventListener("contextmenu", (event: MouseEvent) => {
                if (!rowModel.selectionId) {
                    return;
                }

                event.preventDefault();
                this.selectionManager.showContextMenu(rowModel.selectionId, {
                    x: event.clientX,
                    y: event.clientY
                });
            });

            if (this.formattingSettings.ranking.showPositionColumn.value) {
                const positionCell = document.createElement("td");
                positionCell.className = "tm-position-col tm-position";
                positionCell.textContent = `${rowIndex + 1}`;
                row.appendChild(positionCell);
            }

            if (this.formattingSettings.images.showImages.value) {
                const imageCell = document.createElement("td");
                imageCell.className = "tm-image-col";
                imageCell.appendChild(this.renderImage(rowModel, displayColumns));
                row.appendChild(imageCell);
            }

            displayColumns.forEach((column) => {
                const cell = document.createElement("td");
                const value = rowModel.values[column.index];
                cell.className = column.isNumeric ? "tm-number-col" : "";

                if (this.isConditionalColumn(column)) {
                    cell.appendChild(this.renderConditionalCell(value, column));
                } else {
                    cell.textContent = this.formatValue(value, column);
                }

                row.appendChild(cell);
            });

            row.title = displayColumns
                .map((column) => `${column.displayName}: ${this.formatValue(rowModel.values[column.index], column)}`)
                .join("\n");
            this.bindRowTooltip(row, displayColumns, rowModel);
            body.appendChild(row);
        });

        if (rows.length === 0) {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");
            emptyCell.className = "tm-empty-cell";
            emptyCell.colSpan = displayColumns.length + 2;
            emptyCell.textContent = "Sem dados para exibir.";
            emptyRow.appendChild(emptyCell);
            body.appendChild(emptyRow);
        }

        return body;
    }

    private renderFooter(displayColumns: DisplayColumn[], rows: TableRowModel[]): HTMLElement {
        const foot = document.createElement("tfoot");
        const row = document.createElement("tr");
        const footer = this.formattingSettings.footer;

        if (this.formattingSettings.ranking.showPositionColumn.value) {
            const positionCell = document.createElement("td");
            positionCell.className = "tm-footer-label";
            positionCell.textContent = this.safeText(footer.footerLabel.value, "TOTAL");
            row.appendChild(positionCell);
        }

        if (this.formattingSettings.images.showImages.value) {
            const imageCell = document.createElement("td");
            imageCell.className = this.formattingSettings.ranking.showPositionColumn.value ? "" : "tm-footer-label";
            imageCell.textContent = this.formattingSettings.ranking.showPositionColumn.value
                ? ""
                : this.safeText(footer.footerLabel.value, "TOTAL");
            row.appendChild(imageCell);
        }

        displayColumns.forEach((column, columnIndex) => {
            const cell = document.createElement("td");
            cell.className = column.isNumeric ? "tm-number-col" : "";

            if (!this.formattingSettings.ranking.showPositionColumn.value
                && !this.formattingSettings.images.showImages.value
                && columnIndex === 0) {
                cell.className = "tm-footer-label";
                cell.textContent = this.safeText(footer.footerLabel.value, "TOTAL");
            } else if (column.isNumeric) {
                const aggregateValue = this.aggregateColumn(rows, column);
                cell.textContent = aggregateValue === undefined ? "" : this.formatNumberForColumn(aggregateValue, column);
            } else {
                cell.textContent = "";
            }

            row.appendChild(cell);
        });

        foot.appendChild(row);
        return foot;
    }

    private createHeaderCell(text: string, className: string): HTMLElement {
        const cell = document.createElement("th");
        cell.textContent = text;

        if (className) {
            cell.className = className;
        }

        return cell;
    }

    private renderImage(rowModel: TableRowModel, displayColumns: DisplayColumn[]): HTMLElement {
        const imageSettings = this.formattingSettings.images;
        const imageWrap = document.createElement("div");
        const size = this.clampNumber(imageSettings.imageSize.value, 24, 72);
        imageWrap.className = "tm-avatar";
        imageWrap.style.width = `${size}px`;
        imageWrap.style.height = `${size}px`;
        imageWrap.style.borderRadius = `${this.clampNumber(imageSettings.imageRadius.value, 0, 36)}px`;

        if (rowModel.imageUrl) {
            const image = document.createElement("img");
            image.alt = "";
            image.src = rowModel.imageUrl;
            imageWrap.appendChild(image);
            return imageWrap;
        }

        imageWrap.textContent = this.getInitials(rowModel, displayColumns);
        imageWrap.style.backgroundColor = this.getAvatarColor(rowModel.originalIndex);
        return imageWrap;
    }

    private renderConditionalCell(value: PrimitiveValue, column: DisplayColumn): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.className = "tm-conditional";
        const numericValue = this.toNumber(value);

        if (this.formattingSettings.conditional.showValue.value) {
            const valueSpan = document.createElement("span");
            valueSpan.className = "tm-conditional-value";
            valueSpan.textContent = this.formatValue(value, column);
            wrapper.appendChild(valueSpan);
        }

        const iconSpan = document.createElement("span");
        iconSpan.className = "tm-conditional-icons";
        iconSpan.style.color = this.color(this.formattingSettings.conditional.iconColor.value.value, "#FFB21A");
        iconSpan.textContent = numericValue === undefined ? "" : this.buildConditionalIcons(numericValue);
        wrapper.appendChild(iconSpan);
        return wrapper;
    }

    private bindRowTooltip(row: HTMLElement, displayColumns: DisplayColumn[], rowModel: TableRowModel): void {
        if (!this.tooltipService.enabled()) {
            return;
        }

        const dataItems = this.createTooltipItems(displayColumns, rowModel);
        const identities = rowModel.selectionId ? [rowModel.selectionId] : [];

        row.addEventListener("mouseover", (event: MouseEvent) => {
            this.tooltipService.show({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems,
                identities
            });
        });

        row.addEventListener("mousemove", (event: MouseEvent) => {
            this.tooltipService.move({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems,
                identities
            });
        });

        row.addEventListener("mouseout", () => {
            this.tooltipService.hide({
                isTouchEvent: false,
                immediately: false
            });
        });
    }

    private createTooltipItems(displayColumns: DisplayColumn[], rowModel: TableRowModel): VisualTooltipDataItem[] {
        return displayColumns.map((column) => ({
            displayName: column.displayName,
            value: this.formatValue(rowModel.values[column.index], column)
        }));
    }

    private getDisplayColumns(table: powerbi.DataViewTable): DisplayColumn[] {
        return table.columns
            .map((column, index) => ({ source: column, index }))
            .filter((column) => Boolean(column.source.roles?.tableFields))
            .map((column, visibleIndex) => ({
                source: column.source,
                index: column.index,
                visibleIndex,
                displayName: this.getColumnDisplayName(column.source, visibleIndex),
                isNumeric: this.isNumericColumn(column.source)
            }));
    }

    private getColumnDisplayName(column: powerbi.DataViewMetadataColumn, visibleIndex: number): string {
        const customTitle = this.safeText(this.getColumnSlotSettings(visibleIndex).title, "");

        if (customTitle) {
            return customTitle;
        }

        return this.cleanDisplayName(column.displayName || `Coluna ${visibleIndex + 1}`);
    }

    private cleanDisplayName(displayName: string): string {
        return displayName
            .replace(/^(Soma de|Sum of|Media de|Média de|Average of|Contagem de|Count of|Maximo de|Máximo de|Maximum of|Minimo de|Mínimo de|Minimum of)\s+/i, "")
            .trim();
    }

    private getColumnSlotSettings(visibleIndex: number): { title: string; type: DataFormatType; decimals: number } {
        const dataFormat = this.formattingSettings.dataFormat;

        if (visibleIndex === 0) {
            return {
                title: dataFormat.column1Title.value,
                type: this.toDataFormatType(String(dataFormat.column1Type.value.value)),
                decimals: dataFormat.column1Decimals.value
            };
        }

        if (visibleIndex === 1) {
            return {
                title: dataFormat.column2Title.value,
                type: this.toDataFormatType(String(dataFormat.column2Type.value.value)),
                decimals: dataFormat.column2Decimals.value
            };
        }

        if (visibleIndex === 2) {
            return {
                title: dataFormat.column3Title.value,
                type: this.toDataFormatType(String(dataFormat.column3Type.value.value)),
                decimals: dataFormat.column3Decimals.value
            };
        }

        if (visibleIndex === 3) {
            return {
                title: dataFormat.column4Title.value,
                type: this.toDataFormatType(String(dataFormat.column4Type.value.value)),
                decimals: dataFormat.column4Decimals.value
            };
        }

        if (visibleIndex === 4) {
            return {
                title: dataFormat.column5Title.value,
                type: this.toDataFormatType(String(dataFormat.column5Type.value.value)),
                decimals: dataFormat.column5Decimals.value
            };
        }

        if (visibleIndex === 5) {
            return {
                title: dataFormat.column6Title.value,
                type: this.toDataFormatType(String(dataFormat.column6Type.value.value)),
                decimals: dataFormat.column6Decimals.value
            };
        }

        return {
            title: "",
            type: "auto",
            decimals: this.formattingSettings.dataFormat.defaultDecimals.value
        };
    }

    private buildRows(table: powerbi.DataViewTable): TableRowModel[] {
        const imageUrlIndex = table.columns.findIndex((column) => Boolean(column.roles?.imageUrl));

        return (table.rows || []).map((row, rowIndex) => {
            const imageUrl = imageUrlIndex >= 0 ? this.safeText(this.formatPrimitive(row[imageUrlIndex]), "") : "";

            return {
                originalIndex: rowIndex,
                values: row,
                imageUrl,
                selectionId: this.host.createSelectionIdBuilder()
                    .withTable(table, rowIndex)
                    .createSelectionId()
            };
        });
    }

    private sortRows(rows: TableRowModel[], displayColumns: DisplayColumn[]): TableRowModel[] {
        const sortColumn = this.getSortColumn(displayColumns);

        if (!sortColumn) {
            return rows;
        }

        const direction = this.getDirection();
        return [...rows].sort((left, right) => {
            const leftValue = this.toSortableValue(left.values[sortColumn.index]);
            const rightValue = this.toSortableValue(right.values[sortColumn.index]);

            if (leftValue < rightValue) {
                return direction === "best" ? 1 : -1;
            }

            if (leftValue > rightValue) {
                return direction === "best" ? -1 : 1;
            }

            return left.originalIndex - right.originalIndex;
        });
    }

    private limitRows(rows: TableRowModel[]): TableRowModel[] {
        const maxRows = Math.floor(this.clampNumber(this.formattingSettings.layout.maxRows.value, 0, 5000));
        return maxRows === 0 ? rows : rows.slice(0, maxRows);
    }

    private getSortColumn(displayColumns: DisplayColumn[]): DisplayColumn | undefined {
        const configuredName = this.normalizeText(this.formattingSettings.ranking.sortColumnName.value);

        if (configuredName) {
            const exactColumn = displayColumns.find((column) => this.normalizeText(column.displayName) === configuredName);

            if (exactColumn) {
                return exactColumn;
            }

            return displayColumns.find((column) => this.normalizeText(column.displayName).includes(configuredName));
        }

        return displayColumns.find((column) => column.isNumeric);
    }

    private getDirection(): SortDirection {
        if (this.sortDirectionOverride) {
            return this.sortDirectionOverride;
        }

        return this.formattingSettings.ranking.sortDirection.value.value === "worst" ? "worst" : "best";
    }

    private isConditionalColumn(column: DisplayColumn): boolean {
        if (!this.formattingSettings.conditional.enabled.value) {
            return false;
        }

        const configuredName = this.normalizeText(this.formattingSettings.conditional.columnName.value);

        if (!configuredName) {
            return false;
        }

        const columnName = this.normalizeText(column.displayName);
        return columnName === configuredName || columnName.includes(configuredName);
    }

    private buildConditionalIcons(value: number): string {
        const conditional = this.formattingSettings.conditional;
        const minValue = conditional.minValue.value;
        const maxValue = conditional.maxValue.value;
        const range = maxValue - minValue;
        const normalized = range === 0 ? 1 : this.clampNumber((value - minValue) / range, 0, 1);
        const steps = Math.max(1, Math.round(normalized * 5));
        const style = conditional.iconStyle.value.value;

        if (style === "wifi") {
            return "≋".repeat(steps);
        }

        if (style === "bars") {
            return "▁▂▃▄▅".slice(0, steps);
        }

        if (style === "dots") {
            return "●".repeat(steps);
        }

        return "★".repeat(steps);
    }

    private aggregateColumn(rows: TableRowModel[], column: DisplayColumn): number | undefined {
        const values = rows
            .map((row) => this.toNumber(row.values[column.index]))
            .filter((value): value is number => value !== undefined);

        if (values.length === 0) {
            return undefined;
        }

        const type = this.formattingSettings.footer.aggregateType.value.value;

        if (type === "sum") {
            return values.reduce((sum, value) => sum + value, 0);
        }

        if (type === "max") {
            return Math.max(...values);
        }

        if (type === "min") {
            return Math.min(...values);
        }

        if (type === "count") {
            return values.length;
        }

        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    private formatValue(value: PrimitiveValue, column: DisplayColumn): string {
        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "number") {
            return this.formatNumberForColumn(value, column);
        }

        if (value instanceof Date) {
            return new Intl.DateTimeFormat("pt-BR").format(value);
        }

        return String(value);
    }

    private formatNumberForColumn(value: number, column: DisplayColumn): string {
        const rule = this.getColumnFormatRule(column);
        const type = rule.type === "auto" ? this.getAutoColumnType(column) : rule.type;
        const decimals = this.getDecimalsForRule(rule, value);

        if (type === "text") {
            return String(value);
        }

        if (type === "currency") {
            const formattedCurrency = new Intl.NumberFormat("pt-BR", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(value);

            return `${this.safeText(this.formattingSettings.dataFormat.currencySymbol.value, "R$")} ${formattedCurrency}`;
        }

        const shouldShowPercent = type === "percent";
        const displayValue = shouldShowPercent && Math.abs(value) <= 1 ? value * 100 : value;
        const formatted = new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(displayValue);

        return shouldShowPercent ? `${formatted}%` : formatted;
    }

    private formatPrimitive(value: PrimitiveValue): string {
        if (value === null || value === undefined) {
            return "";
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        return String(value);
    }

    private isNumericColumn(column: powerbi.DataViewMetadataColumn): boolean {
        return Boolean(column.type?.numeric || column.type?.integer || column.isMeasure);
    }

    private isPercentColumn(column: DisplayColumn): boolean {
        const format = column.source.format || "";
        return format.includes("%");
    }

    private getAutoColumnType(column: DisplayColumn): DataFormatType {
        if (!column.isNumeric) {
            return "text";
        }

        return this.isPercentColumn(column) ? "percent" : "number";
    }

    private getColumnFormatRule(column: DisplayColumn): ColumnFormatRule {
        const columnSlot = this.getColumnSlotSettings(column.visibleIndex);
        const defaultType = this.toDataFormatType(String(this.formattingSettings.dataFormat.defaultType.value.value));

        if (columnSlot.type !== "auto") {
            return {
                type: columnSlot.type,
                decimals: Math.floor(this.clampNumber(columnSlot.decimals, 0, 8))
            };
        }

        return {
            type: defaultType,
            decimals: defaultType === "auto"
                ? undefined
                : Math.floor(this.clampNumber(this.formattingSettings.dataFormat.defaultDecimals.value, 0, 8))
        };
    }

    private getDecimalsForRule(rule: ColumnFormatRule, value: number): number {
        if (rule.decimals !== undefined) {
            return Math.floor(this.clampNumber(rule.decimals, 0, 8));
        }

        return Number.isInteger(value) ? 0 : 1;
    }

    private toDataFormatType(value: string): DataFormatType {
        const normalizedValue = this.normalizeText(value);

        if (normalizedValue === "moeda" || normalizedValue === "currency") {
            return "currency";
        }

        if (normalizedValue === "percentual" || normalizedValue === "percent" || normalizedValue === "porcentagem") {
            return "percent";
        }

        if (normalizedValue === "numero" || normalizedValue === "number") {
            return "number";
        }

        if (normalizedValue === "texto" || normalizedValue === "text") {
            return "text";
        }

        return "auto";
    }

    private toNumber(value: PrimitiveValue): number | undefined {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === "string") {
            const normalizedValue = value.replace("%", "").replace(".", "").replace(",", ".");
            const numberValue = Number(normalizedValue);

            if (Number.isFinite(numberValue)) {
                return numberValue;
            }
        }

        return undefined;
    }

    private toSortableValue(value: PrimitiveValue): number | string {
        const numericValue = this.toNumber(value);

        if (numericValue !== undefined) {
            return numericValue;
        }

        return this.normalizeText(this.formatPrimitive(value));
    }

    private getInitials(rowModel: TableRowModel, displayColumns: DisplayColumn[]): string {
        const textColumn = displayColumns.find((column) => !column.isNumeric);
        const value = textColumn ? this.formatPrimitive(rowModel.values[textColumn.index]) : "";
        const parts = value
            .split(/\s+/)
            .filter((part) => Boolean(part));

        if (parts.length === 0) {
            return "--";
        }

        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }

        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    private getAvatarColor(index: number): string {
        const colors = ["#EEE6FF", "#E9FFF1", "#FFF0E5", "#EAF2FF", "#F0F4FF"];
        return colors[index % colors.length];
    }

    private applyCardStyles(card: HTMLElement): void {
        const layout = this.formattingSettings.layout;
        const tableStyle = this.formattingSettings.tableStyle;
        const footer = this.formattingSettings.footer;

        card.style.backgroundColor = this.color(layout.backgroundColor.value.value, "#FFFFFF");
        card.style.borderColor = this.color(layout.borderColor.value.value, "#E6EAF2");
        card.style.borderRadius = `${this.clampNumber(layout.borderRadius.value, 0, 32)}px`;
        card.style.padding = `${this.clampNumber(layout.padding.value, 10, 40)}px`;
        card.style.fontFamily = this.safeText(layout.fontFamily.value, "Segoe UI");
        card.style.setProperty("--tm-header-color", this.color(tableStyle.headerColor.value.value, "#151B4D"));
        card.style.setProperty("--tm-text-color", this.color(tableStyle.textColor.value.value, "#1E254E"));
        card.style.setProperty("--tm-muted-color", this.color(tableStyle.mutedColor.value.value, "#5C658A"));
        card.style.setProperty("--tm-divider-color", this.color(tableStyle.dividerColor.value.value, "#E9EDF5"));
        card.style.setProperty("--tm-accent-color", this.color(tableStyle.accentColor.value.value, "#1D6DFF"));
        card.style.setProperty("--tm-font-size", `${this.clampNumber(tableStyle.fontSize.value, 9, 24)}px`);
        card.style.setProperty("--tm-header-font-size", `${this.clampNumber(tableStyle.headerFontSize.value, 9, 22)}px`);
        card.style.setProperty("--tm-footer-bg", this.color(footer.footerBackgroundColor.value.value, "#EEF5FF"));
        card.style.setProperty("--tm-footer-color", this.color(footer.footerColor.value.value, "#1467FF"));
    }

    private renderEmpty(message: string): void {
        this.clearRoot();
        const empty = document.createElement("div");
        empty.className = "tm-empty";
        empty.textContent = message;
        this.root.appendChild(empty);
    }

    private clearRoot(): void {
        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }
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
