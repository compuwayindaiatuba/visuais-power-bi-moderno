// src/visual.ts
import "../style/visual.less";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";
import { hideVisualElement, shouldShowVisualForMenu, showVisualElement } from "./menuFilter";

import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import PrimitiveValue = powerbi.PrimitiveValue;
import FilterAction = powerbi.FilterAction;
import FormattingModel = powerbi.visuals.FormattingModel;

interface FilterTarget {
    table: string;
    column: string;
}

interface DateParts {
    year: number;
    month: number;
    day: number;
}

interface ParsedDate {
    date: Date;
    key: string;
}

interface HierarchyDateParts {
    day?: number;
    month?: number;
    quarter?: number;
    year?: number;
}

export class Visual implements IVisual {
    private readonly target: HTMLElement;
    private readonly host: IVisualHost;
    private readonly root: HTMLElement;
    private readonly popup: HTMLElement;
    private readonly monthDropdown: HTMLElement;
    private readonly yearDropdown: HTMLElement;
    private readonly yearList: HTMLElement;
    private readonly daysContainer: HTMLElement;
    private readonly valueElement: HTMLElement;

    private startDate: Date | null = null;
    private endDate: Date | null = null;
    private currentMonth: number;
    private currentYear: number;
    private filterTarget: FilterTarget | null = null;
    private isDateColumn = false;
    private dataMinDate: Date | null = null;
    private dataMaxDate: Date | null = null;
    private readonly availableExactDays: Set<string> = new Set();
    private readonly availableMonths: Set<string> = new Set();
    private readonly availableYears: Set<string> = new Set();
    private readonly valuesByDateKey: Map<string, PrimitiveValue[]> = new Map();
    private readonly formattingSettingsService = new FormattingSettingsService();
    private formattingSettings = new VisualFormattingSettingsModel();

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;

        const now = new Date();
        this.currentMonth = now.getMonth();
        this.currentYear = now.getFullYear();

        this.root = document.createElement("div");
        this.root.className = "mc-container";

        const card = document.createElement("div");
        card.className = "mc-card";
        card.tabIndex = 0;

        const left = document.createElement("div");
        left.className = "mc-left";

        const icon = document.createElement("div");
        icon.className = "mc-icon";
        icon.innerText = "📅";

        const text = document.createElement("div");
        text.className = "mc-text";

        const title = document.createElement("div");
        title.className = "mc-title";
        title.innerText = "Período selecionado";

        this.valueElement = document.createElement("div");
        this.valueElement.className = "mc-value";
        this.valueElement.innerText = "Selecione um período";

        text.appendChild(title);
        text.appendChild(this.valueElement);
        left.appendChild(icon);
        left.appendChild(text);

        const arrow = document.createElement("div");
        arrow.className = "mc-arrow";
        arrow.innerText = "▾";

        card.appendChild(left);
        card.appendChild(arrow);

        this.popup = document.createElement("div");
        this.popup.className = "mc-popup";

        const popupContent = document.createElement("div");
        popupContent.className = "mc-popup-content";

        const calendar = document.createElement("div");
        calendar.className = "calendar";

        const toolbar = document.createElement("div");
        toolbar.className = "calendar-toolbar";

        this.monthDropdown = document.createElement("div");
        this.monthDropdown.className = "calendar-dropdown";
        const monthSelected = document.createElement("div");
        monthSelected.className = "dropdown-selected";
        monthSelected.innerText = this.getMonthName(this.currentMonth);
        this.monthDropdown.appendChild(monthSelected);

        const monthList = document.createElement("div");
        monthList.className = "dropdown-list";
        for (let month = 0; month < 12; month++) {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.innerText = this.getMonthName(month);
            item.addEventListener("click", (event) => {
                event.stopPropagation();
                this.currentMonth = month;
                this.updateDropdownLabels();
                monthList.classList.remove("open");
                this.renderCalendar();
            });
            monthList.appendChild(item);
        }
        this.monthDropdown.appendChild(monthList);
        monthSelected.addEventListener("click", (event) => {
            event.stopPropagation();
            monthList.classList.toggle("open");
            this.yearList.classList.remove("open");
        });

        this.yearDropdown = document.createElement("div");
        this.yearDropdown.className = "calendar-dropdown";
        const yearSelected = document.createElement("div");
        yearSelected.className = "dropdown-selected";
        yearSelected.innerText = String(this.currentYear);
        this.yearDropdown.appendChild(yearSelected);

