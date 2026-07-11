"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

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

const valueFormatItems = [
    { value: "number", displayName: "Numero" },
    { value: "currency", displayName: "Moeda" },
    { value: "percent", displayName: "Percentual 0-100" },
    { value: "percentFraction", displayName: "Percentual decimal 0-1" }
];

const sortModeItems = [
    { value: "valueDesc", displayName: "Maior quantidade" },
    { value: "valueAsc", displayName: "Menor quantidade" },
    { value: "table", displayName: "Ordem da tabela" },
    { value: "sortDesc", displayName: "Classificacao maior" },
    { value: "sortAsc", displayName: "Classificacao menor" }
];

const titleWeightItems = [
    { value: "500", displayName: "Normal" },
    { value: "650", displayName: "Semibold" },
    { value: "750", displayName: "Bold" },
    { value: "800", displayName: "Extra bold" }
];

const footerWeightItems = [
    { value: "400", displayName: "Normal" },
    { value: "500", displayName: "Medium" },
    { value: "650", displayName: "Semibold" }
];

class LayoutSettings extends FormattingSettingsCard {
    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo",
        value: { value: "#FFFFFF" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Borda",
        value: { value: "#E6EAF2" }
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento",
        value: 18,
        options: numericOptions(0, 48)
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Espacamento",
        value: 24,
        options: numericOptions(8, 60)
    });

    fontFamily = new formattingSettings.TextInput({
        name: "fontFamily",
        displayName: "Fonte",
        value: "Segoe UI",
        placeholder: "Segoe UI"
    });

    showShadow = new formattingSettings.ToggleSwitch({
        name: "showShadow",
        displayName: "Sombra",
        value: true
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: FormattingSettingsSlice[] = [
        this.backgroundColor,
        this.borderColor,
        this.borderRadius,
        this.padding,
        this.fontFamily,
        this.showShadow
    ];
}

class HeaderSettings extends FormattingSettingsCard {
    showIcon = new formattingSettings.ToggleSwitch({
        name: "showIcon",
        displayName: "Mostrar icone",
        value: true
    });

    title = new formattingSettings.TextInput({
        name: "title",
        displayName: "Titulo",
        value: "Grafico de Funil",
        placeholder: "Grafico de Funil"
    });

    subtitle = new formattingSettings.TextInput({
        name: "subtitle",
        displayName: "Subtitulo",
        value: "Digite aqui seu subtitulo",
        placeholder: "Digite aqui seu subtitulo"
    });

    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Cor titulo",
        value: { value: "#101828" }
    });

    subtitleColor = new formattingSettings.ColorPicker({
        name: "subtitleColor",
        displayName: "Cor subtitulo",
        value: { value: "#667085" }
    });

    iconColor = new formattingSettings.ColorPicker({
        name: "iconColor",
        displayName: "Cor icone",
        value: { value: "#2F6BFF" }
    });

    iconBackground = new formattingSettings.ColorPicker({
        name: "iconBackground",
        displayName: "Fundo icone",
        value: { value: "#EEF3FF" }
    });

    titleFontSize = new formattingSettings.NumUpDown({
        name: "titleFontSize",
        displayName: "Fonte titulo",
        value: 24,
        options: numericOptions(12, 42)
    });

    subtitleFontSize = new formattingSettings.NumUpDown({
        name: "subtitleFontSize",
        displayName: "Fonte subtitulo",
        value: 14,
        options: numericOptions(8, 28)
    });

    name: string = "header";
    displayName: string = "Cabecalho";
    slices: FormattingSettingsSlice[] = [
        this.showIcon,
        this.title,
        this.subtitle,
        this.titleColor,
        this.subtitleColor,
        this.iconColor,
        this.iconBackground,
        this.titleFontSize,
        this.subtitleFontSize
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
    slices: FormattingSettingsSlice[] = [
        this.enabled,
        this.menuName
    ];
}

class RankingSettings extends FormattingSettingsCard {
    sortMode = new formattingSettings.ItemDropdown({
        name: "sortMode",
        displayName: "Ordenar por",
        value: { value: "valueDesc", displayName: "Maior quantidade" },
        items: sortModeItems
    });

    visibleItems = new formattingSettings.NumUpDown({
        name: "visibleItems",
        displayName: "Dados visiveis",
        value: 8,
        options: numericOptions(1, 30)
    });

