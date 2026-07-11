"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import DataViewMatrix = powerbi.DataViewMatrix;
import DataViewMatrixNode = powerbi.DataViewMatrixNode;
import DataViewMatrixNodeValue = powerbi.DataViewMatrixNodeValue;
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
type MatrixColumnKind = "value" | "rowTotal" | "percentTotal";
type ValueFormatType = "auto" | "number" | "currency" | "percent";

interface MatrixColumnModel {
    key: string;
    kind: MatrixColumnKind;
    label: string;
    path: string[];
    measureIndex: number;
    measureName: string;
    valueIndex: number;
    source: powerbi.DataViewMetadataColumn;
}

interface DisplayValueSource {
    source: powerbi.DataViewMetadataColumn;
    measureIndex: number;
}

interface ColumnPathItem {
    label: string;
    levelName: string;
}

interface ColumnLeafModel {
    node: DataViewMatrixNode;
    pathItems: ColumnPathItem[];
}

interface ColumnHeaderCell {
    label: string;
    colspan: number;
    rowspan: number;
    isSubtotal: boolean;
}

interface MatrixRowModel {
    key: string;
    node?: DataViewMatrixNode;
    level: number;
    labels: string[];
    path: string[];
    values?: { [id: number]: DataViewMatrixNodeValue };
    selectionId?: ISelectionId;
    hasChildren: boolean;
    isCollapsed: boolean;
    isSubtotal: boolean;
    isGrandTotal: boolean;
}