        this.yearList = document.createElement("div");
        this.yearList.className = "dropdown-list";
        this.yearDropdown.appendChild(this.yearList);
        this.rebuildYearOptions();

        yearSelected.addEventListener("click", (event) => {
            event.stopPropagation();
            this.yearList.classList.toggle("open");
            monthList.classList.remove("open");
        });

        const nav = document.createElement("div");
        nav.style.display = "flex";
        nav.style.gap = "8px";

        const prevBtn = document.createElement("button");
        prevBtn.className = "footer-btn";
        prevBtn.type = "button";
        prevBtn.innerText = "<";
        prevBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.changeMonth(-1);
        });

        const nextBtn = document.createElement("button");
        nextBtn.className = "footer-btn";
        nextBtn.type = "button";
        nextBtn.innerText = ">";
        nextBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.changeMonth(1);
        });

        nav.appendChild(prevBtn);
        nav.appendChild(nextBtn);
        toolbar.appendChild(this.monthDropdown);
        toolbar.appendChild(this.yearDropdown);
        toolbar.appendChild(nav);

        const week = document.createElement("div");
        week.className = "week";
        ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"].forEach((day) => {
            const weekDay = document.createElement("div");
            weekDay.innerText = day;
            week.appendChild(weekDay);
        });

        this.daysContainer = document.createElement("div");
        this.daysContainer.className = "days";

        const footer = document.createElement("div");
        footer.className = "calendar-footer";

        const clearBtn = document.createElement("button");
        clearBtn.className = "footer-btn";
        clearBtn.type = "button";
        clearBtn.innerText = "Limpar";
        clearBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.clearSelection(true);
        });

        const applyBtn = document.createElement("button");
        applyBtn.className = "footer-btn apply";
        applyBtn.type = "button";
        applyBtn.innerText = "Aplicar";
        applyBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.applyFilter();
            this.popup.classList.remove("open");
        });

        footer.appendChild(clearBtn);
        footer.appendChild(applyBtn);
        calendar.appendChild(toolbar);
        calendar.appendChild(week);
        calendar.appendChild(this.daysContainer);
        calendar.appendChild(footer);
        popupContent.appendChild(calendar);
        this.popup.appendChild(popupContent);
        this.root.appendChild(card);
        this.root.appendChild(this.popup);
        this.target.appendChild(this.root);

        card.addEventListener("click", (event) => {
            event.stopPropagation();
            this.popup.classList.toggle("open");
        });

        document.addEventListener("click", () => {
            monthList.classList.remove("open");
            this.yearList.classList.remove("open");
        });

        this.applyFormattingSettings();
        this.renderCalendar();
    }

    public update(options: VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];
        if (dataView) {
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);
        }

        if (!shouldShowVisualForMenu(dataView, {
            enabled: this.formattingSettings.menuFilter.enabled.value,
            menuName: this.formattingSettings.menuFilter.menuName.value
        })) {
            hideVisualElement(this.root);
            return;
        }

        showVisualElement(this.root);
        this.applyFormattingSettings();
        this.resetDataState();

        const categories = dataView?.categorical?.categories ?? [];
        const dateCategories = categories.filter((category) => Boolean(category.source.roles?.date));
        const activeDateCategories = dateCategories.length > 0 ? dateCategories : categories.slice(0, 1);
        const filterCategory = activeDateCategories.find((category) => Boolean(category.source.type?.dateTime)) ?? activeDateCategories[0];

        if (filterCategory) {
            this.filterTarget = this.createFilterTarget(filterCategory.source);
            this.isDateColumn = Boolean(filterCategory.source.type?.dateTime);
            this.registerDateCategories(activeDateCategories);
        }

        if (this.dataMinDate && !this.startDate && !this.hasAvailableDayInMonth(this.currentYear, this.currentMonth)) {
            this.currentYear = this.dataMinDate.getFullYear();
            this.currentMonth = this.dataMinDate.getMonth();
        }

        this.rebuildYearOptions();
        this.updateDropdownLabels();
        this.renderCalendar();
    }

    public getFormattingModel(): FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private applyFormattingSettings(): void {
        const settings = this.formattingSettings;

        this.setPx("--mc-popup-height", settings.layout.popupHeight.value);
        this.setPx("--mc-container-padding", settings.layout.containerPadding.value);
        this.setPx("--mc-calendar-padding", settings.layout.calendarPadding.value);
        this.setPx("--mc-calendar-gap", settings.layout.calendarGap.value);
        this.root.style.setProperty("--mc-font-family", settings.layout.fontFamily.value || "Segoe UI");
        this.root.style.setProperty("--mc-font-weight", String(settings.layout.fontWeight.value.value));

        this.setPx("--mc-card-height", settings.card.cardHeight.value);
        this.setPx("--mc-card-padding", settings.card.cardPadding.value);
        this.setPx("--mc-card-radius", settings.card.cardRadius.value);
        this.setPx("--mc-card-title-size", settings.card.titleFontSize.value);
        this.setPx("--mc-card-value-size", settings.card.valueFontSize.value);
        this.setPx("--mc-card-icon-size", settings.card.iconFontSize.value);
        this.setColor("--mc-card-background", settings.card.cardBackground.value);
        this.setColor("--mc-card-border-color", settings.card.cardBorderColor.value);
        this.setColor("--mc-card-title-color", settings.card.titleColor.value);
        this.setColor("--mc-card-value-color", settings.card.valueColor.value);

        this.setColor("--mc-popup-background", settings.calendar.popupBackground.value);
        this.setColor("--mc-popup-border-color", settings.calendar.popupBorderColor.value);
        this.setPx("--mc-toolbar-font-size", settings.calendar.toolbarFontSize.value);
        this.setPx("--mc-dropdown-width", settings.calendar.dropdownWidth.value);
        this.setPx("--mc-dropdown-height", settings.calendar.dropdownHeight.value);
        this.setPx("--mc-weekday-font-size", settings.calendar.weekdayFontSize.value);
        this.setColor("--mc-weekday-color", settings.calendar.weekdayColor.value);

        this.setPx("--mc-day-size", settings.days.daySize.value);
        this.setPx("--mc-day-gap", settings.days.dayGap.value);
        this.setPx("--mc-day-font-size", settings.days.dayFontSize.value);
        this.setPx("--mc-day-radius", settings.days.dayRadius.value);
        this.setColor("--mc-day-background", settings.days.dayBackground.value);
        this.setColor("--mc-day-text-color", settings.days.dayTextColor.value);
        this.setColor("--mc-day-hover-background", settings.days.dayHoverBackground.value);
        this.setColor("--mc-selected-background", settings.days.selectedBackground.value);
        this.setColor("--mc-selected-text-color", settings.days.selectedTextColor.value);
        this.setColor("--mc-range-background", settings.days.rangeBackground.value);
        this.setColor("--mc-range-text-color", settings.days.rangeTextColor.value);
        this.root.style.setProperty("--mc-disabled-opacity", String(settings.days.disabledOpacity.value / 100));

        this.setPx("--mc-button-font-size", settings.buttons.buttonFontSize.value);
        this.setPx("--mc-button-padding-x", settings.buttons.buttonPaddingX.value);
        this.setPx("--mc-button-padding-y", settings.buttons.buttonPaddingY.value);
        this.setPx("--mc-button-radius", settings.buttons.buttonRadius.value);
        this.setColor("--mc-button-background", settings.buttons.buttonBackground.value);
        this.setColor("--mc-button-text-color", settings.buttons.buttonTextColor.value);
        this.setColor("--mc-apply-background", settings.buttons.applyBackground.value);
        this.setColor("--mc-apply-text-color", settings.buttons.applyTextColor.value);
    }

    private setPx(propertyName: string, value: number): void {
        this.root.style.setProperty(propertyName, `${value}px`);
    }

    private setColor(propertyName: string, color: powerbi.ThemeColorData): void {
        if (color.value) {
            this.root.style.setProperty(propertyName, color.value);
        }
    }

    private resetDataState(): void {
        this.filterTarget = null;
        this.isDateColumn = false;
        this.dataMinDate = null;
        this.dataMaxDate = null;
        this.availableExactDays.clear();
        this.availableMonths.clear();
        this.availableYears.clear();
        this.valuesByDateKey.clear();
    }

    private registerDateCategories(categories: powerbi.DataViewCategoryColumn[]): void {
        if (categories.length === 0) {
            return;
        }

        const dateTimeCategory = categories.find((category) => Boolean(category.source.type?.dateTime));

        if (dateTimeCategory) {
            dateTimeCategory.values.forEach((value) => this.registerValue(value));
            return;
        }

        if (categories.length === 1) {
            categories[0].values.forEach((value) => this.registerValue(value));
            return;
        }

        const rowCount = Math.max(...categories.map((category) => category.values.length));

        for (let index = 0; index < rowCount; index++) {
            this.registerHierarchyDateRow(categories, index);
        }
    }

    private registerHierarchyDateRow(categories: powerbi.DataViewCategoryColumn[], rowIndex: number): void {
        const parts: HierarchyDateParts = {};

        categories.forEach((category, categoryIndex) => {
            const value = category.values[rowIndex];
            const role = this.detectHierarchyDateRole(category.source, categoryIndex, value);

            if (role === "year") {
                parts.year = this.parseYearPart(value) ?? parts.year;
            } else if (role === "quarter") {
                parts.quarter = this.parseQuarterPart(value) ?? parts.quarter;
            } else if (role === "month") {
                parts.month = this.parseMonthPart(value) ?? parts.month;
            } else if (role === "day") {
                parts.day = this.parseDayPart(value) ?? parts.day;
            } else {
                const parsed = this.parseDateValue(value);
                if (parsed) {
                    this.availableExactDays.add(parsed.key);
                    this.updateDataBounds(parsed.date, parsed.date);
                }
            }
        });

        this.registerHierarchyParts(parts);
    }

    private registerHierarchyParts(parts: HierarchyDateParts): void {
        if (!parts.year) {
            return;
        }

        if (parts.month && parts.day) {
            const parsed = this.createParsedDate({
                year: parts.year,
                month: parts.month,
                day: parts.day
            });

            if (parsed) {
                this.availableExactDays.add(parsed.key);
                this.updateDataBounds(parsed.date, parsed.date);
            }
            return;
        }

        if (parts.month) {
            this.registerAvailableMonth(parts.year, parts.month);
            return;
        }

        if (parts.quarter) {
            const firstMonth = ((parts.quarter - 1) * 3) + 1;
            this.registerAvailableMonth(parts.year, firstMonth);
            this.registerAvailableMonth(parts.year, firstMonth + 1);
            this.registerAvailableMonth(parts.year, firstMonth + 2);
            return;
        }

        this.availableYears.add(String(parts.year));
        this.updateDataBounds(new Date(parts.year, 0, 1), new Date(parts.year, 11, 31));
    }

    private registerAvailableMonth(year: number, month: number): void {
        if (!this.isValidMonth(month)) {
            return;
        }

        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        this.availableMonths.add(monthKey);
        this.updateDataBounds(new Date(year, month - 1, 1), new Date(year, month, 0));
    }

    private registerValue(value: PrimitiveValue): void {
        if (value === null || value === undefined) {
            return;
        }

        const parsed = this.parseDateValue(value);
        if (!parsed) {
            this.registerPartialDateValue(value);
            return;
        }

        this.availableExactDays.add(parsed.key);
        this.addValueForDateKey(parsed.key, value);
        this.updateDataBounds(parsed.date, parsed.date);
    }

    private registerPartialDateValue(value: PrimitiveValue): void {
        const raw = String(value).trim();
        const yearMonth = raw.match(/^(\d{4})-(\d{1,2})$/);
        if (yearMonth) {
            const year = Number(yearMonth[1]);
            const month = Number(yearMonth[2]);
            if (this.isValidMonth(month)) {
                const monthKey = `${year}-${String(month).padStart(2, "0")}`;
                this.availableMonths.add(monthKey);
                this.updateDataBounds(new Date(year, month - 1, 1), new Date(year, month, 0));
            }
            return;
        }

        const yearOnly = raw.match(/^(\d{4})$/);
        if (yearOnly) {
            const year = Number(yearOnly[1]);
            this.availableYears.add(String(year));
            this.updateDataBounds(new Date(year, 0, 1), new Date(year, 11, 31));
        }
    }

    private detectHierarchyDateRole(
        source: DataViewMetadataColumn,
        categoryIndex: number,
        value: PrimitiveValue
    ): "year" | "quarter" | "month" | "day" | "date" | "unknown" {
        if (value instanceof Date || source.type?.dateTime) {
            return "date";
        }

        const metadata = this.normalizeText(`${source.displayName || ""} ${source.queryName || ""}`);

        if (/(ano|year)/.test(metadata)) {
            return "year";
        }

        if (/(trimestre|quarter|trim|quart)/.test(metadata)) {
            return "quarter";
        }

        if (/(mes|month)/.test(metadata)) {
            return "month";
        }

        if (/(dia|day)/.test(metadata)) {
            return "day";
        }

        const raw = String(value ?? "").trim();

        if (categoryIndex === 0 && this.parseYearPart(raw) !== undefined) {
            return "year";
        }

        if (this.parseQuarterPart(raw) !== undefined) {
            return "quarter";
        }

        if (categoryIndex <= 2 && this.parseMonthPart(raw) !== undefined) {
            return "month";
        }

        if (this.parseDayPart(raw) !== undefined) {
            return "day";
        }

        return "unknown";
    }

    private parseYearPart(value: PrimitiveValue): number | undefined {
        const raw = String(value ?? "").trim();
        const match = raw.match(/\b(19\d{2}|20\d{2}|21\d{2})\b/);
        const year = match ? Number(match[1]) : Number(raw);

        return Number.isInteger(year) && year >= 1900 && year <= 2199 ? year : undefined;
    }

    private parseQuarterPart(value: PrimitiveValue): number | undefined {
        const raw = this.normalizeText(String(value ?? "").trim());
        const match = raw.match(/(?:^|\\b)(?:q|t|tri|trim|trimestre|quarter)?\\s*([1-4])(?:\\b|$)/);
        const quarter = match ? Number(match[1]) : Number(raw);

        return Number.isInteger(quarter) && quarter >= 1 && quarter <= 4 ? quarter : undefined;
    }

    private parseMonthPart(value: PrimitiveValue): number | undefined {
        if (typeof value === "number" && Number.isInteger(value) && this.isValidMonth(value)) {
            return value;
        }

        const raw = String(value ?? "").trim();
        const numeric = Number(raw);

        if (Number.isInteger(numeric) && this.isValidMonth(numeric)) {
            return numeric;
        }

        const month = this.monthNameToNumber(raw);
        return this.isValidMonth(month) ? month : undefined;
    }

    private parseDayPart(value: PrimitiveValue): number | undefined {
        const day = Number(String(value ?? "").trim());
        return Number.isInteger(day) && day >= 1 && day <= 31 ? day : undefined;
    }

    private parseDateValue(value: PrimitiveValue): ParsedDate | null {
        if (value instanceof Date) {
            return this.createParsedDate(this.getDateParts(value));
        }

        const raw = String(value).trim();
        const portugueseDate = raw.match(/^(\d{4})-([a-zA-ZçÇãõéêíóúâô]+)-(\d{1,2})$/i);
        if (portugueseDate) {
            const month = this.monthNameToNumber(portugueseDate[2]);
            if (this.isValidMonth(month)) {
                return this.createParsedDate({
                    year: Number(portugueseDate[1]),
                    month,
                    day: Number(portugueseDate[3])
                });
            }
        }

        const isoDate = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
        if (isoDate) {
            return this.createParsedDate({
                year: Number(isoDate[1]),
                month: Number(isoDate[2]),
                day: Number(isoDate[3])
            });
        }

        const brazilianDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (brazilianDate) {
            return this.createParsedDate({
                year: Number(brazilianDate[3]),
                month: Number(brazilianDate[2]),
                day: Number(brazilianDate[1])
            });
        }

        const parsedDate = new Date(raw);
        if (!Number.isNaN(parsedDate.getTime())) {
            return this.createParsedDate(this.getDateParts(parsedDate));
        }

        return null;
    }

    private createParsedDate(parts: DateParts): ParsedDate | null {
        if (!this.isValidMonth(parts.month) || parts.day < 1 || parts.day > 31) {
            return null;
        }

        const date = new Date(parts.year, parts.month - 1, parts.day);
        if (date.getFullYear() !== parts.year || date.getMonth() !== parts.month - 1 || date.getDate() !== parts.day) {
            return null;
        }

        return {
            date,
            key: this.toDateKey(date)
        };
    }

    private getDateParts(date: Date): DateParts {
        const isUtcMidnight = date.getUTCHours() === 0
            && date.getUTCMinutes() === 0
            && date.getUTCSeconds() === 0
            && date.getUTCMilliseconds() === 0;

        if (isUtcMidnight) {
            return {
                year: date.getUTCFullYear(),
                month: date.getUTCMonth() + 1,
                day: date.getUTCDate()
            };
        }

        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate()
        };
    }

    private addValueForDateKey(key: string, value: PrimitiveValue): void {
        const values = this.valuesByDateKey.get(key) ?? [];
        if (!values.includes(value)) {
            values.push(value);
        }
        this.valuesByDateKey.set(key, values);
    }

    private updateDataBounds(start: Date, end: Date): void {
        if (!this.dataMinDate || start < this.dataMinDate) {
            this.dataMinDate = start;
        }
        if (!this.dataMaxDate || end > this.dataMaxDate) {
            this.dataMaxDate = end;
        }
    }

    private createFilterTarget(source: DataViewMetadataColumn): FilterTarget | null {
        const queryName = source.queryName?.trim();
        if (!queryName) {
            return null;
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

        return null;
    }

    private getMonthName(month: number): string {
        return ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][month];
    }

    private monthNameToNumber(name: string): number {
        const months: { [key: string]: number } = {
            janeiro: 1,
            jan: 1,
            january: 1,
            fevereiro: 2,
            fev: 2,
            feb: 2,
            february: 2,
            março: 3,
            marco: 3,
            mar: 3,
            march: 3,
            abril: 4,
            abr: 4,
            apr: 4,
            april: 4,
            maio: 5,
            may: 5,
            junho: 6,
            jun: 6,
            june: 6,
            julho: 7,
            jul: 7,
            july: 7,
            agosto: 8,
            ago: 8,
            aug: 8,
            august: 8,
            setembro: 9,
            set: 9,
            sep: 9,
            september: 9,
            outubro: 10,
            out: 10,
            oct: 10,
            october: 10,
            novembro: 11,
            nov: 11,
            november: 11,
            dezembro: 12,
            dez: 12,
            dec: 12,
            december: 12
        };

        return months[this.normalizeText(name)] ?? 0;
    }

    private normalizeText(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    private changeMonth(delta: number): void {
        this.currentMonth += delta;

        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear -= 1;
        }

        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear += 1;
        }

        this.rebuildYearOptions();
        this.updateDropdownLabels();
        this.renderCalendar();
    }

    private rebuildYearOptions(): void {
        const minYear = this.dataMinDate?.getFullYear() ?? this.currentYear - 5;
        const maxYear = this.dataMaxDate?.getFullYear() ?? this.currentYear + 5;
        const firstYear = Math.min(minYear, this.currentYear);
        const lastYear = Math.max(maxYear, this.currentYear);

        this.yearList.replaceChildren();
        for (let year = firstYear; year <= lastYear; year++) {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.innerText = String(year);
            if (year === this.currentYear) {
                item.classList.add("selected");
            }
            item.addEventListener("click", (event) => {
                event.stopPropagation();
                this.currentYear = year;
                this.updateDropdownLabels();
                this.yearList.classList.remove("open");
                this.renderCalendar();
            });
            this.yearList.appendChild(item);
        }
    }

    private updateDropdownLabels(): void {
        const monthSelected = this.monthDropdown.querySelector(".dropdown-selected") as HTMLElement;
        const yearSelected = this.yearDropdown.querySelector(".dropdown-selected") as HTMLElement;

        monthSelected.innerText = this.getMonthName(this.currentMonth);
        yearSelected.innerText = String(this.currentYear);
    }

    private renderCalendar(): void {
        this.daysContainer.replaceChildren();

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const startWeekDay = firstDay.getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

        for (let index = 0; index < startWeekDay; index++) {
            const empty = document.createElement("div");
            empty.className = "day empty";
            this.daysContainer.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const cell = document.createElement("div");
            const available = this.isDateAvailable(date);

            cell.className = available ? "day available" : "day disabled";
            cell.innerText = String(day);
            cell.dataset.date = this.toDateKey(date);

            if (available) {
                this.applySelectionClasses(cell, date);
                cell.addEventListener("click", (event) => {
                    event.stopPropagation();
                    this.onDayClick(date);
                });
            } else {
                cell.style.pointerEvents = "none";
                cell.title = "Data não disponível na fonte";
            }

            this.daysContainer.appendChild(cell);
        }
    }

    private applySelectionClasses(cell: HTMLElement, date: Date): void {
        if (this.startDate && this.endDate) {
            if (this.isSameDay(date, this.startDate)) {
                cell.classList.add("start");
            } else if (this.isSameDay(date, this.endDate)) {
                cell.classList.add("end");
            } else if (date > this.startDate && date < this.endDate) {
                cell.classList.add("range");
            }
            return;
        }

        if (this.startDate && this.isSameDay(date, this.startDate)) {
            cell.classList.add("selected");
        }
    }

    private isDateAvailable(date: Date): boolean {
        if (!this.hasAvailableValues()) {
            return false;
        }

        const dateKey = this.toDateKey(date);
        if (this.availableExactDays.has(dateKey)) {
            return true;
        }

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (this.availableMonths.has(monthKey)) {
            return true;
        }

        return this.availableYears.has(String(date.getFullYear()));
    }

    private hasAvailableValues(): boolean {
        return this.availableExactDays.size > 0 || this.availableMonths.size > 0 || this.availableYears.size > 0;
    }

    private hasAvailableDayInMonth(year: number, month: number): boolean {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            if (this.isDateAvailable(new Date(year, month, day))) {
                return true;
            }
        }
        return false;
    }

    private onDayClick(date: Date): void {
        if (!this.startDate || this.endDate) {
            this.startDate = date;
            this.endDate = null;
        } else if (date < this.startDate) {
            this.endDate = this.startDate;
            this.startDate = date;
        } else {
            this.endDate = date;
        }

        this.updateHeader();
        this.renderCalendar();
    }

    private clearSelection(removeFilter: boolean): void {
        this.startDate = null;
        this.endDate = null;
        this.updateHeader();
        this.renderCalendar();

        if (removeFilter) {
            this.host.applyJsonFilter(null as powerbi.IFilter, "general", "filter", FilterAction.remove);
        }
    }

    private updateHeader(): void {
        if (this.startDate && this.endDate) {
            this.valueElement.innerText = `${this.formatDate(this.startDate)} - ${this.formatDate(this.endDate)}`;
            return;
        }

        if (this.startDate) {
            this.valueElement.innerText = `${this.formatDate(this.startDate)} - ...`;
            return;
        }

        this.valueElement.innerText = "Selecione um período";
    }

    private applyFilter(): void {
        if (!this.startDate) {
            this.host.applyJsonFilter(null as powerbi.IFilter, "general", "filter", FilterAction.remove);
            return;
        }

        if (!this.filterTarget) {
            return;
        }

        const endDate = this.endDate ?? this.startDate;
        const basicFilter = this.createBasicFilterFromLoadedValues(this.startDate, endDate);
        const filter = this.isDateColumn
            ? this.createAdvancedDateFilter(this.startDate, endDate)
            : basicFilter;

        if (!filter) {
            return;
        }

        this.host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
    }

    private createAdvancedDateFilter(startDate: Date, endDate: Date): powerbi.IFilter {
        return {
            $schema: "https://powerbi.com/product/schema#advanced",
            target: this.filterTarget,
            logicalOperator: "And",
            conditions: [
                {
                    operator: "GreaterThanOrEqual",
                    value: this.toUtcIsoDateTime(startDate, false)
                },
                {
                    operator: "LessThanOrEqual",
                    value: this.toUtcIsoDateTime(endDate, true)
                }
            ],
            filterType: 2
        } as powerbi.IFilter;
    }

    private createBasicFilterFromLoadedValues(startDate: Date, endDate: Date): powerbi.IFilter | null {
        const values: PrimitiveValue[] = [];
        const startKey = this.toDateKey(startDate);
        const endKey = this.toDateKey(endDate);

        this.valuesByDateKey.forEach((dateValues, key) => {
            if (key >= startKey && key <= endKey) {
                values.push(...dateValues);
            }
        });

        if (values.length === 0) {
            return null;
        }

        return {
            $schema: "https://powerbi.com/product/schema#basic",
            target: this.filterTarget,
            operator: "In",
            values,
            filterType: 1
        } as powerbi.IFilter;
    }

    private toUtcIsoDateTime(date: Date, endOfDay: boolean): string {
        const utcDate = endOfDay
            ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999))
            : new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));

        return utcDate.toISOString();
    }

    private toDateKey(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    private formatDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    private isSameDay(first: Date, second: Date): boolean {
        return first.getFullYear() === second.getFullYear()
            && first.getMonth() === second.getMonth()
            && first.getDate() === second.getDate();
    }

    private isValidMonth(month: number): boolean {
        return month >= 1 && month <= 12;
    }
}




