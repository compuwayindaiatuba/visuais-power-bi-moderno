"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import IFilter = powerbi.IFilter;
import ISelectionId = powerbi.extensibility.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";
import { VisualFormattingSettingsModel } from "./settings";

type VisualMode = "blocks" | "list" | "dropdown" | "timeline";
type SortMode = "source" | "labelAsc" | "labelDesc" | "valueAsc" | "valueDesc";
type TimelineRange = "all" | "today" | "1d" | "7d" | "1m" | "3m" | "6m" | "1y" | "custom";
type IconName = "calendar" | "check" | "chevron" | "filter" | "refresh" | "search" | "sort";

interface FilterTarget {
    table: string;
    column: string;
}

interface BasicFilter extends IFilter {
    $schema: string;
    target: FilterTarget;
    operator: "In";
    values: PrimitiveValue[];
}

interface BasicFilterLike extends IFilter {
    target?: FilterTarget;
    operator?: string;
    values?: PrimitiveValue[];
}

interface ModernSlicerItem {
    key: string;
    label: string;
    rawValue: PrimitiveValue;
    numericValue?: number;
    displayValue: string;
    iconText: string;
    date?: Date;
    index: number;
    selectionId: ISelectionId;
}

interface ViewModel {
    categoryColumn?: DataViewCategoryColumn;
    valueColumn?: DataViewValueColumn;
    items: ModernSlicerItem[];
}

interface TimelinePeriodOption {
    key: TimelineRange;
    label: string;
    visible: boolean;
}

const dayInMilliseconds: number = 24 * 60 * 60 * 1000;
const basicFilterSchema: string = "http" + "://powerbi.com/product/schema#basic";