    name: string = "ranking";
    displayName: string = "Classificacao e limite";
    slices: FormattingSettingsSlice[] = [
        this.sortMode,
        this.visibleItems
    ];
}

class FunnelSettings extends FormattingSettingsCard {
    maxStages = new formattingSettings.NumUpDown({
        name: "maxStages",
        displayName: "Max etapas",
        value: 8,
        options: numericOptions(2, 12)
    });

    minStageWidth = new formattingSettings.NumUpDown({
        name: "minStageWidth",
        displayName: "Largura minima",
        value: 36,
        options: numericOptions(18, 80)
    });

    stageHeight = new formattingSettings.NumUpDown({
        name: "stageHeight",
        displayName: "Altura etapa",
        value: 66,
        options: numericOptions(28, 120)
    });

    stageGap = new formattingSettings.NumUpDown({
        name: "stageGap",
        displayName: "Distancia",
        value: 7,
        options: numericOptions(0, 24)
    });

    stageRadius = new formattingSettings.NumUpDown({
        name: "stageRadius",
        displayName: "Arredondamento",
        value: 8,
        options: numericOptions(0, 24)
    });

    showStageValues = new formattingSettings.ToggleSwitch({
        name: "showStageValues",
        displayName: "Mostrar valores",
        value: true
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Cor valor",
        value: { value: "#FFFFFF" }
    });

    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Fonte valor",
        value: 21,
        options: numericOptions(10, 42)
    });

    name: string = "funnel";
    displayName: string = "Funil";
    slices: FormattingSettingsSlice[] = [
        this.minStageWidth,
        this.stageHeight,
        this.stageGap,
        this.stageRadius,
        this.showStageValues,
        this.valueColor,
        this.valueFontSize
    ];
}

class NumberFormatSettings extends FormattingSettingsCard {
    valueFormat = new formattingSettings.ItemDropdown({
        name: "valueFormat",
        displayName: "Formato",
        value: { value: "number", displayName: "Numero" },
        items: valueFormatItems
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Casas decimais",
        value: 0,
        options: numericOptions(0, 6)
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

    revenuePrefix = new formattingSettings.TextInput({
        name: "revenuePrefix",
        displayName: "Prefixo receita",
        value: "R$ ",
        placeholder: "R$ "
    });

    averagePrefix = new formattingSettings.TextInput({
        name: "averagePrefix",
        displayName: "Prefixo media",
        value: "R$ ",
        placeholder: "R$ "
    });

    name: string = "numberFormat";
    displayName: string = "Formato dos numeros";
    slices: FormattingSettingsSlice[] = [
        this.valueFormat,
        this.decimalPlaces,
        this.prefix,
        this.suffix,
        this.revenuePrefix,
        this.averagePrefix
    ];
}

class LegendSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Mostrar",
        value: true
    });

    showSubtitles = new formattingSettings.ToggleSwitch({
        name: "showSubtitles",
        displayName: "Mostrar subtitulos",
        value: true
    });

    showValues = new formattingSettings.ToggleSwitch({
        name: "showValues",
        displayName: "Mostrar quantidade",
        value: true
    });

    showConversion = new formattingSettings.ToggleSwitch({
        name: "showConversion",
        displayName: "Mostrar conversao",
        value: true
    });

    headerColor = new formattingSettings.ColorPicker({
        name: "headerColor",
        displayName: "Cor cabecalho",
        value: { value: "#667085" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Cor texto",
        value: { value: "#101828" }
    });

    mutedColor = new formattingSettings.ColorPicker({
        name: "mutedColor",
        displayName: "Cor secundaria",
        value: { value: "#667085" }
    });

    dividerColor = new formattingSettings.ColorPicker({
        name: "dividerColor",
        displayName: "Cor linhas",
        value: { value: "#E7EAF0" }
    });

    name: string = "legendStyle";
    displayName: string = "Legenda";
    slices: FormattingSettingsSlice[] = [
        this.show,
        this.showSubtitles,
        this.showValues,
        this.showConversion,
        this.headerColor,
        this.textColor,
        this.mutedColor,
        this.dividerColor
    ];
}

