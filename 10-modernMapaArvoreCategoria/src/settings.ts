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
    { value: "valueDesc", displayName: "Maior valor" },
    { value: "valueAsc", displayName: "Menor valor" },
    { value: "table", displayName: "Ordem da tabela" },
    { value: "sortDesc", displayName: "Classificacao maior" },
    { value: "sortAsc", displayName: "Classificacao menor" }
];

class LayoutSettings extends FormattingSettingsCard {
    backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Fundo", value: { value: "#FFFFFF" } });
    borderColor = new formattingSettings.ColorPicker({ name: "borderColor", displayName: "Borda", value: { value: "#E6EAF2" } });
    borderRadius = new formattingSettings.NumUpDown({ name: "borderRadius", displayName: "Arredondamento", value: 20, options: numericOptions(0, 48) });
    padding = new formattingSettings.NumUpDown({ name: "padding", displayName: "Espacamento", value: 22, options: numericOptions(8, 64) });
    fontFamily = new formattingSettings.TextInput({ name: "fontFamily", displayName: "Fonte", value: "Segoe UI", placeholder: "Segoe UI" });
    showShadow = new formattingSettings.ToggleSwitch({ name: "showShadow", displayName: "Sombra", value: true });

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
    showIcon = new formattingSettings.ToggleSwitch({ name: "showIcon", displayName: "Mostrar icone", value: true });
    title = new formattingSettings.TextInput({ name: "title", displayName: "Titulo", value: "Mapa de Arvore - Hierarquia", placeholder: "Mapa de Arvore - Hierarquia" });
    subtitle = new formattingSettings.TextInput({ name: "subtitle", displayName: "Subtitulo", value: "Visualize o desempenho por Regiao, Estado e Categoria", placeholder: "Digite aqui seu subtitulo" });
    titleColor = new formattingSettings.ColorPicker({ name: "titleColor", displayName: "Cor titulo", value: { value: "#101828" } });
    subtitleColor = new formattingSettings.ColorPicker({ name: "subtitleColor", displayName: "Cor subtitulo", value: { value: "#667085" } });
    iconColor = new formattingSettings.ColorPicker({ name: "iconColor", displayName: "Cor icone", value: { value: "#2F6BFF" } });
    iconBackground = new formattingSettings.ColorPicker({ name: "iconBackground", displayName: "Fundo icone", value: { value: "#EEF3FF" } });
    titleFontSize = new formattingSettings.NumUpDown({ name: "titleFontSize", displayName: "Fonte titulo", value: 23, options: numericOptions(12, 44) });
    subtitleFontSize = new formattingSettings.NumUpDown({ name: "subtitleFontSize", displayName: "Fonte subtitulo", value: 14, options: numericOptions(8, 28) });

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
    enabled = new formattingSettings.ToggleSwitch({ name: "enabled", displayName: "Ativar menu invisivel", value: false });
    menuName = new formattingSettings.TextInput({ name: "menuName", displayName: "Mostrar quando menu for", value: "", placeholder: "Funcionarios" });

    name: string = "menuFilter";
    displayName: string = "Filtro de Menu";
    slices: FormattingSettingsSlice[] = [this.enabled, this.menuName];
}

class NavigationSettings extends FormattingSettingsCard {
    showLevelBar = new formattingSettings.ToggleSwitch({ name: "showLevelBar", displayName: "Mostrar niveis", value: true });
    showInstruction = new formattingSettings.ToggleSwitch({ name: "showInstruction", displayName: "Mostrar instrucao", value: true });
    instructionText = new formattingSettings.TextInput({ name: "instructionText", displayName: "Texto instrucao", value: "Clique em um bloco para navegar para o proximo nivel", placeholder: "Clique em um bloco..." });
    showBackButton = new formattingSettings.ToggleSwitch({ name: "showBackButton", displayName: "Mostrar voltar", value: true });
    backText = new formattingSettings.TextInput({ name: "backText", displayName: "Texto voltar", value: "Voltar", placeholder: "Voltar" });
    levelLabelPrefix = new formattingSettings.TextInput({ name: "levelLabelPrefix", displayName: "Prefixo nivel", value: "Nivel", placeholder: "Nivel" });
    activeLevelColor = new formattingSettings.ColorPicker({ name: "activeLevelColor", displayName: "Cor nivel ativo", value: { value: "#2F6BFF" } });
    inactiveLevelColor = new formattingSettings.ColorPicker({ name: "inactiveLevelColor", displayName: "Cor nivel inativo", value: { value: "#667085" } });

    name: string = "navigation";
    displayName: string = "Navegacao";
    slices: FormattingSettingsSlice[] = [
        this.showLevelBar,
        this.showInstruction,
        this.instructionText,
        this.showBackButton,
        this.backText,
        this.levelLabelPrefix,
        this.activeLevelColor,
        this.inactiveLevelColor
    ];
}

