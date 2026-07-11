"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

const numericOptions = (min: number, max: number): powerbi.visuals.NumUpDownFormat => ({
    minValue: {
        type: powerbi.visuals.ValidatorType.Min,
        value: min
    },
    maxValue: {
        type: powerbi.visuals.ValidatorType.Max,
        value: max
    }
});

const fontWeightItems: powerbi.IEnumMember[] = [
    { value: "400", displayName: "Normal" },
    { value: "500", displayName: "Medio" },
    { value: "600", displayName: "Semibold" },
    { value: "700", displayName: "Bold" }
];

class LayoutSettings extends FormattingSettingsCard {
    popupHeight = new formattingSettings.NumUpDown({
        name: "popupHeight",
        displayName: "Altura do popup",
        value: 400,
        options: numericOptions(300, 720)
    });

    containerPadding = new formattingSettings.NumUpDown({
        name: "containerPadding",
        displayName: "Espaçamento externo",
        value: 8,
        options: numericOptions(0, 32)
    });

    calendarPadding = new formattingSettings.NumUpDown({
        name: "calendarPadding",
        displayName: "Espaçamento calendário",
        value: 14,
        options: numericOptions(6, 32)
    });

    calendarGap = new formattingSettings.NumUpDown({
        name: "calendarGap",
        displayName: "Espaçamento interno",
        value: 12,
        options: numericOptions(6, 28)
    });

    fontFamily = new formattingSettings.TextInput({
        name: "fontFamily",
        displayName: "Fonte",
        value: "Segoe UI",
        placeholder: "Segoe UI"
    });

    fontWeight = new formattingSettings.ItemDropdown({
        name: "fontWeight",
        displayName: "Peso do texto",
        value: fontWeightItems[0],
        items: fontWeightItems
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [
        this.popupHeight,
        this.containerPadding,
        this.calendarPadding,
        this.calendarGap,
        this.fontFamily,
        this.fontWeight
    ];
}

class MenuFilterSettings extends FormattingSettingsCard {
    enabled = new formattingSettings.ToggleSwitch({
        name: "enabled",
        displayName: "Ativar menu invisivel",
        value: false
    });

    menuName = new formattingSettings.TextInput({
        name: "menuName",
        displayName: "Mostrar quando menu for",
        value: "",
        placeholder: "Funcionarios"
    });

    name: string = "menuFilter";
    displayName: string = "Menu";
    slices: Array<FormattingSettingsSlice> = [
        this.enabled,
        this.menuName
    ];
}

class CardSettings extends FormattingSettingsCard {
    cardHeight = new formattingSettings.NumUpDown({
        name: "cardHeight",
        displayName: "Altura mínima",
        value: 62,
        options: numericOptions(44, 120)
    });

    cardPadding = new formattingSettings.NumUpDown({
        name: "cardPadding",
        displayName: "Espaçamento",
        value: 12,
        options: numericOptions(6, 28)
    });

    cardRadius = new formattingSettings.NumUpDown({
        name: "cardRadius",
        displayName: "Arredondamento",
        value: 14,
        options: numericOptions(0, 28)
    });

    titleFontSize = new formattingSettings.NumUpDown({
        name: "titleFontSize",
        displayName: "Fonte título",
        value: 12,
        options: numericOptions(8, 24)
    });

    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Fonte período",
        value: 16,
        options: numericOptions(10, 32)
    });

    iconFontSize = new formattingSettings.NumUpDown({
        name: "iconFontSize",
        displayName: "Tamanho ícone",
        value: 22,
        options: numericOptions(12, 40)
    });

    cardBackground = new formattingSettings.ColorPicker({
        name: "cardBackground",
        displayName: "Fundo",
        value: { value: "#FFFFFF" }
    });

    cardBorderColor = new formattingSettings.ColorPicker({
        name: "cardBorderColor",
        displayName: "Cor da borda",
        value: { value: "#E4E7EC" }
    });

    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Cor título",
        value: { value: "#6B7280" }
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Cor período",
        value: { value: "#1F2A44" }
    });

    name: string = "card";
    displayName: string = "Cartão";
    slices: Array<FormattingSettingsSlice> = [
        this.cardHeight,
        this.cardPadding,
        this.cardRadius,
        this.titleFontSize,
        this.valueFontSize,
        this.iconFontSize,
        this.cardBackground,
        this.cardBorderColor,
        this.titleColor,
        this.valueColor
    ];
}

class CalendarSettings extends FormattingSettingsCard {
    popupBackground = new formattingSettings.ColorPicker({
        name: "popupBackground",
        displayName: "Fundo popup",
        value: { value: "#FFFFFF" }
    });

    popupBorderColor = new formattingSettings.ColorPicker({
        name: "popupBorderColor",
        displayName: "Borda popup",
        value: { value: "#E4E7EC" }
    });

    toolbarFontSize = new formattingSettings.NumUpDown({
        name: "toolbarFontSize",
        displayName: "Fonte mês/ano",
        value: 13,
        options: numericOptions(9, 22)
    });

    dropdownWidth = new formattingSettings.NumUpDown({
        name: "dropdownWidth",
        displayName: "Largura mês/ano",
        value: 132,
        options: numericOptions(90, 220)
    });

    dropdownHeight = new formattingSettings.NumUpDown({
        name: "dropdownHeight",
        displayName: "Altura mês/ano",
        value: 34,
        options: numericOptions(28, 52)
    });

