"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const sortItems = [
    { value: "desc", displayName: "Maior primeiro" },
    { value: "asc", displayName: "Menor primeiro" },
    { value: "none", displayName: "Sem ordenar" }
];

const modeItems = [
    { value: "stacked", displayName: "Empilhado" },
    { value: "clustered", displayName: "Clusterizado" },
    { value: "stacked100", displayName: "100% empilhado" }
];

const shapeItems = [
    { value: "rounded", displayName: "Arredondado" },
    { value: "pill", displayName: "Pill" },
    { value: "flat", displayName: "Reto" },
    { value: "pyramid", displayName: "Piramide" }
];

const radiusItems = [
    { value: "all", displayName: "Todas as pontas" },
    { value: "outer", displayName: "Somente ponta final" },
    { value: "none", displayName: "Sem arredondar" }
];

const formatItems = [
    { value: "auto", displayName: "Automatico" },
    { value: "number", displayName: "Numero" },
    { value: "currency", displayName: "Moeda" },
    { value: "percent", displayName: "Percentual" }
];

const legendPositionItems = [
    { value: "top", displayName: "Topo" },
    { value: "bottom", displayName: "Rodape" },
    { value: "hidden", displayName: "Oculta" }
];

class LayoutSettings extends FormattingSettingsCard {
    titleText = new formattingSettings.TextInput({
        name: "titleText",
        displayName: "Titulo",
        value: "Titulo",
        placeholder: "Titulo do grafico"
    });

    showTitle = new formattingSettings.ToggleSwitch({
        name: "showTitle",
        displayName: "Mostrar titulo",
        value: true
    });

    maxItems = new formattingSettings.NumUpDown({
        name: "maxItems",
        displayName: "Maximo de itens",
        value: 0
    });

    showSortButton = new formattingSettings.ToggleSwitch({
        name: "showSortButton",
        displayName: "Botao ordenar",
        value: true
    });

