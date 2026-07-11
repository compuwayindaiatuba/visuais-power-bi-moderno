"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
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

type LogoPosition = "left" | "right";
type ButtonStyle = "underline" | "pill" | "simple";
type MenuIconName = "analysis" | "chart" | "cost" | "file" | "grid" | "home" | "target" | "tag" | "truck" | "users";

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

interface MenuItem {
    key: string;
    label: string;
    rawValue: PrimitiveValue;
    title: string;
    subtitle: string;
    icon: string;
    index: number;
    selectionId: ISelectionId;
}

interface ViewModel {
    menuColumn?: DataViewCategoryColumn;
    items: MenuItem[];
}

const basicFilterSchema: string = "http" + "://powerbi.com/product/schema#basic";

const iconAliases: Record<string, MenuIconName> = {
    "1": "grid",
    "2": "users",
    "3": "tag",
    "4": "cost",
    "5": "analysis",
    "6": "file",
    "analise": "analysis",
    "analysis": "analysis",
    "analytics": "analysis",
    "bar": "chart",
    "categoria": "tag",
    "categorias": "tag",
    "category": "tag",
    "chart": "chart",
    "cost": "cost",
    "custo": "cost",
    "departamento": "grid",
    "departamentos": "grid",
    "file": "file",
    "fornecedor": "truck",
    "fornecedores": "truck",
    "grid": "grid",
    "home": "home",
    "meta": "target",
    "metas": "target",
    "relatorio": "file",
    "relatorios": "file",
    "tag": "tag",
    "target": "target",
    "truck": "truck",
    "user": "users",
    "users": "users"
};

