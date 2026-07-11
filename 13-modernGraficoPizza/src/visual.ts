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

type ChartMode = "pie" | "donut" | "rings";
type LegendPosition = "right" | "left" | "bottom" | "hidden";
type LabelPosition = "outside" | "inside" | "hidden";

interface ColumnIndexes {
    categoryIndex: number;
    menuIndex?: number;
    tooltipIndexes: number[];
    valueIndexes: number[];
}

interface SliceItem {
    color: string;
    extraTooltip: string;
    label: string;
    percent: number;
    value: number;
}

interface PieModel {
    measureDisplayName: string;
    slices: SliceItem[];
    total: number;
    valueIndex: number;
    valueIndexes: number[];
}

interface ArcBounds {
    centerX: number;
    centerY: number;
    height: number;
    radius: number;
    width: number;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const DEFAULT_COLORS = [
    "#6C4FF6",
    "#3978FF",
    "#FF9F2E",
    "#3DBE7E",
    "#E11D2E",
    "#F26D78",
    "#F7A8B1",
    "#14B8A6",
    "#8B5CF6",
    "#64748B"
];

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly hostElement: HTMLElement;
    private readonly root: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private lastDataView?: powerbi.DataView;
    private lastViewport?: powerbi.IViewport;
    private selectedValueIndex?: number;

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.hostElement = options.element;
        this.root = document.createElement("div");
        this.root.className = "mpz-root";
        this.hostElement.classList.add("modern-pizza-host");
        this.hostElement.appendChild(this.root);
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
            if (!this.shouldRenderForMenu(dataView?.table)) {
                this.hideVisual();
                this.events.renderingFinished(options);
                return;
            }

