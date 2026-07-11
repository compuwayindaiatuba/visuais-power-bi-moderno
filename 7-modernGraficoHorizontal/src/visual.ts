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
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { VisualFormattingSettingsModel } from "./settings";
import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";

type ChartMode = "stacked" | "clustered" | "stacked100";
type SortDirection = "asc" | "desc" | "none";
type BarShape = "rounded" | "pill" | "flat" | "pyramid";
type RadiusMode = "all" | "outer" | "none";
type ValueFormat = "auto" | "number" | "currency" | "percent";

interface ColumnRef {
    index: number;
    displayName: string;
}

interface ChartSegment {
    series: string;
    value: number;
    colorStart: string;
    colorEnd: string;
    selectionId?: powerbi.visuals.ISelectionId;
    tooltipItems: VisualTooltipDataItem[];
}

interface CategoryRow {
    key: string;
    category: string;
    categoryId: string;
    imageId: string;
    imageUrl: string;
    smallMultiple: string;
    total: number;
    originalOrder: number;
    segments: ChartSegment[];
    selectionId?: powerbi.visuals.ISelectionId;
    tooltipItems: VisualTooltipDataItem[];
}

interface ChartPanel {
    name: string;
    rows: CategoryRow[];
}

interface ChartDataset {
    categoryTitle: string;
    valueTitle: string;
    panels: ChartPanel[];
    seriesNames: string[];
}

interface ChartMetrics {
    width: number;
    height: number;
    labelWidth: number;
    valueWidth: number;
    barX: number;
    barWidth: number;
    valueX: number;
    imageSize: number;
    labelX: number;
    headerHeight: number;
    axisHeight: number;
    rowBlockHeight: number;
}

