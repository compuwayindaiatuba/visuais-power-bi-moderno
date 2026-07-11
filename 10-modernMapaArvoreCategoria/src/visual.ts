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
    levelIndexes: number[];
    levelNames: string[];
    menuIndex?: number;
    sortIndex?: number;
    tooltipIndexes: number[];
    valueIndex: number;
}

interface TreeNode {
    children: Map<string, TreeNode>;
    color?: string;
    firstOrder: number;
    isOthers?: boolean;
    key: string;
    label: string;
    level: number;
    path: string[];
    sortNumber?: number;
    sortText: string;
    tooltipText: string;
    value: number;
}

interface TreeModel {
    currentNode: TreeNode;
    levelNames: string[];
    root: TreeNode;
    visibleNodes: TreeNode[];
}

interface TreemapDatum {
    children?: TreemapDatum[];
    node?: TreeNode;
    value?: number;
}

const DEFAULT_COLORS = [
    "#2F6BFF",
    "#77B1FF",
    "#2DBFB3",
    "#895CF6",
    "#FFBF2F",
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
    private readonly rootElement: HTMLElement;
    private readonly visualId: string;
    private drillPath: string[] = [];
    private formattingSettings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.visualId = `marv-${Date.now().toString(36)}-${visualInstanceCounter++}`;
        this.rootElement = document.createElement("div");
        this.rootElement.className = "marv-root";
        options.element.classList.add("modern-arvore-host");
        options.element.appendChild(this.rootElement);
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
                hideVisualElement(this.rootElement);
                this.events.renderingFinished(options);
                return;
            }

            showVisualElement(this.rootElement);
            this.render(dataView, options);
            this.events.renderingFinished(options);
        } catch (error) {
            showVisualElement(this.rootElement);
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
        card.className = "marv-card";
        card.appendChild(this.renderHeader());

        if (!model || model.root.value <= 0 || model.levelNames.length === 0) {
            card.appendChild(this.renderEmpty("Adicione os Niveis da arvore e Valores para montar a hierarquia."));
            this.rootElement.appendChild(card);
            return;
        }

        this.ensureValidPath(model.root);
        model.currentNode = this.getCurrentNode(model.root);
        model.visibleNodes = this.getVisibleNodes(model.currentNode);

        if (this.formattingSettings.navigation.showLevelBar.value || this.formattingSettings.navigation.showInstruction.value) {
            card.appendChild(this.renderNavigation(model, dataView, options));
        }

        const body = document.createElement("div");
        body.className = this.formattingSettings.sidePanel.show.value ? "marv-body" : "marv-body no-side";

        const chart = document.createElement("div");
        chart.className = "marv-chart";
        body.appendChild(chart);

        if (this.formattingSettings.sidePanel.show.value) {
            body.appendChild(this.renderSidePanel(model));
        }

        card.appendChild(body);

        if (this.formattingSettings.footer.show.value) {
            card.appendChild(this.renderFooter());
        }

        this.rootElement.appendChild(card);
        this.renderTreemap(chart, model, dataView, options);
    }

    private renderHeader(): HTMLElement {
        const settings = this.formattingSettings.header;
        const header = document.createElement("div");
        header.className = "marv-header";

        if (settings.showIcon.value) {
            const iconBox = document.createElement("div");
            iconBox.className = "marv-header-icon";
            iconBox.style.background = this.color(settings.iconBackground.value.value, "#EEF3FF");
            iconBox.appendChild(this.renderTreeIcon(this.color(settings.iconColor.value.value, "#2F6BFF")));
            header.appendChild(iconBox);
        }

        const text = document.createElement("div");
        text.className = "marv-heading-text";

        const title = document.createElement("div");
        title.className = "marv-title";
        title.style.color = this.color(settings.titleColor.value.value, "#101828");
        title.style.fontSize = `${this.clampNumber(settings.titleFontSize.value, 12, 44)}px`;
        title.textContent = this.safeText(settings.title.value, "Mapa de Arvore - Hierarquia");
        text.appendChild(title);

        const subtitle = document.createElement("div");
        subtitle.className = "marv-subtitle";
        subtitle.style.color = this.color(settings.subtitleColor.value.value, "#667085");
        subtitle.style.fontSize = `${this.clampNumber(settings.subtitleFontSize.value, 8, 28)}px`;
        subtitle.textContent = this.safeText(settings.subtitle.value, "Visualize o desempenho por Regiao, Estado e Categoria");
        text.appendChild(subtitle);

        header.appendChild(text);
        return header;
    }

    private renderNavigation(model: TreeModel, dataView: powerbi.DataView | undefined, options: VisualUpdateOptions): HTMLElement {
        const settings = this.formattingSettings.navigation;
        const nav = document.createElement("div");
        nav.className = "marv-navigation";

        if (settings.showLevelBar.value) {
            const levelBar = document.createElement("div");
            levelBar.className = "marv-levels";
            const currentLevelIndex = this.drillPath.length;

            model.levelNames.forEach((name, index) => {
                const chip = document.createElement("button");
                chip.className = index === currentLevelIndex ? "marv-level active" : "marv-level";
                chip.type = "button";
                chip.style.setProperty("--marv-level-color", index === currentLevelIndex
                    ? this.color(settings.activeLevelColor.value.value, "#2F6BFF")
                    : this.color(settings.inactiveLevelColor.value.value, "#667085"));

                const label = document.createElement("span");
                label.className = "marv-level-index";
                label.textContent = `${this.safeText(settings.levelLabelPrefix.value, "Nivel")} ${index + 1}`;
                chip.appendChild(label);

                const value = document.createElement("span");
                value.className = "marv-level-name";
                value.textContent = this.drillPath[index] || name;
                chip.appendChild(value);

                chip.disabled = index > this.drillPath.length;
                chip.addEventListener("click", () => {
                    this.drillPath = this.drillPath.slice(0, index);
                    this.render(dataView, options);
                });

                levelBar.appendChild(chip);
            });

            nav.appendChild(levelBar);
        }

        const actions = document.createElement("div");
        actions.className = "marv-nav-actions";

        if (settings.showInstruction.value) {
            const instruction = document.createElement("div");
            instruction.className = "marv-instruction";
            instruction.textContent = this.safeText(settings.instructionText.value, "Clique em um bloco para navegar para o proximo nivel");
            actions.appendChild(instruction);
        }

        if (settings.showBackButton.value && this.drillPath.length > 0) {
            const back = document.createElement("button");
            back.className = "marv-back";
            back.type = "button";
            back.textContent = this.safeText(settings.backText.value, "Voltar");
            back.addEventListener("click", () => {
                this.drillPath = this.drillPath.slice(0, -1);
                this.render(dataView, options);
            });
            actions.appendChild(back);
        }

        nav.appendChild(actions);
        return nav;
    }

    private renderTreemap(container: HTMLElement, model: TreeModel, dataView: powerbi.DataView | undefined, options: VisualUpdateOptions): void {
        const settings = this.formattingSettings.tree;
        const rect = container.getBoundingClientRect();
        const fallbackWidth = Math.max(1, options.viewport.width - 340);
        const fallbackHeight = Math.max(1, options.viewport.height - 230);
        const width = Math.max(1, Math.floor(rect.width || container.clientWidth || fallbackWidth));
        const height = Math.max(1, Math.floor(rect.height || container.clientHeight || fallbackHeight));
        const gap = this.clampNumber(settings.blockGap.value, 0, 24);
        const outerPadding = this.clampNumber(settings.outerPadding.value, 0, 40);
        const total = Math.max(1, model.currentNode.value);

        if (model.visibleNodes.length === 0) {
            container.appendChild(this.renderEmpty("Este nivel nao possui subcategorias."));
            return;
        }

        const rootData: TreemapDatum = {
            children: model.visibleNodes.map((node) => ({
                node,
                value: node.value
            }))
        };
        const root = d3.hierarchy(rootData).sum((datum) => datum.value || 0);
        const layout = d3.treemap<TreemapDatum>()
            .size([width, height])
            .paddingInner(gap)
            .paddingOuter(outerPadding)
            .round(true)
            .tile(d3.treemapSquarify.ratio(1.35));
        const treemapRoot = layout(root);

        const svg = document.createElementNS(SVG_NAMESPACE, "svg");
        svg.setAttribute("class", "marv-svg");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("role", "img");
        container.appendChild(svg);

        const defs = document.createElementNS(SVG_NAMESPACE, "defs");
        svg.appendChild(defs);

        treemapRoot.leaves().forEach((leaf, index) => {
            const node = leaf.data.node;

            if (!node) {
                return;
            }

            node.color = this.getBlockColor(index);
            this.renderNodeBlock(
                svg,
                defs,
                node,
                index,
                leaf.x0,
                leaf.y0,
                Math.max(0, leaf.x1 - leaf.x0),
                Math.max(0, leaf.y1 - leaf.y0),
                total,
                dataView,
                options
            );
        });
    }

    private renderNodeBlock(
        svg: SVGSVGElement,
        defs: SVGDefsElement,
        node: TreeNode,
        index: number,
        x: number,
        y: number,
        width: number,
        height: number,
        total: number,
        dataView: powerbi.DataView | undefined,
        options: VisualUpdateOptions
    ): void {
        if (width <= 0 || height <= 0) {
            return;
        }

        const settings = this.formattingSettings.tree;
        const radius = this.clampNumber(settings.blockRadius.value, 0, 30);
        const color = node.color || this.getBlockColor(index);
        const gradientId = `${this.visualId}-gradient-${index}`;
        const clipId = `${this.visualId}-clip-${index}`;
        const hasChildren = node.children.size > 0 && !node.isOthers;

        const gradient = document.createElementNS(SVG_NAMESPACE, "linearGradient");
        gradient.setAttribute("id", gradientId);
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("y2", "100%");
        this.appendStop(gradient, "0%", this.mixWithWhite(color, 0.14));
        this.appendStop(gradient, "62%", color);
        this.appendStop(gradient, "100%", this.mixWithBlack(color, 0.1));
        defs.appendChild(gradient);

        const clipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
        clipPath.setAttribute("id", clipId);
        const clipRect = document.createElementNS(SVG_NAMESPACE, "rect");
        clipRect.setAttribute("width", String(width));
        clipRect.setAttribute("height", String(height));
        clipRect.setAttribute("rx", String(radius));
        clipRect.setAttribute("ry", String(radius));
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);

        const group = document.createElementNS(SVG_NAMESPACE, "g");
        group.setAttribute("class", hasChildren ? "marv-block has-children" : "marv-block");
        group.setAttribute("transform", `translate(${x}, ${y})`);
        svg.appendChild(group);

        const title = document.createElementNS(SVG_NAMESPACE, "title");
        title.textContent = this.getTooltipTitle(node, total);
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

        this.renderBlockLabels(group, node, width, height, clipId, total);

        if (hasChildren && settings.showExpandButton.value) {
            this.renderExpandButton(group, width, height);
        }

        if (hasChildren) {
            group.addEventListener("click", () => {
                this.drillPath = [...this.drillPath, node.label];
                this.render(dataView, options);
            });
        }
    }

    private renderBlockLabels(group: SVGGElement, node: TreeNode, width: number, height: number, clipId: string, total: number): void {
        const settings = this.formattingSettings.tree;
        const area = width * height;
        const minArea = this.clampNumber(settings.hideLabelsBelowArea.value, 0, 30000);

        if (area < minArea) {
            return;
        }

        const lines: { text: string; size: number; weight: string }[] = [];

        if (settings.showCategory.value) {
            lines.push({
                text: node.label,
                size: this.clampNumber(settings.categoryFontSize.value, 8, 40),
                weight: "760"
            });
        }

        if (settings.showValue.value) {
            lines.push({
                text: this.formatValue(node.value),
                size: this.clampNumber(settings.valueFontSize.value, 8, 44),
                weight: "800"
            });
        }

        if (settings.showPercent.value) {
            lines.push({
                text: this.formatPercent(total === 0 ? 0 : node.value / total * 100),
                size: this.clampNumber(settings.percentFontSize.value, 8, 36),
                weight: "500"
            });
        }

        if (lines.length === 0) {
            return;
        }

        const text = document.createElementNS(SVG_NAMESPACE, "text");
        text.setAttribute("class", "marv-block-text");
        text.setAttribute("x", String(width / 2));
        text.setAttribute("y", String(height / 2));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("clip-path", `url(#${clipId})`);
        text.setAttribute("fill", this.color(settings.labelColor.value.value, "#FFFFFF"));
        group.appendChild(text);

        const lineGap = 7;
        const totalHeight = lines.reduce((sum, line) => sum + line.size, 0) + Math.max(0, lines.length - 1) * lineGap;
        let firstLine = true;

        lines.forEach((line) => {
            const tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
            const size = this.getFittedFontSize(line.size, width, line.text);
            tspan.setAttribute("x", String(width / 2));
            tspan.setAttribute("dy", String(firstLine ? -totalHeight / 2 + size : size + lineGap));
            tspan.setAttribute("font-size", String(size));
            tspan.setAttribute("font-weight", line.weight);
            tspan.textContent = this.truncateText(line.text, width, size);
            text.appendChild(tspan);
            firstLine = false;
        });
    }

    private renderExpandButton(group: SVGGElement, width: number, height: number): void {
        if (width < 54 || height < 46) {
            return;
        }

        const buttonSize = Math.min(36, Math.max(26, Math.min(width, height) * 0.16));
        const x = Math.max(10, width - buttonSize - 14);
        const y = Math.max(10, height - buttonSize - 14);

        const box = document.createElementNS(SVG_NAMESPACE, "rect");
        box.setAttribute("class", "marv-expand-box");
        box.setAttribute("x", String(x));
        box.setAttribute("y", String(y));
        box.setAttribute("width", String(buttonSize));
        box.setAttribute("height", String(buttonSize));
        box.setAttribute("rx", String(Math.min(10, buttonSize / 3)));
        box.setAttribute("ry", String(Math.min(10, buttonSize / 3)));
        group.appendChild(box);

        const arrow = document.createElementNS(SVG_NAMESPACE, "text");
        arrow.setAttribute("class", "marv-expand-arrow");
        arrow.setAttribute("x", String(x + buttonSize / 2));
        arrow.setAttribute("y", String(y + buttonSize / 2 + 1));
        arrow.setAttribute("text-anchor", "middle");
        arrow.setAttribute("dominant-baseline", "middle");
        arrow.setAttribute("font-size", String(Math.max(16, buttonSize * 0.62)));
        arrow.textContent = ">";
        group.appendChild(arrow);
    }

    private renderSidePanel(model: TreeModel): HTMLElement {
        const settings = this.formattingSettings.sidePanel;
        const panel = document.createElement("div");
        panel.className = "marv-side";
        panel.style.background = this.color(settings.backgroundColor.value.value, "#FFFFFF");
        panel.style.borderColor = this.color(settings.borderColor.value.value, "#E6EAF2");
        panel.style.setProperty("--marv-side-text", this.color(settings.textColor.value.value, "#101828"));
        panel.style.setProperty("--marv-side-muted", this.color(settings.mutedColor.value.value, "#667085"));

        const summary = document.createElement("div");
        summary.className = "marv-side-card";
        summary.appendChild(this.sideTitle(this.safeText(settings.summaryTitle.value, "Resumo Geral")));
        summary.appendChild(this.sideMetric(this.safeText(settings.totalLabel.value, "Total de Vendas"), this.formatValue(model.root.value)));
        summary.appendChild(this.sideMetric(this.safeText(settings.currentLevelLabel.value, "Nivel atual"), this.getCurrentLevelName(model)));
        summary.appendChild(this.sideMetric(this.safeText(settings.nextLevelLabel.value, "Proximo nivel"), this.getNextLevelName(model)));
        summary.appendChild(this.sideMetric(this.safeText(settings.itemsLabel.value, "Itens visiveis"), String(model.visibleNodes.length)));
        panel.appendChild(summary);

        const performance = document.createElement("div");
        performance.className = "marv-side-card";
        performance.appendChild(this.sideTitle(this.safeText(settings.performanceTitle.value, "Desempenho (%)")));
        performance.appendChild(this.renderPerformanceBar());

        const ranked = [...model.visibleNodes].sort((first, second) => second.value - first.value);
        const max = ranked[0];
        const min = ranked[ranked.length - 1];

        if (max) {
            performance.appendChild(this.renderPerformanceItem(this.safeText(settings.maxLabel.value, "Maior desempenho"), max, model.currentNode.value, true));
        }

        if (min && min !== max) {
            performance.appendChild(this.renderPerformanceItem(this.safeText(settings.minLabel.value, "Menor desempenho"), min, model.currentNode.value, false));
        }

        panel.appendChild(performance);
        return panel;
    }

    private sideTitle(text: string): HTMLElement {
        const title = document.createElement("div");
        title.className = "marv-side-title";
        title.textContent = text;
        return title;
    }

    private sideMetric(labelText: string, valueText: string): HTMLElement {
        const metric = document.createElement("div");
        metric.className = "marv-side-metric";

        const label = document.createElement("div");
        label.className = "marv-side-label";
        label.textContent = labelText;
        metric.appendChild(label);

        const value = document.createElement("div");
        value.className = "marv-side-value";
        value.textContent = valueText;
        metric.appendChild(value);
        return metric;
    }

    private renderPerformanceBar(): HTMLElement {
        const wrap = document.createElement("div");
        wrap.className = "marv-perf-bar";
        const bar = document.createElement("div");
        bar.className = "marv-perf-gradient";
        wrap.appendChild(bar);

        const ticks = document.createElement("div");
        ticks.className = "marv-perf-ticks";
        ["0%", "25%", "50%", "75%", "100%"].forEach((tick) => {
            const span = document.createElement("span");
            span.textContent = tick;
            ticks.appendChild(span);
        });
        wrap.appendChild(ticks);
        return wrap;
    }

    private renderPerformanceItem(label: string, node: TreeNode, total: number, isMax: boolean): HTMLElement {
        const item = document.createElement("div");
        item.className = "marv-perf-item";

        const heading = document.createElement("div");
        heading.className = "marv-perf-label";
        heading.textContent = label;
        item.appendChild(heading);

        const row = document.createElement("div");
        row.className = "marv-perf-row";

        const dot = document.createElement("span");
        dot.className = "marv-perf-dot";
        dot.style.background = isMax ? "#2DBFB3" : "#F05A5A";
        row.appendChild(dot);

        const text = document.createElement("span");
        text.textContent = `${node.path.join(" / ")} - ${this.formatPercent(total === 0 ? 0 : node.value / total * 100)}`;
        row.appendChild(text);
        item.appendChild(row);

        const value = document.createElement("div");
        value.className = "marv-perf-value";
        value.textContent = this.formatValue(node.value);
        item.appendChild(value);
        return item;
    }

    private renderFooter(): HTMLElement {
        const settings = this.formattingSettings.footer;
        const footer = document.createElement("div");
        footer.className = "marv-footer";
        footer.style.color = this.color(settings.color.value.value, "#667085");
        footer.style.fontSize = `${this.clampNumber(settings.fontSize.value, 8, 26)}px`;

        const bulb = document.createElement("span");
        bulb.className = "marv-bulb";
        bulb.textContent = "i";
        footer.appendChild(bulb);

        const text = document.createElement("span");
        text.textContent = this.safeText(settings.text.value, "Navegue pelos niveis clicando nos blocos ou use os niveis para voltar.");
        footer.appendChild(text);
        return footer;
    }

    private buildModel(table?: powerbi.DataViewTable): TreeModel | undefined {
        if (!table || !table.rows || table.rows.length === 0) {
            return undefined;
        }

        const indexes = this.getColumnIndexes(table);

        if (!indexes || indexes.levelIndexes.length === 0) {
            return undefined;
        }

        const rootNode = this.createNode("root", "root", -1, [], 0);

        table.rows.forEach((row, rowIndex) => {
            const value = this.parseNumber(row[indexes.valueIndex]);

            if (value === undefined || value <= 0) {
                return;
            }

            const path = indexes.levelIndexes
                .map((index) => this.safeText(this.formatPrimitive(row[index]), ""))
                .filter(Boolean);

            if (path.length === 0) {
                return;
            }

            const tooltipText = this.getTooltipText(row, indexes, table);
            const sortPrimitive = indexes.sortIndex === undefined ? undefined : row[indexes.sortIndex];
            const sortNumber = sortPrimitive === undefined ? undefined : this.parseNumber(sortPrimitive);
            const sortText = sortPrimitive === undefined ? "" : this.safeText(this.formatPrimitive(sortPrimitive), "");

            rootNode.value += value;
            let current = rootNode;

            path.forEach((label, levelIndex) => {
                const key = this.normalizeKey(label);
                const existing = current.children.get(key);
                const nextPath = path.slice(0, levelIndex + 1);
                const child = existing || this.createNode(key, label, levelIndex, nextPath, rowIndex);

                if (!existing) {
                    current.children.set(key, child);
                }

                child.value += value;
                child.tooltipText = this.mergeText(child.tooltipText, tooltipText);

                if (child.sortNumber === undefined && sortNumber !== undefined) {
                    child.sortNumber = sortNumber;
                }

                if (!child.sortText && sortText) {
                    child.sortText = sortText;
                }

                current = child;
            });
        });

        if (rootNode.value <= 0) {
            return undefined;
        }

        this.ensureValidPath(rootNode);
        const currentNode = this.getCurrentNode(rootNode);

        return {
            currentNode,
            levelNames: indexes.levelNames,
            root: rootNode,
            visibleNodes: this.getVisibleNodes(currentNode)
        };
    }

    private createNode(key: string, label: string, level: number, path: string[], firstOrder: number): TreeNode {
        return {
            children: new Map<string, TreeNode>(),
            firstOrder,
            key,
            label,
            level,
            path,
            sortText: "",
            tooltipText: "",
            value: 0
        };
    }

    private getColumnIndexes(table: powerbi.DataViewTable): ColumnIndexes | undefined {
        const levelIndexes = this.getIndexesForRole(table, "levels");
        const valueIndex = this.getFirstIndexForRole(table, "values");

        if (levelIndexes.length === 0 || valueIndex === undefined) {
            return undefined;
        }

        return {
            levelIndexes,
            levelNames: levelIndexes.map((index) => table.columns[index].displayName),
            menuIndex: this.getFirstIndexForRole(table, "menu"),
            sortIndex: this.getFirstIndexForRole(table, "sortOrder"),
            tooltipIndexes: this.getIndexesForRole(table, "tooltips"),
            valueIndex
        };
    }

    private ensureValidPath(root: TreeNode): void {
        let current = root;
        const validPath: string[] = [];

        for (const label of this.drillPath) {
            const child = current.children.get(this.normalizeKey(label));

            if (!child) {
                break;
            }

            validPath.push(child.label);
            current = child;
        }

        this.drillPath = validPath;
    }

    private getCurrentNode(root: TreeNode): TreeNode {
        let current = root;

        this.drillPath.forEach((label) => {
            const child = current.children.get(this.normalizeKey(label));

            if (child) {
                current = child;
            }
        });

        return current;
    }

    private getVisibleNodes(parent: TreeNode): TreeNode[] {
        const sorted = this.sortNodes(Array.from(parent.children.values()));
        const maxItems = Math.floor(this.clampNumber(this.formattingSettings.ranking.maxItems.value, 1, 40));

        if (sorted.length <= maxItems) {
            return sorted;
        }

        if (!this.formattingSettings.ranking.showOthers.value || maxItems <= 1) {
            return sorted.slice(0, maxItems);
        }

        const visible = sorted.slice(0, maxItems - 1);
        const rest = sorted.slice(maxItems - 1);
        const others = this.createNode("others", this.safeText(this.formattingSettings.ranking.othersLabel.value, "Outros"), parent.level + 1, [...parent.path, "Outros"], rest[0]?.firstOrder || 0);
        others.isOthers = true;

        rest.forEach((node) => {
            others.value += node.value;
            others.tooltipText = this.mergeText(others.tooltipText, `${node.label}: ${this.formatValue(node.value)}`);
        });

        return [...visible, others];
    }

    private sortNodes(nodes: TreeNode[]): TreeNode[] {
        const sortMode = String(this.formattingSettings.ranking.sortMode.value.value) as SortMode;
        const sorted = [...nodes];

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

    private compareSortValues(first: TreeNode, second: TreeNode): number {
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

    private getCurrentLevelName(model: TreeModel): string {
        return model.levelNames[this.drillPath.length] || "Fim";
    }

    private getNextLevelName(model: TreeModel): string {
        return model.levelNames[this.drillPath.length + 1] || "Sem proximo nivel";
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

    private renderTreeIcon(color: string): SVGSVGElement {
        const svg = document.createElementNS(SVG_NAMESPACE, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", color);
        svg.setAttribute("stroke-width", "2.1");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");

        ["M12 6v5", "M6 14v-3h12v3"].forEach((pathValue) => {
            const path = document.createElementNS(SVG_NAMESPACE, "path");
            path.setAttribute("d", pathValue);
            svg.appendChild(path);
        });

        [
            { x: 9, y: 3, w: 6, h: 5 },
            { x: 3, y: 15, w: 6, h: 5 },
            { x: 15, y: 15, w: 6, h: 5 }
        ].forEach((rectValue) => {
            const rect = document.createElementNS(SVG_NAMESPACE, "rect");
            rect.setAttribute("x", String(rectValue.x));
            rect.setAttribute("y", String(rectValue.y));
            rect.setAttribute("width", String(rectValue.w));
            rect.setAttribute("height", String(rectValue.h));
            rect.setAttribute("rx", "1.6");
            svg.appendChild(rect);
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

    private getTooltipTitle(node: TreeNode, total: number): string {
        const parts = [
            node.path.join(" / "),
            `Valor: ${this.formatValue(node.value)}`,
            `Participacao: ${this.formatPercent(total === 0 ? 0 : node.value / total * 100)}`
        ];

        if (node.children.size > 0 && !node.isOthers) {
            parts.push("Clique para expandir");
        }

        if (node.tooltipText) {
            parts.push(node.tooltipText);
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
        this.rootElement.style.setProperty("--marv-bg", this.color(layout.backgroundColor.value.value, "#FFFFFF"));
        this.rootElement.style.setProperty("--marv-border", this.color(layout.borderColor.value.value, "#E6EAF2"));
        this.rootElement.style.setProperty("--marv-radius", `${this.clampNumber(layout.borderRadius.value, 0, 48)}px`);
        this.rootElement.style.setProperty("--marv-padding", `${this.clampNumber(layout.padding.value, 8, 64)}px`);
        this.rootElement.style.setProperty("--marv-font", this.safeText(layout.fontFamily.value, "Segoe UI"));
        this.rootElement.style.setProperty("--marv-shadow", layout.showShadow.value ? "0 18px 44px rgba(15, 23, 42, 0.10)" : "none");
    }

    private renderEmpty(message: string): HTMLElement {
        const empty = document.createElement("div");
        empty.className = "marv-empty";
        empty.textContent = message;
        return empty;
    }

    private renderError(): void {
        this.clearRoot();
        this.applyRootStyles();
        const card = document.createElement("div");
        card.className = "marv-card";
        card.appendChild(this.renderEmpty("Nao foi possivel renderizar a arvore."));
        this.rootElement.appendChild(card);
    }

    private clearRoot(): void {
        while (this.rootElement.firstChild) {
            this.rootElement.removeChild(this.rootElement.firstChild);
        }
    }

    private getFittedFontSize(baseSize: number, width: number, text: string): number {
        if (!text) {
            return baseSize;
        }

        const approximateWidth = text.length * baseSize * 0.54;

        if (approximateWidth <= width * 0.84) {
            return baseSize;
        }

        return Math.max(8, Math.floor(width * 0.84 / Math.max(1, text.length * 0.54)));
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