const iconPaths: Record<MenuIconName, string[]> = {
    analysis: [
        "M4 19V5",
        "M4 19h16",
        "M8 15l3-4 3 2 4-6",
        "M18 7h2v2"
    ],
    chart: [
        "M4 19V5",
        "M8 19V9",
        "M12 19V7",
        "M16 19v-5",
        "M20 19V4"
    ],
    cost: [
        "M4 7h16v12H4Z",
        "M8 7V5h8v2",
        "M8 13h8",
        "M12 10v6"
    ],
    file: [
        "M6 3h8l4 4v14H6Z",
        "M14 3v5h5",
        "M9 13h6",
        "M9 17h6"
    ],
    grid: [
        "M4 4h6v6H4Z",
        "M14 4h6v6h-6Z",
        "M4 14h6v6H4Z",
        "M14 14h6v6h-6Z"
    ],
    home: [
        "M3 11 12 4l9 7",
        "M5 10v10h14V10",
        "M9 20v-6h6v6"
    ],
    target: [
        "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
        "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
        "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
    ],
    tag: [
        "M20 13 13 20 4 11V4h7l9 9Z",
        "M7.5 7.5h.01"
    ],
    truck: [
        "M3 7h11v10H3Z",
        "M14 11h4l3 3v3h-7Z",
        "M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
        "M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
    ],
    users: [
        "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2",
        "M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
        "M22 21v-2a4 4 0 0 0-3-3.87",
        "M16 3.13a4 4 0 0 1 0 7.75"
    ]
};

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly host: IVisualHost;
    private readonly root: HTMLElement;
    private readonly selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private items: MenuItem[] = [];
    private menuColumn?: DataViewCategoryColumn;
    private selectedKey?: string;
    private locale: string;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.locale = options.host.locale || "pt-BR";
        this.root = document.createElement("section");
        this.root.className = "modern-top-menu";
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
            }, "menuVisibility")) {
                hideVisualElement(this.root);
                this.events.renderingFinished(options);
                return;
            }

            showVisualElement(this.root);

            const viewModel: ViewModel = this.createViewModel(dataView);
            this.menuColumn = viewModel.menuColumn;
            this.items = viewModel.items;

            this.syncSelectionFromHost(options.jsonFilters);
            this.ensureSelectedItem();
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
        const categories: DataViewCategoryColumn[] = dataView.categorical?.categories || [];
        const menuColumn: DataViewCategoryColumn | undefined =
            categories.find((column: DataViewCategoryColumn) => Boolean(column.source.roles?.menu)) || categories[0];
        const titleColumn: DataViewCategoryColumn | undefined =
            categories.find((column: DataViewCategoryColumn) => Boolean(column.source.roles?.title));
        const subtitleColumn: DataViewCategoryColumn | undefined =
            categories.find((column: DataViewCategoryColumn) => Boolean(column.source.roles?.subtitle));
        const iconColumn: DataViewCategoryColumn | undefined =
            categories.find((column: DataViewCategoryColumn) => Boolean(column.source.roles?.icon));

        if (!menuColumn) {
            return {
                items: []
            };
        }

        const items: MenuItem[] = menuColumn.values.map((rawValue: PrimitiveValue, index: number) => {
            const label: string = this.primitiveToText(rawValue);
            const title: string = this.primitiveToText(titleColumn?.values[index]) || label;

            return {
                key: this.getKey(rawValue),
                label,
                rawValue,
                title,
                subtitle: this.primitiveToText(subtitleColumn?.values[index]),
                icon: this.primitiveToText(iconColumn?.values[index]),
                index,
                selectionId: this.host.createSelectionIdBuilder().withCategory(menuColumn, index).createSelectionId()
            };
        });

        return {
            menuColumn,
            items
        };
    }

    private render(): void {
        this.applyStyleSettings();
        this.clearElement(this.root);

        if (this.items.length === 0) {
            this.renderLanding();
            return;
        }

        const selectedItem: MenuItem = this.getSelectedItem();
        const logoPosition: LogoPosition = this.getLogoPosition();
        const shell: HTMLElement = document.createElement("div");
        shell.className = `modern-top-menu__shell modern-top-menu__shell--logo-${logoPosition} modern-top-menu__shell--${this.getButtonStyle()}`;

        if (logoPosition === "left") {
            this.renderLogo(shell);
        }

        this.renderText(shell, selectedItem);
        this.renderButtons(shell);

        if (logoPosition === "right") {
            this.renderLogo(shell);
        }

        this.root.appendChild(shell);
        this.fitDynamicText();
    }

    private renderLogo(parent: HTMLElement): void {
        if (!this.isEnabled(this.formattingSettings.logo.showLogo.value)) {
            return;
        }

        const logo: HTMLElement = document.createElement("div");
        logo.className = "modern-top-menu__logo";

        const logoUrl: string = this.formattingSettings.logo.logoUrl.value.trim();
        const logoText: string = this.formattingSettings.logo.logoText.value.trim();

        if (this.isHttpsUrl(logoUrl)) {
            const image: HTMLImageElement = document.createElement("img");
            image.alt = logoText || "Logo";
            image.src = logoUrl;
            image.addEventListener("error", () => {
                image.remove();
                this.appendLogoText(logo, logoText);
            });
            logo.appendChild(image);
        } else {
            this.appendLogoText(logo, logoText);
        }

        parent.appendChild(logo);
    }

    private appendLogoText(parent: HTMLElement, logoText: string): void {
        const mark: HTMLElement = document.createElement("span");
        mark.className = "modern-top-menu__logo-mark";
        mark.textContent = logoText ? logoText.charAt(0).toUpperCase() : "M";
        parent.appendChild(mark);

        if (logoText) {
            const label: HTMLElement = document.createElement("span");
            label.className = "modern-top-menu__logo-text";
            label.textContent = logoText;
            parent.appendChild(label);
        }
    }

    private renderText(parent: HTMLElement, selectedItem: MenuItem): void {
        const showTitle: boolean = this.isEnabled(this.formattingSettings.text.showTitle.value);
        const showSubtitle: boolean = this.isEnabled(this.formattingSettings.text.showSubtitle.value);

        if (!showTitle && !showSubtitle) {
            return;
        }

        const textBox: HTMLElement = document.createElement("div");
        textBox.className = "modern-top-menu__text";

        if (showTitle) {
            const title: HTMLHeadingElement = document.createElement("h2");
            title.className = "modern-top-menu__title";
            title.textContent = selectedItem.title || selectedItem.label;
            textBox.appendChild(title);
        }

        if (showSubtitle && selectedItem.subtitle) {
            const subtitle: HTMLParagraphElement = document.createElement("p");
            subtitle.className = "modern-top-menu__subtitle";
            subtitle.textContent = selectedItem.subtitle;
            textBox.appendChild(subtitle);
        }

        parent.appendChild(textBox);
    }

    private renderButtons(parent: HTMLElement): void {
        const nav: HTMLElement = document.createElement("nav");
        nav.className = "modern-top-menu__buttons";
        nav.setAttribute("aria-label", "Menu superior");

        this.items.forEach((item: MenuItem) => {
            const button: HTMLButtonElement = document.createElement("button");
            const isSelected: boolean = item.key === this.selectedKey;
            button.type = "button";
            button.className = "modern-top-menu__button";
            button.title = item.label;
            button.setAttribute("aria-pressed", String(isSelected));

            if (isSelected) {
                button.classList.add("modern-top-menu__button--selected");
            }

            if (this.isEnabled(this.formattingSettings.buttons.showIcons.value) && item.icon) {
                this.appendMenuIcon(button, item.icon);
            }

            const label: HTMLSpanElement = document.createElement("span");
            label.className = "modern-top-menu__button-label";
            label.textContent = item.label;
            button.appendChild(label);

            button.addEventListener("click", () => this.selectItem(item));
            button.addEventListener("contextmenu", (event: MouseEvent) => {
                event.preventDefault();
                this.showContextMenu(item, event);
            });

            nav.appendChild(button);
        });

        parent.appendChild(nav);
    }

    private appendMenuIcon(parent: HTMLElement, rawIcon: string): void {
        const trimmedIcon: string = rawIcon.trim();
        const normalizedIcon: string = this.normalize(trimmedIcon);
        const iconName: MenuIconName | undefined = iconAliases[normalizedIcon];
        const iconWrapper: HTMLElement = document.createElement("span");
        iconWrapper.className = "modern-top-menu__button-icon";

        if (this.isImageUrl(trimmedIcon)) {
            this.appendImageIcon(iconWrapper, trimmedIcon);
        } else if (iconName) {
            this.appendSvgIcon(iconWrapper, iconName);
        } else {
            iconWrapper.textContent = trimmedIcon.slice(0, 3);
        }

        parent.appendChild(iconWrapper);
    }

    private appendImageIcon(parent: HTMLElement, imageUrl: string): void {
        const image: HTMLImageElement = document.createElement("img");
        image.alt = "";
        image.src = imageUrl;
        image.addEventListener("error", () => {
            parent.remove();
        });
        parent.classList.add("modern-top-menu__button-icon--image");
        parent.appendChild(image);
    }

    private appendSvgIcon(parent: HTMLElement, icon: MenuIconName): void {
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

    private renderLanding(): void {
        const landing: HTMLElement = document.createElement("div");
        landing.className = "modern-top-menu__landing";

        const title: HTMLHeadingElement = document.createElement("h3");
        title.textContent = "Adicione o campo Menu";
        landing.appendChild(title);

        const message: HTMLParagraphElement = document.createElement("p");
        message.textContent = "Use Menu como campo filtrado. Titulo, Subtitulo e Icone sao opcionais.";
        landing.appendChild(message);

        this.root.appendChild(landing);
    }

    private renderError(): void {
        this.clearElement(this.root);
        const error: HTMLElement = document.createElement("div");
        error.className = "modern-top-menu__landing";
        error.textContent = "Nao foi possivel renderizar o menu superior.";
        this.root.appendChild(error);
    }

    private selectItem(item: MenuItem): void {
        this.selectedKey = item.key;
        this.applySelection();
        this.render();
    }

    private ensureSelectedItem(): void {
        const availableKeys: Set<string> = new Set<string>(this.items.map((item: MenuItem) => item.key));

        if (this.selectedKey && availableKeys.has(this.selectedKey)) {
            return;
        }

        if (this.items.length === 0) {
            this.selectedKey = undefined;
            return;
        }

        this.selectedKey = this.items[0].key;
        this.applySelection();
    }

    private applySelection(): void {
        const selectedItem: MenuItem | undefined = this.items.find((item: MenuItem) => item.key === this.selectedKey);

        if (!selectedItem) {
            return;
        }

        this.selectionManager.select(selectedItem.selectionId, false);

        const filterTarget: FilterTarget | undefined = this.getFilterTarget();

        if (!filterTarget) {
            return;
        }

        const filter: BasicFilter = {
            $schema: basicFilterSchema,
            target: filterTarget,
            operator: "In",
            values: [selectedItem.rawValue]
        };

        this.host.applyJsonFilter(filter, "general", "filter", powerbi.FilterAction.merge);
    }

    private showContextMenu(item: MenuItem, event: MouseEvent): void {
        if (item.key !== this.selectedKey) {
            this.selectedKey = item.key;
            this.applySelection();
            this.render();
        }

        this.selectionManager.showContextMenu(item.selectionId, {
            x: event.clientX,
            y: event.clientY
        });
    }

    private syncSelectionFromHost(jsonFilters: IFilter[] | undefined): void {
        const filterTarget: FilterTarget | undefined = this.getFilterTarget();

        if (!jsonFilters || !filterTarget) {
            return;
        }

        const matchingFilter: BasicFilterLike | undefined = jsonFilters
            .map((filter: IFilter) => filter as BasicFilterLike)
            .find((filter: BasicFilterLike) =>
                filter.operator === "In" &&
                Array.isArray(filter.values) &&
                this.targetsMatch(filter.target, filterTarget)
            );

        if (!matchingFilter || !matchingFilter.values || matchingFilter.values.length === 0) {
            this.selectedKey = undefined;
            return;
        }

        this.selectedKey = this.getKey(matchingFilter.values[0]);
    }

    private getSelectedItem(): MenuItem {
        return this.items.find((item: MenuItem) => item.key === this.selectedKey) || this.items[0];
    }

    private getFilterTarget(): FilterTarget | undefined {
        const queryName: string | undefined = this.menuColumn?.source.queryName;

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

    private primitiveToText(value: PrimitiveValue | null | undefined): string {
        if (value === null || value === undefined || value === "") {
            return "";
        }

        if (value instanceof Date) {
            return this.formatDate(value);
        }

        return String(value);
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

    private getKey(value: PrimitiveValue | null | undefined): string {
        if (value instanceof Date) {
            return `date:${value.getTime()}`;
        }

        return `${typeof value}:${String(value)}`;
    }

    private normalize(value: string): string {
        return value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    private fitDynamicText(): void {
        window.requestAnimationFrame(() => {
            const title: HTMLElement | null = this.root.querySelector(".modern-top-menu__title");
            const subtitle: HTMLElement | null = this.root.querySelector(".modern-top-menu__subtitle");

            if (title) {
                this.fitTextElement(title, this.formattingSettings.text.titleSize.value, 12);
            }

            if (subtitle) {
                this.fitTextElement(subtitle, this.formattingSettings.text.subtitleSize.value, 9);
            }
        });
    }

    private fitTextElement(element: HTMLElement, baseSize: number, minSize: number): void {
        let fontSize: number = Math.max(minSize, baseSize);
        element.style.fontSize = `${fontSize}px`;

        while (
            fontSize > minSize &&
            (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight)
        ) {
            fontSize -= 1;
            element.style.fontSize = `${fontSize}px`;
        }
    }

    private isHttpsUrl(value: string): boolean {
        return value.toLowerCase().startsWith("https://");
    }

    private isImageUrl(value: string): boolean {
        const normalizedValue: string = value.toLowerCase();
        return (
            normalizedValue.startsWith("https://") ||
            normalizedValue.startsWith("data:image/")
        );
    }

    private getLogoPosition(): LogoPosition {
        return String(this.formattingSettings.logo.logoPosition.value.value) === "right" ? "right" : "left";
    }

    private getButtonStyle(): ButtonStyle {
        const rawValue: string = String(this.formattingSettings.buttons.buttonStyle.value.value);

        if (rawValue === "pill" || rawValue === "simple") {
            return rawValue;
        }

        return "underline";
    }

    private applyStyleSettings(): void {
        const layoutSettings = this.formattingSettings.layout;
        const logoSettings = this.formattingSettings.logo;
        const textSettings = this.formattingSettings.text;
        const buttonSettings = this.formattingSettings.buttons;

        this.root.style.setProperty("--menu-height", `${this.clamp(layoutSettings.height.value, 44, 180)}px`);
        this.root.style.setProperty("--menu-padding-x", `${this.clamp(layoutSettings.paddingX.value, 0, 80)}px`);
        this.root.style.setProperty("--menu-padding-y", `${this.clamp(layoutSettings.paddingY.value, 0, 40)}px`);
        this.root.style.setProperty("--menu-gap", `${this.clamp(layoutSettings.gap.value, 0, 80)}px`);
        this.root.style.setProperty("--menu-font-family", layoutSettings.fontFamily.value || "Segoe UI");
        this.root.style.setProperty("--menu-bg", this.getColor(layoutSettings.backgroundColor.value, "#ffffff"));
        this.root.style.setProperty("--menu-border", this.getColor(layoutSettings.borderColor.value, "#e5e7eb"));
        this.root.style.setProperty("--logo-align", String(logoSettings.logoAlign.value.value));
        this.root.style.setProperty("--logo-width", `${this.clamp(logoSettings.logoWidth.value, 28, 360)}px`);
        this.root.style.setProperty("--logo-height", `${this.clamp(logoSettings.logoHeight.value, 24, 160)}px`);
        this.root.style.setProperty("--logo-bg", this.getColor(logoSettings.logoBackground.value, "#ffffff"));
        this.root.style.setProperty("--logo-text", this.getColor(logoSettings.logoTextColor.value, "#111827"));
        this.root.style.setProperty("--text-align", String(textSettings.textAlign.value.value));
        this.root.style.setProperty("--title-color", this.getColor(textSettings.titleColor.value, "#0f172a"));
        this.root.style.setProperty("--subtitle-color", this.getColor(textSettings.subtitleColor.value, "#4b5563"));
        this.root.style.setProperty("--title-size", `${this.clamp(textSettings.titleSize.value, 9, 64)}px`);
        this.root.style.setProperty("--subtitle-size", `${this.clamp(textSettings.subtitleSize.value, 8, 36)}px`);
        this.root.style.setProperty("--title-weight", String(textSettings.titleWeight.value.value));
        this.root.style.setProperty("--text-max-width", `${this.clamp(textSettings.textMaxWidth.value, 120, 900)}px`);
        this.root.style.setProperty("--button-align", String(buttonSettings.buttonAlign.value.value));
        this.root.style.setProperty("--button-height", `${this.clamp(buttonSettings.buttonHeight.value, 24, 90)}px`);
        this.root.style.setProperty("--button-radius", `${this.clamp(buttonSettings.buttonRadius.value, 0, 40)}px`);
        this.root.style.setProperty("--button-gap", `${this.clamp(buttonSettings.buttonGap.value, 0, 80)}px`);
        this.root.style.setProperty("--button-padding-x", `${this.clamp(buttonSettings.buttonPaddingX.value, 4, 60)}px`);
        this.root.style.setProperty("--button-font-size", `${this.clamp(buttonSettings.buttonFontSize.value, 8, 32)}px`);
        this.root.style.setProperty("--button-text", this.getColor(buttonSettings.buttonTextColor.value, "#374151"));
        this.root.style.setProperty("--button-bg", this.getColor(buttonSettings.buttonBackground.value, "#ffffff"));
        this.root.style.setProperty("--button-border", this.getColor(buttonSettings.buttonBorderColor.value, "#e5e7eb"));
        this.root.style.setProperty("--selected-text", this.getColor(buttonSettings.selectedTextColor.value, "#2563eb"));
        this.root.style.setProperty("--selected-bg", this.getColor(buttonSettings.selectedBackground.value, "#ffffff"));
        this.root.style.setProperty("--accent", this.getColor(buttonSettings.accentColor.value, "#2563eb"));
        this.root.style.setProperty("--icon-size", `${this.clamp(buttonSettings.iconSize.value, 10, 40)}px`);
    }

    private getColor(color: powerbi.ThemeColorData, fallback: string): string {
        return color.value || fallback;
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value || min));
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
