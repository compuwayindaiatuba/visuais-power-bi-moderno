"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const chartTypeItems = [
    { value: "area", displayName: "Area" },
    { value: "stacked", displayName: "Area empilhada" },
    { value: "stacked100", displayName: "Area 100% empilhada" }
];

const lineShapeItems = [
    { value: "smooth", displayName: "Suave" },
    { value: "straight", displayName: "Ponta aguda" }
];

const markerShapeItems = [
    { value: "circle", displayName: "Circulo" },
    { value: "square", displayName: "Quadrado" },
    { value: "diamond", displayName: "Diamante" },
    { value: "none", displayName: "Oculto" }
];

const legendPositionItems = [
    { value: "top", displayName: "Topo" },
    { value: "bottom", displayName: "Rodape" },
    { value: "hidden", displayName: "Oculta" }
];

const endpointFormatItems = [
    { value: "number", displayName: "Numero" },
    { value: "currency", displayName: "Moeda" },
    { value: "auto", displayName: "Automatico" },
    { value: "percent", displayName: "Percentual 0-100" },
    { value: "percentFraction", displayName: "Percentual decimal 0-1" }
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
        value: 22
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
        value: "Titulo Grafico",
        placeholder: "Titulo do grafico"
    });

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Cor",
        value: { value: "#141D45" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho",
        value: 14
    });

    fontWeight = new formattingSettings.ItemDropdown({
        name: "fontWeight",
        displayName: "Peso",
        value: { value: "750", displayName: "Bold" },
        items: titleWeightItems
    });

    name: string = "title";
    displayName: string = "Titulo grafico";
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
    chartType = new formattingSettings.ItemDropdown({
        name: "chartType",
        displayName: "Tipo",
        value: { value: "area", displayName: "Area" },
        items: chartTypeItems
    });

    lineShape = new formattingSettings.ItemDropdown({
        name: "lineShape",
        displayName: "Linha",
        value: { value: "smooth", displayName: "Suave" },
        items: lineShapeItems
    });

    curveTension = new formattingSettings.NumUpDown({
        name: "curveTension",
        displayName: "Suavidade",
        value: 40
    });

    showEndpointLabel = new formattingSettings.ToggleSwitch({
        name: "showEndpointLabel",
        displayName: "Rotulo fixo final",
        value: false
    });

    endpointFormat = new formattingSettings.ItemDropdown({
        name: "endpointFormat",
        displayName: "Formato valor",
        value: { value: "number", displayName: "Numero" },
        items: endpointFormatItems
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Casas decimais",
        value: 1
    });

    valuePrefix = new formattingSettings.TextInput({
        name: "valuePrefix",
        displayName: "Prefixo",
        value: "",
        placeholder: "R$ "
    });

    valueSuffix = new formattingSettings.TextInput({
        name: "valueSuffix",
        displayName: "Sufixo",
        value: "",
        placeholder: "%"
    });

    name: string = "chart";
    displayName: string = "Grafico";
    slices: FormattingSettingsSlice[] = [
        this.chartType,
        this.lineShape,
        this.curveTension,
        this.showEndpointLabel,
        this.endpointFormat,
        this.decimalPlaces,
        this.valuePrefix,
        this.valueSuffix
    ];
}

class AreaStyleSettings extends FormattingSettingsCard {
    useGradient = new formattingSettings.ToggleSwitch({
        name: "useGradient",
        displayName: "Usar gradiente",
        value: true
    });

    areaOpacity = new formattingSettings.NumUpDown({
        name: "areaOpacity",
        displayName: "Opacidade area",
        value: 24
    });

    lineWidth = new formattingSettings.NumUpDown({
        name: "lineWidth",
        displayName: "Espessura linha",
        value: 2
    });

    useSingleColor = new formattingSettings.ToggleSwitch({
        name: "useSingleColor",
        displayName: "Cor unica",
        value: false
    });

    singleColor = new formattingSettings.ColorPicker({
        name: "singleColor",
        displayName: "Cor principal",
        value: { value: "#6652F0" }
    });

    singleGradientColor = new formattingSettings.ColorPicker({
        name: "singleGradientColor",
        displayName: "Gradiente principal",
        value: { value: "#DCD6FF" }
    });

