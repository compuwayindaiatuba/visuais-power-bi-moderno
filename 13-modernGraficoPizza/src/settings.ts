"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const chartModeItems = [
    { value: "pie", displayName: "Pizza" },
    { value: "donut", displayName: "Rosca" },
    { value: "rings", displayName: "Circulos internos" }
];

const sortItems = [
    { value: "desc", displayName: "Maior primeiro" },
    { value: "asc", displayName: "Menor primeiro" },
    { value: "none", displayName: "Ordem da tabela" }
];

const scaleItems = [
    { value: "auto", displayName: "Automatico" },
    { value: "percent", displayName: "Percentual 0-100" },
    { value: "max", displayName: "Normalizar pelo maior" }
];

const labelPositionItems = [
    { value: "outside", displayName: "Fora" },
    { value: "inside", displayName: "Dentro" },
    { value: "hidden", displayName: "Oculto" }
];

const valueFormatItems = [
    { value: "number", displayName: "Numero" },
    { value: "currency", displayName: "Moeda" },
    { value: "percent", displayName: "Percentual 0-100" },
    { value: "percentFraction", displayName: "Percentual decimal 0-1" }
];

const legendPositionItems = [
    { value: "right", displayName: "Direita" },
    { value: "left", displayName: "Esquerda" },
    { value: "bottom", displayName: "Rodape" },
    { value: "hidden", displayName: "Oculta" }
];

const titleWeightItems = [
    { value: "500", displayName: "Normal" },
    { value: "650", displayName: "Semibold" },
    { value: "750", displayName: "Bold" }
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
        value: { value: "#E9ECF5" }
    });

    borderWidth = new formattingSettings.NumUpDown({
        name: "borderWidth",
        displayName: "Largura da borda",
        value: 1
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento",
        value: 12
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Espacamento interno",
        value: 16
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
        this.borderWidth,
        this.borderRadius,
        this.padding,
        this.fontFamily,
        this.showShadow
    ];
}

class TitleSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Mostrar",
        value: true
    });

    text = new formattingSettings.TextInput({
        name: "text",
        displayName: "Texto",
        value: "Grafico",
        placeholder: "Grafico"
    });

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Cor",
        value: { value: "#141D45" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho",
        value: 13
    });

    fontWeight = new formattingSettings.ItemDropdown({
        name: "fontWeight",
        displayName: "Peso",
        value: { value: "750", displayName: "Bold" },
        items: titleWeightItems
    });

    name: string = "title";
    displayName: string = "Titulo";
    slices: FormattingSettingsSlice[] = [
        this.show,
        this.text,
        this.color,
        this.fontSize,
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
    displayName: string = "Filtro de Menu";
    slices: FormattingSettingsSlice[] = [
        this.enabled,
        this.menuName
    ];
}

class ChartSettings extends FormattingSettingsCard {
    chartMode = new formattingSettings.ItemDropdown({
        name: "chartMode",
        displayName: "Tipo",
        value: { value: "donut", displayName: "Rosca" },
        items: chartModeItems
    });

    measureSelector = new formattingSettings.ToggleSwitch({
        name: "measureSelector",
        displayName: "Seletor de valor",
        value: true
    });

    sortMode = new formattingSettings.ItemDropdown({
        name: "sortMode",
        displayName: "Ordenacao",
        value: { value: "desc", displayName: "Maior primeiro" },
        items: sortItems
    });

    maxItems = new formattingSettings.NumUpDown({
        name: "maxItems",
        displayName: "Max categorias",
        value: 5
    });

    showOthers = new formattingSettings.ToggleSwitch({
        name: "showOthers",
        displayName: "Agrupar outros",
        value: true
    });

    othersLabel = new formattingSettings.TextInput({
        name: "othersLabel",
        displayName: "Nome outros",
        value: "Outros",
        placeholder: "Outros"
    });

    startAngle = new formattingSettings.NumUpDown({
        name: "startAngle",
        displayName: "Angulo inicial",
        value: -90
    });

    padAngle = new formattingSettings.NumUpDown({
        name: "padAngle",
        displayName: "Espaco fatias",
        value: 1
    });