interface MatrixModel {
    columns: MatrixColumnModel[];
    valueColumns: MatrixColumnModel[];
    summaryColumns: MatrixColumnModel[];
    columnHeaderRows: ColumnHeaderCell[][];
    rows: MatrixRowModel[];
    rowLevelCount: number;
    rowHeaderNames: string[];
    rowHeaderLabel: string;
    grandTotalsByMeasure: { [measureIndex: number]: number };
    hasColumnGroups: boolean;
    hasMultipleMeasures: boolean;
}

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly host: IVisualHost;
    private readonly root: HTMLElement;
    private readonly selectionManager: ISelectionManager;
    private readonly tooltipService: ITooltipService;
    private formattingSettings: VisualFormattingSettingsModel;
    private autoExpandedKeys: Set<string>;
    private selectedKeys: Set<string>;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.autoExpandedKeys = new Set<string>();
        this.selectedKeys = new Set<string>();
        this.root = document.createElement("div");
        this.root.className = "modern-matrix";
        options.element.classList.add("modern-matrix-host");
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
            this.renderEmpty("Nao foi possivel renderizar a matriz.");
            this.events.renderingFailed(options, error instanceof Error ? error.message : String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private render(dataView?: powerbi.DataView): void {
        this.clearRoot();
        this.applyRootStyles();

        const matrix = dataView && dataView.matrix;

        if (!matrix || !matrix.rows || !matrix.valueSources || this.getDisplayValueSources(matrix).length === 0) {
            this.renderEmpty("Adicione campos em Linhas e Valores. Colunas sao opcionais.");
            return;
        }

        const model = this.createMatrixModel(matrix);

        if (model.rows.length === 0) {
            this.renderEmpty("Sem dados para exibir.");
            return;
        }

        const card = document.createElement("section");
        card.className = this.formattingSettings.layout.showShadow.value ? "mm-card mm-card-shadow" : "mm-card";

        if (this.formattingSettings.layout.showHeader.value) {
            card.appendChild(this.renderHeader());
        }

        card.appendChild(this.renderMatrixTable(model));
        this.root.appendChild(card);
        this.autoExpandCollapsedRows(model);
    }

    private renderHeader(): HTMLElement {
        const header = document.createElement("header");
        header.className = "mm-header";

        const titleGroup = document.createElement("div");
        titleGroup.className = "mm-title-group";

        const title = document.createElement("div");
        title.className = "mm-title";
        title.textContent = this.safeText(this.formattingSettings.layout.titleText.value, "Matriz");
        titleGroup.appendChild(title);

        const subtitleText = this.safeText(this.formattingSettings.layout.subtitleText.value, "");

        if (subtitleText) {
            const subtitle = document.createElement("div");
            subtitle.className = "mm-subtitle";
            subtitle.textContent = subtitleText;
            titleGroup.appendChild(subtitle);
        }

        header.appendChild(titleGroup);
        return header;
    }

    private renderMatrixTable(model: MatrixModel): HTMLElement {
        const tableWrap = document.createElement("div");
        tableWrap.className = "mm-table-wrap";

        const table = document.createElement("table");
        table.className = this.formattingSettings.matrixStyle.stickyHeader.value
            ? "mm-table mm-sticky-header"
            : "mm-table";

        table.appendChild(this.renderTableHead(model));
        table.appendChild(this.renderTableBody(model));
        tableWrap.appendChild(table);
        return tableWrap;
    }

    private renderTableHead(model: MatrixModel): HTMLTableSectionElement {
        const head = document.createElement("thead");

        if (!model.hasColumnGroups) {
            const row = document.createElement("tr");
            this.appendRowHeaderCell(row, model.rowHeaderLabel, 1);
            model.columns.forEach((column) => row.appendChild(this.createHeaderCell(column.label, 1, 1, this.getHeaderClassName(column))));
            head.appendChild(row);
            return head;
        }

        const headerDepth = 2;
        const groupRow = document.createElement("tr");
        this.appendRowHeaderCell(groupRow, model.rowHeaderLabel, headerDepth);

        const valueGroupLabel = model.hasMultipleMeasures
            ? "Valores"
            : model.valueColumns[0]?.measureName || "Valores";
        groupRow.appendChild(this.createHeaderCell(valueGroupLabel, model.valueColumns.length, 1, "mm-col-group"));

        model.summaryColumns.forEach((column) => {
            groupRow.appendChild(this.createHeaderCell(column.label, 1, headerDepth, this.getHeaderClassName(column)));
        });

        const valueRow = document.createElement("tr");
        model.valueColumns.forEach((column) => {
            valueRow.appendChild(this.createHeaderCell(column.label, 1, 1, this.getHeaderClassName(column)));
        });

        head.appendChild(groupRow);
        head.appendChild(valueRow);
        return head;
    }

    private renderTableBody(model: MatrixModel): HTMLTableSectionElement {
        const body = document.createElement("tbody");

        model.rows.forEach((rowModel, rowIndex) => {
            const row = document.createElement("tr");
            row.className = this.getRowClassName(rowModel, rowIndex);
            row.tabIndex = 0;

            if (rowModel.selectionId) {
                row.setAttribute("data-selection-key", rowModel.selectionId.getKey());
            }

            if (this.formattingSettings.behavior.enableSelection.value && rowModel.selectionId) {
                this.bindSelection(row, rowModel.selectionId);
            }

            if (this.formattingSettings.behavior.enableContextMenu.value && rowModel.selectionId) {
                this.bindContextMenu(row, rowModel.selectionId);
            }

            row.appendChild(this.renderRowHeaderCell(rowModel));

            model.columns.forEach((column) => {
                row.appendChild(this.renderValueCell(rowModel, column, model));
            });

            body.appendChild(row);
        });

        return body;
    }

    private appendRowHeaderCell(row: HTMLTableRowElement, label: string, rowSpan: number): void {
        row.appendChild(this.createHeaderCell(label, 1, rowSpan, "mm-row-heading"));
    }

    private createHeaderCell(label: string, colSpan: number, rowSpan: number, className: string): HTMLTableCellElement {
        const cell = document.createElement("th");
        cell.textContent = label;
        cell.colSpan = colSpan;
        cell.rowSpan = rowSpan;
        cell.className = className;
        return cell;
    }

    private getHeaderClassName(column: MatrixColumnModel): string {
        if (column.kind === "rowTotal") {
            return "mm-value-heading mm-total-heading";
        }

        if (column.kind === "percentTotal") {
            return "mm-value-heading mm-percent-heading";
        }

        return "mm-value-heading";
    }

    private renderRowHeaderCell(rowModel: MatrixRowModel): HTMLTableCellElement {
        const cell = document.createElement("td");
        cell.className = "mm-row-header mm-row-header-active";

        const label = rowModel.labels[rowModel.level] || rowModel.path[rowModel.path.length - 1] || "";

        if (!label) {
            return cell;
        }

        const labelWrap = document.createElement("div");
        labelWrap.className = "mm-row-label";
        labelWrap.style.paddingLeft = `${this.getRowIndent(rowModel)}px`;

        if (rowModel.hasChildren && !rowModel.isSubtotal && !rowModel.isGrandTotal) {
            labelWrap.appendChild(this.renderExpander(rowModel));
        } else {
            const spacer = document.createElement("span");
            spacer.className = "mm-expander-spacer";
            labelWrap.appendChild(spacer);
        }

        const text = document.createElement("span");
        text.className = "mm-row-text";
        text.textContent = label;
        labelWrap.appendChild(text);
        cell.appendChild(labelWrap);
        return cell;
    }

    private renderExpander(rowModel: MatrixRowModel): HTMLElement {
        const button = document.createElement("button");
        button.className = "mm-expander";
        button.type = "button";
        button.title = rowModel.isCollapsed ? "Expandir" : "Recolher";
        button.classList.add(rowModel.isCollapsed ? "mm-expander-collapsed" : "mm-expander-expanded");

        if (!this.formattingSettings.behavior.enableExpandCollapse.value || !rowModel.selectionId) {
            button.disabled = true;
            return button;
        }

        button.addEventListener("click", (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectionManager.toggleExpandCollapse(rowModel.selectionId);
        });

        return button;
    }

    private renderValueCell(rowModel: MatrixRowModel, column: MatrixColumnModel, model: MatrixModel): HTMLTableCellElement {
        const cell = document.createElement("td");
        const rawValue = this.getDisplayValue(rowModel, column, model);
        cell.className = this.getValueCellClassName(column);
        cell.textContent = this.formatColumnValue(rawValue, column);
        this.bindTooltip(cell, rowModel, column, rawValue);
        return cell;
    }

    private getValueCellClassName(column: MatrixColumnModel): string {
        if (column.kind === "rowTotal") {
            return "mm-value-cell mm-total-cell";
        }

        if (column.kind === "percentTotal") {
            return "mm-value-cell mm-percent-cell";
        }

        return "mm-value-cell";
    }

    private bindSelection(row: HTMLTableRowElement, selectionId: ISelectionId): void {
        row.addEventListener("click", (event: MouseEvent) => {
            const multiSelect = event.ctrlKey || event.metaKey;
            this.selectionManager.select(selectionId, multiSelect).then((selectionIds: ISelectionId[]) => {
                this.selectedKeys = new Set(selectionIds.map((item) => item.getKey()));
                this.updateSelectionStyles();
            });
        });
    }

    private bindContextMenu(row: HTMLTableRowElement, selectionId: ISelectionId): void {
        row.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            this.selectionManager.showContextMenu(selectionId, {
                x: event.clientX,
                y: event.clientY
            }, "rows");
        });
    }

    private bindTooltip(
        cell: HTMLElement,
        rowModel: MatrixRowModel,
        column: MatrixColumnModel,
        value: PrimitiveValue | undefined
    ): void {
        if (!this.tooltipService.enabled()) {
            return;
        }

        const dataItems: VisualTooltipDataItem[] = [
            {
                displayName: "Linha",
                value: rowModel.path.join(" > ")
            },
            {
                displayName: "Coluna",
                value: column.path.length > 0 ? column.path.join(" > ") : column.measureName
            },
            {
                displayName: column.measureName,
                value: this.formatColumnValue(value, column)
            }
        ];

        const identities = rowModel.selectionId ? [rowModel.selectionId] : [];

        cell.addEventListener("mouseover", (event: MouseEvent) => {
            this.tooltipService.show({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems,
                identities
            });
        });

        cell.addEventListener("mousemove", (event: MouseEvent) => {
            this.tooltipService.move({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems,
                identities
            });
        });

        cell.addEventListener("mouseout", () => {
            this.tooltipService.hide({
                isTouchEvent: false,
                immediately: false
            });
        });
    }

    private updateSelectionStyles(): void {
        const rows = this.root.querySelectorAll<HTMLTableRowElement>("tbody tr[data-selection-key]");
        rows.forEach((row) => {
            const key = row.getAttribute("data-selection-key") || "";
            row.classList.toggle("mm-row-selected", this.selectedKeys.has(key));
        });
    }

    private getDisplayValueSources(matrix: DataViewMatrix): DisplayValueSource[] {
        return (matrix.valueSources || [])
            .map((source, measureIndex) => ({ source, measureIndex }))
            .filter((valueSource) => !Boolean(valueSource.source.roles && valueSource.source.roles.menu));
    }

    private createMatrixModel(matrix: DataViewMatrix): MatrixModel {
        const rowLevelCount = Math.max(1, matrix.rows.levels.length);
        const rowHeaderNames = this.getRowHeaderNames(matrix, rowLevelCount);
        const rowHeaderLabel = this.getRowHeaderLabel(rowHeaderNames);
        const displayValueSources = this.getDisplayValueSources(matrix);
        const columnNodes = matrix.columns && matrix.columns.root && matrix.columns.root.children
            ? matrix.columns.root.children
            : [];
        const hasColumnGroups = columnNodes.length > 0;
        const valueColumns = this.createValueColumns(matrix, columnNodes, displayValueSources);
        const summaryColumns = this.createSummaryColumns(valueColumns, displayValueSources, hasColumnGroups);
        const columns = [...valueColumns, ...summaryColumns];
        const columnHeaderRows = hasColumnGroups
            ? this.createColumnHeaderRows(matrix, columnNodes, displayValueSources.length)
            : [];
        const rows = this.createRows(matrix, rowLevelCount, valueColumns);
        const grandTotalsByMeasure = this.calculateGrandTotalsByMeasure(rows, valueColumns);

        return {
            columns,
            valueColumns,
            summaryColumns,
            columnHeaderRows,
            rows,
            rowLevelCount,
            rowHeaderNames,
            rowHeaderLabel,
            grandTotalsByMeasure,
            hasColumnGroups,
            hasMultipleMeasures: displayValueSources.length > 1
        };
    }

    private createValueColumns(
        matrix: DataViewMatrix,
        columnNodes: DataViewMatrixNode[],
        valueSources: DisplayValueSource[]
    ): MatrixColumnModel[] {
        if (columnNodes.length === 0) {
            return valueSources.map((valueSource, displayIndex) => {
                const measureName = this.cleanDisplayName(valueSource.source.displayName || `Valor ${displayIndex + 1}`);

                return {
                    key: `measure-${valueSource.measureIndex}`,
                    kind: "value",
                    label: measureName,
                    path: [],
                    measureIndex: valueSource.measureIndex,
                    measureName,
                    valueIndex: valueSource.measureIndex,
                    source: valueSource.source
                };
            });
        }

        const leaves = this.getColumnLeaves(columnNodes, matrix.columns.levels);
        const columns: MatrixColumnModel[] = [];
        const hasMultipleMeasures = valueSources.length > 1;

        leaves.forEach((leaf, leafIndex) => {
            const path = leaf.pathItems.map((item) => item.label);
            const pathLabel = this.formatColumnPathLabel(leaf.pathItems);

            valueSources.forEach((valueSource, displayIndex) => {
                const measureName = this.cleanDisplayName(valueSource.source.displayName || `Valor ${displayIndex + 1}`);
                columns.push({
                    key: `leaf-${leafIndex}-measure-${valueSource.measureIndex}`,
                    kind: "value",
                    label: hasMultipleMeasures
                        ? `${pathLabel || `Coluna ${leafIndex + 1}`} ${measureName}`
                        : pathLabel || measureName,
                    path,
                    measureIndex: valueSource.measureIndex,
                    measureName,
                    valueIndex: (leafIndex * (matrix.valueSources || []).length) + valueSource.measureIndex,
                    source: valueSource.source
                });
            });
        });

        this.alignValueColumnIndexes(matrix, columns);
        return columns;
    }

    private createSummaryColumns(
        valueColumns: MatrixColumnModel[],
        valueSources: DisplayValueSource[],
        hasColumnGroups: boolean
    ): MatrixColumnModel[] {
        if (!hasColumnGroups || valueColumns.length === 0) {
            return [];
        }

        const totals = this.formattingSettings.totals;
        const measureColumns = valueSources.map((valueSource, displayIndex) => {
            const measureName = this.cleanDisplayName(valueSource.source.displayName || `Valor ${displayIndex + 1}`);
            return {
                source: valueSource.source,
                measureIndex: valueSource.measureIndex,
                measureName
            };
        });

        const summaryColumns: MatrixColumnModel[] = [];
        const hasMultipleMeasures = measureColumns.length > 1;

        if (totals.showRowTotal.value) {
            measureColumns.forEach((measure) => {
                const totalLabel = this.safeText(totals.rowTotalLabel.value, "Total");
                summaryColumns.push({
                    key: `total-measure-${measure.measureIndex}`,
                    kind: "rowTotal",
                    label: hasMultipleMeasures ? `${totalLabel} ${measure.measureName}` : totalLabel,
                    path: [totalLabel],
                    measureIndex: measure.measureIndex,
                    measureName: measure.measureName,
                    valueIndex: -1,
                    source: measure.source
                });
            });
        }

        if (totals.showPercentOfTotal.value) {
            measureColumns.forEach((measure) => {
                const percentLabel = this.safeText(totals.percentTotalLabel.value, "% do Total");
                summaryColumns.push({
                    key: `percent-measure-${measure.measureIndex}`,
                    kind: "percentTotal",
                    label: hasMultipleMeasures ? `${percentLabel} ${measure.measureName}` : percentLabel,
                    path: [percentLabel],
                    measureIndex: measure.measureIndex,
                    measureName: measure.measureName,
                    valueIndex: -1,
                    source: measure.source
                });
            });
        }

        return summaryColumns;
    }

    private createColumnHeaderRows(
        matrix: DataViewMatrix,
        columnNodes: DataViewMatrixNode[],
        valueSourceCount: number
    ): ColumnHeaderCell[][] {
        const depth = Math.max(1, matrix.columns.levels.length);
        const rows: ColumnHeaderCell[][] = Array.from({ length: depth }, () => []);
        const measureCount = Math.max(1, valueSourceCount);

        const visit = (node: DataViewMatrixNode, level: number): void => {
            const childNodes = node.children || [];
            const hasChildren = childNodes.length > 0;
            const leafCount = this.countColumnLeaves(node);
            const remainingDepth = Math.max(1, depth - level);

            rows[level].push({
                label: this.getNodeLabel(node, node.isSubtotal ? this.formattingSettings.totals.subtotalLabel.value : "", true),
                colspan: leafCount * measureCount,
                rowspan: hasChildren ? 1 : remainingDepth,
                isSubtotal: Boolean(node.isSubtotal)
            });

            childNodes.forEach((child) => visit(child, level + 1));
        };

        columnNodes.forEach((node) => visit(node, 0));
        return rows.filter((row) => row.length > 0);
    }

    private createRows(matrix: DataViewMatrix, rowLevelCount: number, valueColumns: MatrixColumnModel[]): MatrixRowModel[] {
        const rows: MatrixRowModel[] = [];
        const rootChildren = matrix.rows.root.children || [];

        rootChildren.forEach((node) => {
            this.appendRowNode(rows, matrix, node, [], [], rowLevelCount, valueColumns);
        });

        if (this.formattingSettings.totals.showGrandTotal.value) {
            const grandTotalValues = matrix.rows.root.values || this.aggregateNodesValues(rootChildren, valueColumns);

            const label = this.safeText(this.formattingSettings.totals.grandTotalLabel.value, "Total Geral");
            const labels = Array.from({ length: rowLevelCount }, () => "");
            labels[0] = label;
            rows.push({
                key: "grand-total",
                level: 0,
                labels,
                path: [label],
                values: grandTotalValues,
                hasChildren: false,
                isCollapsed: false,
                isSubtotal: false,
                isGrandTotal: true
            });
        }

        return rows;
    }

    private appendRowNode(
        rows: MatrixRowModel[],
        matrix: DataViewMatrix,
        node: DataViewMatrixNode,
        parentNodes: DataViewMatrixNode[],
        parentPath: string[],
        rowLevelCount: number,
        valueColumns: MatrixColumnModel[]
    ): void {
        if (node.isSubtotal && !this.formattingSettings.totals.showSubtotals.value) {
            return;
        }

        const level = Math.min(typeof node.level === "number" ? node.level : 0, rowLevelCount - 1);
        const label = this.getNodeLabel(node, node.isSubtotal ? this.formattingSettings.totals.subtotalLabel.value : "", false);
        const labels = Array.from({ length: rowLevelCount }, () => "");
        labels[level] = label;
        const path = node.isSubtotal ? [...parentPath, label] : [...parentPath, label];
        const selectionId = this.createMatrixSelectionId(matrix, [...parentNodes, node]);
        const hasChildren = Boolean((node.children && node.children.length > 0) || node.isCollapsed);
        const values = node.values || this.aggregateNodeValues(node, valueColumns);

        rows.push({
            key: selectionId ? selectionId.getKey() : path.join("|"),
            node,
            level,
            labels,
            path,
            values,
            selectionId,
            hasChildren,
            isCollapsed: Boolean(node.isCollapsed),
            isSubtotal: Boolean(node.isSubtotal),
            isGrandTotal: false
        });

        if (!node.isCollapsed && node.children) {
            const nextParents = [...parentNodes, node];
            const nextPath = node.isSubtotal ? parentPath : path;
            node.children.forEach((child) => this.appendRowNode(rows, matrix, child, nextParents, nextPath, rowLevelCount, valueColumns));
        }
    }

    private createMatrixSelectionId(matrix: DataViewMatrix, nodes: DataViewMatrixNode[]): ISelectionId | undefined {
        if (nodes.length === 0) {
            return undefined;
        }

        let builder = this.host.createSelectionIdBuilder();
        nodes.forEach((node) => {
            builder = builder.withMatrixNode(node, matrix.rows.levels);
        });

        return builder.createSelectionId();
    }

    private autoExpandCollapsedRows(model: MatrixModel): void {
        if (!this.formattingSettings.behavior.enableExpandCollapse.value) {
            return;
        }

        model.rows
            .filter((row) => Boolean(row.isCollapsed && row.selectionId))
            .forEach((row) => {
                const selectionId = row.selectionId;

                if (!selectionId) {
                    return;
                }

                const selectionKey = selectionId.getKey();

                if (this.autoExpandedKeys.has(selectionKey)) {
                    return;
                }

                this.autoExpandedKeys.add(selectionKey);
                this.selectionManager.toggleExpandCollapse(selectionId);
            });
    }

    private getCellValue(rowModel: MatrixRowModel, column: MatrixColumnModel): DataViewMatrixNodeValue | undefined {
        const values = rowModel.values;

        if (!values) {
            return undefined;
        }

        if (Object.prototype.hasOwnProperty.call(values, column.valueIndex)) {
            return values[column.valueIndex];
        }

        if (Object.prototype.hasOwnProperty.call(values, column.measureIndex)) {
            return values[column.measureIndex];
        }

        return undefined;
    }

    private getDisplayValue(
        rowModel: MatrixRowModel,
        column: MatrixColumnModel,
        model: MatrixModel
    ): PrimitiveValue | undefined {
        if (column.kind === "rowTotal") {
            return this.calculateRowTotal(rowModel, model.valueColumns, column.measureIndex);
        }

        if (column.kind === "percentTotal") {
            const rowTotal = this.calculateRowTotal(rowModel, model.valueColumns, column.measureIndex);
            const grandTotal = model.grandTotalsByMeasure[column.measureIndex] || 0;

            if (grandTotal === 0) {
                return undefined;
            }

            return rowTotal / grandTotal;
        }

        const valueNode = this.getCellValue(rowModel, column);
        return valueNode && valueNode.value;
    }

    private calculateRowTotal(rowModel: MatrixRowModel, valueColumns: MatrixColumnModel[], measureIndex: number): number {
        return valueColumns
            .filter((column) => column.measureIndex === measureIndex)
            .reduce((total, column) => total + this.getNumericColumnValue(rowModel, column), 0);
    }

    private calculateGrandTotalsByMeasure(
        rows: MatrixRowModel[],
        valueColumns: MatrixColumnModel[]
    ): { [measureIndex: number]: number } {
        const totals: { [measureIndex: number]: number } = {};
        const grandTotalRow = rows.find((row) => row.isGrandTotal);

        if (!grandTotalRow) {
            return totals;
        }

        valueColumns.forEach((column) => {
            totals[column.measureIndex] = (totals[column.measureIndex] || 0) + this.getNumericColumnValue(grandTotalRow, column);
        });

        return totals;
    }

    private aggregateNodeValues(
        node: DataViewMatrixNode,
        valueColumns: MatrixColumnModel[]
    ): { [id: number]: DataViewMatrixNodeValue } | undefined {
        if (!node.children || node.children.length === 0) {
            return node.values;
        }

        return this.aggregateNodesValues(node.children.filter((child) => !child.isSubtotal), valueColumns);
    }

    private aggregateNodesValues(
        nodes: DataViewMatrixNode[],
        valueColumns: MatrixColumnModel[]
    ): { [id: number]: DataViewMatrixNodeValue } | undefined {
        const aggregateValues: { [id: number]: DataViewMatrixNodeValue } = {};
        let hasValue = false;

        valueColumns.forEach((column) => {
            let total = 0;
            let foundColumnValue = false;

            nodes.forEach((node) => {
                const value = this.getNodeNumericValue(node, column);

                if (value !== undefined) {
                    total += value;
                    foundColumnValue = true;
                }
            });

            if (foundColumnValue) {
                aggregateValues[column.valueIndex] = {
                    value: total,
                    valueSourceIndex: column.measureIndex
                };
                hasValue = true;
            }
        });

        return hasValue ? aggregateValues : undefined;
    }

    private getNodeNumericValue(node: DataViewMatrixNode, column: MatrixColumnModel): number | undefined {
        const directValue = this.getNumericValueFromValues(node.values, column);

        if (directValue !== undefined) {
            return directValue;
        }

        if (!node.children || node.children.length === 0) {
            return undefined;
        }

        let total = 0;
        let hasValue = false;

        node.children
            .filter((child) => !child.isSubtotal)
            .forEach((child) => {
                const childValue = this.getNodeNumericValue(child, column);

                if (childValue !== undefined) {
                    total += childValue;
                    hasValue = true;
                }
            });

        return hasValue ? total : undefined;
    }

    private getNumericColumnValue(rowModel: MatrixRowModel, column: MatrixColumnModel): number {
        return this.getNumericValueFromValues(rowModel.values, column) || 0;
    }

    private getNumericValueFromValues(
        values: { [id: number]: DataViewMatrixNodeValue } | undefined,
        column: MatrixColumnModel
    ): number | undefined {
        if (!values) {
            return undefined;
        }

        const valueNode = Object.prototype.hasOwnProperty.call(values, column.valueIndex)
            ? values[column.valueIndex]
            : values[column.measureIndex];
        const value = valueNode && valueNode.value;

        return typeof value === "number" && Number.isFinite(value) ? value : undefined;
    }

    private alignValueColumnIndexes(matrix: DataViewMatrix, columns: MatrixColumnModel[]): void {
        const keysByMeasure = this.collectValueKeysByMeasure(matrix.rows.root, matrix.valueSources.length);

        matrix.valueSources.forEach((_source, measureIndex) => {
            const measureColumns = columns.filter((column) => column.measureIndex === measureIndex);
            const keys = keysByMeasure[measureIndex] || [];

            measureColumns.forEach((column, columnIndex) => {
                if (keys[columnIndex] !== undefined) {
                    column.valueIndex = keys[columnIndex];
                }
            });
        });
    }

    private collectValueKeysByMeasure(
        rootNode: DataViewMatrixNode,
        measureCount: number
    ): { [measureIndex: number]: number[] } {
        const keysByMeasure: { [measureIndex: number]: number[] } = {};

        for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
            keysByMeasure[measureIndex] = [];
        }

        const visit = (node: DataViewMatrixNode): void => {
            if (node.values) {
                Object.keys(node.values).forEach((key) => {
                    const keyIndex = Number(key);
                    const valueSourceIndex = node.values?.[keyIndex]?.valueSourceIndex || 0;

                    if (!Number.isFinite(keyIndex)) {
                        return;
                    }

                    if (!keysByMeasure[valueSourceIndex]) {
                        keysByMeasure[valueSourceIndex] = [];
                    }

                    if (!keysByMeasure[valueSourceIndex].includes(keyIndex)) {
                        keysByMeasure[valueSourceIndex].push(keyIndex);
                    }
                });
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(visit);
            }
        };

        visit(rootNode);
        Object.keys(keysByMeasure).forEach((measureIndex) => {
            keysByMeasure[Number(measureIndex)].sort((left, right) => left - right);
        });

        return keysByMeasure;
    }

    private getColumnLeaves(
        nodes: DataViewMatrixNode[],
        levels: powerbi.DataViewHierarchyLevel[]
    ): ColumnLeafModel[] {
        const leaves: ColumnLeafModel[] = [];
        const visit = (node: DataViewMatrixNode, parentPath: ColumnPathItem[]): void => {
            const pathItem = this.getColumnPathItem(node, levels);
            const nextPath = pathItem ? [...parentPath, pathItem] : parentPath;

            if (node.children && node.children.length > 0) {
                node.children.forEach((child) => visit(child, nextPath));
                return;
            }

            leaves.push({
                node,
                pathItems: nextPath
            });
        };

        nodes.forEach((node) => visit(node, []));
        return leaves;
    }

    private getColumnPathItem(
        node: DataViewMatrixNode,
        levels: powerbi.DataViewHierarchyLevel[]
    ): ColumnPathItem | undefined {
        const label = this.getNodeLabel(node, "", true);

        if (!label) {
            return undefined;
        }

        const level = typeof node.level === "number" ? levels[node.level] : undefined;
        const levelValue = node.levelValues && node.levelValues[0];
        const levelSourceIndex = levelValue?.levelSourceIndex || 0;
        const source = level?.sources && level.sources[levelSourceIndex]
            ? level.sources[levelSourceIndex]
            : level?.sources && level.sources[0];

        return {
            label,
            levelName: source ? this.cleanDisplayName(source.displayName || "") : ""
        };
    }

    private countColumnLeaves(node: DataViewMatrixNode): number {
        if (!node.children || node.children.length === 0) {
            return 1;
        }

        return node.children.reduce((total, child) => total + this.countColumnLeaves(child), 0);
    }

    private formatColumnPathLabel(pathItems: ColumnPathItem[]): string {
        if (pathItems.length === 0) {
            return "";
        }

        if (pathItems.length === 1) {
            return pathItems[0].label;
        }

        const yearItem = this.findColumnPathItem(pathItems, ["ano", "year"]);
        const quarterItem = this.findColumnPathItem(pathItems, ["trimestre", "quarter", "qtr"]);
        const monthItem = this.findColumnPathItem(pathItems, ["mes", "month"]);
        const dayItem = this.findColumnPathItem(pathItems, ["dia", "day"]);
        const year = yearItem ? this.extractYear(yearItem.label) : this.extractYearFromPath(pathItems);
        const monthIndex = monthItem ? this.extractMonthIndex(monthItem.label) : this.extractMonthIndexFromPath(pathItems);
        const quarter = quarterItem ? this.extractQuarterLabel(quarterItem.label) : this.extractQuarterFromPath(pathItems);
        const day = dayItem ? this.extractDay(dayItem.label) : undefined;

        if (year && monthIndex !== undefined) {
            const monthLabel = this.getMonthShortName(monthIndex);
            return day && day > 1 ? `${String(day).padStart(2, "0")}/${monthLabel}/${year}` : `${monthLabel}/${year}`;
        }

        if (year && quarter) {
            return `${quarter}/${year}`;
        }

        if (year) {
            return String(year);
        }

        if (monthIndex !== undefined) {
            return this.getMonthShortName(monthIndex);
        }

        return pathItems
            .map((item) => item.label)
            .filter((label) => Boolean(label))
            .join(" / ");
    }

    private findColumnPathItem(pathItems: ColumnPathItem[], acceptedLevelNames: string[]): ColumnPathItem | undefined {
        return pathItems.find((item) => {
            const normalizedLevelName = this.normalizeText(item.levelName);
            return acceptedLevelNames.some((acceptedName) => normalizedLevelName.includes(acceptedName));
        });
    }

    private extractYearFromPath(pathItems: ColumnPathItem[]): number | undefined {
        for (const item of pathItems) {
            const year = this.extractYear(item.label);

            if (year) {
                return year;
            }
        }

        return undefined;
    }

    private extractMonthIndexFromPath(pathItems: ColumnPathItem[]): number | undefined {
        for (const item of pathItems) {
            if (!/[a-z]/.test(this.normalizeText(item.label))) {
                continue;
            }

            const monthIndex = this.extractMonthIndex(item.label);

            if (monthIndex !== undefined) {
                return monthIndex;
            }
        }

        return undefined;
    }

    private extractQuarterFromPath(pathItems: ColumnPathItem[]): string | undefined {
        for (const item of pathItems) {
            const quarter = this.extractQuarterLabel(item.label);

            if (quarter) {
                return quarter;
            }
        }

        return undefined;
    }

    private extractYear(label: string): number | undefined {
        const match = label.match(/\b(19|20|21)\d{2}\b/);

        if (!match) {
            return undefined;
        }

        return Number(match[0]);
    }

    private extractMonthIndex(label: string): number | undefined {
        const normalizedLabel = this.normalizeText(label);
        const monthNames = [
            ["jan", "janeiro", "january"],
            ["fev", "fevereiro", "feb", "february"],
            ["mar", "marco", "march"],
            ["abr", "abril", "apr", "april"],
            ["mai", "maio", "may"],
            ["jun", "junho", "june"],
            ["jul", "julho", "july"],
            ["ago", "agosto", "aug", "august"],
            ["set", "setembro", "sep", "september"],
            ["out", "outubro", "oct", "october"],
            ["nov", "novembro", "november"],
            ["dez", "dezembro", "dec", "december"]
        ];

        const namedMonthIndex = monthNames.findIndex((names) => names.some((name) => normalizedLabel.includes(name)));

        if (namedMonthIndex >= 0) {
            return namedMonthIndex;
        }

        const numericMonth = Number(normalizedLabel.replace(/\D/g, ""));

        if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
            return numericMonth - 1;
        }

        return undefined;
    }

    private extractQuarterLabel(label: string): string | undefined {
        const normalizedLabel = this.normalizeText(label);
        const match = normalizedLabel.match(/(?:trimestre|quarter|qtr|tri|t|q)\s*([1-4])/);

        if (!match) {
            return undefined;
        }

        return `T${match[1]}`;
    }

    private extractDay(label: string): number | undefined {
        const day = Number(this.normalizeText(label).replace(/\D/g, ""));

        if (Number.isInteger(day) && day >= 1 && day <= 31) {
            return day;
        }

        return undefined;
    }

    private getRowHeaderNames(matrix: DataViewMatrix, rowLevelCount: number): string[] {
        return Array.from({ length: rowLevelCount }, (_item, index) => {
            const level = matrix.rows.levels[index];
            const firstSource = level && level.sources && level.sources[0];
            return firstSource ? this.cleanDisplayName(firstSource.displayName || `Linha ${index + 1}`) : `Linha ${index + 1}`;
        });
    }

    private getRowHeaderLabel(rowHeaderNames: string[]): string {
        if (rowHeaderNames.length === 0) {
            return "Linhas";
        }

        return rowHeaderNames.join(" / ");
    }

    private getNodeLabel(node: DataViewMatrixNode, fallback: string, isColumn: boolean): string {
        if (node.levelValues && node.levelValues.length > 0) {
            const values = node.levelValues
                .map((levelValue) => this.formatLabelPrimitive(levelValue.value, isColumn))
                .filter((value) => value.length > 0);

            if (values.length > 0) {
                return values.join(" / ");
            }
        }

        const value = this.formatLabelPrimitive(node.value, isColumn);
        return this.safeText(value, fallback || "Total");
    }

    private getRowClassName(rowModel: MatrixRowModel, rowIndex: number): string {
        const classNames = ["mm-row"];

        if (rowModel.selectionId) {
            const selectionKey = rowModel.selectionId.getKey();
            classNames.push("mm-selectable-row");

            if (this.selectedKeys.has(selectionKey)) {
                classNames.push("mm-row-selected");
            }
        }

        if (rowModel.isSubtotal) {
            classNames.push("mm-subtotal-row");
        }

        if (rowModel.hasChildren && !rowModel.isSubtotal && !rowModel.isGrandTotal) {
            classNames.push("mm-group-row");
        }

        if (rowModel.isGrandTotal) {
            classNames.push("mm-grand-total-row");
        }

        if (this.formattingSettings.matrixStyle.showZebraRows.value && rowIndex % 2 === 1) {
            classNames.push("mm-zebra-row");
        }

        return classNames.join(" ");
    }

    private getRowIndent(rowModel: MatrixRowModel): number {
        if (rowModel.isGrandTotal) {
            return 0;
        }

        return Math.max(0, rowModel.level * 18);
    }

    private formatColumnValue(value: PrimitiveValue | undefined, column: MatrixColumnModel): string {
        if (column.kind === "percentTotal") {
            return this.formatPercentValue(value);
        }

        return this.formatPrimitiveValue(value, column.source);
    }

    private formatPercentValue(value: PrimitiveValue | undefined): string {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            return this.formattingSettings.valuesFormat.blankValueText.value;
        }

        const decimalPlaces = Math.floor(this.clampNumber(this.formattingSettings.valuesFormat.percentDecimalPlaces.value, 0, 4));
        const formatted = new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        }).format(value * 100);

        return `${formatted}%`;
    }

    private formatPrimitiveValue(value: PrimitiveValue | undefined, source: powerbi.DataViewMetadataColumn): string {
        if (value === null || value === undefined) {
            return this.formattingSettings.valuesFormat.blankValueText.value;
        }

        if (typeof value === "number") {
            return this.formatNumber(value, source);
        }

        if (value instanceof Date) {
            return new Intl.DateTimeFormat("pt-BR").format(value);
        }

        return String(value);
    }

    private formatNumber(value: number, source: powerbi.DataViewMetadataColumn): string {
        const formatType = this.getFormatType(source);
        const decimalPlaces = Math.floor(this.clampNumber(this.formattingSettings.valuesFormat.decimalPlaces.value, 0, 8));
        const displayUnit = this.getDisplayUnit();
        const scaled = this.scaleValue(value, displayUnit);
        const formatted = new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        }).format(formatType === "percent" && Math.abs(value) <= 1 ? value * 100 : scaled.value);

        if (formatType === "currency") {
            return `${this.safeText(this.formattingSettings.valuesFormat.currencySymbol.value, "R$")} ${formatted}${scaled.suffix}`;
        }

        if (formatType === "percent") {
            return `${formatted}%`;
        }

        return `${formatted}${scaled.suffix}`;
    }

    private getFormatType(source: powerbi.DataViewMetadataColumn): ValueFormatType {
        const configured = String(this.formattingSettings.valuesFormat.formatType.value.value) as ValueFormatType;

        if (configured !== "auto") {
            return configured;
        }

        const format = source.format || "";

        if (format.includes("%")) {
            return "percent";
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

    private cleanDisplayName(displayName: string): string {
        return displayName
            .replace(/^(Soma de|Sum of|Media de|Média de|Average of|Contagem de|Count of|Maximo de|Máximo de|Maximum of|Minimo de|Mínimo de|Minimum of)\s+/i, "")
            .trim();
    }

    private formatPrimitive(value: PrimitiveValue | undefined): string {
        if (value === null || value === undefined) {
            return "";
        }

        if (value instanceof Date) {
            return new Intl.DateTimeFormat("pt-BR").format(value);
        }

        return String(value);
    }

    private formatLabelPrimitive(value: PrimitiveValue | undefined, isColumn: boolean): string {
        if (value === null || value === undefined) {
            return "";
        }

        if (isColumn) {
            const date = this.tryGetDate(value);

            if (date) {
                return this.formatMonthYear(date);
            }
        }

        return this.formatPrimitive(value);
    }

    private tryGetDate(value: PrimitiveValue): Date | undefined {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
        }

        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            const parsed = new Date(value);

            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        return undefined;
    }

    private formatMonthYear(date: Date): string {
        return `${this.getMonthShortName(date.getMonth())}/${date.getFullYear()}`;
    }

    private getMonthShortName(monthIndex: number): string {
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return monthNames[monthIndex] || "";
    }

    private normalizeText(value: string): string {
        return this.safeText(value, "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    private applyRootStyles(): void {
        const layout = this.formattingSettings.layout;
        const matrixStyle = this.formattingSettings.matrixStyle;
        this.root.style.setProperty("--mm-bg", this.color(layout.backgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mm-border", this.color(layout.borderColor.value.value, "#E3E8F3"));
        this.root.style.setProperty("--mm-radius", `${this.clampNumber(layout.borderRadius.value, 0, 36)}px`);
        this.root.style.setProperty("--mm-padding", `${this.clampNumber(layout.padding.value, 8, 42)}px`);
        this.root.style.setProperty("--mm-font-family", this.safeText(layout.fontFamily.value, "Segoe UI"));
        this.root.style.setProperty("--mm-header-bg", this.color(matrixStyle.headerBackgroundColor.value.value, "#F8FAFF"));
        this.root.style.setProperty("--mm-row-header-bg", this.color(matrixStyle.rowHeaderBackgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mm-stripe-bg", this.color(matrixStyle.stripeBackgroundColor.value.value, "#FBFCFF"));
        this.root.style.setProperty("--mm-subtotal-bg", this.color(matrixStyle.subtotalBackgroundColor.value.value, "#F6F2FF"));
        this.root.style.setProperty("--mm-grand-total-bg", this.color(matrixStyle.grandTotalBackgroundColor.value.value, "#F2F5FF"));
        this.root.style.setProperty("--mm-text", this.color(matrixStyle.textColor.value.value, "#0F1733"));
        this.root.style.setProperty("--mm-muted", this.color(matrixStyle.mutedColor.value.value, "#66708F"));
        this.root.style.setProperty("--mm-accent", this.color(matrixStyle.accentColor.value.value, "#5B4DFF"));
        this.root.style.setProperty("--mm-grid", this.color(matrixStyle.gridColor.value.value, "#E6EAF3"));
        this.root.style.setProperty("--mm-font-size", `${this.clampNumber(matrixStyle.fontSize.value, 8, 24)}px`);
        this.root.style.setProperty("--mm-header-font-size", `${this.clampNumber(matrixStyle.headerFontSize.value, 8, 24)}px`);
        this.root.style.setProperty("--mm-row-height", `${this.clampNumber(matrixStyle.rowHeight.value, 28, 90)}px`);
        this.root.style.setProperty("--mm-row-header-width", `${this.clampNumber(matrixStyle.rowHeaderMinWidth.value, 90, 360)}px`);
        this.root.style.setProperty("--mm-value-width", `${this.clampNumber(matrixStyle.valueColumnMinWidth.value, 74, 260)}px`);
        this.root.classList.toggle("mm-no-grid", !matrixStyle.showGrid.value);
    }

    private renderEmpty(message: string): void {
        this.clearRoot();
        this.applyRootStyles();

        const empty = document.createElement("div");
        empty.className = "mm-empty";
        empty.textContent = message;
        this.root.appendChild(empty);
    }

    private clearRoot(): void {
        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }
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
