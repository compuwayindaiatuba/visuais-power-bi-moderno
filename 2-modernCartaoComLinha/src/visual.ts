/*
 * Power BI Custom Visual: CartaoComLinha
 */

"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { VisualFormattingSettingsModel } from "./settings";
import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";

interface SparkPoint {
    label: string;
    value: number;
    date?: Date;
    identity?: powerbi.visuals.ISelectionId;
    tooltipItems: VisualTooltipDataItem[];
}

interface MetricData {
    title: string;
    valueName: string;
    currentValue: number;
    previousValue?: number;
    currentPoint?: SparkPoint;
    points: SparkPoint[];
    hasPeriod: boolean;
    tooltipItems: VisualTooltipDataItem[];
}

interface ComparisonWindow {
    currentStart: number;
    previousStart: number;
    maxTime: number;
}

interface DateHierarchyParts {
    year?: number;
    quarter?: number;
    month?: number;
    day?: number;
}

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly host: IVisualHost;
    private readonly locale: string;
    private readonly root: HTMLElement;
    private readonly selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.locale = options.host.locale || "pt-BR";

        this.root = document.createElement("div");
        this.root.className = "cartao-com-linha";
        options.element.classList.add("cartao-com-linha-host");
        options.element.appendChild(this.root);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews && options.dataViews[0];
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
            this.renderEmpty("Nao foi possivel renderizar o visual.");
            this.events.renderingFailed(options, error instanceof Error ? error.message : String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private render(dataView?: powerbi.DataView): void {
        const metricData = this.buildMetricData(dataView);

        if (!metricData) {
            this.renderEmpty("Adicione um valor.");
            return;
        }

        this.clearRoot();
        const layout = this.formattingSettings.layout;
        const icon = this.formattingSettings.icon;
        const valueSettings = this.formattingSettings.valueCard;
        const comparison = this.formattingSettings.comparison;
        const chart = this.formattingSettings.chart;
        const chartPoints = this.getChartPoints(metricData.points);
        const card = document.createElement("div");
        const canRenderChart = metricData.hasPeriod && chartPoints.length > 1 && chart.showChart.value;
        const backgroundColor = this.color(layout.backgroundColor.value.value, "#FFFFFF");
        const gradientColor = this.hexToRgba(
            this.color(layout.gradientColor.value.value, "#EAF2FF"),
            this.clampNumber(layout.gradientOpacity.value, 0, 1)
        );

        card.className = canRenderChart ? "cartao-card has-chart" : "cartao-card is-compact";
        card.style.background = `linear-gradient(135deg, ${backgroundColor} 0%, ${gradientColor} 54%, ${backgroundColor} 100%)`;
        card.style.borderColor = this.color(layout.borderColor.value.value, "#BFD8FF");
        card.style.borderRadius = `${this.clampNumber(layout.borderRadius.value, 0, 48)}px`;
        card.style.padding = `${this.clampNumber(layout.padding.value, 8, 40)}px`;
        card.style.fontFamily = this.safeText(layout.fontFamily.value, "Segoe UI");
        card.setAttribute("role", "button");
        card.tabIndex = 0;

        const content = document.createElement("div");
        content.className = "cartao-content";

        if (icon.showIcon.value) {
            content.appendChild(this.renderIcon());
        }

        const textBlock = document.createElement("div");
        textBlock.className = "cartao-text";

        if (layout.showTitle.value) {
            const title = document.createElement("div");
            title.className = "cartao-title";
            title.textContent = metricData.title;
            title.style.color = this.color(layout.titleColor.value.value, "#101B4D");
            title.style.fontSize = `${this.clampNumber(layout.titleFontSize.value, 9, 32)}px`;
            textBlock.appendChild(title);
        }

        const value = document.createElement("div");
        value.className = "cartao-value";
        value.textContent = this.formatValue(metricData.currentValue);
        value.style.color = this.color(valueSettings.valueColor.value.value, "#07124A");
        value.style.fontSize = `${this.clampNumber(valueSettings.valueFontSize.value, 18, 72)}px`;
        textBlock.appendChild(value);

        if (comparison.showComparison.value && metricData.previousValue !== undefined) {
            textBlock.appendChild(this.renderComparison(metricData.currentValue, metricData.previousValue));
        }

        content.appendChild(textBlock);
        card.appendChild(content);

        if (canRenderChart) {
            const chartElement = document.createElement("div");
            chartElement.className = "cartao-chart";
            chartElement.style.height = `${this.clampNumber(chart.chartHeight.value, 24, 120)}px`;
            card.appendChild(chartElement);
            this.renderSparkline(chartElement, chartPoints);
        }

        this.bindInteractions(card, metricData);
        this.bindTooltip(card, metricData.tooltipItems, metricData.currentPoint?.identity);
        this.root.appendChild(card);
    }

    private renderEmpty(message: string): void {
        this.clearRoot();
        const empty = document.createElement("div");
        empty.className = "cartao-empty";
        empty.textContent = message;
        this.root.appendChild(empty);
    }

    private clearRoot(): void {
        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }
    }

    private buildMetricData(dataView?: powerbi.DataView): MetricData | undefined {
        const categorical = dataView?.categorical;
        const values = categorical?.values;
        const valueColumn = values?.find((column) => Boolean(column.source.roles?.value));

        if (!valueColumn) {
            return undefined;
        }

        const tooltipColumns: powerbi.DataViewValueColumn[] = [];
        const periodColumns = categorical?.categories || [];
        const hasPeriod = periodColumns.length > 0;
        const valueName = valueColumn.source.displayName || "Valor";
        const configuredTitle = this.safeText(this.formattingSettings.layout.titleText.value, "");
        const title = configuredTitle || valueName;
        const valueValues = valueColumn.values || [];

        if (!hasPeriod) {
            const currentValue = this.sumValues(valueValues);
            return {
                title,
                valueName,
                currentValue,
                hasPeriod: false,
                points: [],
                tooltipItems: this.buildSummaryTooltip(valueName, currentValue, tooltipColumns)
            };
        }

        const rowCount = Math.max(
            valueValues.length,
            ...periodColumns.map((column) => column.values.length)
        );
        const points: SparkPoint[] = [];

        for (let index = 0; index < rowCount; index++) {
            const value = this.toNumber(valueValues[index]);

            if (value === undefined) {
                continue;
            }

            const label = this.buildCategoryLabel(periodColumns, index);
            const date = this.getPointDate(periodColumns, index);
            const identity = this.createSelectionId(periodColumns, index);

            points.push({
                label,
                value,
                date,
                identity,
                tooltipItems: this.buildPointTooltip(label, valueName, value, tooltipColumns, index)
            });
        }

        const orderedPoints = this.orderPoints(points);
        const currentAndPrevious = this.getCurrentAndPrevious(orderedPoints);
        const tooltipItems = currentAndPrevious.currentPoint?.tooltipItems || this.buildSummaryTooltip(
            valueName,
            currentAndPrevious.currentValue,
            tooltipColumns
        );

        return {
            title,
            valueName,
            currentValue: currentAndPrevious.currentValue,
            previousValue: currentAndPrevious.previousValue,
            currentPoint: currentAndPrevious.currentPoint,
            points: orderedPoints,
            hasPeriod: true,
            tooltipItems
        };
    }

    private renderIcon(): HTMLElement {
        const iconSettings = this.formattingSettings.icon;
        const iconWrap = document.createElement("div");
        const size = this.clampNumber(iconSettings.iconSize.value, 32, 140);
        const iconUrl = this.safeText(iconSettings.iconUrl.value, "");

        iconWrap.className = "cartao-icon";
        iconWrap.style.width = `${size}px`;
        iconWrap.style.height = `${size}px`;
        iconWrap.style.minWidth = `${size}px`;
        iconWrap.style.borderRadius = `${this.clampNumber(iconSettings.iconCornerRadius.value, 0, 70)}px`;
        iconWrap.style.backgroundColor = this.color(iconSettings.iconBackgroundColor.value.value, "#EAF2FF");
        iconWrap.style.color = this.color(iconSettings.iconColor.value.value, "#1F6DFF");

        if (iconUrl) {
            const image = document.createElement("img");
            image.alt = "";
            image.src = iconUrl;
            iconWrap.appendChild(image);
            return iconWrap;
        }

        const iconText = this.safeText(iconSettings.iconText.value, "users").toLowerCase();

        if (iconText === "users" || iconText === "user-x") {
            iconWrap.appendChild(this.renderBuiltInIcon(iconText));
            return iconWrap;
        }

        const textIcon = document.createElement("span");
        textIcon.className = "cartao-icon-text";
        textIcon.textContent = iconSettings.iconText.value || "";
        iconWrap.appendChild(textIcon);
        return iconWrap;
    }

    private renderBuiltInIcon(iconName: string): HTMLElement {
        const symbol = document.createElement("div");
        symbol.className = `cartao-built-icon ${iconName}`;

        const leftHead = document.createElement("span");
        leftHead.className = "head left";
        const rightHead = document.createElement("span");
        rightHead.className = "head right";
        const leftBody = document.createElement("span");
        leftBody.className = "body left";
        const rightBody = document.createElement("span");
        rightBody.className = "body right";

        symbol.appendChild(leftHead);
        symbol.appendChild(rightHead);
        symbol.appendChild(leftBody);
        symbol.appendChild(rightBody);

        if (iconName === "user-x") {
            const badge = document.createElement("span");
            badge.className = "badge-x";
            symbol.appendChild(badge);
        }

        return symbol;
    }

    private renderComparison(currentValue: number, previousValue: number): HTMLElement {
        const settings = this.formattingSettings.comparison;
        const comparison = document.createElement("div");
        const percent = this.calculatePercentChange(currentValue, previousValue);
        const sentiment = percent > 0 ? "positive" : percent < 0 ? "negative" : "neutral";
        const color = sentiment === "positive"
            ? this.color(settings.positiveColor.value.value, "#27B37E")
            : sentiment === "negative"
                ? this.color(settings.negativeColor.value.value, "#FF4B45")
                : this.color(settings.neutralColor.value.value, "#667085");

        comparison.className = `cartao-comparison ${sentiment}`;
        comparison.style.fontSize = `${this.clampNumber(settings.comparisonFontSize.value, 9, 26)}px`;

        const arrow = document.createElement("span");
        arrow.className = "comparison-arrow";
        arrow.textContent = percent > 0 ? "\u2191" : percent < 0 ? "\u2193" : "\u2013";
        arrow.style.color = color;

        const number = document.createElement("span");
        number.className = "comparison-number";
        number.textContent = `${this.formatPercent(Math.abs(percent))}`;
        number.style.color = color;

        const label = document.createElement("span");
        label.className = "comparison-label";
        label.textContent = this.safeText(settings.comparisonLabel.value, "vs periodo anterior");

        comparison.appendChild(arrow);
        comparison.appendChild(number);
        comparison.appendChild(label);
        return comparison;
    }

    private renderSparkline(container: HTMLElement, points: SparkPoint[]): void {
        const chartSettings = this.formattingSettings.chart;
        const width = 320;
        const height = 64;
        const lineColor = this.color(chartSettings.lineColor.value.value, "#367CFF");
        const lineWidth = this.clampNumber(chartSettings.lineWidth.value, 1, 8);
        const areaColor = this.color(chartSettings.areaColor.value.value, lineColor);
        const areaOpacity = this.clampNumber(chartSettings.areaOpacity.value, 0, 1);
        const curve = chartSettings.curveStyle.value.value === "sharp"
            ? d3.curveLinear
            : d3.curveCatmullRom.alpha(0.5);
        const values = points.map((point) => point.value);
        const extent = d3.extent(values);
        const minValue = extent[0] ?? 0;
        const maxValue = extent[1] ?? 0;
        const valueRange = maxValue - minValue;
        const yPadding = valueRange === 0
            ? Math.max(Math.abs(minValue) * 0.1, 1)
            : valueRange * 0.55;
        const xScale = d3.scaleLinear()
            .domain([0, Math.max(points.length - 1, 1)])
            .range([2, width - 2]);
        const yScale = d3.scaleLinear()
            .domain([minValue - yPadding, maxValue + yPadding])
            .range([height - 9, 9]);
        const line = d3.line<SparkPoint>()
            .x((_point, index) => xScale(index))
            .y((point) => yScale(point.value))
            .curve(curve);
        const area = d3.area<SparkPoint>()
            .x((_point, index) => xScale(index))
            .y0(height - 4)
            .y1((point) => yScale(point.value))
            .curve(curve);

        const svg = d3.select(container)
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "none")
            .attr("aria-hidden", "true");

        svg.append("path")
            .datum(points)
            .attr("class", "sparkline-area")
            .attr("d", area)
            .attr("fill", areaColor)
            .attr("fill-opacity", areaOpacity);

        svg.append("path")
            .datum(points)
            .attr("class", "sparkline-path")
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", lineWidth)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round");
    }

    private getChartPoints(points: SparkPoint[]): SparkPoint[] {
        const mode = this.formattingSettings.chart.chartPeriodMode.value.value;

        if (mode !== "comparison") {
            return points;
        }

        const days = Math.floor(this.clampNumber(this.formattingSettings.comparison.mainPeriodDays.value, 0, 3650));
        const window = this.getComparisonWindow(points, days);

        if (!window) {
            return points;
        }

        const filteredPoints = points.filter((point) => {
            const time = point.date?.getTime() || 0;
            return time >= window.previousStart && time <= window.maxTime;
        });

        return filteredPoints.length > 1 ? filteredPoints : points;
    }

    private bindInteractions(card: HTMLElement, metricData: MetricData): void {
        const identity = metricData.currentPoint?.identity;

        card.addEventListener("click", (event: MouseEvent) => {
            if (identity) {
                this.selectionManager.select(identity, event.ctrlKey || event.metaKey);
            }
        });

        card.addEventListener("keydown", (event: KeyboardEvent) => {
            if (identity && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                this.selectionManager.select(identity, event.ctrlKey || event.metaKey);
            }
        });

        card.addEventListener("contextmenu", (event: MouseEvent) => {
            if (!identity) {
                return;
            }

            event.preventDefault();
            this.selectionManager.select(identity);
            this.selectionManager.showContextMenu(identity, {
                x: event.clientX,
                y: event.clientY
            }, "date");
        });
    }

    private bindTooltip(
        element: HTMLElement,
        dataItems: VisualTooltipDataItem[],
        identity?: powerbi.visuals.ISelectionId
    ): void {
        if (!this.host.tooltipService.enabled() || dataItems.length === 0) {
            element.title = dataItems.map((item) => `${item.displayName}: ${item.value}`).join("\n");
            return;
        }

        const identities = identity ? [identity as unknown as powerbi.extensibility.ISelectionId] : [];

        element.addEventListener("mousemove", (event: MouseEvent) => {
            this.host.tooltipService.show({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems,
                identities
            });
        });

        element.addEventListener("mouseleave", () => {
            this.host.tooltipService.hide({
                isTouchEvent: false,
                immediately: true
            });
        });
    }

    private createSelectionId(
        periodColumns: powerbi.DataViewCategoryColumn[],
        index: number
    ): powerbi.visuals.ISelectionId | undefined {
        if (periodColumns.length === 0) {
            return undefined;
        }

        const builder = this.host.createSelectionIdBuilder();
        periodColumns.forEach((column) => builder.withCategory(column, index));
        return builder.createSelectionId();
    }

    private buildCategoryLabel(periodColumns: powerbi.DataViewCategoryColumn[], index: number): string {
        const labels = periodColumns
            .map((column) => this.formatPrimitive(column.values[index]))
            .filter((label) => Boolean(label));

        return labels.length > 0 ? labels.join(" / ") : "Data";
    }

    private getPointDate(periodColumns: powerbi.DataViewCategoryColumn[], index: number): Date | undefined {
        for (const column of periodColumns) {
            const value = column.values[index];
            const date = this.toDate(value);

            if (date) {
                return date;
            }
        }

        const parts = this.getDateHierarchyParts(periodColumns, index);

        if (!parts.year) {
            return undefined;
        }

        const month = parts.month ?? (parts.quarter ? ((parts.quarter - 1) * 3) + 1 : 1);
        const day = parts.day ?? 1;
        const date = new Date(parts.year, month - 1, day);

        return Number.isNaN(date.getTime()) ? undefined : date;
    }

    private getDateHierarchyParts(
        periodColumns: powerbi.DataViewCategoryColumn[],
        index: number
    ): DateHierarchyParts {
        const parts: DateHierarchyParts = {};

        periodColumns.forEach((column) => {
            const value = column.values[index];
            const columnName = this.normalizeText(`${column.source.displayName} ${column.source.queryName || ""}`);

            if (this.isYearColumn(columnName)) {
                parts.year = this.parseYear(value) ?? parts.year;
                return;
            }

            if (this.isQuarterColumn(columnName)) {
                parts.quarter = this.parseQuarter(value) ?? parts.quarter;
                return;
            }

            if (this.isMonthColumn(columnName)) {
                parts.month = this.parseMonth(value) ?? parts.month;
                return;
            }

            if (this.isDayColumn(columnName)) {
                parts.day = this.parseDay(value) ?? parts.day;
                return;
            }

            parts.year = parts.year ?? this.parseYear(value);
            parts.month = parts.month ?? this.parseMonth(value);
        });

        return parts;
    }

    private orderPoints(points: SparkPoint[]): SparkPoint[] {
        const allDates = points.length > 0 && points.every((point) => point.date instanceof Date);

        if (!allDates) {
            return points;
        }

        return [...points].sort((left, right) => {
            const leftTime = left.date ? left.date.getTime() : 0;
            const rightTime = right.date ? right.date.getTime() : 0;
            return leftTime - rightTime;
        });
    }

    private getCurrentAndPrevious(points: SparkPoint[]): {
        currentValue: number;
        previousValue?: number;
        currentPoint?: SparkPoint;
    } {
        if (points.length === 0) {
            return { currentValue: 0 };
        }

        const days = Math.floor(this.clampNumber(this.formattingSettings.comparison.mainPeriodDays.value, 0, 3650));
        const window = this.getComparisonWindow(points, days);

        if (window) {
            const currentPoints = points.filter((point) => {
                const time = point.date?.getTime() || 0;
                return time >= window.currentStart && time <= window.maxTime;
            });
            const previousPoints = points.filter((point) => {
                const time = point.date?.getTime() || 0;
                return time >= window.previousStart && time < window.currentStart;
            });

            return {
                currentValue: this.sumNumbers(currentPoints.map((point) => point.value)),
                previousValue: previousPoints.length > 0
                    ? this.sumNumbers(previousPoints.map((point) => point.value))
                    : undefined,
                currentPoint: currentPoints[currentPoints.length - 1] || points[points.length - 1]
            };
        }

        const currentPoint = points[points.length - 1];
        const previousPoint = points.length > 1 ? points[points.length - 2] : undefined;

        return {
            currentValue: currentPoint.value,
            previousValue: previousPoint?.value,
            currentPoint
        };
    }

    private getComparisonWindow(points: SparkPoint[], days: number): ComparisonWindow | undefined {
        if (days <= 0 || points.length === 0 || points.some((point) => !point.date)) {
            return undefined;
        }

        const oneDay = 24 * 60 * 60 * 1000;
        const maxTime = Math.max(...points.map((point) => point.date?.getTime() || 0));
        const currentStart = maxTime - ((days - 1) * oneDay);
        const previousStart = currentStart - (days * oneDay);

        return {
            currentStart,
            previousStart,
            maxTime
        };
    }

    private buildPointTooltip(
        label: string,
        valueName: string,
        value: number,
        tooltipColumns: powerbi.DataViewValueColumn[],
        index: number
    ): VisualTooltipDataItem[] {
        const items: VisualTooltipDataItem[] = [
            {
                displayName: "Periodo",
                value: label
            },
            {
                displayName: valueName,
                value: this.formatValue(value)
            }
        ];

        tooltipColumns.forEach((column) => {
            items.push({
                displayName: column.source.displayName || "Tooltip",
                value: this.formatPrimitive(column.values[index])
            });
        });

        return items;
    }

    private buildSummaryTooltip(
        valueName: string,
        value: number,
        tooltipColumns: powerbi.DataViewValueColumn[]
    ): VisualTooltipDataItem[] {
        const items: VisualTooltipDataItem[] = [
            {
                displayName: valueName,
                value: this.formatValue(value)
            }
        ];

        tooltipColumns.forEach((column) => {
            const summaryValue = column.values.length === 1
                ? this.formatPrimitive(column.values[0])
                : this.formatValue(this.sumValues(column.values));

            items.push({
                displayName: column.source.displayName || "Tooltip",
                value: summaryValue
            });
        });

        return items;
    }

    private calculatePercentChange(currentValue: number, previousValue: number): number {
        if (previousValue === 0) {
            return currentValue === 0 ? 0 : 100;
        }

        return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    }

    private formatValue(value: number): string {
        const settings = this.formattingSettings.valueCard;
        const decimals = Math.floor(this.clampNumber(settings.decimalPlaces.value, 0, 8));
        const formatter = new Intl.NumberFormat(this.locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });

        return `${settings.valuePrefix.value || ""}${formatter.format(value)}${settings.valueSuffix.value || ""}`;
    }

    private formatPercent(value: number): string {
        const formatter = new Intl.NumberFormat(this.locale, {
            minimumFractionDigits: value === 0 ? 0 : 1,
            maximumFractionDigits: 1
        });

        return `${formatter.format(value)}%`;
    }

    private formatPrimitive(value: PrimitiveValue | undefined): string {
        if (value === undefined || value === null) {
            return "";
        }

        if (value instanceof Date) {
            return new Intl.DateTimeFormat(this.locale).format(value);
        }

        if (typeof value === "number") {
            return new Intl.NumberFormat(this.locale, {
                maximumFractionDigits: 2
            }).format(value);
        }

        return String(value);
    }

    private toDate(value: PrimitiveValue | undefined): Date | undefined {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
        }

        if (typeof value === "string") {
            const date = new Date(value);

            if (!Number.isNaN(date.getTime())) {
                return date;
            }
        }

        return undefined;
    }

    private isYearColumn(columnName: string): boolean {
        return columnName.includes("ano") || columnName.includes("year");
    }

    private isQuarterColumn(columnName: string): boolean {
        return columnName.includes("trimestre")
            || columnName.includes("quarter")
            || columnName.includes("trim");
    }

    private isMonthColumn(columnName: string): boolean {
        return columnName.includes("mes") || columnName.includes("month");
    }

    private isDayColumn(columnName: string): boolean {
        return columnName.includes("dia") || columnName.includes("day");
    }

    private parseYear(value: PrimitiveValue | undefined): number | undefined {
        const numericValue = this.parseInteger(value);

        if (numericValue !== undefined && numericValue >= 1900 && numericValue <= 9999) {
            return numericValue;
        }

        return undefined;
    }

    private parseQuarter(value: PrimitiveValue | undefined): number | undefined {
        const text = this.normalizeText(this.formatPrimitive(value));
        const match = text.match(/[1-4]/);
        const quarter = match ? Number(match[0]) : undefined;

        return quarter && quarter >= 1 && quarter <= 4 ? quarter : undefined;
    }

    private parseMonth(value: PrimitiveValue | undefined): number | undefined {
        const numericValue = this.parseInteger(value);

        if (numericValue !== undefined && numericValue >= 1 && numericValue <= 12) {
            return numericValue;
        }

        const text = this.normalizeText(this.formatPrimitive(value));
        const months: { [monthName: string]: number } = {
            janeiro: 1,
            jan: 1,
            fevereiro: 2,
            fev: 2,
            marco: 3,
            mar: 3,
            abril: 4,
            abr: 4,
            maio: 5,
            mai: 5,
            junho: 6,
            jun: 6,
            julho: 7,
            jul: 7,
            agosto: 8,
            ago: 8,
            setembro: 9,
            set: 9,
            outubro: 10,
            out: 10,
            novembro: 11,
            nov: 11,
            dezembro: 12,
            dez: 12
        };

        return months[text];
    }

    private parseDay(value: PrimitiveValue | undefined): number | undefined {
        const numericValue = this.parseInteger(value);

        if (numericValue !== undefined && numericValue >= 1 && numericValue <= 31) {
            return numericValue;
        }

        return undefined;
    }

    private parseInteger(value: PrimitiveValue | undefined): number | undefined {
        if (typeof value === "number" && Number.isFinite(value)) {
            return Math.floor(value);
        }

        if (typeof value === "string") {
            const match = value.match(/\d+/);
            const numericValue = match ? Number(match[0]) : undefined;

            if (numericValue !== undefined && Number.isFinite(numericValue)) {
                return Math.floor(numericValue);
            }
        }

        return undefined;
    }

    private normalizeText(value: string): string {
        return value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    private toNumber(value: PrimitiveValue | undefined): number | undefined {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        return undefined;
    }

    private sumValues(values: PrimitiveValue[]): number {
        return this.sumNumbers(values.map((value) => this.toNumber(value) || 0));
    }

    private sumNumbers(values: number[]): number {
        return values.reduce((sum, value) => sum + value, 0);
    }

    private color(value: string | undefined, fallback: string): string {
        return this.safeText(value, fallback);
    }

    private hexToRgba(value: string, opacity: number): string {
        const normalizedValue = value.trim();

        if (!normalizedValue.startsWith("#")) {
            return normalizedValue;
        }

        const hex = normalizedValue.slice(1);
        const fullHex = hex.length === 3
            ? hex.split("").map((part) => `${part}${part}`).join("")
            : hex;

        if (fullHex.length !== 6) {
            return normalizedValue;
        }

        const red = parseInt(fullHex.slice(0, 2), 16);
        const green = parseInt(fullHex.slice(2, 4), 16);
        const blue = parseInt(fullHex.slice(4, 6), 16);

        return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
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