const iconPaths: Record<IconName, string[]> = {
    calendar: [
        "M7 2v4",
        "M17 2v4",
        "M3 9h18",
        "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
    ],
    check: [
        "M20 6 9 17l-5-5"
    ],
    chevron: [
        "m6 9 6 6 6-6"
    ],
    filter: [
        "M3 5h18l-7 8v5l-4 2v-7L3 5Z"
    ],
    refresh: [
        "M21 12a9 9 0 0 1-15 6.7",
        "M3 12a9 9 0 0 1 15-6.7",
        "M3 16v5h5",
        "M21 8V3h-5"
    ],
    search: [
        "M21 21l-4.35-4.35",
        "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
    ],
    sort: [
        "M7 4v16",
        "m3 7-3-3-3 3",
        "M17 20V4",
        "m-3 9 3 3 3-3"
    ]
};

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly host: IVisualHost;
    private readonly root: HTMLElement;
    private readonly selectionManager: ISelectionManager;
    private categoryColumn?: DataViewCategoryColumn;
    private formattingSettings: VisualFormattingSettingsModel;
    private items: ModernSlicerItem[] = [];
    private locale: string;
    private runtimeSortMode?: SortMode;
    private searchTerm: string = "";
    private selectedKeys: Set<string> = new Set<string>();
    private selectedOnly: boolean = false;
    private activeTimelineRange: TimelineRange = "all";
    private dropdownOpen: boolean = false;
    private lastSortSetting: SortMode = "source";
    private restoreSearchFocus: boolean = false;
    private restoreSearchCaret: number = 0;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.locale = options.host.locale || "pt-BR";
        this.root = document.createElement("section");
        this.root.className = "modern-slicer";
        options.element.appendChild(this.root);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView: DataView = this.getDataView(options);
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

            this.syncRuntimeSortWithSettings();

            const viewModel: ViewModel = this.createViewModel(dataView);
            this.categoryColumn = viewModel.categoryColumn;
            this.items = viewModel.items;
            this.syncSelectionFromHost(options.jsonFilters);
            this.pruneSelection();
            this.render();

            this.events.renderingFinished(options);
        } catch (error) {
            this.renderError();
            this.events.renderingFailed(options, error instanceof Error ? error.message : String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private getDataView(options: VisualUpdateOptions): DataView {
        const dataViews: DataView[] | undefined = options.dataViews;

        if (dataViews && dataViews.length > 0 && dataViews[0]) {
            return dataViews[0];
        }

        return {
            metadata: {
                columns: []
            }
        } as DataView;
    }

    private createViewModel(dataView: DataView): ViewModel {
        const mode: VisualMode = this.getVisualMode();
        const categories: DataViewCategoryColumn[] = dataView.categorical?.categories || [];
        const categoryColumn: DataViewCategoryColumn | undefined =
            categories.find((column: DataViewCategoryColumn) => Boolean(column.source.roles?.category));
        const dateColumn: DataViewCategoryColumn | undefined =
            categories.find((column: DataViewCategoryColumn) => Boolean(column.source.roles?.date));
        const primaryColumn: DataViewCategoryColumn | undefined =
            mode === "timeline" ? dateColumn || categoryColumn : categoryColumn || dateColumn || categories[0];
        const iconColumn: DataViewCategoryColumn | undefined =
            categories.find((column: DataViewCategoryColumn) => Boolean(column.source.roles?.icon));
        const valueColumn: DataViewValueColumn | undefined =
            dataView.categorical?.values?.find((column: DataViewValueColumn) => Boolean(column.source.roles?.measure)) ||
            dataView.categorical?.values?.[0];

        if (!primaryColumn) {
            return {
                items: []
            };
        }

        const items: ModernSlicerItem[] = primaryColumn.values.map((rawValue: PrimitiveValue, index: number) => {
            const label: string = this.primitiveToText(rawValue);
            const iconText: string = this.getIconText(iconColumn, index, label);
            const numericValue: number | undefined = this.getNumericValue(valueColumn, index);

            return {
                key: this.getKey(rawValue),
                label,
                rawValue,
                numericValue,
                displayValue: this.formatValue(valueColumn?.values[index], valueColumn),
                iconText,
                date: this.parseDate(rawValue),
                index,
                selectionId: this.host.createSelectionIdBuilder().withCategory(primaryColumn, index).createSelectionId()
            };
        });

        return {
            categoryColumn: primaryColumn,
            valueColumn,
            items
        };
    }

    private render(): void {
        const mode: VisualMode = this.getVisualMode();

        this.applyStyleSettings();
        this.root.className = `modern-slicer modern-slicer--${mode}`;
        this.clearElement(this.root);

        if (this.isEnabled(this.formattingSettings.layout.showHeader.value)) {
            this.renderHeader(this.root, mode);
        }

        if (this.items.length === 0) {
            this.renderLanding(this.root);
            return;
        }

        if (mode !== "timeline" && this.isEnabled(this.formattingSettings.behavior.searchEnabled.value)) {
            this.renderSearch(this.root);
        }

        switch (mode) {
            case "list":
                this.renderList(this.root);
                break;
            case "dropdown":
                this.renderDropdown(this.root);
                break;
            case "timeline":
                this.renderTimeline(this.root);
                break;
            default:
                this.renderBlocks(this.root);
                break;
        }
    }

    private renderHeader(parent: HTMLElement, mode: VisualMode): void {
        const header: HTMLElement = document.createElement("header");
        header.className = "modern-slicer__header";

        const copy: HTMLElement = document.createElement("div");
        copy.className = "modern-slicer__copy";

        const title: HTMLHeadingElement = document.createElement("h2");
        title.textContent = this.getTitle(mode);
        copy.appendChild(title);

        const subtitle: HTMLParagraphElement = document.createElement("p");
        subtitle.textContent = this.getSubtitle(mode);
        copy.appendChild(subtitle);

        header.appendChild(copy);

        if (this.isEnabled(this.formattingSettings.layout.showToolbar.value)) {
            const toolbar: HTMLElement = document.createElement("div");
            toolbar.className = "modern-slicer__toolbar";

            if (mode !== "timeline") {
                const selectedOnlyButton: HTMLButtonElement = this.createIconButton(
                    "Mostrar apenas selecionados",
                    "filter",
                    "modern-slicer__icon-button",
                    () => {
                        this.selectedOnly = !this.selectedOnly;
                        this.render();
                    }
                );

                if (this.selectedOnly) {
                    selectedOnlyButton.classList.add("modern-slicer__icon-button--active");
                }

                toolbar.appendChild(selectedOnlyButton);

                toolbar.appendChild(this.createIconButton(
                    "Alternar classificacao",
                    "sort",
                    "modern-slicer__icon-button",
                    () => {
                        this.cycleSortMode();
                        this.render();
                    }
                ));
            }

            if (this.selectedKeys.size > 0) {
                toolbar.appendChild(this.createIconButton(
                    "Limpar selecao",
                    "refresh",
                    "modern-slicer__icon-button",
                    () => this.clearSelection()
                ));
            }

            header.appendChild(toolbar);
        }

        parent.appendChild(header);
    }

    private renderSearch(parent: HTMLElement): void {
        const search: HTMLElement = document.createElement("label");
        search.className = "modern-slicer__search";
        this.appendIcon(search, "search");

        const input: HTMLInputElement = document.createElement("input");
        input.type = "search";
        input.placeholder = "Buscar...";
        input.value = this.searchTerm;
        input.addEventListener("input", () => {
            this.restoreSearchCaret = input.selectionStart ?? input.value.length;
            this.restoreSearchFocus = true;
            this.searchTerm = input.value;
            this.dropdownOpen = false;
            this.render();
        });

        search.appendChild(input);
        parent.appendChild(search);

        if (this.restoreSearchFocus) {
            const caretPosition: number = Math.min(this.restoreSearchCaret, input.value.length);
            this.restoreSearchFocus = false;
            window.setTimeout(() => {
                input.focus();
                input.setSelectionRange(caretPosition, caretPosition);
            }, 0);
        }
    }

    private renderBlocks(parent: HTMLElement): void {
        const grid: HTMLElement = document.createElement("div");
        grid.className = "modern-slicer__items modern-slicer__items--blocks";
        grid.style.gridTemplateColumns = `repeat(${this.getColumnCount()}, minmax(0, 1fr))`;

        this.getVisibleItems().forEach((item: ModernSlicerItem) => {
            grid.appendChild(this.createItemButton(item, "modern-slicer__block"));
        });

        parent.appendChild(grid);
        this.renderFooter(parent);
    }

    private renderList(parent: HTMLElement): void {
        const list: HTMLElement = document.createElement("div");
        list.className = "modern-slicer__items modern-slicer__items--list";

        this.getVisibleItems().forEach((item: ModernSlicerItem) => {
            list.appendChild(this.createItemButton(item, "modern-slicer__row"));
        });

        parent.appendChild(list);
        this.renderFooter(parent);
    }

    private renderDropdown(parent: HTMLElement): void {
        const wrapper: HTMLElement = document.createElement("div");
        wrapper.className = "modern-slicer__dropdown";

        const trigger: HTMLButtonElement = document.createElement("button");
        trigger.type = "button";
        trigger.className = "modern-slicer__dropdown-trigger";
        trigger.addEventListener("click", () => {
            this.dropdownOpen = !this.dropdownOpen;
            this.render();
        });

        const selectedItems: ModernSlicerItem[] = this.getSelectedItems();
        const label: HTMLSpanElement = document.createElement("span");
        label.textContent = this.getDropdownLabel(selectedItems);
        trigger.appendChild(label);
        this.appendIcon(trigger, "chevron");
        wrapper.appendChild(trigger);

        if (this.dropdownOpen) {
            const menu: HTMLElement = document.createElement("div");
            menu.className = "modern-slicer__dropdown-menu";

            const allButton: HTMLButtonElement = document.createElement("button");
            allButton.type = "button";
            allButton.className = "modern-slicer__dropdown-option modern-slicer__dropdown-option--all";
            allButton.textContent = "Todos os itens";
            allButton.addEventListener("click", () => this.clearSelection());
            menu.appendChild(allButton);

            this.getVisibleItems().forEach((item: ModernSlicerItem) => {
                const option: HTMLButtonElement = this.createItemButton(item, "modern-slicer__dropdown-option");
                option.addEventListener("click", () => {
                    this.dropdownOpen = false;
                });
                menu.appendChild(option);
            });

            wrapper.appendChild(menu);
        }

        parent.appendChild(wrapper);
        this.renderFooter(parent);
    }

    private renderTimeline(parent: HTMLElement): void {
        const dateItems: ModernSlicerItem[] = this.getTimelineItems();

        if (dateItems.length === 0) {
            this.renderTimelineEmpty(parent);
            return;
        }

        const controls: HTMLElement = document.createElement("div");
        controls.className = "modern-slicer__periods";

        this.getVisibleTimelinePeriods().forEach((period: TimelinePeriodOption) => {
            const button: HTMLButtonElement = document.createElement("button");
            button.type = "button";
            button.className = "modern-slicer__period";
            button.textContent = period.label;

            if (this.activeTimelineRange === period.key) {
                button.classList.add("modern-slicer__period--active");
            }

            if (period.key === "custom") {
                button.classList.add("modern-slicer__period--custom");
                this.appendIcon(button, "calendar");
                button.addEventListener("click", () => {
                    this.activeTimelineRange = "custom";
                    this.render();
                });
            } else {
                button.addEventListener("click", () => this.applyTimelineRange(period.key));
            }

            controls.appendChild(button);
        });

        if (controls.childElementCount > 0) {
            parent.appendChild(controls);
        }

        const rangeLabels: HTMLElement = document.createElement("div");
        rangeLabels.className = "modern-slicer__range-labels";

        const selectedDateItems: ModernSlicerItem[] = this.getSelectedItems().filter((item: ModernSlicerItem) => item.date);
        const visibleRange: ModernSlicerItem[] = selectedDateItems.length > 0 ? selectedDateItems : dateItems;

        const firstDate: Date = visibleRange[0].date as Date;
        const lastDate: Date = visibleRange[visibleRange.length - 1].date as Date;
        rangeLabels.appendChild(this.createTextSpan(this.formatDate(firstDate)));
        rangeLabels.appendChild(this.createTextSpan(this.formatDate(lastDate)));
        parent.appendChild(rangeLabels);

        const timeline: HTMLElement = document.createElement("div");
        timeline.className = "modern-slicer__timeline";

        timeline.appendChild(this.createTimelineTrack(dateItems));

        if (this.isEnabled(this.formattingSettings.timeline.showHistogram.value)) {
            timeline.appendChild(this.createHistogram(dateItems));
            timeline.appendChild(this.createTimelineAxis(dateItems));
        }

        parent.appendChild(timeline);
        this.renderFooter(parent);
    }

    private renderFooter(parent: HTMLElement): void {
        const showCount: boolean = this.isEnabled(this.formattingSettings.behavior.showSelectedCount.value);

        if (!showCount && this.selectedKeys.size === 0) {
            return;
        }

        const footer: HTMLElement = document.createElement("footer");
        footer.className = "modern-slicer__footer";

        if (showCount) {
            const counter: HTMLSpanElement = document.createElement("span");
            counter.textContent = `Selecionados: ${this.selectedKeys.size}`;
            footer.appendChild(counter);
        }

        if (this.selectedKeys.size > 0) {
            const clearButton: HTMLButtonElement = document.createElement("button");
            clearButton.type = "button";
            clearButton.className = "modern-slicer__clear";
            clearButton.textContent = "Limpar selecao";
            clearButton.addEventListener("click", () => this.clearSelection());
            footer.appendChild(clearButton);
        }

        parent.appendChild(footer);
    }

    private renderLanding(parent: HTMLElement): void {
        const landing: HTMLElement = document.createElement("div");
        landing.className = "modern-slicer__landing";

        const title: HTMLHeadingElement = document.createElement("h3");
        title.textContent = "Adicione uma categoria";
        landing.appendChild(title);

        const message: HTMLParagraphElement = document.createElement("p");
        message.textContent = "Use Categoria para listas/blocos ou Data para linha do tempo. Valor e Icone sao opcionais.";
        landing.appendChild(message);

        parent.appendChild(landing);
    }

    private renderTimelineEmpty(parent: HTMLElement): void {
        const empty: HTMLElement = document.createElement("div");
        empty.className = "modern-slicer__landing";

        const title: HTMLHeadingElement = document.createElement("h3");
        title.textContent = "Use uma coluna de data";
        empty.appendChild(title);

        const message: HTMLParagraphElement = document.createElement("p");
        message.textContent = "A linha do tempo precisa do campo Data ou de uma Categoria com datas validas.";
        empty.appendChild(message);

        parent.appendChild(empty);
    }

    private renderError(): void {
        this.clearElement(this.root);
        const error: HTMLElement = document.createElement("div");
        error.className = "modern-slicer__landing";
        error.textContent = "Nao foi possivel renderizar a segmentacao.";
        this.root.appendChild(error);
    }

    private createItemButton(item: ModernSlicerItem, className: string): HTMLButtonElement {
        const button: HTMLButtonElement = document.createElement("button");
        const isSelected: boolean = this.selectedKeys.has(item.key);
        button.type = "button";
        button.className = className;
        button.title = item.label;
        button.setAttribute("aria-pressed", String(isSelected));

        if (isSelected) {
            button.classList.add("modern-slicer__item--selected");
        }

        button.addEventListener("click", () => this.toggleItemSelection(item));
        button.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            this.showContextMenu(item, event);
        });

        if (this.isEnabled(this.formattingSettings.behavior.showIcons.value)) {
            const icon: HTMLElement = document.createElement("span");
            icon.className = "modern-slicer__item-icon";
            icon.textContent = item.iconText;
            button.appendChild(icon);
        }

        const content: HTMLElement = document.createElement("span");
        content.className = "modern-slicer__item-content";

        const label: HTMLElement = document.createElement("span");
        label.className = "modern-slicer__item-label";
        label.textContent = item.label;
        content.appendChild(label);

        if (this.isEnabled(this.formattingSettings.behavior.showValues.value) && item.displayValue) {
            const value: HTMLElement = document.createElement("span");
            value.className = "modern-slicer__item-value";
            value.textContent = item.displayValue;
            content.appendChild(value);
        }

        button.appendChild(content);

        const marker: HTMLElement = document.createElement("span");
        marker.className = "modern-slicer__check";

        if (isSelected) {
            this.appendIcon(marker, "check");
        }

        button.appendChild(marker);

        return button;
    }

    private createTimelineTrack(items: ModernSlicerItem[]): HTMLElement {
        const track: HTMLElement = document.createElement("div");
        track.className = "modern-slicer__track";
        track.title = "Clique e arraste para selecionar um intervalo";
        track.appendChild(this.createTimelineRange(items));

        track.addEventListener("pointerdown", (event: PointerEvent) => {
            if (event.button !== 0 || items.length === 0) {
                return;
            }

            event.preventDefault();
            const rect: DOMRect = track.getBoundingClientRect();
            const startIndex: number = this.getTimelineIndexFromPointer(event.clientX, rect, items.length);

            const handlePointerMove = (moveEvent: PointerEvent): void => {
                moveEvent.preventDefault();
                const endIndex: number = this.getTimelineIndexFromPointer(moveEvent.clientX, rect, items.length);
                this.selectTimelineIndexRange(items, startIndex, endIndex, false);
            };

            const handlePointerUp = (upEvent: PointerEvent): void => {
                upEvent.preventDefault();
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);

                const endIndex: number = this.getTimelineIndexFromPointer(upEvent.clientX, rect, items.length);
                this.selectTimelineIndexRange(items, startIndex, endIndex, true);
            };

            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            this.selectTimelineIndexRange(items, startIndex, startIndex, false);
        });

        return track;
    }

    private createTimelineRange(items: ModernSlicerItem[]): HTMLElement {
        const range: HTMLElement = document.createElement("div");
        range.className = "modern-slicer__track-range";

        const selectedIndices: number[] = items
            .map((item: ModernSlicerItem, index: number) => this.selectedKeys.has(item.key) ? index : -1)
            .filter((index: number) => index >= 0);

        if (selectedIndices.length === 0 || items.length === 1) {
            range.style.left = "0%";
            range.style.width = selectedIndices.length === 0 ? "0%" : "100%";
            return range;
        }

        const first: number = Math.min(...selectedIndices);
        const last: number = Math.max(...selectedIndices);
        const maxIndex: number = Math.max(items.length - 1, 1);
        const left: number = (first / maxIndex) * 100;
        const width: number = ((last - first) / maxIndex) * 100;

        range.style.left = `${left}%`;
        range.style.width = `${Math.max(width, 2)}%`;

        const leftHandle: HTMLElement = document.createElement("span");
        leftHandle.className = "modern-slicer__handle modern-slicer__handle--left";
        range.appendChild(leftHandle);

        const rightHandle: HTMLElement = document.createElement("span");
        rightHandle.className = "modern-slicer__handle modern-slicer__handle--right";
        range.appendChild(rightHandle);

        return range;
    }

    private getTimelineIndexFromPointer(clientX: number, rect: DOMRect, itemCount: number): number {
        const width: number = Math.max(rect.width, 1);
        const ratio: number = Math.max(0, Math.min(1, (clientX - rect.left) / width));
        return Math.max(0, Math.min(itemCount - 1, Math.round(ratio * (itemCount - 1))));
    }

    private selectTimelineIndexRange(
        items: ModernSlicerItem[],
        startIndex: number,
        endIndex: number,
        applyFilter: boolean
    ): void {
        const firstIndex: number = Math.min(startIndex, endIndex);
        const lastIndex: number = Math.max(startIndex, endIndex);
        const nextSelection: Set<string> = new Set<string>();

        items.forEach((item: ModernSlicerItem, index: number) => {
            if (index >= firstIndex && index <= lastIndex) {
                nextSelection.add(item.key);
            }
        });

        this.activeTimelineRange = "custom";
        this.selectedKeys = nextSelection;

        if (applyFilter) {
            this.applySelection();
        }

        this.render();
    }

    private createHistogram(items: ModernSlicerItem[]): HTMLElement {
        const histogram: HTMLElement = document.createElement("div");
        histogram.className = "modern-slicer__histogram";

        const maxValue: number = Math.max(
            ...items.map((item: ModernSlicerItem) => item.numericValue || 1),
            1
        );

        items.forEach((item: ModernSlicerItem, index: number) => {
            const bar: HTMLButtonElement = document.createElement("button");
            const isSelected: boolean = this.selectedKeys.has(item.key);
            const fallbackHeight: number = 18 + ((index % 7) * 6);
            const valueHeight: number = item.numericValue ? 16 + ((item.numericValue / maxValue) * 52) : fallbackHeight;

            bar.type = "button";
            bar.className = "modern-slicer__bar";
            bar.title = item.label;
            bar.style.height = `${Math.max(12, Math.min(valueHeight, 68))}px`;

            if (isSelected) {
                bar.classList.add("modern-slicer__bar--selected");
            }

            bar.addEventListener("click", () => {
                this.activeTimelineRange = "custom";
                this.toggleItemSelection(item);
            });
            bar.addEventListener("contextmenu", (event: MouseEvent) => {
                event.preventDefault();
                this.showContextMenu(item, event);
            });

            histogram.appendChild(bar);
        });

        return histogram;
    }

    private createTimelineAxis(items: ModernSlicerItem[]): HTMLElement {
        const axis: HTMLElement = document.createElement("div");
        axis.className = "modern-slicer__timeline-axis";

        if (items.length === 0) {
            return axis;
        }

        const firstIndex: number = 0;
        const middleIndex: number = Math.floor((items.length - 1) / 2);
        const lastIndex: number = items.length - 1;
        const labelIndexes: number[] = [firstIndex, middleIndex, lastIndex]
            .filter((index: number, position: number, source: number[]) => source.indexOf(index) === position);

        labelIndexes.forEach((index: number) => {
            const label: HTMLSpanElement = document.createElement("span");
            label.textContent = this.formatTimelineAxisDate(items[index].date as Date);
            axis.appendChild(label);
        });

        return axis;
    }

    private createTextSpan(text: string): HTMLSpanElement {
        const span: HTMLSpanElement = document.createElement("span");
        span.textContent = text;
        return span;
    }

    private createIconButton(title: string, icon: IconName, className: string, handler: () => void): HTMLButtonElement {
        const button: HTMLButtonElement = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.addEventListener("click", () => handler());
        this.appendIcon(button, icon);
        return button;
    }

    private appendIcon(parent: HTMLElement, icon: IconName): void {
        const svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");

        iconPaths[icon].forEach((pathData: string) => {
            const path: SVGPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "currentColor");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            path.setAttribute("stroke-width", "2");
            svg.appendChild(path);
        });

        parent.appendChild(svg);
    }

    private toggleItemSelection(item: ModernSlicerItem): void {
        const mode: VisualMode = this.getVisualMode();
        const allowMultiSelect: boolean =
            this.isEnabled(this.formattingSettings.behavior.multiSelect.value) && mode !== "dropdown";
        const nextSelection: Set<string> = new Set<string>(this.selectedKeys);

        if (!allowMultiSelect) {
            if (nextSelection.has(item.key)) {
                nextSelection.clear();
            } else {
                nextSelection.clear();
                nextSelection.add(item.key);
            }
        } else if (nextSelection.has(item.key)) {
            nextSelection.delete(item.key);
        } else {
            nextSelection.add(item.key);
        }

        if (mode === "timeline") {
            this.activeTimelineRange = "custom";
        }

        this.selectedKeys = nextSelection;
        this.applySelection();
        this.render();
    }

    private clearSelection(): void {
        this.selectedKeys.clear();
        this.selectedOnly = false;
        this.activeTimelineRange = "all";
        this.dropdownOpen = false;
        this.selectionManager.clear();
        this.host.applyJsonFilter(null as powerbi.IFilter, "general", "filter", powerbi.FilterAction.remove);
        this.render();
    }

    private applySelection(): void {
        const selectedItems: ModernSlicerItem[] = this.getSelectedItems();

        if (selectedItems.length === 0) {
            this.selectionManager.clear();
            this.host.applyJsonFilter(null as powerbi.IFilter, "general", "filter", powerbi.FilterAction.remove);
            return;
        }

        this.selectionManager.select(
            selectedItems.map((item: ModernSlicerItem) => item.selectionId),
            false
        );

        const filterTarget: FilterTarget | undefined = this.getFilterTarget();

        if (!filterTarget) {
            return;
        }

        const filter: BasicFilter = {
            $schema: basicFilterSchema,
            target: filterTarget,
            operator: "In",
            values: selectedItems.map((item: ModernSlicerItem) => item.rawValue)
        };

        this.host.applyJsonFilter(filter, "general", "filter", powerbi.FilterAction.merge);
    }

    private showContextMenu(item: ModernSlicerItem, event: MouseEvent): void {
        if (!this.selectedKeys.has(item.key)) {
            this.selectedKeys.clear();
            this.selectedKeys.add(item.key);
            this.applySelection();
            this.render();
        }

        this.selectionManager.showContextMenu(item.selectionId, {
            x: event.clientX,
            y: event.clientY
        });
    }

    private getVisibleTimelinePeriods(): TimelinePeriodOption[] {
        const timelineSettings = this.formattingSettings.timeline;
        const periods: TimelinePeriodOption[] = [
            { key: "all", label: "Tudo", visible: this.isEnabled(timelineSettings.showAllPeriod.value) },
            { key: "today", label: "Hoje", visible: this.isEnabled(timelineSettings.showTodayPeriod.value) },
            { key: "1d", label: "1D", visible: this.isEnabled(timelineSettings.showOneDayPeriod.value) },
            { key: "7d", label: "7D", visible: this.isEnabled(timelineSettings.showSevenDaysPeriod.value) },
            { key: "1m", label: "1M", visible: this.isEnabled(timelineSettings.showOneMonthPeriod.value) },
            { key: "3m", label: "3M", visible: this.isEnabled(timelineSettings.showThreeMonthsPeriod.value) },
            { key: "6m", label: "6M", visible: this.isEnabled(timelineSettings.showSixMonthsPeriod.value) },
            { key: "1y", label: "1A", visible: this.isEnabled(timelineSettings.showOneYearPeriod.value) },
            { key: "custom", label: "Personalizado", visible: this.isEnabled(timelineSettings.showCustomPeriod.value) }
        ];

        return periods.filter((period: TimelinePeriodOption) => period.visible);
    }

    private applyTimelineRange(range: TimelineRange): void {
        this.activeTimelineRange = range;

        if (range === "all") {
            this.clearSelection();
            return;
        }

        const dateItems: ModernSlicerItem[] = this.getTimelineItems();

        if (dateItems.length === 0) {
            return;
        }

        const maxDate: Date = dateItems[dateItems.length - 1].date as Date;
        const today: Date = this.startOfDay(new Date());
        let startDate: Date;
        let endDate: Date = maxDate;

        switch (range) {
            case "today":
                startDate = today;
                endDate = today;
                break;
            case "1d":
                startDate = maxDate;
                endDate = maxDate;
                break;
            case "7d":
                startDate = new Date(maxDate.getTime() - (6 * dayInMilliseconds));
                break;
            case "1m":
                startDate = this.addMonths(maxDate, -1);
                break;
            case "3m":
                startDate = this.addMonths(maxDate, -3);
                break;
            case "6m":
                startDate = this.addMonths(maxDate, -6);
                break;
            case "1y":
                startDate = this.addMonths(maxDate, -12);
                break;
            default:
                startDate = dateItems[0].date as Date;
                break;
        }

        const startTime: number = this.startOfDay(startDate).getTime();
        const endTime: number = this.endOfDay(endDate).getTime();
        const nextSelection: Set<string> = new Set<string>();

        dateItems.forEach((item: ModernSlicerItem) => {
            const itemTime: number = (item.date as Date).getTime();

            if (itemTime >= startTime && itemTime <= endTime) {
                nextSelection.add(item.key);
            }
        });

        this.selectedKeys = nextSelection;
        this.applySelection();
        this.render();
    }

    private getVisibleItems(): ModernSlicerItem[] {
        const maxItems: number = this.getMaxItems();
        const normalizedSearch: string = this.normalize(this.searchTerm);
        let visibleItems: ModernSlicerItem[] = this.items.slice();

        if (this.selectedOnly && this.selectedKeys.size > 0) {
            visibleItems = visibleItems.filter((item: ModernSlicerItem) => this.selectedKeys.has(item.key));
        }

        if (normalizedSearch) {
            visibleItems = visibleItems.filter((item: ModernSlicerItem) =>
                this.normalize(item.label).indexOf(normalizedSearch) >= 0
            );
        }

        return this.sortItems(visibleItems).slice(0, maxItems);
    }

    private getTimelineItems(): ModernSlicerItem[] {
        return this.items
            .filter((item: ModernSlicerItem) => item.date)
            .sort((first: ModernSlicerItem, second: ModernSlicerItem) =>
                (first.date as Date).getTime() - (second.date as Date).getTime()
            )
            .slice(0, this.getMaxItems());
    }

    private getSelectedItems(): ModernSlicerItem[] {
        return this.items.filter((item: ModernSlicerItem) => this.selectedKeys.has(item.key));
    }

    private sortItems(items: ModernSlicerItem[]): ModernSlicerItem[] {
        const sortMode: SortMode = this.getSortMode();
        const sortedItems: ModernSlicerItem[] = items.slice();

        sortedItems.sort((first: ModernSlicerItem, second: ModernSlicerItem) => {
            switch (sortMode) {
                case "labelAsc":
                    return first.label.localeCompare(second.label, this.locale);
                case "labelDesc":
                    return second.label.localeCompare(first.label, this.locale);
                case "valueAsc":
                    return this.getComparableValue(first) - this.getComparableValue(second);
                case "valueDesc":
                    return this.getComparableValue(second) - this.getComparableValue(first);
                default:
                    return first.index - second.index;
            }
        });

        return sortedItems;
    }

    private getComparableValue(item: ModernSlicerItem): number {
        return item.numericValue ?? Number.NEGATIVE_INFINITY;
    }

    private syncRuntimeSortWithSettings(): void {
        const sortMode: SortMode = this.getSortModeFromSettings();

        if (sortMode !== this.lastSortSetting) {
            this.runtimeSortMode = undefined;
            this.lastSortSetting = sortMode;
        }
    }

    private cycleSortMode(): void {
        const modes: SortMode[] = ["source", "labelAsc", "labelDesc", "valueDesc", "valueAsc"];
        const currentMode: SortMode = this.getSortMode();
        const currentIndex: number = modes.indexOf(currentMode);
        this.runtimeSortMode = modes[(currentIndex + 1) % modes.length];
    }

    private syncSelectionFromHost(jsonFilters: IFilter[] | undefined): void {
        if (!jsonFilters || !this.categoryColumn) {
            return;
        }

        const filterTarget: FilterTarget | undefined = this.getFilterTarget();

        if (!filterTarget) {
            return;
        }

        const matchingFilter: BasicFilterLike | undefined = jsonFilters
            .map((filter: IFilter) => filter as BasicFilterLike)
            .find((filter: BasicFilterLike) =>
                filter.operator === "In" &&
                Array.isArray(filter.values) &&
                this.targetsMatch(filter.target, filterTarget)
            );

        if (!matchingFilter || !matchingFilter.values) {
            if (jsonFilters.length === 0) {
                this.selectedKeys.clear();
            }

            return;
        }

        this.selectedKeys = new Set<string>(
            matchingFilter.values.map((value: PrimitiveValue) => this.getKey(value))
        );
    }

    private pruneSelection(): void {
        const availableKeys: Set<string> = new Set<string>(this.items.map((item: ModernSlicerItem) => item.key));

        this.selectedKeys.forEach((key: string) => {
            if (!availableKeys.has(key)) {
                this.selectedKeys.delete(key);
            }
        });

        if (this.selectedKeys.size === 0) {
            this.selectedOnly = false;
        }
    }

    private getFilterTarget(): FilterTarget | undefined {
        const queryName: string | undefined = this.categoryColumn?.source.queryName;

        if (!queryName || queryName.indexOf(".") < 0) {
            return undefined;
        }

        const parts: string[] = queryName.split(".");
        const column: string | undefined = parts.pop();
        const table: string = parts.join(".");

        if (!column || !table) {
            return undefined;
        }

        return {
            table: this.cleanQueryNamePart(table),
            column: this.cleanQueryNamePart(column)
        };
    }

    private targetsMatch(first: FilterTarget | undefined, second: FilterTarget): boolean {
        return Boolean(first && first.table === second.table && first.column === second.column);
    }

    private cleanQueryNamePart(part: string): string {
        return part.replace(/^\[|\]$/g, "").replace(/^'|'$/g, "");
    }

    private getVisualMode(): VisualMode {
        const rawValue: string = String(this.formattingSettings.layout.visualMode.value.value);

        if (rawValue === "list" || rawValue === "dropdown" || rawValue === "timeline") {
            return rawValue;
        }

        return "blocks";
    }

    private getSortMode(): SortMode {
        return this.runtimeSortMode || this.getSortModeFromSettings();
    }

    private getSortModeFromSettings(): SortMode {
        const rawValue: string = String(this.formattingSettings.behavior.sortBy.value.value);

        if (rawValue === "labelAsc" || rawValue === "labelDesc" || rawValue === "valueAsc" || rawValue === "valueDesc") {
            return rawValue;
        }

        return "source";
    }

    private getTitle(mode: VisualMode): string {
        const configuredTitle: string = this.formattingSettings.layout.title.value.trim();

        if (configuredTitle) {
            return configuredTitle;
        }

        switch (mode) {
            case "list":
                return "Segmentacao em Lista";
            case "dropdown":
                return "Segmentacao Suspensa";
            case "timeline":
                return "Segmentacao Linha do Tempo";
            default:
                return "Segmentacao de Blocos";
        }
    }

    private getSubtitle(mode: VisualMode): string {
        const configuredSubtitle: string = this.formattingSettings.layout.subtitle.value.trim();

        if (configuredSubtitle) {
            return configuredSubtitle;
        }

        if (mode === "dropdown") {
            return "Selecione uma opcao";
        }

        if (mode === "timeline") {
            return "Selecione um periodo";
        }

        return "Selecione uma ou mais opcoes";
    }

    private getDropdownLabel(selectedItems: ModernSlicerItem[]): string {
        if (selectedItems.length === 0) {
            return "Todos os itens";
        }

        if (selectedItems.length === 1) {
            return selectedItems[0].label;
        }

        return `${selectedItems.length} selecionados`;
    }

    private getMaxItems(): number {
        return Math.max(1, Math.min(1000, Math.round(this.formattingSettings.layout.maxItems.value || 200)));
    }

    private getColumnCount(): number {
        return Math.max(1, Math.min(4, Math.round(this.formattingSettings.layout.columnCount.value || 2)));
    }

    private getNumericValue(valueColumn: DataViewValueColumn | undefined, index: number): number | undefined {
        const value: PrimitiveValue | undefined = valueColumn?.values[index];
        return typeof value === "number" ? value : undefined;
    }

    private getIconText(iconColumn: DataViewCategoryColumn | undefined, index: number, label: string): string {
        if (iconColumn) {
            const iconValue: string = this.primitiveToText(iconColumn.values[index]).trim();

            if (iconValue) {
                return iconValue.slice(0, 3);
            }
        }

        const initials: string = label
            .split(/\s+/)
            .filter((part: string) => part.length > 0)
            .slice(0, 2)
            .map((part: string) => part.charAt(0).toUpperCase())
            .join("");

        return initials || "?";
    }

    private primitiveToText(value: PrimitiveValue | null | undefined): string {
        if (value === null || value === undefined || value === "") {
            return "Em branco";
        }

        if (value instanceof Date) {
            return this.formatDate(value);
        }

        return String(value);
    }

    private formatValue(value: PrimitiveValue | undefined, valueColumn: DataViewValueColumn | undefined): string {
        if (value === undefined || value === null || value === "") {
            return "";
        }

        if (value instanceof Date) {
            return this.formatDate(value);
        }

        if (typeof value !== "number") {
            return String(value);
        }

        const formatString: string = valueColumn?.source.format || "";
        const useCurrency: boolean = formatString.indexOf("$") >= 0 || formatString.toLowerCase().indexOf("r$") >= 0;

        try {
            return new Intl.NumberFormat(this.locale, {
                currency: "BRL",
                maximumFractionDigits: 1,
                notation: "compact",
                style: useCurrency ? "currency" : "decimal"
            }).format(value);
        } catch {
            return String(value);
        }
    }

    private formatDate(date: Date): string {
        try {
            return new Intl.DateTimeFormat(this.locale, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }).format(date);
        } catch {
            return date.toLocaleDateString();
        }
    }

    private formatTimelineAxisDate(date: Date): string {
        try {
            return new Intl.DateTimeFormat(this.locale, {
                month: "short",
                year: "numeric"
            }).format(date);
        } catch {
            return date.toLocaleDateString();
        }
    }

    private parseDate(value: PrimitiveValue): Date | undefined {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return this.startOfDay(value);
        }

        if (typeof value === "string" || typeof value === "number") {
            const parsedDate: Date = new Date(value);

            if (!Number.isNaN(parsedDate.getTime())) {
                return this.startOfDay(parsedDate);
            }
        }

        return undefined;
    }

    private getKey(value: PrimitiveValue | null | undefined): string {
        if (value instanceof Date || typeof value === "string") {
            const parsedDate: Date | undefined = this.parseDate(value);

            if (parsedDate && (value instanceof Date || /[-/T:]/.test(value))) {
                return `date:${parsedDate.getTime()}`;
            }
        }

        return `${typeof value}:${String(value)}`;
    }

    private normalize(value: string): string {
        return value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    private startOfDay(date: Date): Date {
        const start: Date = new Date(date.getTime());
        start.setHours(0, 0, 0, 0);
        return start;
    }

    private endOfDay(date: Date): Date {
        const end: Date = new Date(date.getTime());
        end.setHours(23, 59, 59, 999);
        return end;
    }

    private addMonths(date: Date, months: number): Date {
        const nextDate: Date = new Date(date.getTime());
        nextDate.setMonth(nextDate.getMonth() + months);
        return nextDate;
    }

    private applyStyleSettings(): void {
        const styleSettings = this.formattingSettings.style;
        const timelineSettings = this.formattingSettings.timeline;

        this.root.style.setProperty("--modern-bg", this.getColor(styleSettings.backgroundColor.value, "#ffffff"));
        this.root.style.setProperty("--modern-text", this.getColor(styleSettings.textColor.value, "#0f172a"));
        this.root.style.setProperty("--modern-muted", this.getColor(styleSettings.mutedTextColor.value, "#64748b"));
        this.root.style.setProperty("--modern-accent", this.getColor(styleSettings.accentColor.value, "#2563eb"));
        this.root.style.setProperty("--modern-selected-bg", this.getColor(styleSettings.selectedFillColor.value, "#eaf1ff"));
        this.root.style.setProperty("--modern-selected-text", this.getColor(styleSettings.selectedTextColor.value, "#0f172a"));
        this.root.style.setProperty("--modern-border", this.getColor(styleSettings.borderColor.value, "#e2e8f0"));
        this.root.style.setProperty("--modern-item-border", this.getColor(styleSettings.itemBorderColor.value, "#dbe3ef"));
        this.root.style.setProperty("--modern-range-fill", this.getColor(timelineSettings.rangeFillColor.value, "#bcd2ff"));
        this.root.style.setProperty("--modern-bar", this.getColor(timelineSettings.barColor.value, "#9bbcff"));
        this.root.style.setProperty("--modern-bar-muted", this.getColor(timelineSettings.inactiveBarColor.value, "#e8edf5"));
        this.root.style.setProperty("--modern-radius", `${Math.max(0, styleSettings.borderRadius.value)}px`);
        this.root.style.setProperty("--modern-item-radius", `${Math.max(0, styleSettings.itemRadius.value)}px`);
        this.root.style.setProperty("--modern-padding", `${Math.max(0, styleSettings.padding.value)}px`);
        this.root.style.setProperty("--modern-gap", `${Math.max(4, styleSettings.itemSpacing.value)}px`);
        this.root.style.setProperty("--modern-font-size", `${Math.max(9, styleSettings.fontSize.value)}px`);
        this.root.style.setProperty("--modern-font-family", styleSettings.fontFamily.value || "Segoe UI");
        this.root.style.setProperty("--modern-font-weight", String(styleSettings.fontWeight.value.value));
    }

    private getColor(color: powerbi.ThemeColorData, fallback: string): string {
        return color.value || fallback;
    }

    private isEnabled(value: boolean): boolean {
        return value !== false;
    }

    private clearElement(element: HTMLElement): void {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
