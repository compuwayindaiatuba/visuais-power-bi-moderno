"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const horizontalAlignItems: powerbi.IEnumMember[] = [
    { value: "flex-start", displayName: "Esquerda" },
    { value: "center", displayName: "Centro" },
    { value: "flex-end", displayName: "Direita" },
    { value: "space-between", displayName: "Espacado" }
];

const logoPositionItems: powerbi.IEnumMember[] = [
    { value: "left", displayName: "Esquerda" },
    { value: "right", displayName: "Direita" }
];

const logoAlignItems: powerbi.IEnumMember[] = [
    { value: "flex-start", displayName: "Inicio" },
    { value: "center", displayName: "Centro" },
    { value: "flex-end", displayName: "Fim" }
];

const textAlignItems: powerbi.IEnumMember[] = [
    { value: "left", displayName: "Esquerda" },
    { value: "center", displayName: "Centro" },
    { value: "right", displayName: "Direita" }
];

const titleWeightItems: powerbi.IEnumMember[] = [
    { value: "400", displayName: "Normal" },
    { value: "600", displayName: "Semibold" },
    { value: "700", displayName: "Bold" }
];

const buttonStyleItems: powerbi.IEnumMember[] = [
    { value: "underline", displayName: "Linha inferior" },
    { value: "pill", displayName: "Pill" },
    { value: "simple", displayName: "Simples" }
];

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
        placeholder: "Ex: Vendas"
    });

    name: string = "menuFilter";
    displayName: string = "Menu";
    slices: Array<FormattingSettingsSlice> = [
        this.enabled,
        this.menuName
    ];
}

class LayoutCardSettings extends FormattingSettingsCard {
    height = new formattingSettings.NumUpDown({
        name: "height",
        displayName: "Altura",
        value: 72
    });

    paddingX = new formattingSettings.NumUpDown({
        name: "paddingX",
        displayName: "Margem horizontal",
        value: 18
    });

    paddingY = new formattingSettings.NumUpDown({
        name: "paddingY",
        displayName: "Margem vertical",
        value: 8
    });

    gap = new formattingSettings.NumUpDown({
        name: "gap",
        displayName: "Espacamento",
        value: 22
    });

    fontFamily = new formattingSettings.TextInput({
        name: "fontFamily",
        displayName: "Fonte",
        value: "Segoe UI",
        placeholder: "Segoe UI"
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo",
        value: { value: "#ffffff" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Borda inferior",
        value: { value: "#e5e7eb" }
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [
        this.height,
        this.paddingX,
        this.paddingY,
        this.gap,
        this.fontFamily,
        this.backgroundColor,
        this.borderColor
    ];
}

class LogoCardSettings extends FormattingSettingsCard {
    showLogo = new formattingSettings.ToggleSwitch({
        name: "showLogo",
        displayName: "Mostrar logo",
        value: true
    });

    logoUrl = new formattingSettings.TextInput({
        name: "logoUrl",
        displayName: "URL da logo",
        value: "",
        placeholder: "https://..."
    });

    logoText = new formattingSettings.TextInput({
        name: "logoText",
        displayName: "Texto da logo",
        value: "Power BI",
        placeholder: "Power BI"
    });

    logoPosition = new formattingSettings.ItemDropdown({
        name: "logoPosition",
        displayName: "Posicao",
        value: logoPositionItems[0],
        items: logoPositionItems
    });

    logoAlign = new formattingSettings.ItemDropdown({
        name: "logoAlign",
        displayName: "Alinhamento vertical",
        value: logoAlignItems[1],
        items: logoAlignItems
    });

    logoWidth = new formattingSettings.NumUpDown({
        name: "logoWidth",
        displayName: "Largura",
        value: 150
    });

    logoHeight = new formattingSettings.NumUpDown({
        name: "logoHeight",
        displayName: "Altura",
        value: 56
    });

    logoBackground = new formattingSettings.ColorPicker({
        name: "logoBackground",
        displayName: "Fundo",
        value: { value: "#ffffff" }
    });

    logoTextColor = new formattingSettings.ColorPicker({
        name: "logoTextColor",
        displayName: "Cor do texto",
        value: { value: "#111827" }
    });

    name: string = "logo";
    displayName: string = "Logo";
    slices: Array<FormattingSettingsSlice> = [
        this.showLogo,
        this.logoUrl,
        this.logoText,
        this.logoPosition,
        this.logoAlign,
        this.logoWidth,
        this.logoHeight,
        this.logoBackground,
        this.logoTextColor
    ];
}

class TextCardSettings extends FormattingSettingsCard {
    showTitle = new formattingSettings.ToggleSwitch({
        name: "showTitle",
        displayName: "Mostrar titulo",
        value: true
    });

    showSubtitle = new formattingSettings.ToggleSwitch({
        name: "showSubtitle",
        displayName: "Mostrar subtitulo",
        value: true
    });

    textAlign = new formattingSettings.ItemDropdown({
        name: "textAlign",
        displayName: "Alinhamento",
        value: textAlignItems[0],
        items: textAlignItems
    });

    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Cor do titulo",
        value: { value: "#0f172a" }
    });

    subtitleColor = new formattingSettings.ColorPicker({
        name: "subtitleColor",
        displayName: "Cor do subtitulo",
        value: { value: "#4b5563" }
    });

    titleSize = new formattingSettings.NumUpDown({
        name: "titleSize",
        displayName: "Tamanho titulo",
        value: 24
    });

    subtitleSize = new formattingSettings.NumUpDown({
        name: "subtitleSize",
        displayName: "Tamanho subtitulo",
        value: 13
    });

    titleWeight = new formattingSettings.ItemDropdown({
        name: "titleWeight",
        displayName: "Peso titulo",
        value: titleWeightItems[2],
        items: titleWeightItems
    });

    textMaxWidth = new formattingSettings.NumUpDown({
        name: "textMaxWidth",
        displayName: "Largura maxima",
        value: 420
    });

    name: string = "text";
    displayName: string = "Texto superior";
    slices: Array<FormattingSettingsSlice> = [
        this.showTitle,
        this.showSubtitle,
        this.textAlign,
        this.titleColor,
        this.subtitleColor,
        this.titleSize,
        this.subtitleSize,
        this.titleWeight,
        this.textMaxWidth
    ];
}

class ButtonsCardSettings extends FormattingSettingsCard {
    buttonAlign = new formattingSettings.ItemDropdown({
        name: "buttonAlign",
        displayName: "Alinhamento",
        value: horizontalAlignItems[1],
        items: horizontalAlignItems
    });