class ColorSettings extends FormattingSettingsCard {
    color1 = new formattingSettings.ColorPicker({ name: "color1", displayName: "Etapa 1", value: { value: "#2F6BFF" } });
    color2 = new formattingSettings.ColorPicker({ name: "color2", displayName: "Etapa 2", value: { value: "#65BDF5" } });
    color3 = new formattingSettings.ColorPicker({ name: "color3", displayName: "Etapa 3", value: { value: "#2DBFB3" } });
    color4 = new formattingSettings.ColorPicker({ name: "color4", displayName: "Etapa 4", value: { value: "#FFBF2F" } });
    color5 = new formattingSettings.ColorPicker({ name: "color5", displayName: "Etapa 5", value: { value: "#895CF6" } });
    color6 = new formattingSettings.ColorPicker({ name: "color6", displayName: "Etapa 6", value: { value: "#F06595" } });
    color7 = new formattingSettings.ColorPicker({ name: "color7", displayName: "Etapa 7", value: { value: "#14B8A6" } });
    color8 = new formattingSettings.ColorPicker({ name: "color8", displayName: "Etapa 8", value: { value: "#64748B" } });

    name: string = "colors";
    displayName: string = "Cores das etapas";
    slices: FormattingSettingsSlice[] = [
        this.color1,
        this.color2,
        this.color3,
        this.color4,
        this.color5,
        this.color6,
        this.color7,
        this.color8
    ];
}

class SummaryCardSettings extends FormattingSettingsCard {
    showCards = new formattingSettings.ToggleSwitch({ name: "showCards", displayName: "Mostrar cards", value: true });

    showConversion = new formattingSettings.ToggleSwitch({ name: "showConversion", displayName: "Taxa de conversao", value: true });
    conversionTitle = new formattingSettings.TextInput({ name: "conversionTitle", displayName: "Titulo conversao", value: "Taxa de Conversao", placeholder: "Taxa de Conversao" });
    conversionIcon = new formattingSettings.TextInput({ name: "conversionIcon", displayName: "Icone conversao", value: "users", placeholder: "users, trend, money, chart" });
    conversionValueText = new formattingSettings.TextInput({ name: "conversionValueText", displayName: "Valor conversao", value: "", placeholder: "Automatico" });
    conversionFooter = new formattingSettings.TextInput({ name: "conversionFooter", displayName: "Rodape conversao", value: "Visitantes -> Vendas", placeholder: "Visitantes -> Vendas" });

    showSales = new formattingSettings.ToggleSwitch({ name: "showSales", displayName: "Total vendas", value: true });
    salesTitle = new formattingSettings.TextInput({ name: "salesTitle", displayName: "Titulo vendas", value: "Vendas Fechadas", placeholder: "Vendas Fechadas" });
    salesIcon = new formattingSettings.TextInput({ name: "salesIcon", displayName: "Icone vendas", value: "trend", placeholder: "trend" });
    salesValueText = new formattingSettings.TextInput({ name: "salesValueText", displayName: "Valor vendas", value: "", placeholder: "Automatico" });
    salesFooter = new formattingSettings.TextInput({ name: "salesFooter", displayName: "Rodape vendas", value: "Total", placeholder: "Total" });

    showRevenue = new formattingSettings.ToggleSwitch({ name: "showRevenue", displayName: "Receita total", value: true });
    revenueTitle = new formattingSettings.TextInput({ name: "revenueTitle", displayName: "Titulo receita", value: "Receita Gerada", placeholder: "Receita Gerada" });
    revenueIcon = new formattingSettings.TextInput({ name: "revenueIcon", displayName: "Icone receita", value: "money", placeholder: "money" });
    revenueValueText = new formattingSettings.TextInput({ name: "revenueValueText", displayName: "Valor receita", value: "", placeholder: "Automatico" });
    revenueFooter = new formattingSettings.TextInput({ name: "revenueFooter", displayName: "Rodape receita", value: "Total", placeholder: "Total" });

    showAverage = new formattingSettings.ToggleSwitch({ name: "showAverage", displayName: "Media", value: true });
    averageTitle = new formattingSettings.TextInput({ name: "averageTitle", displayName: "Titulo media", value: "Ticket Medio", placeholder: "Ticket Medio" });
    averageIcon = new formattingSettings.TextInput({ name: "averageIcon", displayName: "Icone media", value: "chart", placeholder: "chart" });
    averageValueText = new formattingSettings.TextInput({ name: "averageValueText", displayName: "Valor media", value: "", placeholder: "Automatico" });
    averageFooter = new formattingSettings.TextInput({ name: "averageFooter", displayName: "Rodape media", value: "Por venda", placeholder: "Por venda" });