    defaultSort = new formattingSettings.ItemDropdown({
        name: "defaultSort",
        displayName: "Ordenacao inicial",
        value: { value: "desc", displayName: "Maior primeiro" },
        items: sortItems
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Cor de fundo",
        value: { value: "#FFFFFF" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Cor da borda",
        value: { value: "#E8ECF5" }
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento",
        value: 16
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Espacamento interno",
        value: 20
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
        this.titleText,
        this.showTitle,
        this.maxItems,
        this.showSortButton,
        this.defaultSort,
        this.backgroundColor,
        this.borderColor,
        this.borderRadius,
        this.padding,
        this.fontFamily
    ];
}

class ChartSettings extends FormattingSettingsCard {
    mode = new formattingSettings.ItemDropdown({
        name: "mode",
        displayName: "Tipo",
        value: { value: "stacked", displayName: "Empilhado" },
        items: modeItems
    });

    barShape = new formattingSettings.ItemDropdown({
        name: "barShape",
        displayName: "Desenho da barra",
        value: { value: "rounded", displayName: "Arredondado" },
        items: shapeItems
    });

    radiusMode = new formattingSettings.ItemDropdown({
        name: "radiusMode",
        displayName: "Arredondar",
        value: { value: "outer", displayName: "Somente ponta final" },
        items: radiusItems
    });

    barRadius = new formattingSettings.NumUpDown({
        name: "barRadius",
        displayName: "Raio da barra",
        value: 8
    });

    barHeight = new formattingSettings.NumUpDown({
        name: "barHeight",
        displayName: "Altura da barra",
        value: 17
    });

    rowGap = new formattingSettings.NumUpDown({
        name: "rowGap",
        displayName: "Espaco entre linhas",
        value: 14
    });

    clusterGap = new formattingSettings.NumUpDown({
        name: "clusterGap",
        displayName: "Espaco cluster",
        value: 6
    });

    categoryWidth = new formattingSettings.NumUpDown({
        name: "categoryWidth",
        displayName: "Largura categorias",
        value: 170
    });

    valueWidth = new formattingSettings.NumUpDown({
        name: "valueWidth",
        displayName: "Largura valores",
        value: 58
    });

    showTrack = new formattingSettings.ToggleSwitch({
        name: "showTrack",
        displayName: "Trilho cinza",
        value: true
    });

    trackColor = new formattingSettings.ColorPicker({
        name: "trackColor",
        displayName: "Cor do trilho",
        value: { value: "#E8EDF3" }
    });

    showAxis = new formattingSettings.ToggleSwitch({
        name: "showAxis",
        displayName: "Mostrar eixo",
        value: true
    });

    axisColor = new formattingSettings.ColorPicker({
        name: "axisColor",
        displayName: "Cor do eixo",
        value: { value: "#22305F" }
    });

    name: string = "chart";
    displayName: string = "Grafico";
    slices: Array<FormattingSettingsSlice> = [
        this.mode,
        this.barShape,
        this.radiusMode,
        this.barRadius,
        this.barHeight,
        this.rowGap,
        this.clusterGap,
        this.categoryWidth,
        this.valueWidth,
        this.showTrack,
        this.trackColor,
        this.showAxis,
        this.axisColor
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

class LabelsSettings extends FormattingSettingsCard {
    showCategoryLabels = new formattingSettings.ToggleSwitch({
        name: "showCategoryLabels",
        displayName: "Categorias",
        value: true
    });

    showValues = new formattingSettings.ToggleSwitch({
        name: "showValues",
        displayName: "Valores",
        value: true
    });

    showImages = new formattingSettings.ToggleSwitch({
        name: "showImages",
        displayName: "Imagens/icones",
        value: true
    });

    imageSize = new formattingSettings.NumUpDown({
        name: "imageSize",
        displayName: "Tamanho imagem",
        value: 24
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Cor do texto",
        value: { value: "#18204C" }
    });

    mutedColor = new formattingSettings.ColorPicker({
        name: "mutedColor",
        displayName: "Cor secundaria",
        value: { value: "#687196" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho do texto",
        value: 12
    });

    valueFormat = new formattingSettings.ItemDropdown({
        name: "valueFormat",
        displayName: "Formato valor",
        value: { value: "auto", displayName: "Automatico" },
        items: formatItems
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Casas decimais",
        value: 1
    });

    currencySymbol = new formattingSettings.TextInput({
        name: "currencySymbol",
        displayName: "Simbolo moeda",
        value: "R$",
        placeholder: "R$"
    });

    name: string = "labels";
    displayName: string = "Rotulos";
    slices: Array<FormattingSettingsSlice> = [
        this.showCategoryLabels,
        this.showValues,
        this.showImages,
        this.imageSize,
        this.textColor,
        this.mutedColor,
        this.fontSize,
        this.valueFormat,
        this.decimalPlaces,
        this.currencySymbol
    ];
}

class LegendSettings extends FormattingSettingsCard {
    showLegend = new formattingSettings.ToggleSwitch({
        name: "showLegend",
        displayName: "Mostrar legenda",
        value: true
    });

    position = new formattingSettings.ItemDropdown({
        name: "position",
        displayName: "Posicao",
        value: { value: "top", displayName: "Topo" },
        items: legendPositionItems
    });

    itemGap = new formattingSettings.NumUpDown({
        name: "itemGap",
        displayName: "Margem entre itens",
        value: 14
    });

    name: string = "legendStyle";
    displayName: string = "Legenda";
    slices: Array<FormattingSettingsSlice> = [
        this.showLegend,
        this.position,
        this.itemGap
    ];
}

class SmallMultipleSettings extends FormattingSettingsCard {
    columns = new formattingSettings.NumUpDown({
        name: "columns",
        displayName: "Colunas",
        value: 1
    });

    showTitles = new formattingSettings.ToggleSwitch({
        name: "showTitles",
        displayName: "Titulos",
        value: true
    });

    panelGap = new formattingSettings.NumUpDown({
        name: "panelGap",
        displayName: "Espaco entre paineis",
        value: 18
    });

    name: string = "smallMultipleStyle";
    displayName: string = "Multiplos pequenos";
    slices: Array<FormattingSettingsSlice> = [
        this.columns,
        this.showTitles,
        this.panelGap
    ];
}

class ColorsSettings extends FormattingSettingsCard {
    usePalette = new formattingSettings.ToggleSwitch({
        name: "usePalette",
        displayName: "Usar paleta por serie",
        value: true
    });

    startColor = new formattingSettings.ColorPicker({
        name: "startColor",
        displayName: "Gradiente inicio",
        value: { value: "#1D6DFF" }
    });

    endColor = new formattingSettings.ColorPicker({
        name: "endColor",
        displayName: "Gradiente fim",
        value: { value: "#27D8FF" }
    });

    secondStartColor = new formattingSettings.ColorPicker({
        name: "secondStartColor",
        displayName: "Serie 2 inicio",
        value: { value: "#241096" }
    });

    secondEndColor = new formattingSettings.ColorPicker({
        name: "secondEndColor",
        displayName: "Serie 2 fim",
        value: { value: "#9C8CFF" }
    });

    name: string = "colors";
    displayName: string = "Cores";
    slices: Array<FormattingSettingsSlice> = [
        this.usePalette,
        this.startColor,
        this.endColor,
        this.secondStartColor,
        this.secondEndColor
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    chart = new ChartSettings();
    menuFilter = new MenuFilterSettings();
    labels = new LabelsSettings();
    legendStyle = new LegendSettings();
    smallMultipleStyle = new SmallMultipleSettings();
    colors = new ColorsSettings();

    cards = [
        this.layout,
        this.chart,
        this.menuFilter,
        this.labels,
        this.legendStyle,
        this.smallMultipleStyle,
        this.colors
    ];
}