    weekdayFontSize = new formattingSettings.NumUpDown({
        name: "weekdayFontSize",
        displayName: "Fonte semana",
        value: 11,
        options: numericOptions(8, 18)
    });

    weekdayColor = new formattingSettings.ColorPicker({
        name: "weekdayColor",
        displayName: "Cor semana",
        value: { value: "#8391AE" }
    });

    name: string = "calendar";
    displayName: string = "Calendário";
    slices: Array<FormattingSettingsSlice> = [
        this.popupBackground,
        this.popupBorderColor,
        this.toolbarFontSize,
        this.dropdownWidth,
        this.dropdownHeight,
        this.weekdayFontSize,
        this.weekdayColor
    ];
}

class DaysSettings extends FormattingSettingsCard {
    daySize = new formattingSettings.NumUpDown({
        name: "daySize",
        displayName: "Tamanho do dia",
        value: 36,
        options: numericOptions(28, 68)
    });

    dayGap = new formattingSettings.NumUpDown({
        name: "dayGap",
        displayName: "Espaço entre dias",
        value: 6,
        options: numericOptions(2, 16)
    });

    dayFontSize = new formattingSettings.NumUpDown({
        name: "dayFontSize",
        displayName: "Fonte dos dias",
        value: 13,
        options: numericOptions(9, 24)
    });

    dayRadius = new formattingSettings.NumUpDown({
        name: "dayRadius",
        displayName: "Arredondamento",
        value: 12,
        options: numericOptions(0, 24)
    });

    dayBackground = new formattingSettings.ColorPicker({
        name: "dayBackground",
        displayName: "Fundo disponível",
        value: { value: "#EEF2FF" }
    });

    dayTextColor = new formattingSettings.ColorPicker({
        name: "dayTextColor",
        displayName: "Texto disponível",
        value: { value: "#222222" }
    });

    dayHoverBackground = new formattingSettings.ColorPicker({
        name: "dayHoverBackground",
        displayName: "Fundo hover",
        value: { value: "#DCE6FF" }
    });

    selectedBackground = new formattingSettings.ColorPicker({
        name: "selectedBackground",
        displayName: "Fundo selecionado",
        value: { value: "#2563EB" }
    });

    selectedTextColor = new formattingSettings.ColorPicker({
        name: "selectedTextColor",
        displayName: "Texto selecionado",
        value: { value: "#FFFFFF" }
    });

    rangeBackground = new formattingSettings.ColorPicker({
        name: "rangeBackground",
        displayName: "Fundo intervalo",
        value: { value: "#DBEAFE" }
    });

    rangeTextColor = new formattingSettings.ColorPicker({
        name: "rangeTextColor",
        displayName: "Texto intervalo",
        value: { value: "#1E3A8A" }
    });

    disabledOpacity = new formattingSettings.NumUpDown({
        name: "disabledOpacity",
        displayName: "Opacidade indisponível",
        value: 28,
        options: numericOptions(5, 100)
    });

    name: string = "days";
    displayName: string = "Dias";
    slices: Array<FormattingSettingsSlice> = [
        this.daySize,
        this.dayGap,
        this.dayFontSize,
        this.dayRadius,
        this.dayBackground,
        this.dayTextColor,
        this.dayHoverBackground,
        this.selectedBackground,
        this.selectedTextColor,
        this.rangeBackground,
        this.rangeTextColor,
        this.disabledOpacity
    ];
}

class ButtonsSettings extends FormattingSettingsCard {
    buttonFontSize = new formattingSettings.NumUpDown({
        name: "buttonFontSize",
        displayName: "Fonte",
        value: 13,
        options: numericOptions(9, 22)
    });

    buttonPaddingX = new formattingSettings.NumUpDown({
        name: "buttonPaddingX",
        displayName: "Largura interna",
        value: 18,
        options: numericOptions(8, 40)
    });

    buttonPaddingY = new formattingSettings.NumUpDown({
        name: "buttonPaddingY",
        displayName: "Altura interna",
        value: 9,
        options: numericOptions(4, 22)
    });

    buttonRadius = new formattingSettings.NumUpDown({
        name: "buttonRadius",
        displayName: "Arredondamento",
        value: 12,
        options: numericOptions(0, 24)
    });

    buttonBackground = new formattingSettings.ColorPicker({
        name: "buttonBackground",
        displayName: "Fundo botão",
        value: { value: "#F3F5FB" }
    });

    buttonTextColor = new formattingSettings.ColorPicker({
        name: "buttonTextColor",
        displayName: "Texto botão",
        value: { value: "#1F2A44" }
    });

    applyBackground = new formattingSettings.ColorPicker({
        name: "applyBackground",
        displayName: "Fundo aplicar",
        value: { value: "#4F63F6" }
    });

    applyTextColor = new formattingSettings.ColorPicker({
        name: "applyTextColor",
        displayName: "Texto aplicar",
        value: { value: "#FFFFFF" }
    });

    name: string = "buttons";
    displayName: string = "Botões";
    slices: Array<FormattingSettingsSlice> = [
        this.buttonFontSize,
        this.buttonPaddingX,
        this.buttonPaddingY,
        this.buttonRadius,
        this.buttonBackground,
        this.buttonTextColor,
        this.applyBackground,
        this.applyTextColor
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    menuFilter = new MenuFilterSettings();
    card = new CardSettings();
    calendar = new CalendarSettings();
    days = new DaysSettings();
    buttons = new ButtonsSettings();

    cards = [this.layout, this.menuFilter, this.card, this.calendar, this.days, this.buttons];
}