interface SeriesColor {
    start: string;
    end: string;
}

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly host: IVisualHost;
    private readonly root: HTMLElement;
    private readonly selectionManager: ISelectionManager;
    private readonly tooltipService: ITooltipService;
    private readonly svgNamespace = "http://www.w3.org/2000/svg";
    private clipCounter: number = 0;
    private formattingSettings: VisualFormattingSettingsModel;
    private gradientCounter: number = 0;
    private lastDataView?: powerbi.DataView;
    private sortOverride?: SortDirection;
    private viewport: powerbi.IViewport = { width: 0, height: 0 };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.root = document.createElement("div");
        this.root.className = "gbm-root";
        options.element.classList.add("gbm-host");
        options.element.appendChild(this.root);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews && options.dataViews[0];
            this.lastDataView = dataView;
            this.viewport = options.viewport;
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
            this.renderEmpty("Nao foi possivel renderizar o grafico.");
            this.events.renderingFailed(options, error instanceof Error ? error.message : String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private render(dataView?: powerbi.DataView): void {
        this.clearRoot();
        this.gradientCounter = 0;
        this.clipCounter = 0;

        const table = dataView?.table;

        if (!table || !table.rows || table.rows.length === 0) {
            this.renderEmpty("Adicione Categorias e Valores.");
            return;
        }

        const dataset = this.buildDataset(table);

        if (dataset.panels.length === 0 || dataset.panels.every((panel) => panel.rows.length === 0)) {
            this.renderEmpty("Nao ha valores numericos para exibir.");
            return;
        }

        const card = document.createElement("div");
        card.className = "gbm-card";
        this.applyCardStyles(card);

        if (this.formattingSettings.layout.showTitle.value || this.formattingSettings.layout.showSortButton.value) {
            card.appendChild(this.renderTopBar());
        }

        const legendPosition = String(this.formattingSettings.legendStyle.position.value.value);
        const legend = this.renderLegend(dataset.seriesNames);

        if (legend && legendPosition === "top") {
            card.appendChild(legend);
        }

        card.appendChild(this.renderPanels(dataset));

        if (legend && legendPosition === "bottom") {
            card.appendChild(legend);
        }

        this.root.appendChild(card);
    }

    private renderTopBar(): HTMLElement {
        const topBar = document.createElement("div");
        topBar.className = "gbm-topbar";

        const title = document.createElement("div");
        title.className = "gbm-title";
        title.textContent = this.formattingSettings.layout.showTitle.value
            ? this.safeText(this.formattingSettings.layout.titleText.value, "Grafico de barras")
            : "";
        topBar.appendChild(title);

        if (this.formattingSettings.layout.showSortButton.value) {
            const direction = this.getSortDirection();
            const button = document.createElement("button");
            button.className = "gbm-sort-button";
            button.type = "button";
            button.title = "Alternar maior/menor";
            const icon = document.createElement("span");
            icon.textContent = direction === "asc" ? "↑" : "↓";
            button.appendChild(icon);

            const label = document.createElement("strong");
            label.textContent = direction === "asc" ? "Menor" : "Maior";
            button.appendChild(label);
            button.addEventListener("click", () => {
                this.sortOverride = direction === "asc" ? "desc" : "asc";

                if (this.lastDataView) {
                    this.render(this.lastDataView);
                }
            });
            topBar.appendChild(button);
        }

        return topBar;
    }

    private renderLegend(seriesNames: string[]): HTMLElement | undefined {
        const legendSettings = this.formattingSettings.legendStyle;

        if (!legendSettings.showLegend.value || legendSettings.position.value.value === "hidden" || seriesNames.length <= 1) {
            return undefined;
        }

        const legend = document.createElement("div");
        legend.className = "gbm-legend";
        legend.style.columnGap = `${this.clampNumber(legendSettings.itemGap.value, 4, 40)}px`;

        seriesNames.forEach((series, index) => {
            const colors = this.getSeriesColor(index);
            const item = document.createElement("div");
            item.className = "gbm-legend-item";

            const swatch = document.createElement("span");
            swatch.className = "gbm-legend-swatch";
            swatch.style.background = `linear-gradient(90deg, ${colors.start}, ${colors.end})`;
            item.appendChild(swatch);

            const label = document.createElement("span");
            label.textContent = series;
            item.appendChild(label);
            legend.appendChild(item);
        });

        return legend;
    }

    private renderPanels(dataset: ChartDataset): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.className = "gbm-panels";

        const columns = Math.max(1, Math.floor(this.clampNumber(this.formattingSettings.smallMultipleStyle.columns.value, 1, 4)));
        const gap = this.clampNumber(this.formattingSettings.smallMultipleStyle.panelGap.value, 6, 40);
        const contentWidth = Math.max(
            280,
            (this.viewport.width || this.root.clientWidth || 480)
                - (this.clampNumber(this.formattingSettings.layout.padding.value, 8, 40) * 2)
        );
        const panelWidth = Math.max(260, Math.floor((contentWidth - gap * (columns - 1)) / columns));

        wrapper.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
        wrapper.style.gap = `${gap}px`;

        dataset.panels.forEach((panel) => {
            const panelElement = document.createElement("div");
            panelElement.className = "gbm-panel";

            if (this.formattingSettings.smallMultipleStyle.showTitles.value && panel.name) {
                const panelTitle = document.createElement("div");
                panelTitle.className = "gbm-panel-title";
                panelTitle.textContent = panel.name;
                panelElement.appendChild(panelTitle);
            }

            panelElement.appendChild(this.renderPanelSvg(panel, dataset, panelWidth));
            wrapper.appendChild(panelElement);
        });

        return wrapper;
    }

    private renderPanelSvg(panel: ChartPanel, dataset: ChartDataset, width: number): SVGSVGElement {
        const mode = this.getChartMode();
        const metrics = this.getMetrics(width, panel.rows.length, dataset.seriesNames.length, mode);
        const svg = this.createSvgElement("svg");
        svg.classList.add("gbm-svg");
        svg.setAttribute("viewBox", `0 0 ${metrics.width} ${metrics.height}`);
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
        svg.style.height = `${metrics.height}px`;

        const defs = this.createSvgElement("defs");
        svg.appendChild(defs);

        this.drawHeader(svg, dataset, metrics);
        this.drawRows(svg, defs, panel, dataset.seriesNames, metrics, mode);

        if (this.formattingSettings.chart.showAxis.value) {
            this.drawAxis(svg, panel.rows, metrics, mode);
        }

        return svg;
    }

    private drawHeader(svg: SVGSVGElement, dataset: ChartDataset, metrics: ChartMetrics): void {
        const labels = this.formattingSettings.labels;
        const headerColor = this.color(labels.mutedColor.value.value, "#687196");

        if (labels.showCategoryLabels.value) {
            this.appendText(svg, dataset.categoryTitle, metrics.labelX, 13, "gbm-header-text", "start", headerColor);
        }

        if (labels.showValues.value) {
            this.appendText(svg, dataset.valueTitle, metrics.barX, 13, "gbm-header-text", "start", headerColor);
        }

        const line = this.createSvgElement("line");
        line.setAttribute("x1", "0");
        line.setAttribute("x2", `${metrics.width}`);
        line.setAttribute("y1", `${metrics.headerHeight - 1}`);
        line.setAttribute("y2", `${metrics.headerHeight - 1}`);
        line.setAttribute("class", "gbm-header-line");
        svg.appendChild(line);
    }

    private drawRows(
        svg: SVGSVGElement,
        defs: SVGDefsElement,
        panel: ChartPanel,
        seriesNames: string[],
        metrics: ChartMetrics,
        mode: ChartMode
    ): void {
        const maxTotal = Math.max(...panel.rows.map((row) => row.total), 0);
        const maxSegment = Math.max(...panel.rows.flatMap((row) => row.segments.map((segment) => segment.value)), 0);
        const stackedScale = mode === "stacked100" ? 1 : Math.max(maxTotal, 1);
        const clusteredScale = Math.max(maxSegment, 1);
        const barHeight = this.clampNumber(this.formattingSettings.chart.barHeight.value, 8, 48);
        const clusterGap = this.clampNumber(this.formattingSettings.chart.clusterGap.value, 0, 22);
        const rowGap = this.clampNumber(this.formattingSettings.chart.rowGap.value, 4, 36);
        const rowStartY = metrics.headerHeight + 8;

        panel.rows.forEach((row, rowIndex) => {
            const rowTop = rowStartY + rowIndex * metrics.rowBlockHeight;
            const rowGroup = this.createSvgElement("g");
            rowGroup.setAttribute("class", "gbm-row");

            const hoverRect = this.createSvgElement("rect");
            hoverRect.setAttribute("class", "gbm-row-hover");
            hoverRect.setAttribute("x", "0");
            hoverRect.setAttribute("y", `${Math.max(0, rowTop - 4)}`);
            hoverRect.setAttribute("width", `${metrics.width}`);
            hoverRect.setAttribute("height", `${Math.max(barHeight + 8, metrics.rowBlockHeight - rowGap + 6)}`);
            hoverRect.setAttribute("rx", "8");
            rowGroup.appendChild(hoverRect);

            if (mode === "clustered") {
                this.drawClusteredRow(rowGroup, defs, row, seriesNames, metrics, rowTop, clusteredScale, barHeight, clusterGap);
            } else {
                this.drawStackedRow(rowGroup, defs, row, seriesNames, metrics, rowTop, stackedScale, mode, barHeight);
            }

            this.bindInteractions(rowGroup, row.tooltipItems, row.selectionId);
            svg.appendChild(rowGroup);
        });
    }

    private drawStackedRow(
        group: SVGGElement,
        defs: SVGDefsElement,
        row: CategoryRow,
        seriesNames: string[],
        metrics: ChartMetrics,
        rowTop: number,
        scale: number,
        mode: ChartMode,
        barHeight: number
    ): void {
        const rowContentHeight = Math.max(barHeight, metrics.imageSize);
        const centerY = rowTop + rowContentHeight / 2;
        const barY = centerY - barHeight / 2;
        const total = Math.max(row.total, 0);
        const denominator = mode === "stacked100" ? Math.max(total, 1) : scale;
        let offset = 0;

        this.drawCategoryBlock(group, row, metrics, centerY);

        if (this.formattingSettings.chart.showTrack.value) {
            this.drawBarShape(group, metrics.barX, barY, metrics.barWidth, barHeight, this.getTrackColor(), this.getTrackColor(), true);
        }

        row.segments.forEach((segment) => {
            const start = mode === "stacked100" ? offset / denominator : offset / denominator;
            const widthRatio = mode === "stacked100" ? segment.value / denominator : segment.value / denominator;
            const segmentX = metrics.barX + metrics.barWidth * start;
            const segmentWidth = metrics.barWidth * widthRatio;
            const seriesIndex = Math.max(0, seriesNames.indexOf(segment.series));
            const colors = this.getSeriesColor(seriesIndex, segment);
            const isLast = offset + segment.value >= total;

            this.drawBarShape(group, segmentX, barY, segmentWidth, barHeight, colors.start, colors.end, isLast, defs);

            if (mode === "stacked100" && segmentWidth > 38 && this.formattingSettings.labels.showValues.value) {
                this.appendText(
                    group,
                    `${this.formatPercent(total === 0 ? 0 : (segment.value / total) * 100)}`,
                    segmentX + segmentWidth / 2,
                    barY + barHeight / 2 + 4,
                    "gbm-inside-value",
                    "middle",
                    "#FFFFFF"
                );
            }

            offset += segment.value;
        });

        if (this.formattingSettings.labels.showValues.value) {
            const text = mode === "stacked100" ? (total === 0 ? "0%" : "100%") : this.formatValue(total);
            this.appendText(group, text, metrics.valueX, centerY + 4, "gbm-value-text", "start", this.getTextColor());
        }
    }

    private drawClusteredRow(
        group: SVGGElement,
        defs: SVGDefsElement,
        row: CategoryRow,
        seriesNames: string[],
        metrics: ChartMetrics,
        rowTop: number,
        scale: number,
        barHeight: number,
        clusterGap: number
    ): void {
        const seriesMap = new Map(row.segments.map((segment) => [segment.series, segment]));
        const clusterHeight = seriesNames.length * barHeight + Math.max(0, seriesNames.length - 1) * clusterGap;
        const centerY = rowTop + Math.max(clusterHeight, metrics.imageSize) / 2;
        this.drawCategoryBlock(group, row, metrics, centerY);

        seriesNames.forEach((series, seriesIndex) => {
            const segment = seriesMap.get(series);
            const barY = rowTop + seriesIndex * (barHeight + clusterGap);
            const value = segment?.value || 0;
            const filledWidth = metrics.barWidth * (value / Math.max(scale, 1));
            const colors = this.getSeriesColor(seriesIndex, segment);

            if (this.formattingSettings.chart.showTrack.value) {
                this.drawBarShape(group, metrics.barX, barY, metrics.barWidth, barHeight, this.getTrackColor(), this.getTrackColor(), true);
            }

            this.drawBarShape(group, metrics.barX, barY, filledWidth, barHeight, colors.start, colors.end, true, defs);

            if (this.formattingSettings.labels.showValues.value && segment) {
                this.appendText(group, this.formatValue(value), metrics.valueX, barY + barHeight / 2 + 4, "gbm-value-text", "start", this.getTextColor());
            }
        });
    }

    private drawCategoryBlock(group: SVGGElement, row: CategoryRow, metrics: ChartMetrics, centerY: number): void {
        const labels = this.formattingSettings.labels;

        if (labels.showImages.value) {
            this.drawImageOrAvatar(group, row, metrics.imageSize / 2, centerY, metrics.imageSize);
        }

        if (labels.showCategoryLabels.value) {
            this.appendText(group, row.category, metrics.labelX, centerY + 4, "gbm-category-text", "start", this.getTextColor());
        }
    }

    private drawImageOrAvatar(group: SVGGElement, row: CategoryRow, cx: number, cy: number, size: number): void {
        const radius = size / 2;

        if (row.imageUrl && this.isImageUrl(row.imageUrl)) {
            const clipId = `gbm-clip-${this.clipCounter++}`;
            const clipPath = this.createSvgElement("clipPath");
            clipPath.setAttribute("id", clipId);
            const clipCircle = this.createSvgElement("circle");
            clipCircle.setAttribute("cx", `${cx}`);
            clipCircle.setAttribute("cy", `${cy}`);
            clipCircle.setAttribute("r", `${radius}`);
            clipPath.appendChild(clipCircle);

            const defs = this.ensureLocalDefs(group);
            defs.appendChild(clipPath);

            const image = this.createSvgElement("image");
            image.setAttribute("href", row.imageUrl);
            image.setAttribute("x", `${cx - radius}`);
            image.setAttribute("y", `${cy - radius}`);
            image.setAttribute("width", `${size}`);
            image.setAttribute("height", `${size}`);
            image.setAttribute("clip-path", `url(#${clipId})`);
            image.setAttribute("preserveAspectRatio", "xMidYMid slice");
            group.appendChild(image);
            return;
        }

        const circle = this.createSvgElement("circle");
        circle.setAttribute("cx", `${cx}`);
        circle.setAttribute("cy", `${cy}`);
        circle.setAttribute("r", `${radius}`);
        circle.setAttribute("class", "gbm-avatar-bg");
        group.appendChild(circle);

        this.appendText(group, this.getInitials(row.category), cx, cy + 4, "gbm-avatar-text", "middle", "#1D6DFF");
    }

    private drawAxis(svg: SVGSVGElement, rows: CategoryRow[], metrics: ChartMetrics, mode: ChartMode): void {
        const y = metrics.height - 8;
        const ticks = [0, 0.25, 0.5, 0.75, 1];
        const maxValue = mode === "clustered"
            ? Math.max(...rows.flatMap((row) => row.segments.map((segment) => segment.value)), 1)
            : Math.max(...rows.map((row) => row.total), 1);
        const axisColor = this.color(this.formattingSettings.chart.axisColor.value.value, "#22305F");

        ticks.forEach((tick) => {
            const x = metrics.barX + metrics.barWidth * tick;
            const line = this.createSvgElement("line");
            line.setAttribute("x1", `${x}`);
            line.setAttribute("x2", `${x}`);
            line.setAttribute("y1", `${y - 5}`);
            line.setAttribute("y2", `${y - 1}`);
            line.setAttribute("class", "gbm-axis-tick");
            svg.appendChild(line);

            const text = mode === "stacked100" ? `${Math.round(tick * 100)}%` : this.formatAxisValue(maxValue * tick);
            this.appendText(svg, text, x, y + 13, "gbm-axis-text", "middle", axisColor);
        });
    }

    private drawBarShape(
        group: SVGElement,
        x: number,
        y: number,
        width: number,
        height: number,
        startColor: string,
        endColor: string,
        isLast: boolean,
        defs?: SVGDefsElement
    ): void {
        if (width <= 0.5 || height <= 0.5) {
            return;
        }

        const fill = defs ? this.createGradient(defs, startColor, endColor) : startColor;
        const shape = String(this.formattingSettings.chart.barShape.value.value) as BarShape;

        if (shape === "pyramid") {
            const path = this.createSvgElement("path");
            path.setAttribute("d", `M ${x} ${y} L ${x + width} ${y + height / 2} L ${x} ${y + height} Z`);
            path.setAttribute("fill", fill);
            path.setAttribute("class", "gbm-bar");
            group.appendChild(path);
            return;
        }

        const radiusMode = String(this.formattingSettings.chart.radiusMode.value.value) as RadiusMode;
        const radius = shape === "pill"
            ? height / 2
            : this.clampNumber(this.formattingSettings.chart.barRadius.value, 0, height / 2);
        const leftRounded = radiusMode === "all";
        const rightRounded = radiusMode === "all" || (radiusMode === "outer" && isLast);
        const finalRadius = shape === "flat" || radiusMode === "none" ? 0 : radius;

        if (finalRadius === 0) {
            const rect = this.createSvgElement("rect");
            rect.setAttribute("x", `${x}`);
            rect.setAttribute("y", `${y}`);
            rect.setAttribute("width", `${width}`);
            rect.setAttribute("height", `${height}`);
            rect.setAttribute("fill", fill);
            rect.setAttribute("class", "gbm-bar");
            group.appendChild(rect);
            return;
        }

        const path = this.createRoundedRectPath(x, y, width, height, finalRadius, leftRounded, rightRounded);
        const bar = this.createSvgElement("path");
        bar.setAttribute("d", path);
        bar.setAttribute("fill", fill);
        bar.setAttribute("class", "gbm-bar");
        group.appendChild(bar);
    }

    private createRoundedRectPath(x: number, y: number, width: number, height: number, radius: number, left: boolean, right: boolean): string {
        const r = Math.min(radius, width / 2, height / 2);
        const leftRadius = left ? r : 0;
        const rightRadius = right ? r : 0;
        const x2 = x + width;
        const y2 = y + height;

        return [
            `M ${x + leftRadius} ${y}`,
            `H ${x2 - rightRadius}`,
            rightRadius ? `Q ${x2} ${y} ${x2} ${y + rightRadius}` : `L ${x2} ${y}`,
            `V ${y2 - rightRadius}`,
            rightRadius ? `Q ${x2} ${y2} ${x2 - rightRadius} ${y2}` : `L ${x2} ${y2}`,
            `H ${x + leftRadius}`,
            leftRadius ? `Q ${x} ${y2} ${x} ${y2 - leftRadius}` : `L ${x} ${y2}`,
            `V ${y + leftRadius}`,
            leftRadius ? `Q ${x} ${y} ${x + leftRadius} ${y}` : `L ${x} ${y}`,
            "Z"
        ].join(" ");
    }

    private buildDataset(table: powerbi.DataViewTable): ChartDataset {
        const categoryIndex = this.findRoleIndex(table, "category");
        const categoryIdIndex = this.findRoleIndex(table, "categoryId");
        const imageIdIndex = this.findRoleIndex(table, "imageId");
        const imageUrlIndex = this.findRoleIndex(table, "imageUrl");
        const legendIndex = this.findRoleIndex(table, "legend");
        const smallMultipleIndex = this.findRoleIndex(table, "smallMultiples");
        const valueColumns = this.findRoleColumns(table, "values");
        const tooltipColumns = this.findRoleColumns(table, "tooltips");
        const groups = new Map<string, CategoryRow>();
        const panelOrder: string[] = [];
        const seriesNames: string[] = [];
        let categoryOrder = 0;

        table.rows.forEach((row, rowIndex) => {
            const category = this.safeText(this.formatPrimitive(row[categoryIndex]), "(Sem categoria)");
            const categoryId = categoryIdIndex >= 0 ? this.formatPrimitive(row[categoryIdIndex]) : "";
            const imageId = imageIdIndex >= 0 ? this.formatPrimitive(row[imageIdIndex]) : "";
            const imageUrl = imageUrlIndex >= 0 ? this.formatPrimitive(row[imageUrlIndex]) : "";
            const smallMultiple = smallMultipleIndex >= 0 ? this.safeText(this.formatPrimitive(row[smallMultipleIndex]), "Geral") : "";
            const groupKey = `${smallMultiple}\u001f${category}\u001f${categoryId || imageId}`;
            const selectionId = this.host.createSelectionIdBuilder()
                .withTable(table, rowIndex)
                .createSelectionId();

            let categoryRow = groups.get(groupKey);

            if (!categoryRow) {
                categoryRow = {
                    key: groupKey,
                    category,
                    categoryId,
                    imageId,
                    imageUrl,
                    smallMultiple,
                    total: 0,
                    originalOrder: categoryOrder++,
                    segments: [],
                    selectionId,
                    tooltipItems: this.createBaseTooltipItems(category, tooltipColumns, row)
                };
                groups.set(groupKey, categoryRow);

                if (!panelOrder.includes(smallMultiple)) {
                    panelOrder.push(smallMultiple);
                }
            }

            valueColumns.forEach((valueColumn) => {
                const numericValue = this.toNumber(row[valueColumn.index]);

                if (numericValue === undefined) {
                    return;
                }

                const value = Math.max(0, numericValue);
                const measureName = this.cleanDisplayName(valueColumn.displayName);
                const legendName = legendIndex >= 0 ? this.safeText(this.formatPrimitive(row[legendIndex]), "") : "";
                const series = legendName || (valueColumns.length > 1 ? measureName : "Valor");

                if (!seriesNames.includes(series)) {
                    seriesNames.push(series);
                }

                const existingSegment = categoryRow?.segments.find((segment) => segment.series === series);
                const segmentTooltipItems = this.createSegmentTooltipItems(category, series, measureName, value, tooltipColumns, row);

                if (existingSegment) {
                    existingSegment.value += value;
                    existingSegment.tooltipItems = segmentTooltipItems;
                } else if (categoryRow) {
                    const colors = this.getSeriesColor(Math.max(0, seriesNames.indexOf(series)));
                    categoryRow.segments.push({
                        series,
                        value,
                        colorStart: colors.start,
                        colorEnd: colors.end,
                        selectionId,
                        tooltipItems: segmentTooltipItems
                    });
                }

                if (categoryRow) {
                    categoryRow.total += value;
                }
            });
        });

        const panels = panelOrder.map((panelName) => {
            const rows = Array.from(groups.values())
                .filter((row) => row.smallMultiple === panelName)
                .map((row) => ({
                    ...row,
                    segments: this.orderSegments(row.segments, seriesNames),
                    tooltipItems: this.createRowTooltipItems(row, this.orderSegments(row.segments, seriesNames))
                }));

            return {
                name: panelName,
                rows: this.limitRows(this.sortRows(rows))
            };
        });

        return {
            categoryTitle: categoryIndex >= 0 ? this.cleanDisplayName(table.columns[categoryIndex].displayName) : "Categoria",
            valueTitle: valueColumns.length === 1 ? this.cleanDisplayName(valueColumns[0].displayName) : "Valores",
            panels,
            seriesNames
        };
    }

    private createRowTooltipItems(row: CategoryRow, segments: ChartSegment[]): VisualTooltipDataItem[] {
        const extraItems = row.tooltipItems.filter((item) => item.displayName !== "Categoria");

        return [
            { displayName: "Categoria", value: row.category },
            { displayName: "Total", value: this.formatValue(row.total) },
            ...segments.map((segment) => ({
                displayName: segment.series,
                value: this.formatValue(segment.value)
            })),
            ...extraItems
        ];
    }

    private orderSegments(segments: ChartSegment[], seriesNames: string[]): ChartSegment[] {
        return [...segments].sort((left, right) => seriesNames.indexOf(left.series) - seriesNames.indexOf(right.series));
    }

    private sortRows(rows: CategoryRow[]): CategoryRow[] {
        const direction = this.getSortDirection();

        if (direction === "none") {
            return [...rows].sort((left, right) => left.originalOrder - right.originalOrder);
        }

        return [...rows].sort((left, right) => {
            if (left.total === right.total) {
                return left.originalOrder - right.originalOrder;
            }

            return direction === "desc" ? right.total - left.total : left.total - right.total;
        });
    }

    private limitRows(rows: CategoryRow[]): CategoryRow[] {
        const maxItems = Math.floor(this.clampNumber(this.formattingSettings.layout.maxItems.value, 0, 5000));
        return maxItems === 0 ? rows : rows.slice(0, maxItems);
    }

    private findRoleIndex(table: powerbi.DataViewTable, roleName: string): number {
        return table.columns.findIndex((column) => Boolean(column.roles?.[roleName]));
    }

    private findRoleColumns(table: powerbi.DataViewTable, roleName: string): ColumnRef[] {
        return table.columns
            .map((column, index) => ({ index, displayName: column.displayName || `Coluna ${index + 1}`, roles: column.roles }))
            .filter((column) => Boolean(column.roles?.[roleName]))
            .map((column) => ({ index: column.index, displayName: column.displayName }));
    }

    private getMetrics(width: number, rowCount: number, seriesCount: number, mode: ChartMode): ChartMetrics {
        const labels = this.formattingSettings.labels;
        const chart = this.formattingSettings.chart;
        const imageSize = labels.showImages.value ? this.clampNumber(labels.imageSize.value, 16, 52) : 0;
        const labelWidth = labels.showCategoryLabels.value
            ? Math.min(this.clampNumber(chart.categoryWidth.value, 90, 300), Math.max(90, width * 0.45))
            : imageSize + 8;
        const valueWidth = labels.showValues.value ? this.clampNumber(chart.valueWidth.value, 36, 120) : 8;
        const barX = labelWidth;
        const barWidth = Math.max(60, width - labelWidth - valueWidth - 12);
        const valueX = barX + barWidth + 10;
        const barHeight = this.clampNumber(chart.barHeight.value, 8, 48);
        const rowGap = this.clampNumber(chart.rowGap.value, 4, 36);
        const clusterGap = this.clampNumber(chart.clusterGap.value, 0, 22);
        const seriesRows = mode === "clustered" ? Math.max(1, seriesCount) : 1;
        const barStackHeight = seriesRows * barHeight + Math.max(0, seriesRows - 1) * clusterGap;
        const rowBlockHeight = Math.max(barStackHeight, imageSize) + rowGap;
        const headerHeight = 24;
        const axisHeight = chart.showAxis.value ? 30 : 8;
        const height = headerHeight + 8 + rowCount * rowBlockHeight + axisHeight;

        return {
            width,
            height,
            labelWidth,
            valueWidth,
            barX,
            barWidth,
            valueX,
            imageSize,
            labelX: labels.showImages.value ? imageSize + 12 : 0,
            headerHeight,
            axisHeight,
            rowBlockHeight
        };
    }

    private getSeriesColor(index: number, segment?: ChartSegment): SeriesColor {
        if (segment && segment.colorStart && segment.colorEnd) {
            return {
                start: segment.colorStart,
                end: segment.colorEnd
            };
        }

        const colors = this.formattingSettings.colors;
        const customFirst = {
            start: this.color(colors.startColor.value.value, "#1D6DFF"),
            end: this.color(colors.endColor.value.value, "#27D8FF")
        };
        const customSecond = {
            start: this.color(colors.secondStartColor.value.value, "#241096"),
            end: this.color(colors.secondEndColor.value.value, "#9C8CFF")
        };

        if (!colors.usePalette.value) {
            return customFirst;
        }

        const palette = [
            customFirst,
            customSecond,
            { start: "#FF5C39", end: "#FFB85A" },
            { start: "#008F7A", end: "#24E1BD" },
            { start: "#8D45FF", end: "#D77DFF" },
            { start: "#005B9E", end: "#1FC4FF" },
            { start: "#C70E6D", end: "#FF3978" }
        ];

        return palette[index % palette.length];
    }

    private getChartMode(): ChartMode {
        const mode = String(this.formattingSettings.chart.mode.value.value);

        if (mode === "clustered" || mode === "stacked100") {
            return mode;
        }

        return "stacked";
    }

    private getSortDirection(): SortDirection {
        if (this.sortOverride) {
            return this.sortOverride;
        }

        const value = String(this.formattingSettings.layout.defaultSort.value.value);

        if (value === "asc" || value === "none") {
            return value;
        }

        return "desc";
    }

    private createBaseTooltipItems(category: string, tooltipColumns: ColumnRef[], row: powerbi.DataViewTableRow): VisualTooltipDataItem[] {
        return [
            { displayName: "Categoria", value: category },
            ...tooltipColumns.map((column) => ({
                displayName: this.cleanDisplayName(column.displayName),
                value: this.formatPrimitive(row[column.index])
            }))
        ];
    }

    private createSegmentTooltipItems(
        category: string,
        series: string,
        measureName: string,
        value: number,
        tooltipColumns: ColumnRef[],
        row: powerbi.DataViewTableRow
    ): VisualTooltipDataItem[] {
        return [
            { displayName: "Categoria", value: category },
            { displayName: "Serie", value: series },
            { displayName: measureName, value: this.formatValue(value) },
            ...tooltipColumns.map((column) => ({
                displayName: this.cleanDisplayName(column.displayName),
                value: this.formatPrimitive(row[column.index])
            }))
        ];
    }

    private bindInteractions(element: SVGElement, dataItems: VisualTooltipDataItem[], selectionId?: powerbi.visuals.ISelectionId): void {
        if (selectionId) {
            element.addEventListener("click", (event: MouseEvent) => {
                this.selectionManager.select(selectionId, event.ctrlKey || event.metaKey);
            });

            element.addEventListener("contextmenu", (event: MouseEvent) => {
                event.preventDefault();
                this.selectionManager.showContextMenu(selectionId, {
                    x: event.clientX,
                    y: event.clientY
                });
            });
        }

        if (!this.tooltipService.enabled()) {
            return;
        }

        const identities = selectionId ? [selectionId] : [];

        element.addEventListener("mouseover", (event: MouseEvent) => {
            this.tooltipService.show({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems,
                identities
            });
        });

        element.addEventListener("mousemove", (event: MouseEvent) => {
            this.tooltipService.move({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems,
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

    private createGradient(defs: SVGDefsElement, startColor: string, endColor: string): string {
        const id = `gbm-gradient-${this.gradientCounter++}`;
        const gradient = this.createSvgElement("linearGradient");
        gradient.setAttribute("id", id);
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("y2", "0%");

        const start = this.createSvgElement("stop");
        start.setAttribute("offset", "0%");
        start.setAttribute("stop-color", startColor);
        gradient.appendChild(start);

        const end = this.createSvgElement("stop");
        end.setAttribute("offset", "100%");
        end.setAttribute("stop-color", endColor);
        gradient.appendChild(end);

        defs.appendChild(gradient);
        return `url(#${id})`;
    }

    private ensureLocalDefs(group: SVGElement): SVGDefsElement {
        const existingDefs = Array.from(group.children).find((child) => child.tagName.toLowerCase() === "defs") as SVGDefsElement | undefined;

        if (existingDefs) {
            return existingDefs;
        }

        const defs = this.createSvgElement("defs");
        group.insertBefore(defs, group.firstChild);
        return defs;
    }

    private appendText(
        parent: SVGElement,
        text: string,
        x: number,
        y: number,
        className: string,
        anchor: "start" | "middle" | "end",
        fill: string
    ): SVGTextElement {
        const textElement = this.createSvgElement("text");
        textElement.textContent = text;
        textElement.setAttribute("x", `${x}`);
        textElement.setAttribute("y", `${y}`);
        textElement.setAttribute("class", className);
        textElement.setAttribute("text-anchor", anchor);
        textElement.setAttribute("fill", fill);
        parent.appendChild(textElement);
        return textElement;
    }

    private createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
        return document.createElementNS(this.svgNamespace, tagName);
    }

    private formatValue(value: number): string {
        const format = String(this.formattingSettings.labels.valueFormat.value.value) as ValueFormat;
        const decimals = Math.floor(this.clampNumber(this.formattingSettings.labels.decimalPlaces.value, 0, 8));
        const percentValue = format === "percent" && Math.abs(value) <= 1 ? value * 100 : value;
        const finalValue = format === "percent" ? percentValue : value;
        const formatted = new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(finalValue);

        if (format === "currency") {
            return `${this.safeText(this.formattingSettings.labels.currencySymbol.value, "R$")} ${formatted}`;
        }

        if (format === "percent") {
            return `${formatted}%`;
        }

        return formatted;
    }

    private formatAxisValue(value: number): string {
        const format = String(this.formattingSettings.labels.valueFormat.value.value) as ValueFormat;

        if (format === "percent") {
            return this.formatValue(value);
        }

        return new Intl.NumberFormat("pt-BR", {
            maximumFractionDigits: 1,
            notation: Math.abs(value) >= 10000 ? "compact" : "standard"
        }).format(value);
    }

    private formatPercent(value: number): string {
        const decimals = Math.floor(this.clampNumber(this.formattingSettings.labels.decimalPlaces.value, 0, 8));
        return `${new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value)}%`;
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

    private toNumber(value: PrimitiveValue): number | undefined {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === "string") {
            const normalized = value.replace("%", "").replace(/\./g, "").replace(",", ".");
            const numberValue = Number(normalized);

            if (Number.isFinite(numberValue)) {
                return numberValue;
            }
        }

        return undefined;
    }

    private cleanDisplayName(displayName: string): string {
        return this.safeText(displayName, "")
            .replace(/^(Soma de|Sum of|Media de|Média de|Average of|Contagem de|Count of|Maximo de|Máximo de|Maximum of|Minimo de|Mínimo de|Minimum of)\s+/i, "")
            .trim();
    }

    private getInitials(value: string): string {
        const words = this.safeText(value, "")
            .split(/\s+/)
            .filter((word) => Boolean(word));

        if (words.length === 0) {
            return "--";
        }

        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase();
        }

        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    private getTrackColor(): string {
        return this.color(this.formattingSettings.chart.trackColor.value.value, "#E8EDF3");
    }

    private getTextColor(): string {
        return this.color(this.formattingSettings.labels.textColor.value.value, "#18204C");
    }

    private isImageUrl(value: string): boolean {
        return /^(https?:\/\/|data:image\/)/i.test(value);
    }

    private applyCardStyles(card: HTMLElement): void {
        const layout = this.formattingSettings.layout;
        const labels = this.formattingSettings.labels;

        card.style.backgroundColor = this.color(layout.backgroundColor.value.value, "#FFFFFF");
        card.style.borderColor = this.color(layout.borderColor.value.value, "#E8ECF5");
        card.style.borderRadius = `${this.clampNumber(layout.borderRadius.value, 0, 36)}px`;
        card.style.padding = `${this.clampNumber(layout.padding.value, 8, 40)}px`;
        card.style.fontFamily = this.safeText(layout.fontFamily.value, "Segoe UI");
        card.style.setProperty("--gbm-text", this.getTextColor());
        card.style.setProperty("--gbm-muted", this.color(labels.mutedColor.value.value, "#687196"));
        card.style.setProperty("--gbm-font-size", `${this.clampNumber(labels.fontSize.value, 9, 22)}px`);
    }

    private renderEmpty(message: string): void {
        this.clearRoot();
        const empty = document.createElement("div");
        empty.className = "gbm-empty";
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
