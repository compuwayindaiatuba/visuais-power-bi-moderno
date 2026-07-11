"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const visualModeItems: powerbi.IEnumMember[] = [
    { value: "blocks", displayName: "Blocos" },
    { value: "list", displayName: "Lista" },
    { value: "dropdown", displayName: "Suspensa" },
    { value: "timeline", displayName: "Linha do tempo" }
];

const sortItems: powerbi.IEnumMember[] = [
    { value: "source", displayName: "Ordem do modelo" },
    { value: "labelAsc", displayName: "Nome A-Z" },
    { value: "labelDesc", displayName: "Nome Z-A" },
    { value: "valueDesc", displayName: "Valor maior-menor" },
    { value: "valueAsc", displayName: "Valor menor-maior" }
];

const fontWeightItems: powerbi.IEnumMember[] = [
    { value: "400", displayName: "Normal" },
    { value: "500", displayName: "Medio" },
    { value: "600", displayName: "Semibold" },
    { value: "700", displayName: "Bold" }
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
    visualMode = new formattingSettings.ItemDropdown({
        name: "visualMode",
        displayName: "Tipo de segmentacao",
        value: visualModeItems[0],
        items: visualModeItems
    });

    title = new formattingSettings.TextInput({
        name: "title",
        displayName: "Titulo",
        value: "",
        placeholder: "Automatico"
    });

    subtitle = new formattingSettings.TextInput({
        name: "subtitle",
        displayName: "Subtitulo",
        value: "",
        placeholder: "Automatico"
    });

    showHeader = new formattingSettings.ToggleSwitch({
        name: "showHeader",
        displayName: "Mostrar cabecalho",
        value: true
    });

    showToolbar = new formattingSettings.ToggleSwitch({
        name: "showToolbar",
        displayName: "Mostrar botoes superiores",
        value: true
    });

    columnCount = new formattingSettings.NumUpDown({
        name: "columnCount",
        displayName: "Colunas nos blocos",
        value: 2
    });

    maxItems = new formattingSettings.NumUpDown({
        name: "maxItems",
        displayName: "Maximo de itens",
        value: 200
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [
        this.visualMode,
        this.title,
        this.subtitle,
        this.showHeader,
        this.showToolbar,
        this.columnCount,
        this.maxItems
    ];
}

class BehaviorCardSettings extends FormattingSettingsCard {
    multiSelect = new formattingSettings.ToggleSwitch({
        name: "multiSelect",
        displayName: "Permitir selecao multipla",
        value: true
    });

    searchEnabled = new formattingSettings.ToggleSwitch({
        name: "searchEnabled",
        displayName: "Mostrar busca",
        value: true
    });

    showValues = new formattingSettings.ToggleSwitch({
        name: "showValues",
        displayName: "Mostrar valores",
        value: true
    });

    showIcons = new formattingSettings.ToggleSwitch({
        name: "showIcons",
        displayName: "Mostrar icones",
        value: true
    });

    showSelectedCount = new formattingSettings.ToggleSwitch({
        name: "showSelectedCount",
        displayName: "Mostrar total selecionado",
        value: true
    });

    sortBy = new formattingSettings.ItemDropdown({
        name: "sortBy",
        displayName: "Classificacao",
        value: sortItems[0],
        items: sortItems
    });

    name: string = "behavior";
    displayName: string = "Comportamento";
    slices: Array<FormattingSettingsSlice> = [
        this.multiSelect,
        this.searchEnabled,
        this.showValues,
        this.showIcons,
        this.showSelectedCount,
        this.sortBy
    ];
}

class StyleCardSettings extends FormattingSettingsCard {
    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo",
        value: { value: "#ffffff" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Texto",
        value: { value: "#0f172a" }
    });

    mutedTextColor = new formattingSettings.ColorPicker({
        name: "mutedTextColor",
        displayName: "Texto secundario",
        value: { value: "#64748b" }
    });

    accentColor = new formattingSettings.ColorPicker({
        name: "accentColor",
        displayName: "Destaque",
        value: { value: "#2563eb" }
    });

    selectedFillColor = new formattingSettings.ColorPicker({
        name: "selectedFillColor",
        displayName: "Fundo selecionado",
        value: { value: "#eaf1ff" }
    });

    selectedTextColor = new formattingSettings.ColorPicker({
        name: "selectedTextColor",
        displayName: "Texto selecionado",
        value: { value: "#0f172a" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Borda do visual",
        value: { value: "#e2e8f0" }
    });

    itemBorderColor = new formattingSettings.ColorPicker({
        name: "itemBorderColor",
        displayName: "Borda dos itens",
        value: { value: "#dbe3ef" }
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Raio do visual",
        value: 18
    });

    itemRadius = new formattingSettings.NumUpDown({
        name: "itemRadius",
        displayName: "Raio dos itens",
        value: 12
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Margem interna",
        value: 18
    });

    itemSpacing = new formattingSettings.NumUpDown({
        name: "itemSpacing",
        displayName: "Espacamento",
        value: 12
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho do texto",
        value: 13
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

    name: string = "style";
    displayName: string = "Estilo";
    slices: Array<FormattingSettingsSlice> = [
        this.backgroundColor,
        this.textColor,
        this.mutedTextColor,
        this.accentColor,
        this.selectedFillColor,
        this.selectedTextColor,
        this.borderColor,
        this.itemBorderColor,
        this.borderRadius,
        this.itemRadius,
        this.padding,
        this.itemSpacing,
        this.fontSize,
        this.fontFamily,
        this.fontWeight
    ];
}

class TimelineCardSettings extends FormattingSettingsCard {
    showHistogram = new formattingSettings.ToggleSwitch({
        name: "showHistogram",
        displayName: "Mostrar histograma",
        value: true
    });

    showAllPeriod = new formattingSettings.ToggleSwitch({
        name: "showAllPeriod",
        displayName: "Mostrar Tudo",
        value: true
    });

    showTodayPeriod = new formattingSettings.ToggleSwitch({
        name: "showTodayPeriod",
        displayName: "Mostrar Hoje",
        value: true
    });

    showOneDayPeriod = new formattingSettings.ToggleSwitch({
        name: "showOneDayPeriod",
        displayName: "Mostrar 1D",
        value: true
    });

    showSevenDaysPeriod = new formattingSettings.ToggleSwitch({
        name: "showSevenDaysPeriod",
        displayName: "Mostrar 7D",
        value: true
    });

    showOneMonthPeriod = new formattingSettings.ToggleSwitch({
        name: "showOneMonthPeriod",
        displayName: "Mostrar 1M",
        value: true
    });

    showThreeMonthsPeriod = new formattingSettings.ToggleSwitch({
        name: "showThreeMonthsPeriod",
        displayName: "Mostrar 3M",
        value: true
    });

    showSixMonthsPeriod = new formattingSettings.ToggleSwitch({
        name: "showSixMonthsPeriod",
        displayName: "Mostrar 6M",
        value: true
    });

    showOneYearPeriod = new formattingSettings.ToggleSwitch({
        name: "showOneYearPeriod",
        displayName: "Mostrar 1A",
        value: true
    });

    showCustomPeriod = new formattingSettings.ToggleSwitch({
        name: "showCustomPeriod",
        displayName: "Mostrar Personalizado",
        value: true
    });

    rangeFillColor = new formattingSettings.ColorPicker({
        name: "rangeFillColor",
        displayName: "Faixa selecionada",
        value: { value: "#bcd2ff" }
    });

    barColor = new formattingSettings.ColorPicker({
        name: "barColor",
        displayName: "Barras",
        value: { value: "#9bbcff" }
    });

    inactiveBarColor = new formattingSettings.ColorPicker({
        name: "inactiveBarColor",
        displayName: "Barras inativas",
        value: { value: "#e8edf5" }
    });

    name: string = "timeline";
    displayName: string = "Linha do tempo";
    slices: Array<FormattingSettingsSlice> = [
        this.showHistogram,
        this.showAllPeriod,
        this.showTodayPeriod,
        this.showOneDayPeriod,
        this.showSevenDaysPeriod,
        this.showOneMonthPeriod,
        this.showThreeMonthsPeriod,
        this.showSixMonthsPeriod,
        this.showOneYearPeriod,
        this.showCustomPeriod,
        this.rangeFillColor,
        this.barColor,
        this.inactiveBarColor
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutCardSettings();
    behavior = new BehaviorCardSettings();
    style = new StyleCardSettings();
    timeline = new TimelineCardSettings();
    menuFilter = new MenuFilterSettings();

    cards = [this.layout, this.behavior, this.style, this.timeline, this.menuFilter];
}

