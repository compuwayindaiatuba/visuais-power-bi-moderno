# Visuais Power BI Moderno

Pacote de visuais personalizados Power BI da Compuway.

## Visuais

- `1-modernCalendarioFiltro`
- `2-modernCartaoComLinha`
- `3-modernTabela`
- `4-modernRanking`
- `5-modernMenuSuperior`
- `6-modernGraficoVertical`
- `7-modernGraficoHorizontal`
- `8-modernTabelaMatriz`
- `9-modernSegmentacao`
- `10-modernMapaArvoreCategoria`
- `11-modernMapaArvore`
- `12-modernFunil`
- `13-modernGraficoPizza`
- `14-modernGraficoArea`
- `15-modernMenuSide`

## Pacotes

Cada projeto possui o pacote final em `dist/*.pbiviz`, gerado na versao `1.0.0.0`.

## Validacao

Todos os visuais foram validados com:

```powershell
npm run lint
npm run package
```

## Observacoes

- Os projetos preservam `apiVersion` `5.3.0`.
- O ultimo campo de cada visual e o campo `Menu`, usado para ocultar o visual por medida quando configurado.
- No `modernMenuSuperior`, o campo principal `Menu` e a coluna dos botoes; a medida de ocultacao fica como `Menu invisivel`.