    cornerRadius = new formattingSettings.NumUpDown({
        name: "cornerRadius",
        displayName: "Arredondar pontas",
        value: 0
    });

    name: string = "chart";
    displayName: string = "Grafico";
    slices: FormattingSettingsSlice[] = [
        this.chartMode,
        this.measureSelector,
        this.sortMode,
        this.maxItems,
        this.showOthers,
        this.othersLabel,
        this.startAngle,
        this.padAngle,
        this.cornerRadius
    ];
}

class DonutSettings extends FormattingSettingsCard {
    innerRadius = new formattingSettings.NumUpDown({
        name: "innerRadius",
        displayName: "Raio interno",
        value: 52
    });

    outerRadius = new formattingSettings.NumUpDown({
        name: "outerRadius",
        displayName: "Raio externo",
        value: 92
    });

    strokeColor = new formattingSettings.ColorPicker({
        name: "strokeColor",
        displayName: "Cor divisoria",
        value: { value: "#FFFFFF" }
    });

    strokeWidth = new formattingSettings.NumUpDown({
        name: "strokeWidth",
        displayName: "Largura divisoria",
        value: 2
    });

    name: string = "donut";
    displayName: string = "Pizza e rosca";
    slices: FormattingSettingsSlice[] = [
        this.innerRadius,
        this.outerRadius,
        this.strokeColor,
        this.strokeWidth
    ];
}

class RingSettings extends FormattingSettingsCard {
    trackColor = new formattingSettings.ColorPicker({
        name: "trackColor",
        displayName: "Cor trilha",
        value: { value: "#F0F1F7" }
    });

    trackOpacity = new formattingSettings.NumUpDown({
        name: "trackOpacity",
        displayName: "Opacidade trilha",
        value: 100
    });

    ringWidth = new formattingSettings.NumUpDown({
        name: "ringWidth",
        displayName: "Espessura",
        value: 8
    });

    ringGap = new formattingSettings.NumUpDown({
        name: "ringGap",
        displayName: "Distancia",
        value: 8
    });

    roundedCaps = new formattingSettings.ToggleSwitch({
        name: "roundedCaps",
        displayName: "Pontas arredondadas",
        value: true
    });

    scaleMode = new formattingSettings.ItemDropdown({
        name: "scaleMode",
        displayName: "Escala",
        value: { value: "auto", displayName: "Automatico" },
        items: scaleItems
    });

    name: string = "rings";
    displayName: string = "Circulos internos";
    slices: FormattingSettingsSlice[] = [
        this.trackColor,
        this.trackOpacity,
        this.ringWidth,
        this.ringGap,
        this.roundedCaps,
        this.scaleMode
    ];
}

class ColorSettings extends FormattingSettingsCard {
    color1 = new formattingSettings.ColorPicker({ name: "color1", displayName: "Cor 1", value: { value: "#6C4FF6" } });
    color2 = new formattingSettings.ColorPicker({ name: "color2", displayName: "Cor 2", value: { value: "#3978FF" } });
    color3 = new formattingSettings.ColorPicker({ name: "color3", displayName: "Cor 3", value: { value: "#FF9F2E" } });
    color4 = new formattingSettings.ColorPicker({ name: "color4", displayName: "Cor 4", value: { value: "#3DBE7E" } });
    color5 = new formattingSettings.ColorPicker({ name: "color5", displayName: "Cor 5", value: { value: "#E11D2E" } });
    color6 = new formattingSettings.ColorPicker({ name: "color6", displayName: "Cor 6", value: { value: "#F26D78" } });
    color7 = new formattingSettings.ColorPicker({ name: "color7", displayName: "Cor 7", value: { value: "#F7A8B1" } });
    color8 = new formattingSettings.ColorPicker({ name: "color8", displayName: "Cor 8", value: { value: "#14B8A6" } });
    color9 = new formattingSettings.ColorPicker({ name: "color9", displayName: "Cor 9", value: { value: "#8B5CF6" } });
    color10 = new formattingSettings.ColorPicker({ name: "color10", displayName: "Cor 10", value: { value: "#64748B" } });

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

class LabelSettings extends FormattingSettingsCard {
    showCategoryLabels = new formattingSettings.ToggleSwitch({
        name: "showCategoryLabels",
        displayName: "Mostrar categoria",
        value: false
    });

