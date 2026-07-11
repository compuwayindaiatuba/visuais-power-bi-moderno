/*
 * Power BI Visual formatting settings
 */

"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class LayoutSettings extends FormattingSettingsCard {
    showTitle = new formattingSettings.ToggleSwitch({
        name: "showTitle",
        displayName: "Mostrar titulo",
        value: true
    });

    titleText = new formattingSettings.TextInput({
        name: "titleText",
        displayName: "Texto do titulo",
        value: "Funcionarios Ativos",
        placeholder: "Titulo do card"
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Cor de fundo",
        value: { value: "#FFFFFF" }
    });

    gradientColor = new formattingSettings.ColorPicker({
        name: "gradientColor",
        displayName: "Cor do degrade",
        value: { value: "#EAF2FF" }
    });

    gradientOpacity = new formattingSettings.NumUpDown({
        name: "gradientOpacity",
        displayName: "Forca do degrade",
        value: 0.55
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Cor da borda",
        value: { value: "#BFD8FF" }
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento",
        value: 14
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Espacamento interno",
        value: 14
    });

    titleFontSize = new formattingSettings.NumUpDown({
        name: "titleFontSize",
        displayName: "Tamanho do titulo",
        value: 16
    });

    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Cor do titulo",
        value: { value: "#101B4D" }
    });

    fontFamily = new formattingSettings.TextInput({
        name: "fontFamily",
        displayName: "Fonte",
        value: "Segoe UI",
        placeholder: "Segoe UI"
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [
        this.showTitle,
        this.titleText,
        this.backgroundColor,
        this.gradientColor,
        this.gradientOpacity,
        this.borderColor,
        this.borderRadius,
        this.padding,
        this.titleFontSize,
        this.titleColor,
        this.fontFamily
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
    displayName: string = "Filtro de Menu";
    slices: Array<FormattingSettingsSlice> = [
        this.enabled,
        this.menuName
    ];
}

class IconSettings extends FormattingSettingsCard {
    showIcon = new formattingSettings.ToggleSwitch({
        name: "showIcon",
        displayName: "Mostrar icone",
        value: true
    });

    iconText = new formattingSettings.TextInput({
        name: "iconText",
        displayName: "Icone",
        value: "users",
        placeholder: "users, user-x ou texto"
    });

    iconUrl = new formattingSettings.TextInput({
        name: "iconUrl",
        displayName: "URL do icone",
        value: "",
        placeholder: "https://..."
    });

    iconBackgroundColor = new formattingSettings.ColorPicker({
        name: "iconBackgroundColor",
        displayName: "Fundo do icone",
        value: { value: "#EAF2FF" }
    });

    iconColor = new formattingSettings.ColorPicker({
        name: "iconColor",
        displayName: "Cor do icone",
        value: { value: "#1F6DFF" }
    });

    iconSize = new formattingSettings.NumUpDown({
        name: "iconSize",
        displayName: "Tamanho do icone",
        value: 78
    });

    iconCornerRadius = new formattingSettings.NumUpDown({
        name: "iconCornerRadius",
        displayName: "Arredondamento do icone",
        value: 39
    });

    name: string = "icon";
    displayName: string = "Icone";
    slices: Array<FormattingSettingsSlice> = [
        this.showIcon,
        this.iconText,
        this.iconUrl,
        this.iconBackgroundColor,
        this.iconColor,
        this.iconSize,
        this.iconCornerRadius
    ];
}

class ValueSettings extends FormattingSettingsCard {
    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Tamanho do valor",
        value: 32
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Cor do valor",
        value: { value: "#07124A" }
    });

    valuePrefix = new formattingSettings.TextInput({
        name: "valuePrefix",
        displayName: "Prefixo",
        value: "",
        placeholder: "R$"
    });

    valueSuffix = new formattingSettings.TextInput({
        name: "valueSuffix",
        displayName: "Sufixo",
        value: "",
        placeholder: "%"
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Casas decimais",
        value: 0
    });

    name: string = "valueCard";
    displayName: string = "Valor";
    slices: Array<FormattingSettingsSlice> = [
        this.valueFontSize,
        this.valueColor,
        this.valuePrefix,
        this.valueSuffix,
        this.decimalPlaces
    ];
}