    buttonStyle = new formattingSettings.ItemDropdown({
        name: "buttonStyle",
        displayName: "Estilo",
        value: buttonStyleItems[0],
        items: buttonStyleItems
    });

    showIcons = new formattingSettings.ToggleSwitch({
        name: "showIcons",
        displayName: "Mostrar icones",
        value: true
    });

    buttonHeight = new formattingSettings.NumUpDown({
        name: "buttonHeight",
        displayName: "Altura",
        value: 44
    });

    buttonRadius = new formattingSettings.NumUpDown({
        name: "buttonRadius",
        displayName: "Raio",
        value: 10
    });

    buttonGap = new formattingSettings.NumUpDown({
        name: "buttonGap",
        displayName: "Espacamento",
        value: 22
    });

    buttonPaddingX = new formattingSettings.NumUpDown({
        name: "buttonPaddingX",
        displayName: "Margem horizontal",
        value: 18
    });

    buttonFontSize = new formattingSettings.NumUpDown({
        name: "buttonFontSize",
        displayName: "Tamanho texto",
        value: 12
    });

    buttonTextColor = new formattingSettings.ColorPicker({
        name: "buttonTextColor",
        displayName: "Texto",
        value: { value: "#374151" }
    });

    buttonBackground = new formattingSettings.ColorPicker({
        name: "buttonBackground",
        displayName: "Fundo",
        value: { value: "#ffffff" }
    });

    buttonBorderColor = new formattingSettings.ColorPicker({
        name: "buttonBorderColor",
        displayName: "Borda",
        value: { value: "#e5e7eb" }
    });

    selectedTextColor = new formattingSettings.ColorPicker({
        name: "selectedTextColor",
        displayName: "Texto selecionado",
        value: { value: "#2563eb" }
    });

    selectedBackground = new formattingSettings.ColorPicker({
        name: "selectedBackground",
        displayName: "Fundo selecionado",
        value: { value: "#ffffff" }
    });

    accentColor = new formattingSettings.ColorPicker({
        name: "accentColor",
        displayName: "Destaque",
        value: { value: "#2563eb" }
    });

    iconSize = new formattingSettings.NumUpDown({
        name: "iconSize",
        displayName: "Tamanho icone",
        value: 18
    });

    name: string = "buttons";
    displayName: string = "Botoes";
    slices: Array<FormattingSettingsSlice> = [
        this.buttonAlign,
        this.buttonStyle,
        this.showIcons,
        this.buttonHeight,
        this.buttonRadius,
        this.buttonGap,
        this.buttonPaddingX,
        this.buttonFontSize,
        this.buttonTextColor,
        this.buttonBackground,
        this.buttonBorderColor,
        this.selectedTextColor,
        this.selectedBackground,
        this.accentColor,
        this.iconSize
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutCardSettings();
    logo = new LogoCardSettings();
    text = new TextCardSettings();
    buttons = new ButtonsCardSettings();
    menuFilter = new MenuFilterSettings();

    cards = [this.layout, this.logo, this.text, this.buttons, this.menuFilter];
}