    color1 = new formattingSettings.ColorPicker({
        name: "color1",
        displayName: "Linha serie 1",
        value: { value: "#6652F0" }
    });

    gradientColor1 = new formattingSettings.ColorPicker({
        name: "gradientColor1",
        displayName: "Gradiente serie 1",
        value: { value: "#DCD6FF" }
    });

    color2 = new formattingSettings.ColorPicker({
        name: "color2",
        displayName: "Linha serie 2",
        value: { value: "#21A7FF" }
    });

    gradientColor2 = new formattingSettings.ColorPicker({
        name: "gradientColor2",
        displayName: "Gradiente serie 2",
        value: { value: "#CDEEFF" }
    });

    color3 = new formattingSettings.ColorPicker({
        name: "color3",
        displayName: "Linha serie 3",
        value: { value: "#22C55E" }
    });

    gradientColor3 = new formattingSettings.ColorPicker({
        name: "gradientColor3",
        displayName: "Gradiente serie 3",
        value: { value: "#CFF7DC" }
    });

    color4 = new formattingSettings.ColorPicker({
        name: "color4",
        displayName: "Linha serie 4",
        value: { value: "#F59E0B" }
    });

    gradientColor4 = new formattingSettings.ColorPicker({
        name: "gradientColor4",
        displayName: "Gradiente serie 4",
        value: { value: "#FDE7B8" }
    });

    color5 = new formattingSettings.ColorPicker({
        name: "color5",
        displayName: "Linha serie 5",
        value: { value: "#EC4899" }
    });

    gradientColor5 = new formattingSettings.ColorPicker({
        name: "gradientColor5",
        displayName: "Gradiente serie 5",
        value: { value: "#FBD0E5" }
    });

    color6 = new formattingSettings.ColorPicker({
        name: "color6",
        displayName: "Linha serie 6",
        value: { value: "#14B8A6" }
    });

    gradientColor6 = new formattingSettings.ColorPicker({
        name: "gradientColor6",
        displayName: "Gradiente serie 6",
        value: { value: "#C8F3EE" }
    });

    name: string = "areaStyle";
    displayName: string = "Area e linha";
    slices: FormattingSettingsSlice[] = [
        this.useGradient,
        this.areaOpacity,
        this.lineWidth,
        this.useSingleColor,
        this.singleColor,
        this.singleGradientColor,
        this.color1,
        this.gradientColor1,
        this.color2,
        this.gradientColor2,
        this.color3,
        this.gradientColor3,
        this.color4,
        this.gradientColor4,
        this.color5,
        this.gradientColor5,
        this.color6,
        this.gradientColor6
    ];
}

class MarkerSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Mostrar",
        value: true
    });

    shape = new formattingSettings.ItemDropdown({
        name: "shape",
        displayName: "Formato",
        value: { value: "circle", displayName: "Circulo" },
        items: markerShapeItems
    });

    size = new formattingSettings.NumUpDown({
        name: "size",
        displayName: "Tamanho",
        value: 5
    });

    borderWidth = new formattingSettings.NumUpDown({
        name: "borderWidth",
        displayName: "Borda",
        value: 2
    });

    fillColor = new formattingSettings.ColorPicker({
        name: "fillColor",
        displayName: "Cor interna",
        value: { value: "#FFFFFF" }
    });

    name: string = "markers";
    displayName: string = "Marcadores";
    slices: FormattingSettingsSlice[] = [
        this.show,
        this.shape,
        this.size,
        this.borderWidth,
        this.fillColor
    ];
}

class AxisSettings extends FormattingSettingsCard {
    showX = new formattingSettings.ToggleSwitch({
        name: "showX",
        displayName: "Mostrar eixo X",
        value: true
    });

    showY = new formattingSettings.ToggleSwitch({
        name: "showY",
        displayName: "Mostrar eixo Y",
        value: true
    });

    showSecondaryY = new formattingSettings.ToggleSwitch({
        name: "showSecondaryY",
        displayName: "Mostrar eixo Y secundario",
        value: true
    });

    showGrid = new formattingSettings.ToggleSwitch({
        name: "showGrid",
        displayName: "Mostrar grade",
        value: true
    });