            this.showVisual();
            this.render(dataView, options.viewport);
            this.events.renderingFinished(options);
        } catch (error) {
            this.showVisual();
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
        card.className = "mpz-card";
        const model = this.buildModel(dataView?.table);

        card.appendChild(this.renderHeader(model));

        if (!model || model.slices.length === 0) {
            card.appendChild(this.renderEmpty("Adicione uma Categoria e uma medida em Valores."));
            this.root.appendChild(card);
            return;
        }

        const legendPosition = this.getLegendPosition();
        const body = document.createElement("div");
        body.className = `mpz-body mpz-body-${legendPosition}`;

        if (legendPosition === "left") {
            body.appendChild(this.renderLegend(model));
        }

        body.appendChild(this.renderChart(model, viewport));

        if (legendPosition === "right" || legendPosition === "bottom") {
            body.appendChild(this.renderLegend(model));
        }

        card.appendChild(body);
        this.root.appendChild(card);
    }

    private renderHeader(model?: PieModel): HTMLElement {
        const header = document.createElement("div");
        header.className = "mpz-header";

        if (this.formattingSettings.title.show.value) {
            const title = document.createElement("h2");
            title.className = "mpz-title";
            title.style.color = this.color(this.formattingSettings.title.color.value.value, "#141D45");
            title.style.fontSize = `${this.clampNumber(this.formattingSettings.title.fontSize.value, 8, 32)}px`;
            title.style.fontWeight = String(this.formattingSettings.title.fontWeight.value.value);
            title.textContent = this.safeText(this.formattingSettings.title.text.value, "Grafico");
            header.appendChild(title);
        }

        if (model && this.shouldShowSelector(model)) {
            header.appendChild(this.renderMeasureSelector(model));
        }

        return header;
    }

    private renderMeasureSelector(model: PieModel): HTMLElement {
        const select = document.createElement("select");
        select.className = "mpz-selector";
        select.title = "Selecionar valor";

        model.valueIndexes.forEach((index) => {
            const option = document.createElement("option");
            const column = this.lastDataView?.table?.columns[index];
            option.value = String(index);
            option.textContent = column?.displayName || "Valor";
            option.selected = index === model.valueIndex;
            select.appendChild(option);
        });

        select.addEventListener("change", () => {
            this.selectedValueIndex = Number(select.value);

            if (this.lastViewport) {
                this.render(this.lastDataView, this.lastViewport);
            }
        });

        return select;
    }

    private renderChart(model: PieModel, viewport: powerbi.IViewport): HTMLElement {
        const wrap = document.createElement("div");
        const tooltip = document.createElement("div");
        const svg = this.createSvg("svg");
        const legendPosition = this.getLegendPosition();
        const width = Math.max(180, viewport.width * (legendPosition === "right" || legendPosition === "left" ? 0.62 : 1));
        const height = Math.max(140, viewport.height - 58);
        const bounds = this.getArcBounds(width, height);

        wrap.className = "mpz-chart-wrap";
        tooltip.className = "mpz-tooltip";
        svg.classList.add("mpz-svg");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        if (this.getChartMode() === "rings") {
            this.renderRings(svg, model, bounds, tooltip);
        } else {
            this.renderPie(svg, model, bounds, tooltip);
        }

        wrap.appendChild(svg);
        wrap.appendChild(tooltip);
        return wrap;
    }

    private renderPie(svg: SVGSVGElement, model: PieModel, bounds: ArcBounds, tooltip: HTMLElement): void {
        const chart = this.formattingSettings.chart;
        const donut = this.formattingSettings.donut;
        const mode = this.getChartMode();
        const outerRadius = bounds.radius * this.clampNumber(donut.outerRadius.value, 35, 100) / 100;
        const innerRadius = mode === "pie"
            ? 0
            : outerRadius * this.clampNumber(donut.innerRadius.value, 0, 90) / 100;
        const pieGenerator = d3.pie<SliceItem>()
            .sort(null)
            .value((slice) => Math.max(0, slice.value))
            .startAngle(this.degToRad(this.clampNumber(chart.startAngle.value, -360, 360)))
            .endAngle(this.degToRad(this.clampNumber(chart.startAngle.value, -360, 360)) + Math.PI * 2)
            .padAngle(this.degToRad(this.clampNumber(chart.padAngle.value, 0, 8)));
        const arcGenerator = d3.arc<d3.PieArcDatum<SliceItem>>()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .cornerRadius(this.clampNumber(chart.cornerRadius.value, 0, 24));
        const labelArc = d3.arc<d3.PieArcDatum<SliceItem>>()
            .innerRadius(this.getLabelRadius(innerRadius, outerRadius))
            .outerRadius(this.getLabelRadius(innerRadius, outerRadius));
        const group = this.createSvg("g");

        group.setAttribute("transform", `translate(${bounds.centerX}, ${bounds.centerY})`);
        svg.appendChild(group);

        pieGenerator(model.slices).forEach((arcData) => {
            const path = this.createSvg("path");
            path.classList.add("mpz-slice");
            path.setAttribute("d", arcGenerator(arcData) || "");
            path.setAttribute("fill", arcData.data.color);
            path.setAttribute("stroke", this.color(donut.strokeColor.value.value, "#FFFFFF"));
            path.setAttribute("stroke-width", String(this.clampNumber(donut.strokeWidth.value, 0, 8)));
            this.bindTooltip(path, tooltip, arcData.data);
            group.appendChild(path);
            this.renderSliceLabel(group, arcData, labelArc);
        });

        this.renderCenter(group, model, innerRadius);
    }

    private renderRings(svg: SVGSVGElement, model: PieModel, bounds: ArcBounds, tooltip: HTMLElement): void {
        const rings = this.formattingSettings.rings;
        const chart = this.formattingSettings.chart;
        const ringWidth = this.clampNumber(rings.ringWidth.value, 3, 36);
        const ringGap = this.clampNumber(rings.ringGap.value, 0, 26);
        const capRadius = rings.roundedCaps.value ? ringWidth / 2 : 0;
        const maxRadius = bounds.radius * 0.92;
        const maxValue = Math.max(...model.slices.map((slice) => slice.value), 1);
        const group = this.createSvg("g");

        group.setAttribute("transform", `translate(${bounds.centerX}, ${bounds.centerY})`);
        svg.appendChild(group);

        model.slices.forEach((slice, index) => {
            const outerRadius = maxRadius - index * (ringWidth + ringGap);
            const innerRadius = outerRadius - ringWidth;

            if (innerRadius <= 4) {
                return;
            }

            const ratio = this.getRingRatio(slice, maxValue);
            const startAngle = this.degToRad(this.clampNumber(chart.startAngle.value, -360, 360));
            const endAngle = startAngle + Math.PI * 2 * ratio;
            const trackArc = d3.arc<void>()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
                .startAngle(startAngle)
                .endAngle(startAngle + Math.PI * 2);
            const valueArc = d3.arc<void>()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
                .cornerRadius(capRadius)
                .startAngle(startAngle)
                .endAngle(endAngle);
            const track = this.createSvg("path");
            track.classList.add("mpz-ring-track");
            track.setAttribute("d", trackArc() || "");
            track.style.fill = this.color(rings.trackColor.value.value, "#F0F1F7");
            track.style.opacity = String(this.clampNumber(rings.trackOpacity.value, 0, 100) / 100);
            group.appendChild(track);

            const value = this.createSvg("path");
            value.classList.add("mpz-ring-value");
            value.setAttribute("d", valueArc() || "");
            value.setAttribute("fill", slice.color);
            this.bindTooltip(value, tooltip, slice);
            group.appendChild(value);
        });
    }

    private renderSliceLabel(
        group: SVGGElement,
        arcData: d3.PieArcDatum<SliceItem>,
        labelArc: d3.Arc<unknown, d3.PieArcDatum<SliceItem>>
    ): void {
        const labels = this.formattingSettings.labels;
        const position = String(labels.position.value.value) as LabelPosition;

        if (position === "hidden") {
            return;
        }

        const label = this.getSliceLabel(arcData.data);

        if (!label) {
            return;
        }

        const [x, y] = labelArc.centroid(arcData);
        const text = this.createSvg("text");
        text.classList.add("mpz-label");
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(y));
        text.setAttribute("dy", "0.35em");
        text.setAttribute("fill", this.color(labels.color.value.value, "#1F2A55"));
        text.setAttribute("font-size", String(this.clampNumber(labels.fontSize.value, 7, 22)));
        text.textContent = label;
        group.appendChild(text);
    }

    private renderCenter(group: SVGGElement, model: PieModel, innerRadius: number): void {
        const center = this.formattingSettings.center;

        if (!center.show.value || innerRadius <= 18) {
            return;
        }

        if (center.showTotal.value) {
            const value = this.createSvg("text");
            value.classList.add("mpz-center-value");
            value.setAttribute("y", "-4");
            value.setAttribute("font-size", String(this.clampNumber(center.valueFontSize.value, 8, 34)));
            value.setAttribute("fill", this.color(center.valueColor.value.value, "#141D45"));
            value.textContent = this.formatValue(model.total);
            group.appendChild(value);
        }

        const label = this.createSvg("text");
        label.classList.add("mpz-center-label");
        label.setAttribute("y", center.showTotal.value ? "14" : "4");
        label.setAttribute("font-size", String(this.clampNumber(center.labelFontSize.value, 7, 24)));
        label.setAttribute("fill", this.color(center.labelColor.value.value, "#56607F"));
        label.textContent = this.safeText(center.label.value, "Total");
        group.appendChild(label);
    }

    private renderLegend(model: PieModel): HTMLElement {
        const legend = document.createElement("div");
        const settings = this.formattingSettings.legendStyle;
        legend.className = "mpz-legend";
        legend.style.fontSize = `${this.clampNumber(settings.fontSize.value, 7, 22)}px`;

        model.slices.forEach((slice) => {
            const item = document.createElement("div");
            item.className = "mpz-legend-item";

            const dot = document.createElement("span");
            dot.className = "mpz-legend-dot";
            dot.style.background = slice.color;
            item.appendChild(dot);

            const text = document.createElement("div");
            const main = document.createElement("div");
            const sub = document.createElement("div");
            main.className = "mpz-legend-main";
            main.style.color = this.color(settings.textColor.value.value, "#1F2A55");
            main.textContent = slice.label;
            sub.className = "mpz-legend-sub";
            sub.style.color = this.color(settings.mutedColor.value.value, "#6B7391");
            sub.textContent = this.getLegendDetail(slice);
            text.appendChild(main);
            text.appendChild(sub);
            item.appendChild(text);
            legend.appendChild(item);
        });

        return legend;
    }

    private buildModel(table: powerbi.DataViewTable | undefined): PieModel | undefined {
        if (!table || !table.rows || table.rows.length === 0) {
            return undefined;
        }

        const indexes = this.getColumnIndexes(table);

        if (!indexes || indexes.valueIndexes.length === 0) {
            return undefined;
        }

        const valueIndex = this.resolveValueIndex(indexes.valueIndexes);
        const measureDisplayName = table.columns[valueIndex].displayName || "Valor";
        const grouped = new Map<string, SliceItem>();
        const expectedMenu = this.getExpectedMenuName();
        const seenProjectedRows = new Set<string>();

        table.rows.forEach((row) => {
            if (expectedMenu && indexes.menuIndex !== undefined && !this.menuValueMatches(row[indexes.menuIndex], expectedMenu)) {
                return;
            }

            if (indexes.menuIndex !== undefined && !expectedMenu) {
                const projectedKey = this.getProjectedRowKey(row, indexes, valueIndex);

                if (seenProjectedRows.has(projectedKey)) {
                    return;
                }

                seenProjectedRows.add(projectedKey);
            }

            const label = this.safeText(this.formatPrimitive(row[indexes.categoryIndex]), "");
            const value = this.parseNumber(row[valueIndex]);

            if (!label || value === undefined) {
                return;
            }

            const key = this.normalizeKey(label);
            const existing = grouped.get(key);
            const tooltip = this.getTooltipText(row, indexes, table);

            if (existing) {
                existing.value += value;
                existing.extraTooltip = this.mergeTooltipText(existing.extraTooltip, tooltip);
            } else {
                grouped.set(key, {
                    color: "",
                    extraTooltip: tooltip,
                    label,
                    percent: 0,
                    value
                });
            }
        });

        const slices = this.prepareSlices(Array.from(grouped.values()));
        const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);

        slices.forEach((slice, index) => {
            slice.percent = total === 0 ? 0 : Math.max(0, slice.value) / total * 100;
            slice.color = this.getColor(index);
        });

        return {
            measureDisplayName,
            slices,
            total,
            valueIndex,
            valueIndexes: indexes.valueIndexes
        };
    }

    private prepareSlices(source: SliceItem[]): SliceItem[] {
        const sortMode = String(this.formattingSettings.chart.sortMode.value.value);
        const maxItems = this.clampNumber(this.formattingSettings.chart.maxItems.value, 1, 30);
        const items = [...source]
            .filter((slice) => slice.value > 0);

        if (sortMode === "desc") {
            items.sort((first, second) => second.value - first.value);
        } else if (sortMode === "asc") {
            items.sort((first, second) => first.value - second.value);
        }

        if (items.length <= maxItems) {
            return items;
        }

        const visible = items.slice(0, maxItems);

        if (!this.formattingSettings.chart.showOthers.value) {
            return visible;
        }

        const otherItems = items.slice(maxItems);
        const otherValue = otherItems.reduce((sum, slice) => sum + slice.value, 0);
        visible.push({
            color: "",
            extraTooltip: "",
            label: this.safeText(this.formattingSettings.chart.othersLabel.value, "Outros"),
            percent: 0,
            value: otherValue
        });
        return visible;
    }

    private getColumnIndexes(table: powerbi.DataViewTable): ColumnIndexes | undefined {
        const categoryIndex = this.getFirstIndexForRole(table, "category");

        if (categoryIndex === undefined) {
            return undefined;
        }

        return {
            categoryIndex,
            menuIndex: this.getFirstIndexForRole(table, "menu"),
            tooltipIndexes: this.getIndexesForRole(table, "tooltips"),
            valueIndexes: this.getIndexesForRole(table, "values")
        };
    }

    private resolveValueIndex(valueIndexes: number[]): number {
        if (this.selectedValueIndex !== undefined && valueIndexes.includes(this.selectedValueIndex)) {
            return this.selectedValueIndex;
        }

        this.selectedValueIndex = valueIndexes[0];
        return valueIndexes[0];
    }

    private getArcBounds(width: number, height: number): ArcBounds {
        const radius = Math.max(20, Math.min(width, height) * 0.42);
        return {
            centerX: width / 2,
            centerY: height / 2,
            height,
            radius,
            width
        };
    }

    private getLabelRadius(innerRadius: number, outerRadius: number): number {
        const position = String(this.formattingSettings.labels.position.value.value) as LabelPosition;

        if (position === "inside") {
            return innerRadius + (outerRadius - innerRadius) * 0.58;
        }

        return outerRadius + 13;
    }

    private getSliceLabel(slice: SliceItem): string {
        const labels = this.formattingSettings.labels;
        const parts: string[] = [];

        if (labels.showCategoryLabels.value) {
            parts.push(slice.label);
        }

        if (labels.showPercentLabels.value) {
            parts.push(this.formatPercent(slice.percent));
        }

        if (labels.showValueLabels.value) {
            parts.push(this.formatValue(slice.value));
        }

        return parts.join(" ");
    }

    private getLegendDetail(slice: SliceItem): string {
        const legend = this.formattingSettings.legendStyle;
        const details: string[] = [];

        if (legend.showPercent.value) {
            details.push(this.formatPercent(slice.percent));
        }

        if (legend.showValue.value) {
            details.push(this.formatValue(slice.value));
        }

        return details.join(" ");
    }

    private getRingRatio(slice: SliceItem, maxValue: number): number {
        const mode = String(this.formattingSettings.rings.scaleMode.value.value);

        if (mode === "percent") {
            return this.clampNumber(slice.value, 0, 100) / 100;
        }

        if (mode === "max") {
            return maxValue === 0 ? 0 : this.clampNumber(slice.value / maxValue, 0, 1);
        }

        if (slice.value <= 1) {
            return this.clampNumber(slice.value, 0, 1);
        }

        if (slice.value <= 100) {
            return this.clampNumber(slice.value, 0, 100) / 100;
        }

        return maxValue === 0 ? 0 : this.clampNumber(slice.value / maxValue, 0, 1);
    }

    private shouldShowSelector(model: PieModel): boolean {
        return this.formattingSettings.chart.measureSelector.value && model.valueIndexes.length > 1;
    }

    private getChartMode(): ChartMode {
        const value = String(this.formattingSettings.chart.chartMode.value.value);

        if (value === "pie" || value === "rings") {
            return value;
        }

        return "donut";
    }

    private getLegendPosition(): LegendPosition {
        const settings = this.formattingSettings.legendStyle;
        const value = String(settings.position.value.value);

        if (!settings.show.value || value === "hidden") {
            return "hidden";
        }

        if (value === "left" || value === "bottom") {
            return value;
        }

        return "right";
    }

    private bindTooltip(target: SVGElement, tooltip: HTMLElement, slice: SliceItem): void {
        target.addEventListener("mousemove", (event: MouseEvent) => {
            this.showTooltip(tooltip, event, slice);
        });
        target.addEventListener("mouseenter", (event: MouseEvent) => {
            this.showTooltip(tooltip, event, slice);
        });
        target.addEventListener("mouseleave", () => {
            tooltip.classList.remove("mpz-tooltip-visible");
        });
    }

    private showTooltip(tooltip: HTMLElement, event: MouseEvent, slice: SliceItem): void {
        if (!this.formattingSettings.tooltipStyle.show.value) {
            return;
        }

        const parent = tooltip.parentElement;

        if (!parent) {
            return;
        }

        while (tooltip.firstChild) {
            tooltip.removeChild(tooltip.firstChild);
        }

        const title = document.createElement("div");
        title.className = "mpz-tooltip-title";
        title.textContent = slice.label;
        tooltip.appendChild(title);

        const value = document.createElement("div");
        value.className = "mpz-tooltip-row";
        value.textContent = `Valor: ${this.formatValue(slice.value)}`;
        tooltip.appendChild(value);

        const percent = document.createElement("div");
        percent.className = "mpz-tooltip-row";
        percent.textContent = `Percentual: ${this.formatPercent(slice.percent)}`;
        tooltip.appendChild(percent);

        if (slice.extraTooltip) {
            const extra = document.createElement("div");
            extra.className = "mpz-tooltip-extra";
            extra.textContent = slice.extraTooltip;
            tooltip.appendChild(extra);
        }

        const rect = parent.getBoundingClientRect();
        const x = event.clientX - rect.left + 12;
        const y = event.clientY - rect.top - 12;
        tooltip.style.left = `${Math.min(x, Math.max(rect.width - 170, 0))}px`;
        tooltip.style.top = `${Math.max(y, 0)}px`;
        tooltip.classList.add("mpz-tooltip-visible");
    }

    private getColor(index: number): string {
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

    private formatPercent(value: number): string {
        const decimals = this.clampNumber(this.formattingSettings.labels.decimalPlaces.value, 0, 6);
        return `${value.toFixed(decimals)}%`;
    }

    private formatValue(value: number): string {
        const labels = this.formattingSettings.labels;
        const format = String(labels.valueFormat.value.value);
        const decimals = this.clampNumber(labels.decimalPlaces.value, 0, 6);
        const prefix = this.safeText(labels.prefix.value, "");
        const suffix = this.safeText(labels.suffix.value, "");
        let formatted = value.toLocaleString(undefined, {
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals
        });

        if (format === "currency") {
            return `${prefix || "R$ "}${formatted}${suffix}`;
        }

        if (format === "percent") {
            return `${prefix}${value.toFixed(decimals)}${suffix || "%"}`;
        }

        if (format === "percentFraction") {
            formatted = (value * 100).toFixed(decimals);
            return `${prefix}${formatted}${suffix || "%"}`;
        }

        return `${prefix}${formatted}${suffix}`;
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

    private getIndexesForRole(table: powerbi.DataViewTable, roleName: string): number[] {
        return table.columns
            .map((column, index) => ({ column, index }))
            .filter((columnInfo) => Boolean(columnInfo.column.roles && columnInfo.column.roles[roleName]))
            .map((columnInfo) => columnInfo.index);
    }

    private getFirstIndexForRole(table: powerbi.DataViewTable, roleName: string): number | undefined {
        return this.getIndexesForRole(table, roleName)[0];
    }

    private shouldRenderForMenu(table: powerbi.DataViewTable | undefined): boolean {
        const menuFilter = this.formattingSettings.menuFilter;

        if (!menuFilter.enabled.value) {
            return true;
        }

        const expectedMenu = this.getExpectedMenuName();

        if (!expectedMenu) {
            return true;
        }

        if (!table || !table.rows || table.rows.length === 0) {
            return false;
        }

        const menuIndex = this.getFirstIndexForRole(table, "menu");

        if (menuIndex === undefined) {
            return false;
        }

        return table.rows.some((row) => this.menuValueMatches(row[menuIndex], expectedMenu));
    }

    private getExpectedMenuName(): string {
        const menuFilter = this.formattingSettings.menuFilter;

        if (!menuFilter.enabled.value) {
            return "";
        }

        return this.normalizeKey(menuFilter.menuName.value);
    }

    private getProjectedRowKey(row: PrimitiveValue[], indexes: ColumnIndexes, valueIndex: number): string {
        return [
            this.formatPrimitive(row[indexes.categoryIndex]),
            this.formatPrimitive(row[valueIndex]),
            ...indexes.tooltipIndexes.map((index) => this.formatPrimitive(row[index]))
        ].join("\u001F");
    }

    private menuValueMatches(value: PrimitiveValue, expectedMenu: string): boolean {
        const rawValue = this.formatPrimitive(value);
        const normalizedValue = this.normalizeKey(rawValue);

        if (!normalizedValue) {
            return false;
        }

        if (normalizedValue === expectedMenu) {
            return true;
        }

        return rawValue
            .split(/[|;,\n\r]+/)
            .some((menuName) => this.normalizeKey(menuName) === expectedMenu);
    }

    private hideVisual(): void {
        this.clearRoot();
        this.root.style.display = "none";
        this.root.style.opacity = "0";
        this.root.style.visibility = "hidden";
        this.hostElement.style.background = "transparent";
        this.hostElement.style.border = "0";
        this.hostElement.style.boxShadow = "none";
        this.hostElement.style.pointerEvents = "none";
    }

    private showVisual(): void {
        this.root.style.display = "";
        this.root.style.opacity = "";
        this.root.style.visibility = "";
        this.hostElement.style.background = "";
        this.hostElement.style.border = "";
        this.hostElement.style.boxShadow = "";
        this.hostElement.style.pointerEvents = "";
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
        const tooltip = this.formattingSettings.tooltipStyle;
        this.root.style.setProperty("--mpz-bg", this.color(layout.backgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mpz-border", this.color(layout.borderColor.value.value, "#E9ECF5"));
        this.root.style.setProperty("--mpz-border-width", `${this.clampNumber(layout.borderWidth.value, 0, 8)}px`);
        this.root.style.setProperty("--mpz-radius", `${this.clampNumber(layout.borderRadius.value, 0, 48)}px`);
        this.root.style.setProperty("--mpz-padding", `${this.clampNumber(layout.padding.value, 0, 60)}px`);
        this.root.style.setProperty("--mpz-font", this.safeText(layout.fontFamily.value, "Segoe UI"));
        this.root.style.setProperty("--mpz-text", this.color(this.formattingSettings.title.color.value.value, "#141D45"));
        this.root.style.setProperty("--mpz-muted", this.color(this.formattingSettings.legendStyle.mutedColor.value.value, "#6B7391"));
        this.root.style.setProperty("--mpz-tooltip-bg", this.color(tooltip.backgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--mpz-tooltip-text", this.color(tooltip.textColor.value.value, "#141D45"));
        this.root.style.setProperty("--mpz-shadow", layout.showShadow.value ? "0 16px 34px rgba(19, 28, 69, 0.08)" : "none");
    }

    private renderEmpty(message: string): HTMLElement {
        const empty = document.createElement("div");
        empty.className = "mpz-empty";
        empty.textContent = message;
        return empty;
    }

    private renderError(): void {
        this.clearRoot();
        const card = document.createElement("div");
        card.className = "mpz-card";
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
        return this.safeText(value, "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    private degToRad(value: number): number {
        return value * Math.PI / 180;
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
