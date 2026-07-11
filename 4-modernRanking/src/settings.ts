"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const sortModeItems = [
    { value: "top", displayName: "Maiores primeiro" },
    { value: "bottom", displayName: "Menores primeiro" },
    { value: "table", displayName: "Ordem da tabela" }
];

const highlightPositionItems = [
    { value: "first", displayName: "Primeiro visivel" },
    { value: "last", displayName: "Ultimo visivel" }
];

const formatTypeItems = [
    { value: "auto", displayName: "Automatico" },
    { value: "number", displayName: "Numero" },
    { value: "currency", displayName: "Moeda" },
    { value: "percent", displayName: "Percentual 0-100" },
    { value: "percentFraction", displayName: "Percentual decimal 0-1" }
];

const displayUnitItems = [
    { value: "none", displayName: "Nenhum" },
    { value: "thousand", displayName: "Mil" },
    { value: "million", displayName: "Milhao" },
    { value: "billion", displayName: "Bilhao" }
];

class LayoutSettings extends FormattingSettingsCard {
    showHeader = new formattingSettings.ToggleSwitch({
        name: "showHeader",
        displayName: "Mostrar titulo",
        value: true
    });

    titleText = new formattingSettings.TextInput({
        name: "titleText",
        displayName: "Titulo",
        value: "Titulo do gráfico",
        placeholder: "Titulo do gráfico"
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo",
        value: { value: "#FFFFFF" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Borda",
        value: { value: "#E9ECF5" }
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento",
        value: 16
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Espacamento",
        value: 18
    });

    rowGap = new formattingSettings.NumUpDown({
        name: "rowGap",
        displayName: "Distancia entre linhas",
        value: 14
    });

    showShadow = new formattingSettings.ToggleSwitch({
        name: "showShadow",
        displayName: "Sombra",
        value: true
    });

    fontFamily = new formattingSettings.TextInput({
        name: "fontFamily",
        displayName: "Fonte",
        value: "Segoe UI, Arial, sans-serif",
        placeholder: "Segoe UI"
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [
        this.showHeader,
        this.titleText,
        this.backgroundColor,
        this.borderColor,
        this.borderRadius,
        this.padding,
        this.rowGap,
        this.showShadow,
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

class RankingSettings extends FormattingSettingsCard {
    sortMode = new formattingSettings.ItemDropdown({
        name: "sortMode",
        displayName: "Ordenar",
        value: { value: "top", displayName: "Maiores primeiro" },
        items: sortModeItems
    });

    visibleItems = new formattingSettings.NumUpDown({
        name: "visibleItems",
        displayName: "Itens visiveis",
        value: 3
    });

    showBars = new formattingSettings.ToggleSwitch({
        name: "showBars",
        displayName: "Mostrar barras",
        value: true
    });

    showSortToggle = new formattingSettings.ToggleSwitch({
        name: "showSortToggle",
        displayName: "Alternar melhores/piores",
        value: true
    });

    barHeight = new formattingSettings.NumUpDown({
        name: "barHeight",
        displayName: "Altura barra",
        value: 7
    });

    showHighlight = new formattingSettings.ToggleSwitch({
        name: "showHighlight",
        displayName: "Mostrar destaque",
        value: true
    });

    highlightPosition = new formattingSettings.ItemDropdown({
        name: "highlightPosition",
        displayName: "Item destacado",
        value: { value: "first", displayName: "Primeiro visivel" },
        items: highlightPositionItems
    });

    highlightLabel = new formattingSettings.TextInput({
        name: "highlightLabel",
        displayName: "Rotulo destaque",
        value: "Melhor desempenho",
        placeholder: "Melhor desempenho"
    });

    name: string = "ranking";
    displayName: string = "Ranking";
    slices: Array<FormattingSettingsSlice> = [
        this.sortMode,
        this.visibleItems,
        this.showBars,
        this.showSortToggle,
        this.barHeight,
        this.showHighlight,
        this.highlightPosition,
        this.highlightLabel
    ];
}

class ValuesFormatSettings extends FormattingSettingsCard {
    formatType = new formattingSettings.ItemDropdown({
        name: "formatType",
        displayName: "Formato",
        value: { value: "auto", displayName: "Automatico" },
        items: formatTypeItems
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Casas decimais",
        value: 1
    });

    displayUnits = new formattingSettings.ItemDropdown({
        name: "displayUnits",
        displayName: "Unidades",
        value: { value: "none", displayName: "Nenhum" },
        items: displayUnitItems
    });

    prefix = new formattingSettings.TextInput({
        name: "prefix",
        displayName: "Prefixo",
        value: "",
        placeholder: "R$ "
    });

    suffix = new formattingSettings.TextInput({
        name: "suffix",
        displayName: "Sufixo",
        value: "",
        placeholder: "%"
    });

    currencySymbol = new formattingSettings.TextInput({
        name: "currencySymbol",
        displayName: "Simbolo moeda",
        value: "R$",
        placeholder: "R$"
    });

    name: string = "valuesFormat";
    displayName: string = "Valores";
    slices: Array<FormattingSettingsSlice> = [
        this.formatType,
        this.decimalPlaces,
        this.displayUnits,
        this.prefix,
        this.suffix,
        this.currencySymbol
    ];
}

class StyleSettings extends FormattingSettingsCard {
    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Titulo",
        value: { value: "#121936" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Texto",
        value: { value: "#111827" }
    });

    mutedColor = new formattingSettings.ColorPicker({
        name: "mutedColor",
        displayName: "Texto secundario",
        value: { value: "#66708F" }
    });

    trackColor = new formattingSettings.ColorPicker({
        name: "trackColor",
        displayName: "Fundo barra",
        value: { value: "#ECEEFA" }
    });

    highlightBackgroundColor = new formattingSettings.ColorPicker({
        name: "highlightBackgroundColor",
        displayName: "Fundo destaque",
        value: { value: "#F7F3FF" }
    });

    iconBackgroundColor = new formattingSettings.ColorPicker({
        name: "iconBackgroundColor",
        displayName: "Fundo icone",
        value: { value: "#FFFFFF" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho texto",
        value: 12
    });

    titleFontSize = new formattingSettings.NumUpDown({
        name: "titleFontSize",
        displayName: "Tamanho titulo",
        value: 13
    });

    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Tamanho valor",
        value: 11
    });

    iconSize = new formattingSettings.NumUpDown({
        name: "iconSize",
        displayName: "Tamanho icone",
        value: 38
    });

    name: string = "style";
    displayName: string = "Estilo";
    slices: Array<FormattingSettingsSlice> = [
        this.titleColor,
        this.textColor,
        this.mutedColor,
        this.trackColor,
        this.highlightBackgroundColor,
        this.iconBackgroundColor,
        this.fontSize,
        this.titleFontSize,
        this.valueFontSize,
        this.iconSize
    ];
}

class ColorSettings extends FormattingSettingsCard {
    color1 = new formattingSettings.ColorPicker({ name: "color1", displayName: "Cor 1", value: { value: "#7C3CFF" } });
    color2 = new formattingSettings.ColorPicker({ name: "color2", displayName: "Cor 2", value: { value: "#2F80ED" } });
    color3 = new formattingSettings.ColorPicker({ name: "color3", displayName: "Cor 3", value: { value: "#FF9F2D" } });
    color4 = new formattingSettings.ColorPicker({ name: "color4", displayName: "Cor 4", value: { value: "#14B8A6" } });
    color5 = new formattingSettings.ColorPicker({ name: "color5", displayName: "Cor 5", value: { value: "#F06595" } });
    color6 = new formattingSettings.ColorPicker({ name: "color6", displayName: "Cor 6", value: { value: "#64748B" } });

    name: string = "colors";
    displayName: string = "Cores";
    slices: Array<FormattingSettingsSlice> = [
        this.color1,
        this.color2,
        this.color3,
        this.color4,
        this.color5,
        this.color6
    ];
}

class BehaviorSettings extends FormattingSettingsCard {
    enableSelection = new formattingSettings.ToggleSwitch({
        name: "enableSelection",
        displayName: "Selecao",
        value: true
    });

    enableContextMenu = new formattingSettings.ToggleSwitch({
        name: "enableContextMenu",
        displayName: "Menu de contexto",
        value: true
    });

    name: string = "behavior";
    displayName: string = "Interacao";
    slices: Array<FormattingSettingsSlice> = [
        this.enableSelection,
        this.enableContextMenu
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    menuFilter = new MenuFilterSettings();
    ranking = new RankingSettings();
    valuesFormat = new ValuesFormatSettings();
    style = new StyleSettings();
    colors = new ColorSettings();
    behavior = new BehaviorSettings();

    cards = [
        this.layout,
        this.menuFilter,
        this.ranking,
        this.valuesFormat,
        this.style,
        this.colors,
        this.behavior
    ];
}

