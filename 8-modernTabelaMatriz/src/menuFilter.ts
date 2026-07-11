"use strict";

import powerbi from "powerbi-visuals-api";

import DataViewMatrixNode = powerbi.DataViewMatrixNode;
import DataViewMatrixNodeValue = powerbi.DataViewMatrixNodeValue;
import PrimitiveValue = powerbi.PrimitiveValue;

export interface MenuFilterState {
    enabled: boolean;
    menuName: string;
}

export function shouldShowVisualForMenu(dataView: powerbi.DataView | undefined, state: MenuFilterState): boolean {
    if (!state.enabled) {
        return true;
    }

    const expectedMenu = normalizeMenuValue(state.menuName);

    if (!expectedMenu) {
        return true;
    }

    const menuValues = collectMenuValues(dataView);

    if (menuValues.length === 0) {
        return false;
    }

    return menuValues.some((value) => menuValueMatches(value, expectedMenu));
}

export function hideVisualElement(root: HTMLElement): void {
    const host = root.parentElement as HTMLElement | null;
    root.style.display = "none";
    root.style.opacity = "0";
    root.style.visibility = "hidden";
    root.style.pointerEvents = "none";

    if (host) {
        host.style.background = "transparent";
        host.style.border = "0";
        host.style.boxShadow = "none";
        host.style.pointerEvents = "none";
    }
}

export function showVisualElement(root: HTMLElement): void {
    const host = root.parentElement as HTMLElement | null;
    root.style.display = "";
    root.style.opacity = "";
    root.style.visibility = "";
    root.style.pointerEvents = "";

    if (host) {
        host.style.background = "";
        host.style.border = "";
        host.style.boxShadow = "";
        host.style.pointerEvents = "";
    }
}

function collectMenuValues(dataView: powerbi.DataView | undefined): PrimitiveValue[] {
    const values: PrimitiveValue[] = [];
    const table = dataView?.table;

    if (table?.columns && table.rows) {
        const indexes = table.columns
            .map((column, index) => ({ column, index }))
            .filter((columnInfo) => Boolean(columnInfo.column.roles && columnInfo.column.roles.menu))
            .map((columnInfo) => columnInfo.index);

        table.rows.forEach((row) => {
            indexes.forEach((index) => values.push(row[index]));
        });
    }

    dataView?.categorical?.categories?.forEach((category) => {
        if (category.source.roles && category.source.roles.menu) {
            category.values.forEach((value) => values.push(value));
        }
    });

    dataView?.categorical?.values?.forEach((column) => {
        if (column.source.roles && column.source.roles.menu) {
            column.values.forEach((value) => values.push(value));
        }
    });

    const matrix = dataView?.matrix;

    if (matrix?.valueSources && matrix.rows?.root) {
        const menuIndexes = matrix.valueSources
            .map((source, index) => ({ source, index }))
            .filter((sourceInfo) => Boolean(sourceInfo.source.roles && sourceInfo.source.roles.menu))
            .map((sourceInfo) => sourceInfo.index);

        if (menuIndexes.length > 0) {
            collectMatrixNodeMenuValues(matrix.rows.root, menuIndexes, values);
        }
    }

    return values;
}

function collectMatrixNodeMenuValues(
    node: DataViewMatrixNode,
    menuIndexes: number[],
    values: PrimitiveValue[]
): void {
    if (node.values) {
        Object.keys(node.values).forEach((key) => {
            const keyIndex = Number(key);
            const valueNode: DataViewMatrixNodeValue | undefined = node.values?.[keyIndex];
            const valueSourceIndex = valueNode?.valueSourceIndex ?? keyIndex;

            if (valueNode && menuIndexes.includes(valueSourceIndex)) {
                values.push(valueNode.value);
            }
        });
    }

    node.children?.forEach((child) => collectMatrixNodeMenuValues(child, menuIndexes, values));
}

function menuValueMatches(value: PrimitiveValue, expectedMenu: string): boolean {
    const rawValue = formatPrimitive(value);
    const normalizedValue = normalizeMenuValue(rawValue);

    if (!normalizedValue) {
        return false;
    }

    if (normalizedValue === expectedMenu) {
        return true;
    }

    return rawValue
        .split(/[|;,\n\r]+/)
        .some((menuName) => normalizeMenuValue(menuName) === expectedMenu);
}

function formatPrimitive(value: PrimitiveValue): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (value instanceof Date) {
        return value.toLocaleDateString();
    }

    return String(value);
}

function normalizeMenuValue(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
