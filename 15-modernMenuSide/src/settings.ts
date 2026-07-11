"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

const themeSourceItems = [
    { value: "settings", displayName: "Formatacao" },
    { value: "data", displayName: "Tabela" }
];

const themeModeItems = [
    { value: "light", displayName: "Claro" },
    { value: "dark", displayName: "Escuro" }
];

const alignItems = [
    { value: "left", displayName: "Esquerda" },
    { value: "center", displayName: "Centro" },
    { value: "right", displayName: "Direita" }
];

const activeModeItems = [
    { value: "manual", displayName: "Nome informado" },
    { value: "lastClick", displayName: "Ultimo clique" }
];

const clickActionItems = [
    { value: "select", displayName: "Selecionar" },
    { value: "url", displayName: "Abrir URL" }
];

const urlCompletionItems = [
    { value: "rowUrl", displayName: "LinkDestino + URL base" },
    { value: "path", displayName: "Nome/ID no caminho" },
    { value: "pageName", displayName: "Parametro pageName" },
    { value: "placeholder", displayName: "Marcador {page}" }
];

class LayoutSettings extends FormattingSettingsCard {
    expandedWidth = new formattingSettings.NumUpDown({
        name: "expandedWidth",
        displayName: "Largura aberto",
        value: 188
    });

    collapsedWidth = new formattingSettings.NumUpDown({
        name: "collapsedWidth",
        displayName: "Largura recolhido",
        value: 58
    });

    marginTop = new formattingSettings.NumUpDown({
        name: "marginTop",
        displayName: "Margem superior",
        value: 0
    });

    marginRight = new formattingSettings.NumUpDown({
        name: "marginRight",
        displayName: "Margem direita",
        value: 0
    });

    marginBottom = new formattingSettings.NumUpDown({
        name: "marginBottom",
        displayName: "Margem inferior",
        value: 0
    });

    marginLeft = new formattingSettings.NumUpDown({
        name: "marginLeft",
        displayName: "Margem esquerda",
        value: 0
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Espacamento interno",
        value: 12
    });

    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento",
        value: 12
    });

    borderWidth = new formattingSettings.NumUpDown({
        name: "borderWidth",
        displayName: "Largura da borda",
        value: 1
    });

    showShadow = new formattingSettings.ToggleSwitch({
        name: "showShadow",
        displayName: "Sombra",
        value: true
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
        this.expandedWidth,
        this.collapsedWidth,
        this.marginTop,
        this.marginRight,
        this.marginBottom,
        this.marginLeft,
        this.padding,
        this.borderRadius,
        this.borderWidth,
        this.showShadow,
        this.fontFamily
    ];
}

class ThemeSettings extends FormattingSettingsCard {
    themeSource = new formattingSettings.ItemDropdown({
        name: "themeSource",
        displayName: "Origem do tema",
        value: { value: "settings", displayName: "Formatacao" },
        items: themeSourceItems
    });

    themeMode = new formattingSettings.ItemDropdown({
        name: "themeMode",
        displayName: "Modo",
        value: { value: "light", displayName: "Claro" },
        items: themeModeItems
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo claro",
        value: { value: "#FFFFFF" }
    });

