"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const dataTypeItems = [
    { value: "auto", displayName: "Automatico" },
    { value: "text", displayName: "Texto" },
    { value: "number", displayName: "Numero" },
    { value: "currency", displayName: "Moeda" },
    { value: "percent", displayName: "Percentual" }
];

function createColumnTitle(name: string, displayName: string): formattingSettings.TextInput {
    return new formattingSettings.TextInput({
        name,
        displayName,
        value: "",
        placeholder: "Vazio usa o nome original"
    });
}

function createColumnType(name: string, displayName: string): formattingSettings.ItemDropdown {
    return new formattingSettings.ItemDropdown({
        name,
        displayName,
        value: { value: "auto", displayName: "Automatico" },
        items: dataTypeItems
    });
}

function createColumnDecimals(name: string, displayName: string): formattingSettings.NumUpDown {
    return new formattingSettings.NumUpDown({
        name,
        displayName,
        value: 0
    });
}

class LayoutSettings extends FormattingSettingsCard {
    titleText = new formattingSettings.TextInput({
        name: "titleText",
        displayName: "Titulo",
        value: "Tabela",
        placeholder: "Titulo da tabela"
    });

    maxRows = new formattingSettings.NumUpDown({
        name: "maxRows",
        displayName: "Maximo de itens",
        value: 5
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Cor de fundo",
        value: { value: "#FFFFFF" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Cor da borda",
        value: { value: "#E6EAF2" }
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento",
        value: 14
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Espacamento interno",
        value: 22
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
        this.maxRows,
        this.backgroundColor,
        this.borderColor,
        this.borderRadius,
        this.padding,
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

class DataFormatSettings extends FormattingSettingsCard {
    defaultType = new formattingSettings.ItemDropdown({
        name: "defaultType",
        displayName: "Tipo padrao",
        value: { value: "auto", displayName: "Automatico" },
        items: dataTypeItems
    });

    defaultDecimals = new formattingSettings.NumUpDown({
        name: "defaultDecimals",
        displayName: "Casas padrao",
        value: 0
    });

    currencySymbol = new formattingSettings.TextInput({
        name: "currencySymbol",
        displayName: "Simbolo moeda",
        value: "R$",
        placeholder: "R$"
    });

    column1Title = createColumnTitle("column1Title", "Titulo coluna 1");
    column1Type = createColumnType("column1Type", "Tipo coluna 1");
    column1Decimals = createColumnDecimals("column1Decimals", "Casas coluna 1");
    column2Title = createColumnTitle("column2Title", "Titulo coluna 2");
    column2Type = createColumnType("column2Type", "Tipo coluna 2");
    column2Decimals = createColumnDecimals("column2Decimals", "Casas coluna 2");
    column3Title = createColumnTitle("column3Title", "Titulo coluna 3");
    column3Type = createColumnType("column3Type", "Tipo coluna 3");
    column3Decimals = createColumnDecimals("column3Decimals", "Casas coluna 3");
    column4Title = createColumnTitle("column4Title", "Titulo coluna 4");
    column4Type = createColumnType("column4Type", "Tipo coluna 4");
    column4Decimals = createColumnDecimals("column4Decimals", "Casas coluna 4");
    column5Title = createColumnTitle("column5Title", "Titulo coluna 5");
    column5Type = createColumnType("column5Type", "Tipo coluna 5");
    column5Decimals = createColumnDecimals("column5Decimals", "Casas coluna 5");
    column6Title = createColumnTitle("column6Title", "Titulo coluna 6");
    column6Type = createColumnType("column6Type", "Tipo coluna 6");
    column6Decimals = createColumnDecimals("column6Decimals", "Casas coluna 6");

    name: string = "dataFormat";
    displayName: string = "Formatos dos dados";
    slices: Array<FormattingSettingsSlice> = [
        this.defaultType,
        this.defaultDecimals,
        this.currencySymbol,
        this.column1Title,
        this.column1Type,
        this.column1Decimals,
        this.column2Title,
        this.column2Type,
        this.column2Decimals,
        this.column3Title,
        this.column3Type,
        this.column3Decimals,
        this.column4Title,
        this.column4Type,
        this.column4Decimals,
        this.column5Title,
        this.column5Type,
        this.column5Decimals,
        this.column6Title,
        this.column6Type,
        this.column6Decimals
    ];
}

class RankingSettings extends FormattingSettingsCard {
    sortColumnName = new formattingSettings.TextInput({
        name: "sortColumnName",
        displayName: "Coluna do ranking",
        value: "",
        placeholder: "Ex.: Desempenho"
    });

    sortDirection = new formattingSettings.ItemDropdown({
        name: "sortDirection",
        displayName: "Ordem",
        value: { value: "best", displayName: "Melhores primeiro" },
        items: [
            { value: "best", displayName: "Melhores primeiro" },
            { value: "worst", displayName: "Piores primeiro" }
        ]
    });

    showTitleIcon = new formattingSettings.ToggleSwitch({
        name: "showTitleIcon",
        displayName: "Icone no titulo",
        value: true
    });

    showRankToggle = new formattingSettings.ToggleSwitch({
        name: "showRankToggle",
        displayName: "Botao melhores/piores",
        value: true
    });

    showPositionColumn = new formattingSettings.ToggleSwitch({
        name: "showPositionColumn",
        displayName: "Mostrar posicao",
        value: true
    });

    name: string = "ranking";
    displayName: string = "Ranking";
    slices: Array<FormattingSettingsSlice> = [
        this.sortColumnName,
        this.sortDirection,
        this.showTitleIcon,
        this.showRankToggle,
        this.showPositionColumn
    ];
}

class TableStyleSettings extends FormattingSettingsCard {
    headerColor = new formattingSettings.ColorPicker({
        name: "headerColor",
        displayName: "Cor do cabecalho",
        value: { value: "#151B4D" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Cor do texto",
        value: { value: "#1E254E" }
    });

    mutedColor = new formattingSettings.ColorPicker({
        name: "mutedColor",
        displayName: "Cor secundaria",
        value: { value: "#5C658A" }
    });

    dividerColor = new formattingSettings.ColorPicker({
        name: "dividerColor",
        displayName: "Cor das linhas",
        value: { value: "#E9EDF5" }
    });

    accentColor = new formattingSettings.ColorPicker({
        name: "accentColor",
        displayName: "Cor de destaque",
        value: { value: "#1D6DFF" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho do texto",
        value: 13
    });

    headerFontSize = new formattingSettings.NumUpDown({
        name: "headerFontSize",
        displayName: "Tamanho do cabecalho",
        value: 12
    });

    rowHeight = new formattingSettings.NumUpDown({
        name: "rowHeight",
        displayName: "Altura da linha",
        value: 52
    });

    name: string = "tableStyle";
    displayName: string = "Tabela";
    slices: Array<FormattingSettingsSlice> = [
        this.headerColor,
        this.textColor,
        this.mutedColor,
        this.dividerColor,
        this.accentColor,
        this.fontSize,
        this.headerFontSize,
        this.rowHeight
    ];
}

class ImageSettings extends FormattingSettingsCard {
    showImages = new formattingSettings.ToggleSwitch({
        name: "showImages",
        displayName: "Mostrar imagens",
        value: true
    });

    imageSize = new formattingSettings.NumUpDown({
        name: "imageSize",
        displayName: "Tamanho",
        value: 42
    });

    imageRadius = new formattingSettings.NumUpDown({
        name: "imageRadius",
        displayName: "Arredondamento",
        value: 21
    });

    name: string = "images";
    displayName: string = "Imagens";
    slices: Array<FormattingSettingsSlice> = [
        this.showImages,
        this.imageSize,
        this.imageRadius
    ];
}

class FooterSettings extends FormattingSettingsCard {
    showFooter = new formattingSettings.ToggleSwitch({
        name: "showFooter",
        displayName: "Mostrar rodape",
        value: true
    });

    footerLabel = new formattingSettings.TextInput({
        name: "footerLabel",
        displayName: "Texto do rodape",
        value: "TOTAL",
        placeholder: "TOTAL"
    });

    aggregateType = new formattingSettings.ItemDropdown({
        name: "aggregateType",
        displayName: "Calculo",
        value: { value: "sum", displayName: "Soma" },
        items: [
            { value: "average", displayName: "Media" },
            { value: "sum", displayName: "Soma" },
            { value: "max", displayName: "Maximo" },
            { value: "min", displayName: "Minimo" },
            { value: "count", displayName: "Contagem" }
        ]
    });

    footerBackgroundColor = new formattingSettings.ColorPicker({
        name: "footerBackgroundColor",
        displayName: "Fundo",
        value: { value: "#EEF5FF" }
    });

    footerColor = new formattingSettings.ColorPicker({
        name: "footerColor",
        displayName: "Cor do texto",
        value: { value: "#1467FF" }
    });

    name: string = "footer";
    displayName: string = "Rodape";
    slices: Array<FormattingSettingsSlice> = [
        this.showFooter,
        this.footerLabel,
        this.aggregateType,
        this.footerBackgroundColor,
        this.footerColor
    ];
}

class ConditionalSettings extends FormattingSettingsCard {
    enabled = new formattingSettings.ToggleSwitch({
        name: "enabled",
        displayName: "Ativar",
        value: true
    });

    columnName = new formattingSettings.TextInput({
        name: "columnName",
        displayName: "Coluna",
        value: "",
        placeholder: "Nome da coluna"
    });

    minValue = new formattingSettings.NumUpDown({
        name: "minValue",
        displayName: "Valor minimo",
        value: 0
    });

    maxValue = new formattingSettings.NumUpDown({
        name: "maxValue",
        displayName: "Valor maximo",
        value: 5
    });

    iconStyle = new formattingSettings.ItemDropdown({
        name: "iconStyle",
        displayName: "Desenho",
        value: { value: "stars", displayName: "Estrelas" },
        items: [
            { value: "stars", displayName: "Estrelas" },
            { value: "wifi", displayName: "Wifi" },
            { value: "bars", displayName: "Barras" },
            { value: "dots", displayName: "Bolinhas" }
        ]
    });

    iconColor = new formattingSettings.ColorPicker({
        name: "iconColor",
        displayName: "Cor do desenho",
        value: { value: "#FFB21A" }
    });

    showValue = new formattingSettings.ToggleSwitch({
        name: "showValue",
        displayName: "Mostrar numero",
        value: true
    });

    name: string = "conditional";
    displayName: string = "Formatacao condicional";
    slices: Array<FormattingSettingsSlice> = [
        this.enabled,
        this.columnName,
        this.minValue,
        this.maxValue,
        this.iconStyle,
        this.iconColor,
        this.showValue
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    menuFilter = new MenuFilterSettings();
    ranking = new RankingSettings();
    tableStyle = new TableStyleSettings();
    dataFormat = new DataFormatSettings();
    images = new ImageSettings();
    footer = new FooterSettings();
    conditional = new ConditionalSettings();

    cards = [
        this.layout,
        this.menuFilter,
        this.ranking,
        this.tableStyle,
        this.dataFormat,
        this.images,
        this.footer,
        this.conditional
    ];
}

