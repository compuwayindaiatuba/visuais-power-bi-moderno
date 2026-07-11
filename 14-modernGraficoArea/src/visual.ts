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

type ChartType = "area" | "stacked" | "stacked100";
type LineShape = "smooth" | "straight";
type MarkerShape = "circle" | "square" | "diamond" | "none";
type SeriesRole = "primary" | "secondary";

interface ColumnIndexes {
    categoryIndex: number;
    legendIndex?: number;
    selectorIndex?: number;
    smallMultipleIndex?: number;
    tooltipIndexes: number[];
    valueIndexes: number[];
    secondaryValueIndexes: number[];
}

interface SeriesDefinition {
    displayName: string;
    index: number;
    role: SeriesRole;
}

interface SourceRow {
    categoryLabel: string;
    legendLabel: string;
    panelLabel: string;
    selectorLabel: string;
    tooltipText: string;
    values: Map<number, number | undefined>;
}

interface ChartSeries {
    color: string;
    displayLabel: string;
    gradientColor: string;
    key: string;
    role: SeriesRole;
    tooltips: string[];
    values: Array<number | undefined>;
}

interface ChartPanel {
    categoryLabels: string[];
    key: string;
    label: string;
    series: ChartSeries[];
}

interface DataModel {
    activeSelectorLabel: string;
    panels: ChartPanel[];
    selectorLabels: string[];
    seriesLabels: Array<{ color: string; label: string }>;
}

interface Point {
    x: number;
    y: number;
}

interface RenderPoint {
    baseY: number;
    categoryLabel: string;
    displayValue: number;
    rawValue: number;
    tooltipText: string;
    x: number;
    y: number;
}

interface RenderSeries {
    color: string;
    gradientColor: string;
    label: string;
    points: RenderPoint[];
    role: SeriesRole;
}

