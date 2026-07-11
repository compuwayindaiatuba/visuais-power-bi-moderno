"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const formatTypeItems = [
    { value: "auto", displayName: "Automatico" },
    { value: "number", displayName: "Numero" },
    { value: "currency", displayName: "Moeda" },
    { value: "percent", displayName: "Percentual" }
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
        value: "Matriz de Vendas",
        placeholder: "Titulo do visual"
    });

    subtitleText = new formattingSettings.TextInput({
        name: "subtitleText",
        displayName: "Subtitulo",
        value: "Analise de vendas por Regiao, Categoria e Mes",
        placeholder: "Subtitulo"
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo",
        value: { value: "#FFFFFF" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Borda",
        value: { value: "#E3E8F3" }
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento",
        value: 18
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Espacamento",
        value: 18
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
        this.subtitleText,
        this.backgroundColor,
        this.borderColor,
        this.borderRadius,
        this.padding,
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

class MatrixStyleSettings extends FormattingSettingsCard {
    headerBackgroundColor = new formattingSettings.ColorPicker({
        name: "headerBackgroundColor",
        displayName: "Fundo cabecalho",
        value: { value: "#F8FAFF" }
    });

    rowHeaderBackgroundColor = new formattingSettings.ColorPicker({
        name: "rowHeaderBackgroundColor",
        displayName: "Fundo linhas",
        value: { value: "#FFFFFF" }
    });

    stripeBackgroundColor = new formattingSettings.ColorPicker({
        name: "stripeBackgroundColor",
        displayName: "Zebra",
        value: { value: "#FBFCFF" }
    });

    subtotalBackgroundColor = new formattingSettings.ColorPicker({
        name: "subtotalBackgroundColor",
        displayName: "Fundo subtotal",
        value: { value: "#F6F2FF" }
    });

    grandTotalBackgroundColor = new formattingSettings.ColorPicker({
        name: "grandTotalBackgroundColor",
        displayName: "Fundo total geral",
        value: { value: "#F2F5FF" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Texto",
        value: { value: "#0F1733" }
    });

    mutedColor = new formattingSettings.ColorPicker({
        name: "mutedColor",
        displayName: "Texto secundario",
        value: { value: "#66708F" }
    });

    accentColor = new formattingSettings.ColorPicker({
        name: "accentColor",
        displayName: "Destaque",
        value: { value: "#5B4DFF" }
    });

    gridColor = new formattingSettings.ColorPicker({
        name: "gridColor",
        displayName: "Linhas divisorias",
        value: { value: "#E6EAF3" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho texto",
        value: 12
    });

    headerFontSize = new formattingSettings.NumUpDown({
        name: "headerFontSize",
        displayName: "Tamanho cabecalho",
        value: 11
    });

    rowHeight = new formattingSettings.NumUpDown({
        name: "rowHeight",
        displayName: "Altura linha",
        value: 40
    });

    rowHeaderMinWidth = new formattingSettings.NumUpDown({
        name: "rowHeaderMinWidth",
        displayName: "Largura min. linhas",
        value: 210
    });

    valueColumnMinWidth = new formattingSettings.NumUpDown({
        name: "valueColumnMinWidth",
        displayName: "Largura min. valores",
        value: 110
    });

    showZebraRows = new formattingSettings.ToggleSwitch({
        name: "showZebraRows",
        displayName: "Linhas alternadas",
        value: true
    });

    showGrid = new formattingSettings.ToggleSwitch({
        name: "showGrid",
        displayName: "Mostrar grade",
        value: true
    });

    stickyHeader = new formattingSettings.ToggleSwitch({
        name: "stickyHeader",
        displayName: "Cabecalho fixo",
        value: true
    });

    name: string = "matrixStyle";
    displayName: string = "Matriz";
    slices: Array<FormattingSettingsSlice> = [
        this.headerBackgroundColor,
        this.rowHeaderBackgroundColor,
        this.stripeBackgroundColor,
        this.subtotalBackgroundColor,
        this.grandTotalBackgroundColor,
        this.textColor,
        this.mutedColor,
        this.accentColor,
        this.gridColor,
        this.fontSize,
        this.headerFontSize,
        this.rowHeight,
        this.rowHeaderMinWidth,
        this.valueColumnMinWidth,
        this.showZebraRows,
        this.showGrid,
        this.stickyHeader
    ];
}

class ValuesFormatSettings extends FormattingSettingsCard {
    formatType = new formattingSettings.ItemDropdown({
        name: "formatType",
        displayName: "Formato",
        value: { value: "currency", displayName: "Moeda" },
        items: formatTypeItems
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Casas decimais",
        value: 0
    });

    percentDecimalPlaces = new formattingSettings.NumUpDown({
        name: "percentDecimalPlaces",
        displayName: "Casas percentuais",
        value: 1
    });

    displayUnits = new formattingSettings.ItemDropdown({
        name: "displayUnits",
        displayName: "Unidades",
        value: { value: "none", displayName: "Nenhum" },
        items: displayUnitItems
    });

    currencySymbol = new formattingSettings.TextInput({
        name: "currencySymbol",
        displayName: "Simbolo moeda",
        value: "R$",
        placeholder: "R$"
    });

    blankValueText = new formattingSettings.TextInput({
        name: "blankValueText",
        displayName: "Valor em branco",
        value: "",
        placeholder: "-"
    });

    name: string = "valuesFormat";
    displayName: string = "Valores";
    slices: Array<FormattingSettingsSlice> = [
        this.formatType,
        this.decimalPlaces,
        this.percentDecimalPlaces,
        this.displayUnits,
        this.currencySymbol,
        this.blankValueText
    ];
}

class TotalsSettings extends FormattingSettingsCard {
    showGrandTotal = new formattingSettings.ToggleSwitch({
        name: "showGrandTotal",
        displayName: "Total geral",
        value: true
    });

    grandTotalLabel = new formattingSettings.TextInput({
        name: "grandTotalLabel",
        displayName: "Rotulo total geral",
        value: "Total Geral",
        placeholder: "Total Geral"
    });

    showSubtotals = new formattingSettings.ToggleSwitch({
        name: "showSubtotals",
        displayName: "Subtotais",
        value: true
    });

    subtotalLabel = new formattingSettings.TextInput({
        name: "subtotalLabel",
        displayName: "Rotulo subtotal",
        value: "Subtotal",
        placeholder: "Subtotal"
    });

    showRowTotal = new formattingSettings.ToggleSwitch({
        name: "showRowTotal",
        displayName: "Coluna Total",
        value: true
    });

    rowTotalLabel = new formattingSettings.TextInput({
        name: "rowTotalLabel",
        displayName: "Rotulo coluna total",
        value: "Total",
        placeholder: "Total"
    });

    showPercentOfTotal = new formattingSettings.ToggleSwitch({
        name: "showPercentOfTotal",
        displayName: "% do total",
        value: true
    });

    percentTotalLabel = new formattingSettings.TextInput({
        name: "percentTotalLabel",
        displayName: "Rotulo %",
        value: "% do Total",
        placeholder: "% do Total"
    });

    name: string = "totals";
    displayName: string = "Totais";
    slices: Array<FormattingSettingsSlice> = [
        this.showGrandTotal,
        this.grandTotalLabel,
        this.showSubtotals,
        this.subtotalLabel,
        this.showRowTotal,
        this.rowTotalLabel,
        this.showPercentOfTotal,
        this.percentTotalLabel
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

    enableExpandCollapse = new formattingSettings.ToggleSwitch({
        name: "enableExpandCollapse",
        displayName: "Expandir/recolher",
        value: true
    });

    name: string = "behavior";
    displayName: string = "Interacao";
    slices: Array<FormattingSettingsSlice> = [
        this.enableSelection,
        this.enableContextMenu,
        this.enableExpandCollapse
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    menuFilter = new MenuFilterSettings();
    matrixStyle = new MatrixStyleSettings();
    valuesFormat = new ValuesFormatSettings();
    totals = new TotalsSettings();
    behavior = new BehaviorSettings();

    cards = [
        this.layout,
        this.menuFilter,
        this.matrixStyle,
        this.valuesFormat,
        this.totals,
        this.behavior
    ];
}