class RankingSettings extends FormattingSettingsCard {
    sortMode = new formattingSettings.ItemDropdown({ name: "sortMode", displayName: "Ordenar por", value: { value: "valueDesc", displayName: "Maior valor" }, items: sortModeItems });
    maxItems = new formattingSettings.NumUpDown({ name: "maxItems", displayName: "Dados visiveis", value: 8, options: numericOptions(1, 40) });
    showOthers = new formattingSettings.ToggleSwitch({ name: "showOthers", displayName: "Agrupar outros", value: true });
    othersLabel = new formattingSettings.TextInput({ name: "othersLabel", displayName: "Nome outros", value: "Outros", placeholder: "Outros" });

    name: string = "ranking";
    displayName: string = "Classificacao e limite";
    slices: FormattingSettingsSlice[] = [this.sortMode, this.maxItems, this.showOthers, this.othersLabel];
}

class NumberFormatSettings extends FormattingSettingsCard {
    valueFormat = new formattingSettings.ItemDropdown({ name: "valueFormat", displayName: "Formato", value: { value: "currency", displayName: "Moeda" }, items: valueFormatItems });
    decimalPlaces = new formattingSettings.NumUpDown({ name: "decimalPlaces", displayName: "Casas decimais", value: 0, options: numericOptions(0, 6) });
    prefix = new formattingSettings.TextInput({ name: "prefix", displayName: "Prefixo", value: "R$ ", placeholder: "R$ " });
    suffix = new formattingSettings.TextInput({ name: "suffix", displayName: "Sufixo", value: "", placeholder: "%" });
    percentDecimalPlaces = new formattingSettings.NumUpDown({ name: "percentDecimalPlaces", displayName: "Casas decimais %", value: 1, options: numericOptions(0, 4) });

    name: string = "numberFormat";
    displayName: string = "Formato dos numeros";
    slices: FormattingSettingsSlice[] = [this.valueFormat, this.decimalPlaces, this.prefix, this.suffix, this.percentDecimalPlaces];
}

class TreeSettings extends FormattingSettingsCard {
    blockGap = new formattingSettings.NumUpDown({ name: "blockGap", displayName: "Distancia entre blocos", value: 5, options: numericOptions(0, 24) });
    blockRadius = new formattingSettings.NumUpDown({ name: "blockRadius", displayName: "Arredondamento bloco", value: 8, options: numericOptions(0, 30) });
    outerPadding = new formattingSettings.NumUpDown({ name: "outerPadding", displayName: "Margem interna grafico", value: 0, options: numericOptions(0, 40) });
    showExpandButton = new formattingSettings.ToggleSwitch({ name: "showExpandButton", displayName: "Mostrar botao expandir", value: true });
    showCategory = new formattingSettings.ToggleSwitch({ name: "showCategory", displayName: "Mostrar categoria", value: true });
    showValue = new formattingSettings.ToggleSwitch({ name: "showValue", displayName: "Mostrar valor", value: true });
    showPercent = new formattingSettings.ToggleSwitch({ name: "showPercent", displayName: "Mostrar percentual", value: true });
    labelColor = new formattingSettings.ColorPicker({ name: "labelColor", displayName: "Cor dos textos", value: { value: "#FFFFFF" } });
    categoryFontSize = new formattingSettings.NumUpDown({ name: "categoryFontSize", displayName: "Fonte categoria", value: 18, options: numericOptions(8, 40) });
    valueFontSize = new formattingSettings.NumUpDown({ name: "valueFontSize", displayName: "Fonte valor", value: 20, options: numericOptions(8, 44) });
    percentFontSize = new formattingSettings.NumUpDown({ name: "percentFontSize", displayName: "Fonte percentual", value: 16, options: numericOptions(8, 36) });
    hideLabelsBelowArea = new formattingSettings.NumUpDown({ name: "hideLabelsBelowArea", displayName: "Ocultar texto abaixo area", value: 5200, options: numericOptions(0, 30000) });

    name: string = "tree";
    displayName: string = "Arvore";
    slices: FormattingSettingsSlice[] = [
        this.blockGap,
        this.blockRadius,
        this.outerPadding,
        this.showExpandButton,
        this.showCategory,
        this.showValue,
        this.showPercent,
        this.labelColor,
        this.categoryFontSize,
        this.valueFontSize,
        this.percentFontSize,
        this.hideLabelsBelowArea
    ];
}