interface Domain {
    max: number;
    min: number;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const DEFAULT_COLORS = ["#6652F0", "#21A7FF", "#22C55E", "#F59E0B", "#EC4899", "#14B8A6"];

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly root: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private lastDataView?: powerbi.DataView;
    private lastViewport?: powerbi.IViewport;
    private selectedSelectorLabel: string = "";

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.root = document.createElement("div");
        this.root.className = "mag-root";
        options.element.classList.add("modern-area-host");
        options.element.appendChild(this.root);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews && options.dataViews[0];
            this.lastDataView = dataView;
            this.lastViewport = options.viewport;
            this.formattingSettings = dataView
                ? this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView)
                : new VisualFormattingSettingsModel();

            if (!shouldShowVisualForMenu(dataView, {
                enabled: this.formattingSettings.menuFilter.enabled.value,
                menuName: this.formattingSettings.menuFilter.menuName.value
            })) {
                hideVisualElement(this.root);
                this.events.renderingFinished(options);
                return;
            }

            showVisualElement(this.root);
            this.render(dataView, options.viewport);
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

    private render(dataView: powerbi.DataView | undefined, viewport: powerbi.IViewport): void {
        this.clearRoot();
        this.applyRootStyles();

        const card = document.createElement("div");
        card.className = "mag-card";
        const model = this.buildDataModel(dataView?.table);

        card.appendChild(this.renderHeader(model));

        if (model.panels.length === 0) {
            card.appendChild(this.renderEmpty("Adicione uma Categoria e pelo menos uma medida em Valores."));
            this.root.appendChild(card);
            return;
        }

        const legendPosition = this.getLegendPosition();

        if (legendPosition === "top") {
            card.appendChild(this.renderLegend(model.seriesLabels, false));
        }

        card.appendChild(this.renderPanels(model, viewport));

        if (legendPosition === "bottom") {
            card.appendChild(this.renderLegend(model.seriesLabels, true));
        }

        this.root.appendChild(card);
    }

    private renderHeader(model: DataModel): HTMLElement {
        const header = document.createElement("div");
        header.className = "mag-header";

        if (this.formattingSettings.title.show.value) {
            header.appendChild(this.renderTitle());
        }

        if (this.shouldShowSelector(model)) {
            header.appendChild(this.renderSelector(model));
        }

        return header;
    }

    private renderTitle(): HTMLElement {
        const titleSettings = this.formattingSettings.title;
        const title = document.createElement("h2");
        title.className = "mag-title";
        title.style.color = this.color(titleSettings.color.value.value, "#141D45");
        title.style.fontSize = `${this.clampNumber(titleSettings.fontSize.value, 9, 32)}px`;
        title.style.fontWeight = String(titleSettings.fontWeight.value.value);
        title.textContent = this.safeText(titleSettings.text.value, "Titulo Grafico");
        return title;
    }

    private renderSelector(model: DataModel): HTMLElement {
        const select = document.createElement("select");
        select.className = "mag-selector";
        select.title = "Selecionar categoria";
        select.value = model.activeSelectorLabel;

        model.selectorLabels.forEach((label) => {
            const option = document.createElement("option");
            option.value = label;
            option.textContent = label;
            option.selected = label === model.activeSelectorLabel;
            select.appendChild(option);
        });

        select.addEventListener("change", () => {
            this.selectedSelectorLabel = select.value;

            if (this.lastViewport) {
                this.render(this.lastDataView, this.lastViewport);
            }
        });

        return select;
    }

    private shouldShowSelector(model: DataModel): boolean {
        return this.getChartType() === "area" && model.selectorLabels.length > 1;
    }

    private renderLegend(seriesLabels: Array<{ color: string; label: string }>, bottom: boolean): HTMLElement {
        const legend = document.createElement("div");
        legend.className = bottom ? "mag-legend mag-legend-bottom" : "mag-legend";
        legend.style.fontSize = `${this.clampNumber(this.formattingSettings.legendStyle.fontSize.value, 8, 22)}px`;

        seriesLabels.slice(0, 16).forEach((series) => {
            const item = document.createElement("div");
            item.className = "mag-legend-item";

            const dot = document.createElement("span");
            dot.className = "mag-legend-dot";
            dot.style.background = series.color;
            item.appendChild(dot);

            const label = document.createElement("span");
            label.className = "mag-legend-label";
            label.textContent = series.label;
            item.appendChild(label);

            legend.appendChild(item);
        });

        return legend;
    }

    private renderPanels(model: DataModel, viewport: powerbi.IViewport): HTMLElement {
        const panels = document.createElement("div");
        const panelCount = model.panels.length;
        const multipleSettings = this.formattingSettings.smallMultipleStyle;
        const columnCount = panelCount > 1
            ? this.clampNumber(multipleSettings.columns.value, 1, 6)
            : 1;
        const gap = panelCount > 1 ? this.clampNumber(multipleSettings.gap.value, 0, 40) : 0;
        const chartArea = this.getPanelSize(viewport, panelCount, columnCount, gap);

        panels.className = "mag-panels";
        panels.style.gap = `${gap}px`;
        panels.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;

        model.panels.forEach((panel, panelIndex) => {
            const panelNode = document.createElement("div");
            panelNode.className = "mag-panel";

            if (panelCount > 1 && multipleSettings.showTitles.value) {
                const title = document.createElement("div");
                title.className = "mag-panel-title";
                title.style.color = this.color(multipleSettings.titleColor.value.value, "#141D45");
                title.textContent = panel.label;
                panelNode.appendChild(title);
            }

            const chartWrap = document.createElement("div");
            const tooltip = document.createElement("div");
            chartWrap.className = "mag-chart-wrap";
            chartWrap.style.minHeight = `${Math.max(chartArea.height, 80)}px`;
            tooltip.className = "mag-tooltip";
            chartWrap.appendChild(this.renderChartSvg(panel, panelIndex, chartArea.width, chartArea.height, tooltip));
            chartWrap.appendChild(tooltip);
            panelNode.appendChild(chartWrap);
            panels.appendChild(panelNode);
        });

        return panels;
    }

    private renderChartSvg(panel: ChartPanel, panelIndex: number, width: number, height: number, tooltip: HTMLElement): SVGSVGElement {
        const svg = this.createSvg("svg");
        const chartWidth = Math.max(width, 220);
        const chartHeight = Math.max(height, 120);
        const hasSecondary = panel.series.some((series) => series.role === "secondary");
        const margin = {
            bottom: this.getBottomMargin(),
            left: this.getLeftMargin(),
            right: this.getRightMargin(hasSecondary),
            top: 12
        };
        const plot = {
            height: Math.max(chartHeight - margin.top - margin.bottom, 30),
            width: Math.max(chartWidth - margin.left - margin.right, 40),
            x: margin.left,
            y: margin.top
        };
        const chartType = this.getChartType();
        const primaryDomain = this.getPrimaryDomain(panel, chartType);
        const secondaryDomain = this.getSecondaryDomain(panel);
        const renderSeries = this.getRenderSeries(panel, plot, primaryDomain, secondaryDomain, chartType);

        svg.classList.add("mag-svg");
        svg.setAttribute("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
        svg.setAttribute("preserveAspectRatio", "none");

        const defs = this.createSvg("defs");
        svg.appendChild(defs);

        renderSeries.forEach((series, seriesIndex) => {
            this.appendGradient(defs, panelIndex, seriesIndex, series.color, series.gradientColor);
        });

        this.renderAxes(svg, panel, plot, primaryDomain, secondaryDomain, hasSecondary);
        this.renderSeries(svg, renderSeries, panelIndex, tooltip);
        return svg;
    }

    private renderAxes(
        svg: SVGSVGElement,
        panel: ChartPanel,
        plot: { height: number; width: number; x: number; y: number },
        primaryDomain: Domain,
        secondaryDomain: Domain,
        hasSecondary: boolean
    ): void {
        const axisSettings = this.formattingSettings.axis;
        const tickCount = 5;
        const fontSize = this.clampNumber(axisSettings.fontSize.value, 8, 20);

        for (let index = 0; index <= tickCount; index += 1) {
            const ratio = index / tickCount;
            const y = plot.y + plot.height - ratio * plot.height;
            const value = primaryDomain.min + ratio * (primaryDomain.max - primaryDomain.min);

            if (axisSettings.showGrid.value) {
                const grid = this.createSvg("line");
                grid.classList.add("mag-grid-line");
                grid.setAttribute("x1", String(plot.x));
                grid.setAttribute("x2", String(plot.x + plot.width));
                grid.setAttribute("y1", String(y));
                grid.setAttribute("y2", String(y));
                svg.appendChild(grid);
            }

            if (axisSettings.showY.value) {
                const label = this.createAxisText(plot.x - 8, y + 4, this.formatAxisValue(value, primaryDomain), fontSize, "end");
                svg.appendChild(label);
            }

            if (hasSecondary && axisSettings.showSecondaryY.value) {
                const secondaryValue = secondaryDomain.min + ratio * (secondaryDomain.max - secondaryDomain.min);
                const label = this.createAxisText(plot.x + plot.width + 8, y + 4, this.formatNumber(secondaryValue), fontSize, "start");
                svg.appendChild(label);
            }
        }

        if (axisSettings.showX.value) {
            const step = this.clampNumber(axisSettings.xLabelStep.value, 1, 100);
            const lastIndex = panel.categoryLabels.length - 1;
            const rotation = this.clampNumber(axisSettings.xLabelRotation.value, 0, 90);
            const maxLength = this.clampNumber(axisSettings.xLabelMaxLength.value, 3, 40);

            panel.categoryLabels.forEach((labelText, index) => {
                if (index % step !== 0 && index !== lastIndex) {
                    return;
                }

                const x = this.getX(index, panel.categoryLabels.length, plot);
                const anchor = rotation > 0 ? "end" : "middle";
                const label = this.createAxisText(x, plot.y + plot.height + 22, this.truncate(labelText, maxLength), fontSize, anchor);

                if (rotation > 0) {
                    label.setAttribute("transform", `rotate(-${rotation} ${x} ${plot.y + plot.height + 22})`);
                }

                svg.appendChild(label);
            });
        }

        this.renderAxisTitles(svg, plot, hasSecondary);
    }

    private renderSeries(svg: SVGSVGElement, renderSeries: RenderSeries[], panelIndex: number, tooltip: HTMLElement): void {
        const lineWidth = this.clampNumber(this.formattingSettings.areaStyle.lineWidth.value, 1, 8);
        const markerShape = String(this.formattingSettings.markers.shape.value.value) as MarkerShape;
        const markerSize = this.clampNumber(this.formattingSettings.markers.size.value, 2, 16);
        const showMarkers = this.formattingSettings.markers.show.value && markerShape !== "none";

        renderSeries.forEach((series, seriesIndex) => {
            if (series.points.length === 0) {
                return;
            }

            const area = this.createSvg("path");
            area.classList.add("mag-area");
            area.setAttribute("d", this.createAreaPath(series.points));
            area.setAttribute("fill", this.getAreaFill(panelIndex, seriesIndex, series.color));
            area.setAttribute("stroke", "none");
            svg.appendChild(area);

            const line = this.createSvg("path");
            line.classList.add("mag-line");
            line.setAttribute("d", this.createLinePath(series.points));
            line.setAttribute("stroke", series.color);
            line.setAttribute("stroke-width", String(lineWidth));
            line.setAttribute("stroke-linecap", "round");
            line.setAttribute("stroke-linejoin", "round");
            svg.appendChild(line);

            const hitLine = this.createSvg("path");
            hitLine.classList.add("mag-hit-line");
            hitLine.setAttribute("d", this.createLinePath(series.points));
            hitLine.setAttribute("stroke-width", String(Math.max(12, lineWidth + 8)));
            this.bindTooltip(hitLine, svg, tooltip, series);
            svg.appendChild(hitLine);

            if (showMarkers) {
                series.points.forEach((point) => {
                    svg.appendChild(this.createMarker(point, markerShape, markerSize, series.color, series.label, tooltip, svg, series));
                });
            } else {
                series.points.forEach((point) => {
                    const hitPoint = this.createHitPoint(point);
                    this.bindTooltip(hitPoint, svg, tooltip, series, point);
                    svg.appendChild(hitPoint);
                });
            }

            if (this.formattingSettings.chart.showEndpointLabel.value) {
                this.appendEndpointLabel(svg, series);
            }
        });
    }

    private buildDataModel(table: powerbi.DataViewTable | undefined): DataModel {
        if (!table || !table.rows || table.rows.length === 0) {
            return { activeSelectorLabel: "", panels: [], selectorLabels: [], seriesLabels: [] };
        }

        const indexes = this.getColumnIndexes(table);

        if (!indexes || indexes.valueIndexes.length + indexes.secondaryValueIndexes.length === 0) {
            return { activeSelectorLabel: "", panels: [], selectorLabels: [], seriesLabels: [] };
        }

        const definitions = this.getSeriesDefinitions(table, indexes);
        const chartType = this.getChartType();
        const sourceRows = this.getSourceRows(table, indexes, chartType);
        const selectorLabels = this.getSelectorLabels(sourceRows);
        const activeSelectorLabel = this.resolveActiveSelector(selectorLabels, chartType);
        const rows = activeSelectorLabel
            ? sourceRows.filter((row) => row.selectorLabel === activeSelectorLabel)
            : sourceRows;
        const panelsByKey = new Map<string, ChartPanel>();
        const seriesLabelMap = new Map<string, { color: string; gradientColor: string; label: string }>();

        rows.forEach((row) => {
            const panelKey = this.normalizeKey(row.panelLabel);
            let panel = panelsByKey.get(panelKey);

            if (!panel) {
                panel = {
                    categoryLabels: [],
                    key: panelKey,
                    label: row.panelLabel,
                    series: []
                };
                panelsByKey.set(panelKey, panel);
            }

            let categoryIndex = panel.categoryLabels.findIndex((category) => category === row.categoryLabel);

            if (categoryIndex < 0) {
                panel.categoryLabels.push(row.categoryLabel);
                categoryIndex = panel.categoryLabels.length - 1;
                panel.series.forEach((series) => {
                    series.tooltips.push("");
                    series.values.push(undefined);
                });
            }

            definitions.forEach((definition) => {
                const value = row.values.get(definition.index);

                if (value === undefined) {
                    return;
                }

                const seriesKey = this.getSeriesKey(definition, row.legendLabel);
                let series = panel.series.find((item) => item.key === seriesKey);

                if (!series) {
                    const storedSeries = seriesLabelMap.get(seriesKey);
                    const colorIndex = seriesLabelMap.size;
                    const color = storedSeries ? storedSeries.color : this.getSeriesColor(colorIndex);
                    const gradientColor = storedSeries ? storedSeries.gradientColor : this.getSeriesGradientColor(colorIndex);
                    series = {
                        color,
                        displayLabel: this.getSeriesLabel(definition, row.legendLabel),
                        gradientColor,
                        key: seriesKey,
                        role: definition.role,
                        tooltips: new Array(panel.categoryLabels.length).fill(""),
                        values: new Array(panel.categoryLabels.length).fill(undefined)
                    };
                    panel.series.push(series);
                    seriesLabelMap.set(seriesKey, { color: series.color, gradientColor: series.gradientColor, label: series.displayLabel });
                }

                const currentValue = series.values[categoryIndex] || 0;
                series.values[categoryIndex] = currentValue + value;
                series.tooltips[categoryIndex] = this.mergeTooltipText(series.tooltips[categoryIndex], row.tooltipText);
            });
        });

        return {
            activeSelectorLabel,
            panels: Array.from(panelsByKey.values()),
            selectorLabels,
            seriesLabels: Array.from(seriesLabelMap.values())
        };
    }

    private getColumnIndexes(table: powerbi.DataViewTable): ColumnIndexes | undefined {
        const categoryIndexes = this.getIndexesForRole(table, "category");
        const categoryIndex = categoryIndexes[0];

        if (categoryIndex === undefined) {
            return undefined;
        }

        return {
            categoryIndex,
            legendIndex: this.getFirstIndexForRole(table, "legend"),
            secondaryValueIndexes: this.getIndexesForRole(table, "secondaryValues"),
            selectorIndex: categoryIndexes[1],
            smallMultipleIndex: this.getFirstIndexForRole(table, "smallMultiples"),
            tooltipIndexes: this.getIndexesForRole(table, "tooltips"),
            valueIndexes: this.getIndexesForRole(table, "values")
        };
    }

    private getSeriesDefinitions(table: powerbi.DataViewTable, indexes: ColumnIndexes): SeriesDefinition[] {
        const primary = indexes.valueIndexes.map((index) => ({
            displayName: table.columns[index].displayName || "Valor",
            index,
            role: "primary" as SeriesRole
        }));
        const secondary = indexes.secondaryValueIndexes.map((index) => ({
            displayName: table.columns[index].displayName || "Valor secundario",
            index,
            role: "secondary" as SeriesRole
        }));

        return [...primary, ...secondary];
    }

    private getSourceRows(table: powerbi.DataViewTable, indexes: ColumnIndexes, chartType: ChartType): SourceRow[] {
        return table.rows
            .map((row) => {
                const categoryLabel = this.safeText(this.formatPrimitive(row[indexes.categoryIndex]), "");

                if (!categoryLabel) {
                    return undefined;
                }

                const values = new Map<number, number | undefined>();
                [...indexes.valueIndexes, ...indexes.secondaryValueIndexes].forEach((index) => {
                    values.set(index, this.parseNumber(row[index]));
                });
                const selectorLabel = indexes.selectorIndex === undefined
                    ? ""
                    : this.safeText(this.formatPrimitive(row[indexes.selectorIndex]), "");
                const fieldLegendLabel = indexes.legendIndex === undefined
                    ? ""
                    : this.safeText(this.formatPrimitive(row[indexes.legendIndex]), "");

                return {
                    categoryLabel,
                    legendLabel: this.resolveLegendLabel(fieldLegendLabel, selectorLabel, chartType),
                    panelLabel: indexes.smallMultipleIndex === undefined
                        ? "Geral"
                        : this.safeText(this.formatPrimitive(row[indexes.smallMultipleIndex]), "Geral"),
                    selectorLabel,
                    tooltipText: this.getTooltipText(row, indexes, table),
                    values
                };
            })
            .filter((row): row is SourceRow => row !== undefined);
    }

    private resolveLegendLabel(fieldLegendLabel: string, selectorLabel: string, chartType: ChartType): string {
        if (chartType === "area" || !selectorLabel) {
            return fieldLegendLabel;
        }

        return fieldLegendLabel ? `${selectorLabel} - ${fieldLegendLabel}` : selectorLabel;
    }

    private getSelectorLabels(rows: SourceRow[]): string[] {
        const labels: string[] = [];

        rows.forEach((row) => {
            if (row.selectorLabel && !labels.includes(row.selectorLabel)) {
                labels.push(row.selectorLabel);
            }
        });

        return labels;
    }

    private resolveActiveSelector(selectorLabels: string[], chartType: ChartType): string {
        if (chartType !== "area" || selectorLabels.length === 0) {
            return "";
        }

        if (this.selectedSelectorLabel && selectorLabels.includes(this.selectedSelectorLabel)) {
            return this.selectedSelectorLabel;
        }

        this.selectedSelectorLabel = selectorLabels[0];
        return selectorLabels[0];
    }

    private getTooltipText(row: PrimitiveValue[], indexes: ColumnIndexes, table: powerbi.DataViewTable): string {
        return indexes.tooltipIndexes
            .map((index) => `${table.columns[index].displayName}: ${this.formatPrimitive(row[index])}`)
            .join("\n");
    }

    private mergeTooltipText(currentText: string, newText: string): string {
        if (!newText) {
            return currentText;
        }

        if (!currentText) {
            return newText;
        }

        return currentText.includes(newText) ? currentText : `${currentText}\n${newText}`;
    }

    private getRenderSeries(
        panel: ChartPanel,
        plot: { height: number; width: number; x: number; y: number },
        primaryDomain: Domain,
        secondaryDomain: Domain,
        chartType: ChartType
    ): RenderSeries[] {
        const renderSeries: RenderSeries[] = [];
        const primarySeries = panel.series.filter((series) => series.role === "primary");
        const secondarySeries = panel.series.filter((series) => series.role === "secondary");
        const primaryCumulated = new Array(panel.categoryLabels.length).fill(0);

        primarySeries.forEach((series) => {
            const points: RenderPoint[] = [];

            series.values.forEach((value, index) => {
                const rawValue = value || 0;
                const x = this.getX(index, panel.categoryLabels.length, plot);
                let displayValue = rawValue;
                let baseValue = 0;

                if (chartType === "stacked" || chartType === "stacked100") {
                    const total = this.getPrimaryTotal(primarySeries, index);
                    const normalizedValue = chartType === "stacked100" && total !== 0 ? rawValue / total * 100 : rawValue;
                    baseValue = primaryCumulated[index];
                    displayValue = normalizedValue;
                    primaryCumulated[index] += normalizedValue;
                }

                points.push({
                    baseY: this.getY(baseValue, primaryDomain, plot),
                    categoryLabel: panel.categoryLabels[index],
                    displayValue,
                    rawValue,
                    tooltipText: series.tooltips[index] || "",
                    x,
                    y: this.getY(baseValue + displayValue, primaryDomain, plot)
                });
            });

            renderSeries.push({
                color: series.color,
                gradientColor: series.gradientColor,
                label: series.displayLabel,
                points,
                role: series.role
            });
        });

        secondarySeries.forEach((series) => {
            const points = series.values.map((value, index) => {
                const rawValue = value || 0;
                return {
                    baseY: this.getY(secondaryDomain.min, secondaryDomain, plot),
                    categoryLabel: panel.categoryLabels[index],
                    displayValue: rawValue,
                    rawValue,
                    tooltipText: series.tooltips[index] || "",
                    x: this.getX(index, panel.categoryLabels.length, plot),
                    y: this.getY(rawValue, secondaryDomain, plot)
                };
            });

            renderSeries.push({
                color: series.color,
                gradientColor: series.gradientColor,
                label: series.displayLabel,
                points,
                role: series.role
            });
        });

        return renderSeries;
    }

    private getPrimaryDomain(panel: ChartPanel, chartType: ChartType): Domain {
        const axisSettings = this.formattingSettings.axis;
        const manualMin = axisSettings.yMin.value;
        const manualMax = axisSettings.yMax.value;

        if (chartType === "stacked100") {
            return { min: 0, max: 100 };
        }

        if (Number.isFinite(manualMin) && Number.isFinite(manualMax) && manualMax > manualMin) {
            return { min: manualMin, max: manualMax };
        }

        const primarySeries = panel.series.filter((series) => series.role === "primary");
        const values: number[] = [];

        if (chartType === "stacked") {
            panel.categoryLabels.forEach((category, index) => {
                values.push(this.getPrimaryTotal(primarySeries, index));
            });
        } else {
            primarySeries.forEach((series) => {
                series.values.forEach((value) => {
                    if (value !== undefined) {
                        values.push(value);
                    }
                });
            });
        }

        return this.getAutoDomain(values);
    }

    private getSecondaryDomain(panel: ChartPanel): Domain {
        const values: number[] = [];

        panel.series
            .filter((series) => series.role === "secondary")
            .forEach((series) => {
                series.values.forEach((value) => {
                    if (value !== undefined) {
                        values.push(value);
                    }
                });
            });

        return this.getAutoDomain(values);
    }

    private getAutoDomain(values: number[]): Domain {
        if (values.length === 0) {
            return { min: 0, max: 1 };
        }

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        if (minValue === maxValue) {
            const padding = Math.abs(maxValue || 1) * 0.2;
            return { min: Math.min(0, minValue - padding), max: maxValue + padding };
        }

        if (minValue >= 0 && maxValue <= 1.5) {
            const min = minValue > 0.4 ? Math.max(0, Math.floor((minValue - 0.1) * 10) / 10) : 0;
            return { min, max: Math.ceil((maxValue + 0.05) * 10) / 10 };
        }

        if (minValue >= 0 && maxValue <= 100 && minValue > 40) {
            return {
                min: Math.max(0, Math.floor((minValue - 10) / 10) * 10),
                max: Math.min(100, Math.ceil((maxValue + 5) / 10) * 10)
            };
        }

        const range = maxValue - minValue;
        const min = minValue >= 0 ? 0 : Math.floor((minValue - range * 0.1) / 10) * 10;
        const max = Math.ceil((maxValue + range * 0.1) / 10) * 10;
        return { min, max };
    }

    private getPanelSize(viewport: powerbi.IViewport, panelCount: number, columns: number, gap: number): { height: number; width: number } {
        const padding = this.clampNumber(this.formattingSettings.layout.padding.value, 0, 60);
        const rows = Math.ceil(panelCount / columns);
        const titleSpace = this.formattingSettings.title.show.value ? this.clampNumber(this.formattingSettings.title.fontSize.value, 9, 32) + 14 : 0;
        const legendVisible = this.getLegendPosition() !== "hidden";
        const legendSpace = legendVisible ? this.clampNumber(this.formattingSettings.legendStyle.fontSize.value, 8, 22) + 18 : 0;
        const availableWidth = Math.max(viewport.width - padding * 2 - gap * (columns - 1), 220);
        const availableHeight = Math.max(viewport.height - padding * 2 - titleSpace - legendSpace - gap * (rows - 1), 120);

        return {
            height: Math.max(availableHeight / rows, 80),
            width: Math.max(availableWidth / columns, 160)
        };
    }

    private appendGradient(defs: SVGDefsElement, panelIndex: number, seriesIndex: number, color: string, gradientColor: string): void {
        const gradient = this.createSvg("linearGradient");
        const opacity = this.clampNumber(this.formattingSettings.areaStyle.areaOpacity.value, 0, 100) / 100;

        gradient.setAttribute("id", this.getGradientId(panelIndex, seriesIndex));
        gradient.setAttribute("x1", "0");
        gradient.setAttribute("x2", "0");
        gradient.setAttribute("y1", "0");
        gradient.setAttribute("y2", "1");

        const start = this.createSvg("stop");
        start.setAttribute("offset", "0%");
        start.setAttribute("stop-color", color);
        start.setAttribute("stop-opacity", String(opacity));
        gradient.appendChild(start);

        const end = this.createSvg("stop");
        end.setAttribute("offset", "100%");
        end.setAttribute("stop-color", gradientColor);
        end.setAttribute("stop-opacity", "0.03");
        gradient.appendChild(end);

        defs.appendChild(gradient);
    }

    private createMarker(
        point: RenderPoint,
        shape: MarkerShape,
        size: number,
        color: string,
        seriesLabel: string,
        tooltip: HTMLElement,
        svg: SVGSVGElement,
        series: RenderSeries
    ): SVGElement {
        const fillColor = this.color(this.formattingSettings.markers.fillColor.value.value, "#FFFFFF");
        const borderWidth = this.clampNumber(this.formattingSettings.markers.borderWidth.value, 0, 8);
        let marker: SVGElement;

        if (shape === "square") {
            marker = this.createSvg("rect");
            marker.setAttribute("x", String(point.x - size / 2));
            marker.setAttribute("y", String(point.y - size / 2));
            marker.setAttribute("width", String(size));
            marker.setAttribute("height", String(size));
            marker.setAttribute("rx", String(Math.max(1, size * 0.18)));
        } else if (shape === "diamond") {
            marker = this.createSvg("path");
            marker.setAttribute("d", `M ${point.x} ${point.y - size / 2} L ${point.x + size / 2} ${point.y} L ${point.x} ${point.y + size / 2} L ${point.x - size / 2} ${point.y} Z`);
        } else {
            marker = this.createSvg("circle");
            marker.setAttribute("cx", String(point.x));
            marker.setAttribute("cy", String(point.y));
            marker.setAttribute("r", String(size / 2));
        }

        marker.classList.add("mag-marker");
        marker.setAttribute("fill", fillColor);
        marker.setAttribute("stroke", color);
        marker.setAttribute("stroke-width", String(borderWidth));
        marker.setAttribute("aria-label", this.getPointTooltip(point, seriesLabel));
        this.bindTooltip(marker, svg, tooltip, series, point);
        return marker;
    }

    private createHitPoint(point: RenderPoint): SVGCircleElement {
        const hitPoint = this.createSvg("circle");
        hitPoint.classList.add("mag-hit-point");
        hitPoint.setAttribute("cx", String(point.x));
        hitPoint.setAttribute("cy", String(point.y));
        hitPoint.setAttribute("r", "10");
        return hitPoint;
    }

    private bindTooltip(
        target: SVGElement,
        svg: SVGSVGElement,
        tooltip: HTMLElement,
        series: RenderSeries,
        fixedPoint?: RenderPoint
    ): void {
        target.addEventListener("mousemove", (event: MouseEvent) => {
            const point = fixedPoint || this.getNearestPoint(svg, series.points, event);
            this.showTooltip(tooltip, event, point, series.label);
        });
        target.addEventListener("mouseenter", (event: MouseEvent) => {
            const point = fixedPoint || this.getNearestPoint(svg, series.points, event);
            this.showTooltip(tooltip, event, point, series.label);
        });
        target.addEventListener("mouseleave", () => {
            this.hideTooltip(tooltip);
        });
    }

    private getNearestPoint(svg: SVGSVGElement, points: RenderPoint[], event: MouseEvent): RenderPoint {
        const rect = svg.getBoundingClientRect();
        const viewBoxWidth = Number(svg.getAttribute("viewBox")?.split(" ")[2] || rect.width || 1);
        const localX = (event.clientX - rect.left) / Math.max(rect.width, 1) * viewBoxWidth;
        return points.reduce((nearest, point) => (
            Math.abs(point.x - localX) < Math.abs(nearest.x - localX) ? point : nearest
        ), points[0]);
    }

    private showTooltip(tooltip: HTMLElement, event: MouseEvent, point: RenderPoint, seriesLabel: string): void {
        const parent = tooltip.parentElement;

        if (!parent) {
            return;
        }

        const rect = parent.getBoundingClientRect();
        const x = event.clientX - rect.left + 12;
        const y = event.clientY - rect.top - 12;
        while (tooltip.firstChild) {
            tooltip.removeChild(tooltip.firstChild);
        }

        const title = document.createElement("div");
        title.className = "mag-tooltip-title";
        title.textContent = seriesLabel;
        tooltip.appendChild(title);

        const value = document.createElement("div");
        value.className = "mag-tooltip-value";
        value.textContent = `${point.categoryLabel}: ${this.formatDisplayValue(point.displayValue)}`;
        tooltip.appendChild(value);

        if (point.tooltipText) {
            const extra = document.createElement("div");
            extra.className = "mag-tooltip-extra";
            extra.textContent = point.tooltipText;
            tooltip.appendChild(extra);
        }

        tooltip.style.left = `${Math.min(x, Math.max(rect.width - 160, 0))}px`;
        tooltip.style.top = `${Math.max(y, 0)}px`;
        tooltip.classList.add("mag-tooltip-visible");
    }

    private hideTooltip(tooltip: HTMLElement): void {
        tooltip.classList.remove("mag-tooltip-visible");
    }

    private getPointTooltip(point: RenderPoint, seriesLabel: string): string {
        const baseText = `${seriesLabel}\n${point.categoryLabel}: ${this.formatDisplayValue(point.displayValue)}`;

        if (!point.tooltipText) {
            return baseText;
        }

        return `${baseText}\n${point.tooltipText}`;
    }

    private appendEndpointLabel(svg: SVGSVGElement, series: RenderSeries): void {
        const point = series.points[series.points.length - 1];

        if (!point) {
            return;
        }

        const text = this.formatDisplayValue(point.displayValue);
        const width = Math.max(38, text.length * 7 + 12);
        const height = 22;
        const x = Math.min(point.x + 8, Number(svg.getAttribute("viewBox")?.split(" ")[2] || 0) - width - 2);
        const y = Math.max(point.y - height / 2, 2);

        const group = this.createSvg("g");

        const box = this.createSvg("rect");
        box.classList.add("mag-endpoint-box");
        box.setAttribute("x", String(x));
        box.setAttribute("y", String(y));
        box.setAttribute("width", String(width));
        box.setAttribute("height", String(height));
        box.setAttribute("rx", "6");
        box.setAttribute("stroke", series.color);
        group.appendChild(box);

        const label = this.createSvg("text");
        label.classList.add("mag-endpoint-text");
        label.setAttribute("x", String(x + width / 2));
        label.setAttribute("y", String(y + 14));
        label.setAttribute("font-size", "11");
        label.setAttribute("text-anchor", "middle");
        label.textContent = text;
        group.appendChild(label);
        svg.appendChild(group);
    }

    private createAreaPath(points: RenderPoint[]): string {
        if (points.length === 0) {
            return "";
        }

        const topPoints = points.map((point) => ({ x: point.x, y: point.y }));
        const basePoints = points
            .slice()
            .reverse()
            .map((point) => ({ x: point.x, y: point.baseY }));
        return `${this.createPath(topPoints)} L ${basePoints[0].x} ${basePoints[0].y} ${this.createPath(basePoints).replace(/^M\s*/, "L ")} Z`;
    }

    private createLinePath(points: RenderPoint[]): string {
        return this.createPath(points.map((point) => ({ x: point.x, y: point.y })));
    }

    private createPath(points: Point[]): string {
        if (points.length === 0) {
            return "";
        }

        if (points.length === 1) {
            return `M ${points[0].x} ${points[0].y}`;
        }

        const lineShape = String(this.formattingSettings.chart.lineShape.value.value) as LineShape;

        if (lineShape === "straight") {
            return points
                .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                .join(" ");
        }

        const tension = this.clampNumber(this.formattingSettings.chart.curveTension.value, 0, 100) / 100;
        let path = `M ${points[0].x} ${points[0].y}`;

        for (let index = 0; index < points.length - 1; index += 1) {
            const current = points[index];
            const next = points[index + 1];
            const dx = (next.x - current.x) * tension;
            path += ` C ${current.x + dx} ${current.y}, ${next.x - dx} ${next.y}, ${next.x} ${next.y}`;
        }

        return path;
    }

    private getAreaFill(panelIndex: number, seriesIndex: number, color: string): string {
        if (!this.formattingSettings.areaStyle.useGradient.value) {
            const opacity = this.clampNumber(this.formattingSettings.areaStyle.areaOpacity.value, 0, 100) / 100;
            return this.withOpacity(color, opacity);
        }

        return `url(#${this.getGradientId(panelIndex, seriesIndex)})`;
    }

    private getGradientId(panelIndex: number, seriesIndex: number): string {
        return `mag-gradient-${panelIndex}-${seriesIndex}`;
    }

    private getPrimaryTotal(seriesList: ChartSeries[], categoryIndex: number): number {
        return seriesList.reduce((total, series) => total + Math.max(0, series.values[categoryIndex] || 0), 0);
    }

    private getX(index: number, count: number, plot: { width: number; x: number }): number {
        if (count <= 1) {
            return plot.x + plot.width / 2;
        }

        return plot.x + index / (count - 1) * plot.width;
    }

    private getY(value: number, domain: Domain, plot: { height: number; y: number }): number {
        const range = domain.max - domain.min || 1;
        const ratio = (value - domain.min) / range;
        return plot.y + plot.height - ratio * plot.height;
    }

    private createAxisText(x: number, y: number, value: string, fontSize: number, anchor: string): SVGTextElement {
        const text = this.createSvg("text");
        text.classList.add("mag-axis-label");
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(y));
        text.setAttribute("font-size", String(fontSize));
        text.setAttribute("text-anchor", anchor);
        text.textContent = value;
        return text;
    }

    private renderAxisTitles(
        svg: SVGSVGElement,
        plot: { height: number; width: number; x: number; y: number },
        hasSecondary: boolean
    ): void {
        const axis = this.formattingSettings.axis;
        const fontSize = this.clampNumber(axis.fontSize.value, 8, 20);

        if (axis.showXTitle.value && axis.xTitle.value) {
            const title = this.createAxisText(
                plot.x + plot.width / 2,
                plot.y + plot.height + this.getBottomMargin() - 6,
                axis.xTitle.value,
                fontSize,
                "middle"
            );
            title.classList.add("mag-axis-title");
            svg.appendChild(title);
        }

        if (axis.showYTitle.value && axis.yTitle.value) {
            const title = this.createAxisText(
                12,
                plot.y + plot.height / 2,
                axis.yTitle.value,
                fontSize,
                "middle"
            );
            title.classList.add("mag-axis-title");
            title.setAttribute("transform", `rotate(-90 12 ${plot.y + plot.height / 2})`);
            svg.appendChild(title);
        }

        if (hasSecondary && axis.showSecondaryTitle.value && axis.secondaryTitle.value) {
            const x = plot.x + plot.width + this.getRightMargin(hasSecondary) - 10;
            const title = this.createAxisText(
                x,
                plot.y + plot.height / 2,
                axis.secondaryTitle.value,
                fontSize,
                "middle"
            );
            title.classList.add("mag-axis-title");
            title.setAttribute("transform", `rotate(90 ${x} ${plot.y + plot.height / 2})`);
            svg.appendChild(title);
        }
    }

    private getBottomMargin(): number {
        const axis = this.formattingSettings.axis;

        if (!axis.showX.value) {
            return axis.showXTitle.value && axis.xTitle.value ? 28 : 8;
        }

        const rotation = this.clampNumber(axis.xLabelRotation.value, 0, 90);
        const labelSpace = rotation > 60 ? 72 : rotation > 0 ? 54 : 30;
        const titleSpace = axis.showXTitle.value && axis.xTitle.value ? 20 : 0;
        return labelSpace + titleSpace;
    }

    private getLeftMargin(): number {
        const axis = this.formattingSettings.axis;
        const labelSpace = axis.showY.value ? 42 : 10;
        const titleSpace = axis.showYTitle.value && axis.yTitle.value ? 24 : 0;
        return labelSpace + titleSpace;
    }

    private getRightMargin(hasSecondary: boolean): number {
        const axis = this.formattingSettings.axis;
        const labelSpace = hasSecondary && axis.showSecondaryY.value ? 42 : 14;
        const titleSpace = hasSecondary && axis.showSecondaryTitle.value && axis.secondaryTitle.value ? 24 : 0;
        return labelSpace + titleSpace;
    }

    private getSeriesKey(definition: SeriesDefinition, legendLabel: string): string {
        return `${definition.role}|${definition.index}|${this.normalizeKey(legendLabel)}`;
    }

    private getSeriesLabel(definition: SeriesDefinition, legendLabel: string): string {
        if (!legendLabel) {
            return definition.displayName;
        }

        return definition.displayName === "Valor" ? legendLabel : `${legendLabel} - ${definition.displayName}`;
    }

    private getSeriesColor(index: number): string {
        const style = this.formattingSettings.areaStyle;

        if (style.useSingleColor.value) {
            return this.color(style.singleColor.value.value, DEFAULT_COLORS[0]);
        }

        const colors = [
            style.color1.value.value,
            style.color2.value.value,
            style.color3.value.value,
            style.color4.value.value,
            style.color5.value.value,
            style.color6.value.value
        ].map((color, colorIndex) => this.color(color, DEFAULT_COLORS[colorIndex]));

        return colors[index % colors.length];
    }

    private getSeriesGradientColor(index: number): string {
        const style = this.formattingSettings.areaStyle;

        if (style.useSingleColor.value) {
            return this.color(style.singleGradientColor.value.value, "#DCD6FF");
        }

        const colors = [
            style.gradientColor1.value.value,
            style.gradientColor2.value.value,
            style.gradientColor3.value.value,
            style.gradientColor4.value.value,
            style.gradientColor5.value.value,
            style.gradientColor6.value.value
        ].map((color, colorIndex) => this.color(color, this.lightenColor(DEFAULT_COLORS[colorIndex])));

        return colors[index % colors.length];
    }

    private getChartType(): ChartType {
        const value = String(this.formattingSettings.chart.chartType.value.value);

        if (value === "stacked" || value === "stacked100") {
            return value;
        }

        return "area";
    }

    private getLegendPosition(): string {
        const legend = this.formattingSettings.legendStyle;
        const value = String(legend.position.value.value);

        if (!legend.show.value || value === "hidden") {
            return "hidden";
        }

        return value === "bottom" ? "bottom" : "top";
    }

    private formatAxisValue(value: number, domain: Domain): string {
        if (this.getChartType() === "stacked100") {
            return `${Math.round(value)}%`;
        }

        return this.formatDisplayValue(value, domain.max >= 1000);
    }

    private formatDisplayValue(value: number, compact: boolean = false): string {
        const format = String(this.formattingSettings.chart.endpointFormat.value.value);
        const decimals = this.clampNumber(this.formattingSettings.chart.decimalPlaces.value, 0, 6);
        const prefix = this.safeText(this.formattingSettings.chart.valuePrefix.value, "");
        const suffix = this.safeText(this.formattingSettings.chart.valueSuffix.value, "");
        let formattedValue: string;

        if (this.getChartType() === "stacked100" || format === "percent") {
            formattedValue = value.toFixed(decimals);
            return `${prefix}${formattedValue}${suffix || "%"}`;
        }

        if (format === "percentFraction") {
            formattedValue = (value * 100).toFixed(decimals);
            return `${prefix}${formattedValue}${suffix || "%"}`;
        }

        if (format === "currency") {
            formattedValue = value.toLocaleString(undefined, {
                maximumFractionDigits: decimals,
                minimumFractionDigits: decimals
            });
            return `${prefix || "R$ "}${formattedValue}${suffix}`;
        }

        formattedValue = format === "auto" || compact
            ? this.formatNumber(value)
            : value.toLocaleString(undefined, {
                maximumFractionDigits: decimals,
                minimumFractionDigits: decimals
            });
        return `${prefix}${formattedValue}${suffix}`;
    }

    private formatNumber(value: number): string {
        const abs = Math.abs(value);

        if (abs >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        }

        if (abs >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }

        return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

    private applyRootStyles(): void {
        const layout = this.formattingSettings.layout;
        const axis = this.formattingSettings.axis;
        this.root.style.setProperty("--mag-bg", this.color(layout.backgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mag-border", this.color(layout.borderColor.value.value, "#E9ECF5"));
        this.root.style.setProperty("--mag-border-width", `${this.clampNumber(layout.borderWidth.value, 0, 8)}px`);
        this.root.style.setProperty("--mag-radius", `${this.clampNumber(layout.borderRadius.value, 0, 48)}px`);
        this.root.style.setProperty("--mag-padding", `${this.clampNumber(layout.padding.value, 0, 60)}px`);
        this.root.style.setProperty("--mag-font", this.safeText(layout.fontFamily.value, "Segoe UI"));
        this.root.style.setProperty("--mag-grid", this.color(axis.gridColor.value.value, "#E9ECF5"));
        this.root.style.setProperty("--mag-axis", this.color(axis.labelColor.value.value, "#5D668A"));
        this.root.style.setProperty("--mag-title", this.color(this.formattingSettings.title.color.value.value, "#141D45"));
        this.root.style.setProperty("--mag-shadow", layout.showShadow.value ? "0 16px 34px rgba(19, 28, 69, 0.08)" : "none");
    }

    private renderEmpty(message: string): HTMLElement {
        const empty = document.createElement("div");
        empty.className = "mag-empty";
        empty.textContent = message;
        return empty;
    }

    private renderError(): void {
        this.clearRoot();
        const card = document.createElement("div");
        card.className = "mag-card";
        card.appendChild(this.renderEmpty("Nao foi possivel renderizar o grafico."));
        this.root.appendChild(card);
    }

    private clearRoot(): void {
        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }
    }

    private createSvg<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
        return document.createElementNS(SVG_NAMESPACE, tagName);
    }

    private normalizeKey(value: string): string {
        return this.safeText(value, "Geral")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    private truncate(value: string, maxLength: number): string {
        if (value.length <= maxLength) {
            return value;
        }

        return `${value.slice(0, Math.max(0, maxLength - 1))}...`;
    }

    private withOpacity(color: string, opacity: number): string {
        const normalized = color.trim();

        if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
            return normalized;
        }

        const red = parseInt(normalized.slice(1, 3), 16);
        const green = parseInt(normalized.slice(3, 5), 16);
        const blue = parseInt(normalized.slice(5, 7), 16);
        return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
    }

    private lightenColor(color: string): string {
        const normalized = color.trim();

        if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
            return normalized;
        }

        const red = parseInt(normalized.slice(1, 3), 16);
        const green = parseInt(normalized.slice(3, 5), 16);
        const blue = parseInt(normalized.slice(5, 7), 16);
        const mix = (channel: number) => Math.round(channel + (255 - channel) * 0.72)
            .toString(16)
            .padStart(2, "0");
        return `#${mix(red)}${mix(green)}${mix(blue)}`;
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