class ComparisonSettings extends FormattingSettingsCard {
    showComparison = new formattingSettings.ToggleSwitch({
        name: "showComparison",
        displayName: "Mostrar comparacao",
        value: true
    });

    mainPeriodDays = new formattingSettings.NumUpDown({
        name: "mainPeriodDays",
        displayName: "Dias para comparacao",
        value: 0
    });

    comparisonLabel = new formattingSettings.TextInput({
        name: "comparisonLabel",
        displayName: "Texto da comparacao",
        value: "vs periodo anterior",
        placeholder: "vs periodo anterior"
    });

    positiveColor = new formattingSettings.ColorPicker({
        name: "positiveColor",
        displayName: "Cor positiva",
        value: { value: "#27B37E" }
    });

    negativeColor = new formattingSettings.ColorPicker({
        name: "negativeColor",
        displayName: "Cor negativa",
        value: { value: "#FF4B45" }
    });

    neutralColor = new formattingSettings.ColorPicker({
        name: "neutralColor",
        displayName: "Cor neutra",
        value: { value: "#667085" }
    });

    comparisonFontSize = new formattingSettings.NumUpDown({
        name: "comparisonFontSize",
        displayName: "Tamanho da comparacao",
        value: 13
    });

    name: string = "comparison";
    displayName: string = "Comparacao";
    slices: Array<FormattingSettingsSlice> = [
        this.showComparison,
        this.mainPeriodDays,
        this.comparisonLabel,
        this.positiveColor,
        this.negativeColor,
        this.neutralColor,
        this.comparisonFontSize
    ];
}

class ChartSettings extends FormattingSettingsCard {
    showChart = new formattingSettings.ToggleSwitch({
        name: "showChart",
        displayName: "Mostrar grafico",
        value: true
    });

    lineColor = new formattingSettings.ColorPicker({
        name: "lineColor",
        displayName: "Cor da linha",
        value: { value: "#1F6DFF" }
    });

    areaColor = new formattingSettings.ColorPicker({
        name: "areaColor",
        displayName: "Cor da area",
        value: { value: "#1F6DFF" }
    });

    areaOpacity = new formattingSettings.NumUpDown({
        name: "areaOpacity",
        displayName: "Forca da area",
        value: 0.18
    });

    lineWidth = new formattingSettings.NumUpDown({
        name: "lineWidth",
        displayName: "Espessura da linha",
        value: 2.25
    });

    curveStyle = new formattingSettings.ItemDropdown({
        name: "curveStyle",
        displayName: "Estilo da linha",
        value: { value: "smooth", displayName: "Ondulada" },
        items: [
            { value: "smooth", displayName: "Ondulada" },
            { value: "sharp", displayName: "Aguda" }
        ]
    });

    chartPeriodMode = new formattingSettings.ItemDropdown({
        name: "chartPeriodMode",
        displayName: "Periodo do grafico",
        value: { value: "full", displayName: "Periodo completo" },
        items: [
            { value: "full", displayName: "Periodo completo" },
            { value: "comparison", displayName: "Usar dias da comparacao" }
        ]
    });

    chartHeight = new formattingSettings.NumUpDown({
        name: "chartHeight",
        displayName: "Altura do grafico",
        value: 38
    });

    name: string = "chart";
    displayName: string = "Grafico de linha";
    slices: Array<FormattingSettingsSlice> = [
        this.showChart,
        this.lineColor,
        this.areaColor,
        this.areaOpacity,
        this.lineWidth,
        this.curveStyle,
        this.chartPeriodMode,
        this.chartHeight
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    menuFilter = new MenuFilterSettings();
    icon = new IconSettings();
    valueCard = new ValueSettings();
    comparison = new ComparisonSettings();
    chart = new ChartSettings();

    cards = [
        this.layout,
        this.menuFilter,
        this.icon,
        this.valueCard,
        this.comparison,
        this.chart
    ];
}