    showPercentLabels = new formattingSettings.ToggleSwitch({
        name: "showPercentLabels",
        displayName: "Mostrar percentual",
        value: true
    });

    showValueLabels = new formattingSettings.ToggleSwitch({
        name: "showValueLabels",
        displayName: "Mostrar valor",
        value: false
    });

    position = new formattingSettings.ItemDropdown({
        name: "position",
        displayName: "Posicao",
        value: { value: "outside", displayName: "Fora" },
        items: labelPositionItems
    });

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Cor",
        value: { value: "#1F2A55" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho",
        value: 10
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Casas decimais",
        value: 1
    });

    valueFormat = new formattingSettings.ItemDropdown({
        name: "valueFormat",
        displayName: "Formato valor",
        value: { value: "number", displayName: "Numero" },
        items: valueFormatItems
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

    name: string = "labels";
    displayName: string = "Rotulos";
    slices: FormattingSettingsSlice[] = [
        this.showCategoryLabels,
        this.showPercentLabels,
        this.showValueLabels,
        this.position,
        this.color,
        this.fontSize,
        this.decimalPlaces,
        this.valueFormat,
        this.prefix,
        this.suffix
    ];
}

class LegendSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Mostrar",
        value: true
    });

    position = new formattingSettings.ItemDropdown({
        name: "position",
        displayName: "Posicao",
        value: { value: "right", displayName: "Direita" },
        items: legendPositionItems
    });

    showPercent = new formattingSettings.ToggleSwitch({
        name: "showPercent",
        displayName: "Mostrar percentual",
        value: true
    });

    showValue = new formattingSettings.ToggleSwitch({
        name: "showValue",
        displayName: "Mostrar valor",
        value: true
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho",
        value: 10
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Cor texto",
        value: { value: "#1F2A55" }
    });

    mutedColor = new formattingSettings.ColorPicker({
        name: "mutedColor",
        displayName: "Cor secundaria",
        value: { value: "#6B7391" }
    });

    name: string = "legendStyle";
    displayName: string = "Legenda";
    slices: FormattingSettingsSlice[] = [
        this.show,
        this.position,
        this.showPercent,
        this.showValue,
        this.fontSize,
        this.textColor,
        this.mutedColor
    ];
}

class CenterSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Mostrar centro",
        value: true
    });

    showTotal = new formattingSettings.ToggleSwitch({
        name: "showTotal",
        displayName: "Mostrar total",
        value: true
    });

    label = new formattingSettings.TextInput({
        name: "label",
        displayName: "Texto",
        value: "Total",
        placeholder: "Total"
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Cor valor",
        value: { value: "#141D45" }
    });

    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Cor texto",
        value: { value: "#56607F" }
    });

    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Tamanho valor",
        value: 15
    });

    labelFontSize = new formattingSettings.NumUpDown({
        name: "labelFontSize",
        displayName: "Tamanho texto",
        value: 10
    });

    name: string = "center";
    displayName: string = "Centro";
    slices: FormattingSettingsSlice[] = [
        this.show,
        this.showTotal,
        this.label,
        this.valueColor,
        this.labelColor,
        this.valueFontSize,
        this.labelFontSize
    ];
}

class TooltipSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Mostrar",
        value: true
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo",
        value: { value: "#FFFFFF" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Texto",
        value: { value: "#141D45" }
    });

    name: string = "tooltipStyle";
    displayName: string = "Tooltip";
    slices: FormattingSettingsSlice[] = [
        this.show,
        this.backgroundColor,
        this.textColor
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    title = new TitleSettings();
    menuFilter = new MenuFilterSettings();
    chart = new ChartSettings();
    donut = new DonutSettings();
    rings = new RingSettings();
    colors = new ColorSettings();
    labels = new LabelSettings();
    legendStyle = new LegendSettings();
    center = new CenterSettings();
    tooltipStyle = new TooltipSettings();

    cards = [
        this.layout,
        this.title,
        this.menuFilter,
        this.chart,
        this.donut,
        this.rings,
        this.colors,
        this.labels,
        this.legendStyle,
        this.center,
        this.tooltipStyle
    ];
}