    darkBackgroundColor = new formattingSettings.ColorPicker({
        name: "darkBackgroundColor",
        displayName: "Fundo escuro",
        value: { value: "#171A24" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Borda clara",
        value: { value: "#E7EAF3" }
    });

    darkBorderColor = new formattingSettings.ColorPicker({
        name: "darkBorderColor",
        displayName: "Borda escura",
        value: { value: "#2B3040" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Texto claro",
        value: { value: "#243056" }
    });

    darkTextColor = new formattingSettings.ColorPicker({
        name: "darkTextColor",
        displayName: "Texto escuro",
        value: { value: "#F4F7FF" }
    });

    mutedColor = new formattingSettings.ColorPicker({
        name: "mutedColor",
        displayName: "Texto secundario claro",
        value: { value: "#7D849C" }
    });

    darkMutedColor = new formattingSettings.ColorPicker({
        name: "darkMutedColor",
        displayName: "Texto secundario escuro",
        value: { value: "#AEB5CA" }
    });

    name: string = "theme";
    displayName: string = "Tema";
    slices: Array<FormattingSettingsSlice> = [
        this.themeSource,
        this.themeMode,
        this.backgroundColor,
        this.darkBackgroundColor,
        this.borderColor,
        this.darkBorderColor,
        this.textColor,
        this.darkTextColor,
        this.mutedColor,
        this.darkMutedColor
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

class HeaderSettings extends FormattingSettingsCard {
    showLogo = new formattingSettings.ToggleSwitch({
        name: "showLogo",
        displayName: "Mostrar logo",
        value: true
    });

    logoUrl = new formattingSettings.TextInput({
        name: "logoUrl",
        displayName: "URL da logo",
        value: "",
        placeholder: "https://..."
    });

    logoText = new formattingSettings.TextInput({
        name: "logoText",
        displayName: "Texto dentro da logo",
        value: "CL",
        placeholder: "CL"
    });

    logoFontFamily = new formattingSettings.TextInput({
        name: "logoFontFamily",
        displayName: "Fonte logo/marca",
        value: "Segoe UI",
        placeholder: "Segoe UI"
    });

    logoBackgroundColor = new formattingSettings.ColorPicker({
        name: "logoBackgroundColor",
        displayName: "Fundo da logo",
        value: { value: "#FFFFFF" }
    });

    logoTextColor = new formattingSettings.ColorPicker({
        name: "logoTextColor",
        displayName: "Cor texto logo",
        value: { value: "#6C4FF6" }
    });

    brandText = new formattingSettings.TextInput({
        name: "brandText",
        displayName: "Texto ao lado",
        value: "",
        placeholder: "Nome da empresa"
    });

    logoWidth = new formattingSettings.NumUpDown({
        name: "logoWidth",
        displayName: "Largura logo",
        value: 32
    });

    logoHeight = new formattingSettings.NumUpDown({
        name: "logoHeight",
        displayName: "Altura logo",
        value: 32
    });

    collapsedLogoUrl = new formattingSettings.TextInput({
        name: "collapsedLogoUrl",
        displayName: "URL logo recolhida",
        value: "",
        placeholder: "Vazio usa a logo principal"
    });

    collapsedLogoWidth = new formattingSettings.NumUpDown({
        name: "collapsedLogoWidth",
        displayName: "Largura recolhida",
        value: 28
    });

    collapsedLogoHeight = new formattingSettings.NumUpDown({
        name: "collapsedLogoHeight",
        displayName: "Altura recolhida",
        value: 28
    });

    logoRadius = new formattingSettings.NumUpDown({
        name: "logoRadius",
        displayName: "Arredondamento",
        value: 10
    });

    brandFontSize = new formattingSettings.NumUpDown({
        name: "brandFontSize",
        displayName: "Fonte texto ao lado",
        value: 13
    });

    brandGap = new formattingSettings.NumUpDown({
        name: "brandGap",
        displayName: "Distancia logo/texto",
        value: 8
    });

    headerBottomMargin = new formattingSettings.NumUpDown({
        name: "headerBottomMargin",
        displayName: "Margem inferior",
        value: 10
    });

    logoToButtonsGap = new formattingSettings.NumUpDown({
        name: "logoToButtonsGap",
        displayName: "Margem antes dos botoes",
        value: 16
    });

    name: string = "header";
    displayName: string = "Topo e logo";
    slices: Array<FormattingSettingsSlice> = [
        this.showLogo,
        this.logoUrl,
        this.logoText,
        this.logoFontFamily,
        this.logoBackgroundColor,
        this.logoTextColor,
        this.brandText,
        this.logoWidth,
        this.logoHeight,
        this.collapsedLogoUrl,
        this.collapsedLogoWidth,
        this.collapsedLogoHeight,
        this.logoRadius,
        this.brandFontSize,
        this.brandGap,
        this.headerBottomMargin,
        this.logoToButtonsGap
    ];
}

class UserSettings extends FormattingSettingsCard {
    showUser = new formattingSettings.ToggleSwitch({
        name: "showUser",
        displayName: "Mostrar usuario",
        value: false
    });

    userName = new formattingSettings.TextInput({
        name: "userName",
        displayName: "Nome",
        value: "Usuario",
        placeholder: "Usuario"
    });

    userSubtitle = new formattingSettings.TextInput({
        name: "userSubtitle",
        displayName: "Subtitulo",
        value: "Power BI",
        placeholder: "Cargo ou area"
    });

    userImageUrl = new formattingSettings.TextInput({
        name: "userImageUrl",
        displayName: "URL da foto",
        value: "",
        placeholder: "https://..."
    });

    userTopMargin = new formattingSettings.NumUpDown({
        name: "userTopMargin",
        displayName: "Margem superior",
        value: 10
    });

    userBottomMargin = new formattingSettings.NumUpDown({
        name: "userBottomMargin",
        displayName: "Margem inferior",
        value: 10
    });

    userWidth = new formattingSettings.NumUpDown({
        name: "userWidth",
        displayName: "Largura",
        value: 0
    });

    avatarSize = new formattingSettings.NumUpDown({
        name: "avatarSize",
        displayName: "Tamanho foto",
        value: 34
    });

    userNameFontSize = new formattingSettings.NumUpDown({
        name: "userNameFontSize",
        displayName: "Fonte nome",
        value: 13
    });

    userSubtitleFontSize = new formattingSettings.NumUpDown({
        name: "userSubtitleFontSize",
        displayName: "Fonte subtitulo",
        value: 11
    });

    name: string = "user";
    displayName: string = "Usuario";
    slices: Array<FormattingSettingsSlice> = [
        this.showUser,
        this.userName,
        this.userSubtitle,
        this.userImageUrl,
        this.userTopMargin,
        this.userBottomMargin,
        this.userWidth,
        this.avatarSize,
        this.userNameFontSize,
        this.userSubtitleFontSize
    ];
}

class SearchSettings extends FormattingSettingsCard {
    showSearch = new formattingSettings.ToggleSwitch({
        name: "showSearch",
        displayName: "Mostrar pesquisa",
        value: true
    });

    placeholder = new formattingSettings.TextInput({
        name: "placeholder",
        displayName: "Texto",
        value: "Pesquisar",
        placeholder: "Pesquisar"
    });

    height = new formattingSettings.NumUpDown({
        name: "height",
        displayName: "Altura",
        value: 34
    });

    topMargin = new formattingSettings.NumUpDown({
        name: "topMargin",
        displayName: "Margem superior",
        value: 0
    });

    bottomMargin = new formattingSettings.NumUpDown({
        name: "bottomMargin",
        displayName: "Margem inferior",
        value: 10
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo claro",
        value: { value: "#F5F6FB" }
    });

    darkBackgroundColor = new formattingSettings.ColorPicker({
        name: "darkBackgroundColor",
        displayName: "Fundo escuro",
        value: { value: "#222738" }
    });

    name: string = "search";
    displayName: string = "Pesquisa";
    slices: Array<FormattingSettingsSlice> = [
        this.showSearch,
        this.placeholder,
        this.height,
        this.topMargin,
        this.bottomMargin,
        this.backgroundColor,
        this.darkBackgroundColor
    ];
}

class ButtonStyleSettings extends FormattingSettingsCard {
    buttonHeight = new formattingSettings.NumUpDown({
        name: "buttonHeight",
        displayName: "Altura",
        value: 38
    });

    buttonGap = new formattingSettings.NumUpDown({
        name: "buttonGap",
        displayName: "Distancia entre botoes",
        value: 8
    });

    buttonRadius = new formattingSettings.NumUpDown({
        name: "buttonRadius",
        displayName: "Arredondamento",
        value: 8
    });

    iconSize = new formattingSettings.NumUpDown({
        name: "iconSize",
        displayName: "Tamanho do icone",
        value: 18
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho do texto",
        value: 12
    });

    textAlign = new formattingSettings.ItemDropdown({
        name: "textAlign",
        displayName: "Alinhamento",
        value: { value: "left", displayName: "Esquerda" },
        items: alignItems
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Fundo",
        value: { value: "transparent" }
    });

    hoverBackgroundColor = new formattingSettings.ColorPicker({
        name: "hoverBackgroundColor",
        displayName: "Fundo hover",
        value: { value: "#F1EEFF" }
    });

    activeBackgroundColor = new formattingSettings.ColorPicker({
        name: "activeBackgroundColor",
        displayName: "Fundo ativo",
        value: { value: "#6C4FF6" }
    });

    iconColor = new formattingSettings.ColorPicker({
        name: "iconColor",
        displayName: "Cor do icone",
        value: { value: "#2B3674" }
    });

    activeIconColor = new formattingSettings.ColorPicker({
        name: "activeIconColor",
        displayName: "Icone ativo",
        value: { value: "#FFFFFF" }
    });

    activeTextColor = new formattingSettings.ColorPicker({
        name: "activeTextColor",
        displayName: "Texto ativo",
        value: { value: "#FFFFFF" }
    });

    name: string = "buttonStyle";
    displayName: string = "Botoes";
    slices: Array<FormattingSettingsSlice> = [
        this.buttonHeight,
        this.buttonGap,
        this.buttonRadius,
        this.iconSize,
        this.fontSize,
        this.textAlign,
        this.backgroundColor,
        this.hoverBackgroundColor,
        this.activeBackgroundColor,
        this.iconColor,
        this.activeIconColor,
        this.activeTextColor
    ];
}

class ActiveStateSettings extends FormattingSettingsCard {
    activeMode = new formattingSettings.ItemDropdown({
        name: "activeMode",
        displayName: "Modo",
        value: { value: "manual", displayName: "Nome informado" },
        items: activeModeItems
    });

    activePageName = new formattingSettings.TextInput({
        name: "activePageName",
        displayName: "Nome da pagina atual",
        value: "",
        placeholder: "Igual ao nome da pagina"
    });

    exactMatch = new formattingSettings.ToggleSwitch({
        name: "exactMatch",
        displayName: "Nome exato",
        value: true
    });

    name: string = "activeState";
    displayName: string = "Destaque";
    slices: Array<FormattingSettingsSlice> = [
        this.activeMode,
        this.activePageName,
        this.exactMatch
    ];
}

class GroupStyleSettings extends FormattingSettingsCard {
    showGroups = new formattingSettings.ToggleSwitch({
        name: "showGroups",
        displayName: "Mostrar grupos",
        value: true
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Tamanho do texto",
        value: 10
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Cor do texto",
        value: { value: "#9097AD" }
    });

    lineColor = new formattingSettings.ColorPicker({
        name: "lineColor",
        displayName: "Cor da linha",
        value: { value: "#E8EBF5" }
    });

    topSpacing = new formattingSettings.NumUpDown({
        name: "topSpacing",
        displayName: "Espaco superior",
        value: 12
    });

    name: string = "groupStyle";
    displayName: string = "Grupos";
    slices: Array<FormattingSettingsSlice> = [
        this.showGroups,
        this.fontSize,
        this.textColor,
        this.lineColor,
        this.topSpacing
    ];
}

class FooterSettings extends FormattingSettingsCard {
    showFooterImage = new formattingSettings.ToggleSwitch({
        name: "showFooterImage",
        displayName: "Mostrar imagem",
        value: false
    });

    footerImageUrl = new formattingSettings.TextInput({
        name: "footerImageUrl",
        displayName: "URL da imagem",
        value: "",
        placeholder: "https://..."
    });

    footerImageHeight = new formattingSettings.NumUpDown({
        name: "footerImageHeight",
        displayName: "Altura",
        value: 86
    });

    footerTopMargin = new formattingSettings.NumUpDown({
        name: "footerTopMargin",
        displayName: "Margem superior",
        value: 10
    });

    name: string = "footer";
    displayName: string = "Rodape";
    slices: Array<FormattingSettingsSlice> = [
        this.showFooterImage,
        this.footerImageUrl,
        this.footerImageHeight,
        this.footerTopMargin
    ];
}

class InteractionSettings extends FormattingSettingsCard {
    allowCollapse = new formattingSettings.ToggleSwitch({
        name: "collapsible",
        displayName: "Permitir recolher",
        value: true
    });

    startCollapsed = new formattingSettings.ToggleSwitch({
        name: "startCollapsed",
        displayName: "Iniciar recolhido",
        value: false
    });

    useSelection = new formattingSettings.ToggleSwitch({
        name: "useSelection",
        displayName: "Selecionar no clique",
        value: true
    });

    clickAction = new formattingSettings.ItemDropdown({
        name: "clickAction",
        displayName: "Acao do clique",
        value: { value: "select", displayName: "Selecionar" },
        items: clickActionItems
    });

    reportBaseUrl = new formattingSettings.TextInput({
        name: "reportBaseUrl",
        displayName: "URL base relatorio",
        value: "",
        placeholder: "Cole a URL do relatorio ou de uma pagina"
    });

    urlCompletionMode = new formattingSettings.ItemDropdown({
        name: "urlCompletionMode",
        displayName: "Completar URL",
        value: { value: "rowUrl", displayName: "LinkDestino + URL base" },
        items: urlCompletionItems
    });

    name: string = "interaction";
    displayName: string = "Interacao";
    slices: Array<FormattingSettingsSlice> = [
        this.allowCollapse,
        this.startCollapsed,
        this.useSelection,
        this.clickAction,
        this.reportBaseUrl,
        this.urlCompletionMode
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutSettings();
    theme = new ThemeSettings();
    menuFilter = new MenuFilterSettings();
    header = new HeaderSettings();
    user = new UserSettings();
    search = new SearchSettings();
    buttonStyle = new ButtonStyleSettings();
    activeState = new ActiveStateSettings();
    groupStyle = new GroupStyleSettings();
    footer = new FooterSettings();
    interaction = new InteractionSettings();

    cards = [
        this.layout,
        this.theme,
        this.menuFilter,
        this.header,
        this.user,
        this.search,
        this.buttonStyle,
        this.activeState,
        this.groupStyle,
        this.footer,
        this.interaction
    ];
}