class ColorSettings extends FormattingSettingsCard {
    color1 = new formattingSettings.ColorPicker({ name: "color1", displayName: "Bloco 1", value: { value: "#2F6BFF" } });
    color2 = new formattingSettings.ColorPicker({ name: "color2", displayName: "Bloco 2", value: { value: "#77B1FF" } });
    color3 = new formattingSettings.ColorPicker({ name: "color3", displayName: "Bloco 3", value: { value: "#2DBFB3" } });
    color4 = new formattingSettings.ColorPicker({ name: "color4", displayName: "Bloco 4", value: { value: "#895CF6" } });
    color5 = new formattingSettings.ColorPicker({ name: "color5", displayName: "Bloco 5", value: { value: "#FFBF2F" } });
    color6 = new formattingSettings.ColorPicker({ name: "color6", displayName: "Bloco 6", value: { value: "#F06F5B" } });
    color7 = new formattingSettings.ColorPicker({ name: "color7", displayName: "Bloco 7", value: { value: "#5F7AEA" } });
    color8 = new formattingSettings.ColorPicker({ name: "color8", displayName: "Bloco 8", value: { value: "#98A2B3" } });
    color9 = new formattingSettings.ColorPicker({ name: "color9", displayName: "Bloco 9", value: { value: "#E14F8F" } });
    color10 = new formattingSettings.ColorPicker({ name: "color10", displayName: "Bloco 10", value: { value: "#14B8A6" } });

    name: string = "colors";
    displayName: string = "Cores";
    slices: FormattingSettingsSlice[] = [
        this.color1,
        this.color2,
        this.color3,
        this.color4,
        this.color5,
        this.color6,
        this.color7,
        this.color8,
        this.color9,
        this.color10
    ];
}

class SidePanelSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Mostrar", value: true });
    summaryTitle = new formattingSettings.TextInput({ name: "summaryTitle", displayName: "Titulo resumo", value: "Resumo Geral", placeholder: "Resumo Geral" });
    totalLabel = new formattingSettings.TextInput({ name: "totalLabel", displayName: "Rotulo total", value: "Total de Vendas", placeholder: "Total de Vendas" });
    currentLevelLabel = new formattingSettings.TextInput({ name: "currentLevelLabel", displayName: "Rotulo nivel atual", value: "Nivel atual", placeholder: "Nivel atual" });
    nextLevelLabel = new formattingSettings.TextInput({ name: "nextLevelLabel", displayName: "Rotulo proximo nivel", value: "Proximo nivel", placeholder: "Proximo nivel" });
    itemsLabel = new formattingSettings.TextInput({ name: "itemsLabel", displayName: "Rotulo itens", value: "Itens visiveis", placeholder: "Itens visiveis" });
    performanceTitle = new formattingSettings.TextInput({ name: "performanceTitle", displayName: "Titulo desempenho", value: "Desempenho (%)", placeholder: "Desempenho (%)" });
    maxLabel = new formattingSettings.TextInput({ name: "maxLabel", displayName: "Rotulo maior", value: "Maior desempenho", placeholder: "Maior desempenho" });
    minLabel = new formattingSettings.TextInput({ name: "minLabel", displayName: "Rotulo menor", value: "Menor desempenho", placeholder: "Menor desempenho" });
    backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Fundo", value: { value: "#FFFFFF" } });
    borderColor = new formattingSettings.ColorPicker({ name: "borderColor", displayName: "Borda", value: { value: "#E6EAF2" } });
    textColor = new formattingSettings.ColorPicker({ name: "textColor", displayName: "Cor texto", value: { value: "#101828" } });
    mutedColor = new formattingSettings.ColorPicker({ name: "mutedColor", displayName: "Cor secundaria", value: { value: "#667085" } });

    name: string = "sidePanel";
    displayName: string = "Painel lateral";
    slices: FormattingSettingsSlice[] = [
        this.show,
        this.summaryTitle,
        this.totalLabel,
        this.currentLevelLabel,
        this.nextLevelLabel,
        this.itemsLabel,
        this.performanceTitle,
        this.maxLabel,
        this.minLabel,
        this.backgroundColor,
        this.borderColor,
        this.textColor,
        this.mutedColor
    ];
}

class FooterSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Mostrar", value: true });
    text = new formattingSettings.TextInput({ name: "text", displayName: "Texto", value: "Navegue pelos niveis clicando nos blocos ou use os niveis para voltar.", placeholder: "Digite aqui seu rodape" });
    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Cor", value: { value: "#667085" } });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Fonte", value: 12, options: numericOptions(8, 26) });

    name: string = "footer";
    displayName: string = "Rodape";
    slices: FormattingSettingsSlice[] = [this.show, this.text, this.color, this.fontSize];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    header = new HeaderSettings();
    menuFilter = new MenuFilterSettings();
    navigation = new NavigationSettings();
    ranking = new RankingSettings();
    numberFormat = new NumberFormatSettings();
    tree = new TreeSettings();
    colors = new ColorSettings();
    sidePanel = new SidePanelSettings();
    footer = new FooterSettings();

    cards = [
        this.layout,
        this.header,
        this.menuFilter,
        this.navigation,
        this.ranking,
        this.numberFormat,
        this.tree,
        this.colors,
        this.sidePanel,
        this.footer
    ];
}

