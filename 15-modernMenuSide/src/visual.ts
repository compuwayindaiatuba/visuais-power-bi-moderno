"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import FilterAction = powerbi.FilterAction;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { VisualFormattingSettingsModel } from "./settings";
import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";

type ThemeMode = "light" | "dark";
type TextAlignMode = "left" | "center" | "right";

interface MenuColumnPair {
    iconIndex?: number;
    nameIndex: number;
}

interface MenuItem {
    filterValue: PrimitiveValue;
    group: string;
    iconValue: string;
    key: string;
    label: string;
    orderValue?: number;
    originalIndex: number;
    selectionId?: powerbi.visuals.ISelectionId;
    targetUrl: string;
    themeValue: string;
}

interface MenuGroup {
    key: string;
    label: string;
    items: MenuItem[];
}

interface ButtonRecord {
    button: HTMLButtonElement;
    item: MenuItem;
    section: HTMLElement;
}

interface FilterTarget {
    table: string;
    column: string;
}

const BASIC_FILTER_SCHEMA = "http" + "://powerbi.com/product/schema#basic";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const ICON_PATHS: { [key: string]: string[] } = {
    alert: [
        "M12 3 2 21h20L12 3z",
        "M12 9v5",
        "M12 17h.01"
    ],
    bell: [
        "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7",
        "M13.7 21a2 2 0 0 1-3.4 0"
    ],
    building: [
        "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16",
        "M20 21V9a2 2 0 0 0-2-2h-2",
        "M8 7h4",
        "M8 11h4",
        "M8 15h4",
        "M3 21h18"
    ],
    calendar: [
        "M7 3v4",
        "M17 3v4",
        "M4 9h16",
        "M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
    ],
    chart: [
        "M4 20V10",
        "M10 20V4",
        "M16 20v-7",
        "M22 20H2"
    ],
    chevronLeft: [
        "M15 18 9 12l6-6"
    ],
    chevronRight: [
        "m9 18 6-6-6-6"
    ],
    clock: [
        "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
        "M12 7v5l3 2"
    ],
    close: [
        "M18 6 6 18",
        "M6 6l12 12"
    ],
    default: [
        "M5 5h14v14H5z",
        "M9 9h6v6H9z"
    ],
    file: [
        "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
        "M14 2v6h6",
        "M8 13h8",
        "M8 17h5"
    ],
    grid: [
        "M4 4h6v6H4z",
        "M14 4h6v6h-6z",
        "M4 14h6v6H4z",
        "M14 14h6v6h-6z"
    ],
    heart: [
        "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
    ],
    home: [
        "M3 10.5 12 3l9 7.5",
        "M5 10v10h14V10",
        "M9 20v-6h6v6"
    ],
    menu: [
        "M4 7h16",
        "M4 12h16",
        "M4 17h16"
    ],
    message: [
        "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
    ],
    search: [
        "M21 21l-4.35-4.35",
        "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
    ],
    settings: [
        "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
        "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.1V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15.4 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.38.36.72.65 1a1.65 1.65 0 0 0 1.1.4H21a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"
    ],
    user: [
        "M20 21a8 8 0 0 0-16 0",
        "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
    ],
    users: [
        "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
        "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
        "M22 21v-2a4 4 0 0 0-3-3.87",
        "M16 3.13a4 4 0 0 1 0 7.75"
    ],
    wallet: [
        "M19 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h14v10H5a3 3 0 0 1-3-3V7",
        "M16 14h.01"
    ]
};

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly host: IVisualHost;
    private readonly root: HTMLElement;
    private readonly selectionManager: ISelectionManager;
    private buttonRecords: ButtonRecord[] = [];
    private collapsed?: boolean;
    private emptySearchNode?: HTMLElement;
    private filterTarget?: FilterTarget;
    private formattingSettings: VisualFormattingSettingsModel;
    private lastAppliedFilterKey: string = "";
    private lastDataView?: powerbi.DataView;
    private lastSelectedKey: string = "";
    private searchText: string = "";

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.root = document.createElement("div");
        this.root.className = "msl-root";
        options.element.classList.add("menu-side-lateral-host");
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
            if (this.collapsed === undefined) {
                this.collapsed = this.formattingSettings.interaction.startCollapsed.value;
            }

            if (!this.formattingSettings.interaction.allowCollapse.value) {
                this.collapsed = false;
            }

            this.render(dataView);
            this.events.renderingFinished(options);
        } catch (error) {
            showVisualElement(this.root);
            this.renderFailure();
            this.events.renderingFailed(options, error instanceof Error ? error.message : String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private render(dataView?: powerbi.DataView): void {
        const table = dataView?.table;
        const items = table ? this.buildItems(table) : [];
        const activeItem = this.resolveActiveItem(items);
        const themeMode = this.resolveThemeMode(dataView);

        this.clearRoot();
        this.applyRootStyles(themeMode);

        const card = document.createElement("div");
        card.className = "msl-card";
        card.appendChild(this.renderHeader());

        if (this.formattingSettings.user.showUser.value) {
            card.appendChild(this.renderUser());
        }

        if (this.formattingSettings.search.showSearch.value) {
            card.appendChild(this.renderSearch());
        }

        card.appendChild(this.renderMenuList(items));

        const footer = this.renderFooter();

        if (footer) {
            card.appendChild(footer);
        }

        this.root.appendChild(card);
        this.updateButtonActiveStates();
        this.applySearchFilter();
        this.ensureActiveFilter(activeItem);
    }

    private renderHeader(): HTMLElement {
        const headerSettings = this.formattingSettings.header;
        const header = document.createElement("div");
        header.className = "msl-header";
        header.style.marginBottom = `${this.clampNumber(headerSettings.headerBottomMargin.value, 0, 80)}px`;

        if (headerSettings.showLogo.value) {
            header.appendChild(this.renderLogo());
        }

        if (this.formattingSettings.interaction.allowCollapse.value) {
            const toggle = document.createElement("button");
            toggle.className = "msl-collapse-toggle";
            toggle.type = "button";
            toggle.title = this.isCollapsed() ? "Expandir menu" : "Recolher menu";
            toggle.appendChild(this.createSvgIcon(this.isCollapsed() ? "chevronRight" : "chevronLeft"));
            toggle.addEventListener("click", () => {
                this.collapsed = !this.isCollapsed();
                this.render(this.lastDataView);
            });
            header.appendChild(toggle);
        }

        return header;
    }

    private renderLogo(): HTMLElement {
        const headerSettings = this.formattingSettings.header;
        const brand = document.createElement("div");
        const logo = document.createElement("div");
        const logoText = this.safeText(headerSettings.logoText.value, "CL");
        const brandText = this.safeText(headerSettings.brandText.value, "");
        const collapsed = this.isCollapsed();
        const collapsedLogoUrl = this.safeText(headerSettings.collapsedLogoUrl.value, "");
        const logoUrl = collapsed && collapsedLogoUrl ? collapsedLogoUrl : this.safeText(headerSettings.logoUrl.value, "");
        const width = collapsed
            ? this.clampNumber(headerSettings.collapsedLogoWidth.value, 16, 160)
            : this.clampNumber(headerSettings.logoWidth.value, 16, 260);
        const height = collapsed
            ? this.clampNumber(headerSettings.collapsedLogoHeight.value, 16, 160)
            : this.clampNumber(headerSettings.logoHeight.value, 16, 160);

        brand.className = "msl-brand";
        brand.style.fontFamily = this.safeText(headerSettings.logoFontFamily.value, "Segoe UI");
        brand.style.gap = `${this.clampNumber(headerSettings.brandGap.value, 0, 32)}px`;

        logo.className = "msl-logo";
        logo.style.width = `${width}px`;
        logo.style.height = `${height}px`;
        logo.style.borderRadius = `${this.clampNumber(headerSettings.logoRadius.value, 0, 48)}px`;
        logo.title = brandText || logoText;

        if (this.isImageUrl(logoUrl)) {
            const image = document.createElement("img");
            image.alt = brandText || logoText;
            image.src = logoUrl;
            logo.appendChild(image);
        } else {
            logo.textContent = logoText.slice(0, 3).toUpperCase();
        }

        brand.appendChild(logo);

        if (!collapsed && brandText) {
            const text = document.createElement("span");
            text.className = "msl-brand-text";
            text.style.fontSize = `${this.clampNumber(headerSettings.brandFontSize.value, 8, 32)}px`;
            text.textContent = brandText;
            brand.appendChild(text);
        }

        return brand;
    }

    private renderUser(): HTMLElement {
        const userSettings = this.formattingSettings.user;
        const wrapper = document.createElement("div");
        const name = this.safeText(userSettings.userName.value, "Usuario");
        const imageUrl = this.safeText(userSettings.userImageUrl.value, "");

        wrapper.className = "msl-user";
        wrapper.style.marginTop = `${this.clampNumber(userSettings.userTopMargin.value, 0, 60)}px`;
        wrapper.style.marginBottom = `${this.clampNumber(userSettings.userBottomMargin.value, 0, 60)}px`;
        wrapper.style.width = userSettings.userWidth.value > 0
            ? `${this.clampNumber(userSettings.userWidth.value, 44, 420)}px`
            : "100%";

        const avatar = document.createElement("div");
        const avatarSize = this.clampNumber(userSettings.avatarSize.value, 20, 80);
        avatar.className = "msl-user-avatar";
        avatar.style.flexBasis = `${avatarSize}px`;
        avatar.style.height = `${avatarSize}px`;
        avatar.style.width = `${avatarSize}px`;
        avatar.title = name;

        if (this.isImageUrl(imageUrl)) {
            const image = document.createElement("img");
            image.alt = name;
            image.src = imageUrl;
            avatar.appendChild(image);
        } else {
            avatar.textContent = this.initials(name);
        }

        wrapper.appendChild(avatar);

        const text = document.createElement("div");
        text.className = "msl-user-text";

        const title = document.createElement("div");
        title.className = "msl-user-name";
        title.style.fontSize = `${this.clampNumber(userSettings.userNameFontSize.value, 8, 30)}px`;
        title.textContent = name;
        text.appendChild(title);

        const subtitle = document.createElement("div");
        subtitle.className = "msl-user-subtitle";
        subtitle.style.fontSize = `${this.clampNumber(userSettings.userSubtitleFontSize.value, 8, 24)}px`;
        subtitle.textContent = this.safeText(userSettings.userSubtitle.value, "Power BI");
        text.appendChild(subtitle);

        wrapper.appendChild(text);
        return wrapper;
    }

    private renderSearch(): HTMLElement {
        const searchSettings = this.formattingSettings.search;
        const wrapper = document.createElement("div");
        wrapper.className = "msl-search";
        wrapper.style.marginTop = `${this.clampNumber(searchSettings.topMargin.value, 0, 80)}px`;
        wrapper.style.marginBottom = `${this.clampNumber(searchSettings.bottomMargin.value, 0, 80)}px`;

        if (this.isCollapsed()) {
            const searchButton = document.createElement("button");
            searchButton.className = "msl-search-mini";
            searchButton.type = "button";
            searchButton.title = "Pesquisar";
            searchButton.appendChild(this.createSvgIcon("search"));
            searchButton.addEventListener("click", () => {
                this.collapsed = false;
                this.render(this.lastDataView);
                const input = this.root.querySelector(".msl-search-input");

                if (input instanceof HTMLInputElement) {
                    input.focus();
                }
            });
            wrapper.appendChild(searchButton);
            return wrapper;
        }

        const searchBox = document.createElement("div");
        searchBox.className = "msl-search-box";
        searchBox.appendChild(this.createSvgIcon("search"));

        const clearButton = document.createElement("button");
        clearButton.className = "msl-search-clear";
        clearButton.hidden = this.searchText.length === 0;
        clearButton.type = "button";
        clearButton.title = "Limpar pesquisa";
        clearButton.appendChild(this.createSvgIcon("close"));

        const input = document.createElement("input");
        input.className = "msl-search-input";
        input.type = "text";
        input.placeholder = this.safeText(searchSettings.placeholder.value, "Pesquisar");
        input.value = this.searchText;
        input.addEventListener("input", (event: Event) => {
            const target = event.target;

            if (target instanceof HTMLInputElement) {
                this.searchText = target.value;
                clearButton.hidden = this.searchText.length === 0;
                this.applySearchFilter();
            }
        });
        searchBox.appendChild(input);

        clearButton.addEventListener("click", () => {
            this.searchText = "";
            input.value = "";
            clearButton.hidden = true;
            this.applySearchFilter();
            input.focus();
        });
        searchBox.appendChild(clearButton);

        wrapper.appendChild(searchBox);
        return wrapper;
    }

    private renderMenuList(items: MenuItem[]): HTMLElement {
        const nav = document.createElement("nav");
        nav.className = "msl-menu-scroll";
        nav.style.marginTop = `${this.clampNumber(this.formattingSettings.header.logoToButtonsGap.value, 0, 120)}px`;
        nav.setAttribute("aria-label", "Menu de paginas");

        if (items.length === 0) {
            nav.appendChild(this.renderEmpty("Adicione Nome do botao e, opcionalmente, Ordem, Categoria, Icone e LinkDestino."));
            return nav;
        }

        this.groupItems(items).forEach((group) => {
            const section = this.createSection(group.label);
            nav.appendChild(section);

            group.items.forEach((item) => {
                section.appendChild(this.renderMenuButton(item, section));
            });
        });

        this.emptySearchNode = this.renderEmpty("Nenhum botao encontrado.");
        this.emptySearchNode.classList.add("msl-search-empty");
        nav.appendChild(this.emptySearchNode);
        return nav;
    }

    private renderFooter(): HTMLElement | undefined {
        const footerSettings = this.formattingSettings.footer;
        const url = this.safeText(footerSettings.footerImageUrl.value, "");

        if (!footerSettings.showFooterImage.value || !this.isImageUrl(url)) {
            return undefined;
        }

        const footer = document.createElement("div");
        footer.className = "msl-footer";
        footer.style.marginTop = `${this.clampNumber(footerSettings.footerTopMargin.value, 0, 100)}px`;
        footer.style.height = `${this.clampNumber(footerSettings.footerImageHeight.value, 24, 240)}px`;

        const image = document.createElement("img");
        image.alt = "";
        image.src = url;
        footer.appendChild(image);
        return footer;
    }

    private renderMenuButton(item: MenuItem, section: HTMLElement): HTMLButtonElement {
        const button = document.createElement("button");
        button.className = "msl-menu-button";
        button.type = "button";
        button.title = item.label;
        button.setAttribute("aria-label", item.label);
        button.appendChild(this.renderItemIcon(item));

        const label = document.createElement("span");
        label.className = "msl-button-label";
        label.textContent = item.label;
        button.appendChild(label);

        button.addEventListener("click", (event: MouseEvent) => {
            this.handleMenuClick(item, event);
        });

        button.addEventListener("contextmenu", (event: MouseEvent) => {
            if (!item.selectionId) {
                return;
            }

            event.preventDefault();
            this.selectionManager.showContextMenu(item.selectionId, {
                x: event.clientX,
                y: event.clientY
            });
        });

        this.buttonRecords.push({ button, item, section });
        return button;
    }

    private renderItemIcon(item: MenuItem): HTMLElement {
        const iconWrap = document.createElement("span");
        const iconValue = this.safeText(item.iconValue, "");
        iconWrap.className = "msl-icon";
        iconWrap.setAttribute("aria-hidden", "true");

        if (this.isImageUrl(iconValue)) {
            const image = document.createElement("img");
            image.alt = "";
            image.src = iconValue;
            iconWrap.appendChild(image);
            return iconWrap;
        }

        if (this.shouldUseTextIcon(iconValue)) {
            iconWrap.classList.add("msl-text-icon");
            iconWrap.textContent = iconValue.slice(0, 3);
            return iconWrap;
        }

        iconWrap.appendChild(this.createSvgIcon(this.resolveIconKey(iconValue, item.label)));
        return iconWrap;
    }

    private handleMenuClick(item: MenuItem, event: MouseEvent): void {
        this.lastSelectedKey = item.key;

        if (this.formattingSettings.interaction.useSelection.value && item.selectionId) {
            this.selectionManager.select(item.selectionId, event.ctrlKey || event.metaKey);
        }

        if (String(this.formattingSettings.interaction.clickAction.value.value) === "url") {
            const navigationUrl = this.getNavigationUrl(item);

            if (navigationUrl) {
                this.host.launchUrl(navigationUrl);
            }
        }

        this.updateButtonActiveStates();
        this.applyMenuFilter(item);
    }

    private createSection(groupName: string): HTMLElement {
        const section = document.createElement("section");
        section.className = "msl-menu-section";

        if (this.formattingSettings.groupStyle.showGroups.value && groupName) {
            const heading = document.createElement("div");
            heading.className = "msl-group-heading";

            const text = document.createElement("span");
            text.textContent = groupName;
            heading.appendChild(text);

            const line = document.createElement("span");
            line.className = "msl-group-line";
            heading.appendChild(line);
            section.appendChild(heading);
        }

        return section;
    }

    private groupItems(items: MenuItem[]): MenuGroup[] {
        const groups: MenuGroup[] = [];
        let currentGroup: MenuGroup | undefined;

        items.forEach((item) => {
            const label = this.safeText(item.group, "");
            const key = label ? this.normalizeText(label) : "__sem_grupo__";

            if (!currentGroup || currentGroup.key !== key) {
                currentGroup = {
                    key,
                    label,
                    items: []
                };
                groups.push(currentGroup);
            }

            currentGroup.items.push(item);
        });

        return groups;
    }

    private resolveActiveItem(items: MenuItem[]): MenuItem | undefined {
        if (items.length === 0) {
            this.lastSelectedKey = "";
            return undefined;
        }

        const mode = String(this.formattingSettings.activeState.activeMode.value.value);
        const configuredName = mode === "manual"
            ? this.normalizeText(this.formattingSettings.activeState.activePageName.value)
            : "";
        const configuredItem = configuredName
            ? items.find((item) => this.isActive(item.key, configuredName))
            : undefined;

        if (configuredItem) {
            this.lastSelectedKey = configuredItem.key;
            return configuredItem;
        }

        const clickedItem = this.lastSelectedKey
            ? items.find((item) => item.key === this.lastSelectedKey)
            : undefined;

        if (clickedItem) {
            return clickedItem;
        }

        this.lastSelectedKey = items[0].key;
        return items[0];
    }

    private ensureActiveFilter(item: MenuItem | undefined): void {
        if (!item) {
            return;
        }

        this.applyMenuFilter(item);
    }

    private applyMenuFilter(item: MenuItem): void {
        if (!this.filterTarget || this.lastAppliedFilterKey === item.key) {
            return;
        }

        const filter = this.createMenuFilter(item);
        this.host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
        this.lastAppliedFilterKey = item.key;
    }

    private createMenuFilter(item: MenuItem): powerbi.IFilter {
        return {
            $schema: BASIC_FILTER_SCHEMA,
            target: this.filterTarget,
            operator: "In",
            values: [this.formatPrimitive(item.filterValue)],
            filterType: 1
        } as powerbi.IFilter;
    }

    private renderEmpty(message: string): HTMLElement {
        const empty = document.createElement("div");
        empty.className = "msl-empty";
        empty.textContent = message;
        return empty;
    }

    private renderFailure(): void {
        this.clearRoot();
        this.root.appendChild(this.renderEmpty("Nao foi possivel renderizar o menu."));
    }

    private buildItems(table: powerbi.DataViewTable): MenuItem[] {
        const menuIndexes = this.getIndexesForRole(table, "menuFields");
        let nameIndex = this.getFirstIndexForRole(table, "label");
        let iconIndex = this.getFirstIndexForRole(table, "icon");

        if (nameIndex === undefined && menuIndexes.length === 0) {
            this.filterTarget = undefined;
            return [];
        }

        if (nameIndex === undefined) {
            const pair = this.getMenuColumnPair(table, menuIndexes);
            nameIndex = pair.nameIndex;
            iconIndex = iconIndex === undefined ? pair.iconIndex : iconIndex;
        }

        this.filterTarget = this.getFilterTarget(table.columns[nameIndex]);
        const orderIndex = this.getFirstIndexForRole(table, "order");
        const groupIndex = this.getFirstIndexForRole(table, "category") ?? this.getFirstIndexForRole(table, "group");
        const themeIndex = this.getFirstIndexForRole(table, "theme");
        const targetUrlIndex = this.getFirstIndexForRole(table, "targetUrl");

        const items = (table.rows || [])
            .map((row, rowIndex) => this.createMenuItem(table, row, rowIndex, nameIndex, iconIndex, orderIndex, groupIndex, themeIndex, targetUrlIndex))
            .filter((item): item is MenuItem => item !== undefined);

        return this.sortMenuItems(items);
    }

    private createMenuItem(
        table: powerbi.DataViewTable,
        row: PrimitiveValue[],
        rowIndex: number,
        nameIndex: number,
        iconIndex: number | undefined,
        orderIndex: number | undefined,
        groupIndex: number | undefined,
        themeIndex: number | undefined,
        targetUrlIndex: number | undefined
    ): MenuItem | undefined {
        const label = this.safeText(this.formatPrimitive(row[nameIndex]), "");

        if (!label) {
            return undefined;
        }

        return {
            filterValue: row[nameIndex],
            group: groupIndex === undefined ? "" : this.safeText(this.formatPrimitive(row[groupIndex]), ""),
            iconValue: iconIndex === undefined ? "" : this.safeText(this.formatPrimitive(row[iconIndex]), ""),
            key: this.normalizeText(label),
            label,
            orderValue: orderIndex === undefined ? undefined : this.parseOrderValue(row[orderIndex]),
            originalIndex: rowIndex,
            selectionId: this.host.createSelectionIdBuilder()
                .withTable(table, rowIndex)
                .createSelectionId(),
            targetUrl: targetUrlIndex === undefined ? "" : this.safeText(this.formatPrimitive(row[targetUrlIndex]), ""),
            themeValue: themeIndex === undefined ? "" : this.safeText(this.formatPrimitive(row[themeIndex]), "")
        };
    }

    private sortMenuItems(items: MenuItem[]): MenuItem[] {
        if (!items.some((item) => item.orderValue !== undefined)) {
            return items;
        }

        return [...items].sort((first, second) => {
            if (first.orderValue === undefined && second.orderValue === undefined) {
                return first.originalIndex - second.originalIndex;
            }

            if (first.orderValue === undefined) {
                return 1;
            }

            if (second.orderValue === undefined) {
                return -1;
            }

            if (first.orderValue !== second.orderValue) {
                return first.orderValue - second.orderValue;
            }

            return first.originalIndex - second.originalIndex;
        });
    }

    private parseOrderValue(value: PrimitiveValue): number | undefined {
        if (value === null || value === undefined || value instanceof Date) {
            return undefined;
        }

        const parsed = Number(String(value).replace(",", "."));
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    private getMenuColumnPair(table: powerbi.DataViewTable, menuIndexes: number[]): MenuColumnPair {
        if (menuIndexes.length === 1) {
            return { nameIndex: menuIndexes[0] };
        }

        const explicitNameIndex = menuIndexes.find((index) => this.isNameColumn(table.columns[index]));

        if (explicitNameIndex !== undefined) {
            return {
                iconIndex: menuIndexes.find((index) => index !== explicitNameIndex),
                nameIndex: explicitNameIndex
            };
        }

        const explicitIconIndex = menuIndexes.find((index) => this.isIconColumn(table.columns[index]));

        if (explicitIconIndex !== undefined) {
            const nameIndex = menuIndexes.find((index) => index !== explicitIconIndex);

            return {
                iconIndex: explicitIconIndex,
                nameIndex: nameIndex === undefined ? explicitIconIndex : nameIndex
            };
        }

        return {
            iconIndex: menuIndexes[0],
            nameIndex: menuIndexes[1]
        };
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

    private isNameColumn(column: powerbi.DataViewMetadataColumn): boolean {
        const name = this.normalizeText(column.displayName || "");
        return name.includes("nome")
            || name.includes("name")
            || name.includes("pagina")
            || name.includes("page")
            || name.includes("relatorio")
            || name.includes("report");
    }

    private isIconColumn(column: powerbi.DataViewMetadataColumn): boolean {
        const name = this.normalizeText(column.displayName || "");
        return name.includes("icone")
            || name.includes("icon")
            || name.includes("imagem")
            || name.includes("image")
            || name.includes("link")
            || name.includes("url");
    }

    private getFilterTarget(source: powerbi.DataViewMetadataColumn): FilterTarget | undefined {
        const queryName = source.queryName?.trim();

        if (!queryName) {
            return undefined;
        }

        const bracketMatch = queryName.match(/^'?(.*?)'?\[(.*?)\]$/);

        if (bracketMatch && bracketMatch[1] && bracketMatch[2]) {
            return {
                table: bracketMatch[1],
                column: bracketMatch[2]
            };
        }

        const dotIndex = queryName.lastIndexOf(".");

        if (dotIndex > 0 && dotIndex < queryName.length - 1) {
            return {
                table: queryName.slice(0, dotIndex),
                column: queryName.slice(dotIndex + 1)
            };
        }

        return undefined;
    }

    private resolveThemeMode(dataView?: powerbi.DataView): ThemeMode {
        const configuredMode = String(this.formattingSettings.theme.themeMode.value.value) === "dark" ? "dark" : "light";

        if (String(this.formattingSettings.theme.themeSource.value.value) !== "data") {
            return configuredMode;
        }

        const table = dataView?.table;
        const themeIndex = table ? this.getFirstIndexForRole(table, "theme") : undefined;

        if (!table || themeIndex === undefined || !table.rows || table.rows.length === 0) {
            return configuredMode;
        }

        const normalized = this.normalizeText(this.formatPrimitive(table.rows[0][themeIndex]));

        if (normalized.includes("dark") || normalized.includes("escuro")) {
            return "dark";
        }

        if (normalized.includes("light") || normalized.includes("claro")) {
            return "light";
        }

        return configuredMode;
    }

    private applyRootStyles(themeMode: ThemeMode): void {
        const layout = this.formattingSettings.layout;
        const theme = this.formattingSettings.theme;
        const header = this.formattingSettings.header;
        const search = this.formattingSettings.search;
        const buttons = this.formattingSettings.buttonStyle;
        const groups = this.formattingSettings.groupStyle;
        const collapsed = this.isCollapsed();
        const width = collapsed
            ? this.clampNumber(layout.collapsedWidth.value, 44, 120)
            : this.clampNumber(layout.expandedWidth.value, 90, 420);
        const searchColor = themeMode === "dark"
            ? this.color(search.darkBackgroundColor.value.value, "#222738")
            : this.color(search.backgroundColor.value.value, "#F5F6FB");

        this.root.classList.toggle("msl-collapsed", collapsed);
        this.root.classList.toggle("msl-dark", themeMode === "dark");
        this.root.style.margin = "0";
        this.root.style.padding = `${this.clampNumber(layout.marginTop.value, 0, 200)}px ${this.clampNumber(layout.marginRight.value, 0, 200)}px ${this.clampNumber(layout.marginBottom.value, 0, 200)}px ${this.clampNumber(layout.marginLeft.value, 0, 200)}px`;
        this.root.style.setProperty("--msl-width", `${width}px`);
        this.root.style.setProperty("--msl-padding", `${this.clampNumber(layout.padding.value, 4, 48)}px`);
        this.root.style.setProperty("--msl-radius", `${this.clampNumber(layout.borderRadius.value, 0, 48)}px`);
        this.root.style.setProperty("--msl-border-width", `${this.clampNumber(layout.borderWidth.value, 0, 8)}px`);
        this.root.style.setProperty("--msl-shadow", layout.showShadow.value ? "0 14px 34px rgba(22, 29, 57, 0.10)" : "none");
        this.root.style.setProperty("--msl-font", this.safeText(layout.fontFamily.value, "Segoe UI"));
        this.root.style.setProperty("--msl-bg", this.getThemeColor(themeMode, theme.backgroundColor.value.value, theme.darkBackgroundColor.value.value, "#FFFFFF", "#171A24"));
        this.root.style.setProperty("--msl-border", this.getThemeColor(themeMode, theme.borderColor.value.value, theme.darkBorderColor.value.value, "#E7EAF3", "#2B3040"));
        this.root.style.setProperty("--msl-text", this.getThemeColor(themeMode, theme.textColor.value.value, theme.darkTextColor.value.value, "#243056", "#F4F7FF"));
        this.root.style.setProperty("--msl-muted", this.getThemeColor(themeMode, theme.mutedColor.value.value, theme.darkMutedColor.value.value, "#7D849C", "#AEB5CA"));
        this.root.style.setProperty("--msl-logo-bg", this.color(header.logoBackgroundColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--msl-logo-text", this.color(header.logoTextColor.value.value, "#6C4FF6"));
        this.root.style.setProperty("--msl-logo-font", this.safeText(header.logoFontFamily.value, "Segoe UI"));
        this.root.style.setProperty("--msl-search-bg", searchColor);
        this.root.style.setProperty("--msl-search-height", `${this.clampNumber(search.height.value, 26, 70)}px`);
        this.root.style.setProperty("--msl-button-bg", this.resolveButtonBackground(buttons.backgroundColor.value.value));
        this.root.style.setProperty("--msl-hover-bg", this.color(buttons.hoverBackgroundColor.value.value, "#F1EEFF"));
        this.root.style.setProperty("--msl-active-bg", this.color(buttons.activeBackgroundColor.value.value, "#6C4FF6"));
        this.root.style.setProperty("--msl-icon-color", this.color(buttons.iconColor.value.value, "#2B3674"));
        this.root.style.setProperty("--msl-active-icon", this.color(buttons.activeIconColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--msl-active-text", this.color(buttons.activeTextColor.value.value, "#FFFFFF"));
        this.root.style.setProperty("--msl-button-height", `${this.clampNumber(buttons.buttonHeight.value, 28, 86)}px`);
        this.root.style.setProperty("--msl-button-gap", `${this.clampNumber(buttons.buttonGap.value, 0, 40)}px`);
        this.root.style.setProperty("--msl-button-radius", `${this.clampNumber(buttons.buttonRadius.value, 0, 32)}px`);
        this.root.style.setProperty("--msl-icon-size", `${this.clampNumber(buttons.iconSize.value, 12, 44)}px`);
        this.root.style.setProperty("--msl-font-size", `${this.clampNumber(buttons.fontSize.value, 8, 28)}px`);
        this.root.style.setProperty("--msl-group-font-size", `${this.clampNumber(groups.fontSize.value, 8, 18)}px`);
        this.root.style.setProperty("--msl-group-text", this.color(groups.textColor.value.value, "#9097AD"));
        this.root.style.setProperty("--msl-group-line", this.color(groups.lineColor.value.value, "#E8EBF5"));
        this.root.style.setProperty("--msl-group-top", `${this.clampNumber(groups.topSpacing.value, 0, 60)}px`);
        this.root.style.setProperty("--msl-button-justify", this.getButtonJustify());
        this.root.style.setProperty("--msl-text-align", this.getTextAlign());
    }

    private getThemeColor(themeMode: ThemeMode, lightValue: string, darkValue: string, lightFallback: string, darkFallback: string): string {
        return themeMode === "dark"
            ? this.color(darkValue, darkFallback)
            : this.color(lightValue, lightFallback);
    }

    private resolveButtonBackground(value: string): string {
        const color = this.color(value, "#FFFFFF");
        return color.toLowerCase() === "#ffffff" ? "transparent" : color;
    }

    private getButtonJustify(): string {
        const align = this.getTextAlign();

        if (align === "center") {
            return "center";
        }

        if (align === "right") {
            return "flex-end";
        }

        return "flex-start";
    }

    private getTextAlign(): TextAlignMode {
        const align = String(this.formattingSettings.buttonStyle.textAlign.value.value);

        if (align === "center" || align === "right") {
            return align;
        }

        return "left";
    }

    private getNavigationUrl(item: MenuItem): string {
        if (this.isWebUrl(item.targetUrl)) {
            return item.targetUrl;
        }

        const baseUrl = this.safeText(this.formattingSettings.interaction.reportBaseUrl.value, "");

        if (!this.isWebUrl(baseUrl)) {
            return "";
        }

        const pageValue = this.getPageUrlValue(item);
        const mode = String(this.formattingSettings.interaction.urlCompletionMode.value.value);

        if (mode === "rowUrl") {
            return item.targetUrl ? this.buildPathUrl(baseUrl, item.targetUrl) : "";
        }

        if (mode === "placeholder") {
            return baseUrl.replace("{page}", encodeURIComponent(pageValue));
        }

        if (mode === "pageName") {
            return this.buildPageNameUrl(baseUrl, pageValue);
        }

        if (mode === "path") {
            return this.buildPathUrl(baseUrl, pageValue);
        }

        return "";
    }

    private getPageUrlValue(item: MenuItem): string {
        if (item.targetUrl && !this.isWebUrl(item.targetUrl)) {
            return item.targetUrl;
        }

        return item.label;
    }

    private buildPageNameUrl(baseUrl: string, pageValue: string): string {
        try {
            const url = new URL(baseUrl);
            url.searchParams.set("pageName", pageValue);
            return url.toString();
        } catch {
            return "";
        }
    }

    private buildPathUrl(baseUrl: string, pageValue: string): string {
        try {
            const url = new URL(baseUrl);
            const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
            const reportsIndex = pathParts.findIndex((part) => part.toLowerCase() === "reports");

            if (reportsIndex >= 0 && reportsIndex + 1 < pathParts.length) {
                const pageIndex = reportsIndex + 2;

                if (pageIndex < pathParts.length) {
                    pathParts[pageIndex] = encodeURIComponent(pageValue);
                } else {
                    pathParts.push(encodeURIComponent(pageValue));
                }

                url.pathname = `/${pathParts.join("/")}`;
                return url.toString();
            }

            if (pathParts.length > 0 && pathParts[pathParts.length - 1].toLowerCase().startsWith("reportsection")) {
                pathParts[pathParts.length - 1] = encodeURIComponent(pageValue);
            } else {
                pathParts.push(encodeURIComponent(pageValue));
            }

            url.pathname = `/${pathParts.join("/")}`;
            return url.toString();
        } catch {
            return "";
        }
    }

    private applySearchFilter(): void {
        const query = this.normalizeText(this.searchText);
        const visibleSections: HTMLElement[] = [];
        let visibleCount = 0;

        this.buttonRecords.forEach((record) => {
            const visible = query.length === 0 || this.normalizeText(record.item.label).includes(query);
            record.button.classList.toggle("msl-hidden", !visible);

            if (visible) {
                visibleCount += 1;
                visibleSections.push(record.section);
            }
        });

        this.buttonRecords.forEach((record) => {
            record.section.classList.toggle("msl-section-hidden", !visibleSections.includes(record.section));
        });

        if (this.emptySearchNode) {
            this.emptySearchNode.classList.toggle("msl-hidden", visibleCount > 0 || this.buttonRecords.length === 0);
        }
    }

    private updateButtonActiveStates(): void {
        const activeKey = this.getActiveKey();

        this.buttonRecords.forEach((record) => {
            record.button.classList.toggle("msl-active", this.isActive(record.item.key, activeKey));
        });
    }

    private getActiveKey(): string {
        return this.lastSelectedKey;
    }

    private isActive(itemKey: string, activeKey: string): boolean {
        if (!activeKey) {
            return false;
        }

        if (this.formattingSettings.activeState.exactMatch.value) {
            return itemKey === activeKey;
        }

        return itemKey.includes(activeKey) || activeKey.includes(itemKey);
    }

    private resolveIconKey(iconValue: string, label: string): string {
        const normalizedIcon = this.normalizeCompact(iconValue);
        const normalizedLabel = this.normalizeCompact(label);
        const source = `${normalizedIcon} ${normalizedLabel}`;

        if (source.includes("alert")) {
            return "alert";
        }

        if (source.includes("analytics") || source.includes("chart") || source.includes("grafico")) {
            return "chart";
        }

        if (source.includes("calendar") || source.includes("calendario") || source.includes("frequencia") || source.includes("scheduled")) {
            return "calendar";
        }

        if (source.includes("clock") || source.includes("turno")) {
            return "clock";
        }

        if (source.includes("comment") || source.includes("message") || source.includes("mensagem")) {
            return "message";
        }

        if (source.includes("config") || source.includes("setting")) {
            return "settings";
        }

        if (source.includes("departamento") || source.includes("building")) {
            return "building";
        }

        if (source.includes("funcionario") || source.includes("employee") || source.includes("user")) {
            return "users";
        }

        if (source.includes("home") || source.includes("inicio") || source.includes("visao") || source.includes("overview") || source.includes("dashboard")) {
            return "home";
        }

        if (source.includes("like") || source.includes("heart")) {
            return "heart";
        }

        if (source.includes("report") || source.includes("relatorio") || source.includes("file")) {
            return "file";
        }

        if (source.includes("wallet") || source.includes("financeiro")) {
            return "wallet";
        }

        if (source.includes("grid") || source.includes("projeto")) {
            return "grid";
        }

        if (ICON_PATHS[normalizedIcon]) {
            return normalizedIcon;
        }

        return "default";
    }

    private createSvgIcon(iconKey: string): SVGSVGElement {
        const svg = document.createElementNS(SVG_NAMESPACE, "svg");
        const paths = ICON_PATHS[iconKey] || ICON_PATHS.default;

        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");

        paths.forEach((pathData) => {
            const path = document.createElementNS(SVG_NAMESPACE, "path");
            path.setAttribute("d", pathData);
            svg.appendChild(path);
        });

        return svg;
    }

    private clearRoot(): void {
        this.buttonRecords = [];
        this.emptySearchNode = undefined;

        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }
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

    private initials(value: string): string {
        const parts = value
            .split(/\s+/)
            .filter((part) => part.length > 0);

        if (parts.length === 0) {
            return "US";
        }

        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }

        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    private isCollapsed(): boolean {
        return Boolean(this.collapsed && this.formattingSettings.interaction.allowCollapse.value);
    }

    private shouldUseTextIcon(value: string): boolean {
        const trimmed = value.trim();
        return trimmed.length > 0 && trimmed.length <= 3 && !/^[a-z0-9_-]+$/i.test(trimmed);
    }

    private isImageUrl(value: string): boolean {
        const trimmed = value.trim().toLowerCase();
        return trimmed.startsWith("https://")
            || trimmed.startsWith("data:image/")
            || trimmed.startsWith("blob:");
    }

    private isWebUrl(value: string): boolean {
        const trimmed = value.trim().toLowerCase();
        return trimmed.startsWith("https://");
    }

    private normalizeCompact(value: string): string {
        return this.normalizeText(value).replace(/[^a-z0-9]+/g, "");
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