    gridColor = new formattingSettings.ColorPicker({
        name: "gridColor",
        displayName: "Cor grade",
        value: { value: "#E9ECF5" }
    });

    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Cor textos",
        value: { value: "#5D668A" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho textos",
        value: 11
    });

    xLabelStep = new formattingSettings.NumUpDown({
        name: "xLabelStep",
        displayName: "Intervalo eixo X",
        value: 1
    });

    xLabelRotation = new formattingSettings.NumUpDown({
        name: "xLabelRotation",
        displayName: "Rotacao eixo X",
        value: 0
    });

    xLabelMaxLength = new formattingSettings.NumUpDown({
        name: "xLabelMaxLength",
        displayName: "Max letras eixo X",
        value: 14
    });

    showXTitle = new formattingSettings.ToggleSwitch({
        name: "showXTitle",
        displayName: "Titulo eixo X",
        value: false
    });

    xTitle = new formattingSettings.TextInput({
        name: "xTitle",
        displayName: "Texto eixo X",
        value: "",
        placeholder: "Data"
    });

    showYTitle = new formattingSettings.ToggleSwitch({
        name: "showYTitle",
        displayName: "Titulo eixo Y",
        value: false
    });

    yTitle = new formattingSettings.TextInput({
        name: "yTitle",
        displayName: "Texto eixo Y",
        value: "",
        placeholder: "Valores"
    });

    showSecondaryTitle = new formattingSettings.ToggleSwitch({
        name: "showSecondaryTitle",
        displayName: "Titulo eixo Y secundario",
        value: false
    });

    secondaryTitle = new formattingSettings.TextInput({
        name: "secondaryTitle",
        displayName: "Texto eixo Y secundario",
        value: "",
        placeholder: "Valores secundarios"
    });

    yMin = new formattingSettings.NumUpDown({
        name: "yMin",
        displayName: "Minimo eixo Y",
        value: 0
    });

    yMax = new formattingSettings.NumUpDown({
        name: "yMax",
        displayName: "Maximo eixo Y",
        value: 0
    });

    name: string = "axis";
    displayName: string = "Eixos";
    slices: FormattingSettingsSlice[] = [
        this.showX,
        this.showY,
        this.showSecondaryY,
        this.showGrid,
        this.gridColor,
        this.labelColor,
        this.fontSize,
        this.xLabelStep,
        this.xLabelRotation,
        this.xLabelMaxLength,
        this.showXTitle,
        this.xTitle,
        this.showYTitle,
        this.yTitle,
        this.showSecondaryTitle,
        this.secondaryTitle,
        this.yMin,
        this.yMax
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
        value: { value: "top", displayName: "Topo" },
        items: legendPositionItems
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho",
        value: 11
    });

    name: string = "legendStyle";
    displayName: string = "Legenda";
    slices: FormattingSettingsSlice[] = [
        this.show,
        this.position,
        this.fontSize
    ];
}

class SmallMultipleSettings extends FormattingSettingsCard {
    columns = new formattingSettings.NumUpDown({
        name: "columns",
        displayName: "Colunas",
        value: 2
    });

    gap = new formattingSettings.NumUpDown({
        name: "gap",
        displayName: "Distancia",
        value: 14
    });

    showTitles = new formattingSettings.ToggleSwitch({
        name: "showTitles",
        displayName: "Titulos",
        value: true
    });

    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Cor titulos",
        value: { value: "#141D45" }
    });

    name: string = "smallMultipleStyle";
    displayName: string = "Multiplos pequenos";
    slices: FormattingSettingsSlice[] = [
        this.columns,
        this.gap,
        this.showTitles,
        this.titleColor
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    title = new TitleSettings();
    menuFilter = new MenuFilterSettings();
    chart = new ChartSettings();
    areaStyle = new AreaStyleSettings();
    markers = new MarkerSettings();
    axis = new AxisSettings();
    legendStyle = new LegendSettings();
    smallMultipleStyle = new SmallMultipleSettings();

    cards = [
        this.layout,
        this.title,
        this.menuFilter,
        this.chart,
        this.areaStyle,
        this.markers,
        this.axis,
        this.legendStyle,
        this.smallMultipleStyle
    ];
}