    cardBackground = new formattingSettings.ColorPicker({ name: "cardBackground", displayName: "Fundo card", value: { value: "#FFFFFF" } });
    cardBorderColor = new formattingSettings.ColorPicker({ name: "cardBorderColor", displayName: "Borda card", value: { value: "#E7EAF0" } });
    cardRadius = new formattingSettings.NumUpDown({ name: "cardRadius", displayName: "Arredondamento card", value: 14, options: numericOptions(0, 36) });
    cardPadding = new formattingSettings.NumUpDown({ name: "cardPadding", displayName: "Espacamento card", value: 16, options: numericOptions(8, 32) });
    cardFontFamily = new formattingSettings.TextInput({ name: "cardFontFamily", displayName: "Fonte cards", value: "", placeholder: "Usar fonte do visual" });
    titleFontSize = new formattingSettings.NumUpDown({ name: "titleFontSize", displayName: "Fonte titulo", value: 12, options: numericOptions(8, 24) });
    valueFontSize = new formattingSettings.NumUpDown({ name: "valueFontSize", displayName: "Fonte valor", value: 19, options: numericOptions(10, 34) });
    footerFontSize = new formattingSettings.NumUpDown({ name: "footerFontSize", displayName: "Fonte rodape", value: 11, options: numericOptions(8, 22) });
    titleWeight = new formattingSettings.ItemDropdown({ name: "titleWeight", displayName: "Peso titulo", value: { value: "650", displayName: "Semibold" }, items: titleWeightItems });
    valueWeight = new formattingSettings.ItemDropdown({ name: "valueWeight", displayName: "Peso valor", value: { value: "750", displayName: "Bold" }, items: titleWeightItems });
    footerWeight = new formattingSettings.ItemDropdown({ name: "footerWeight", displayName: "Peso rodape", value: { value: "500", displayName: "Medium" }, items: footerWeightItems });
    titleColor = new formattingSettings.ColorPicker({ name: "titleColor", displayName: "Cor titulo", value: { value: "#475467" } });
    valueColor = new formattingSettings.ColorPicker({ name: "valueColor", displayName: "Cor valor", value: { value: "#101828" } });
    footerColor = new formattingSettings.ColorPicker({ name: "footerColor", displayName: "Cor rodape", value: { value: "#667085" } });
    iconColor = new formattingSettings.ColorPicker({ name: "iconColor", displayName: "Cor icone", value: { value: "#2F6BFF" } });
    iconBackground = new formattingSettings.ColorPicker({ name: "iconBackground", displayName: "Fundo icone", value: { value: "#EEF3FF" } });

    name: string = "summaryCards";
    displayName: string = "Cards inferiores";
    slices: FormattingSettingsSlice[] = [
        this.showCards,
        this.showConversion,
        this.conversionTitle,
        this.conversionIcon,
        this.conversionValueText,
        this.conversionFooter,
        this.showSales,
        this.salesTitle,
        this.salesIcon,
        this.salesValueText,
        this.salesFooter,
        this.showRevenue,
        this.revenueTitle,
        this.revenueIcon,
        this.revenueValueText,
        this.revenueFooter,
        this.showAverage,
        this.averageTitle,
        this.averageIcon,
        this.averageValueText,
        this.averageFooter,
        this.cardBackground,
        this.cardBorderColor,
        this.cardRadius,
        this.cardPadding,
        this.cardFontFamily,
        this.titleFontSize,
        this.valueFontSize,
        this.footerFontSize,
        this.titleWeight,
        this.valueWeight,
        this.footerWeight,
        this.titleColor,
        this.valueColor,
        this.footerColor,
        this.iconColor,
        this.iconBackground
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    header = new HeaderSettings();
    menuFilter = new MenuFilterSettings();
    ranking = new RankingSettings();
    funnel = new FunnelSettings();
    numberFormat = new NumberFormatSettings();
    legendStyle = new LegendSettings();
    colors = new ColorSettings();
    summaryCards = new SummaryCardSettings();

    cards = [
        this.layout,
        this.header,
        this.menuFilter,
        this.ranking,
        this.funnel,
        this.numberFormat,
        this.legendStyle,
        this.colors,
        this.summaryCards
    ];
}

