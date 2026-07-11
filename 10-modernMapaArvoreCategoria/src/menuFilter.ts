"use strict";

import powerbi from "powerbi-visuals-api";

import DataView = powerbi.DataView;
import PrimitiveValue = powerbi.PrimitiveValue;

export interface MenuFilterOptions {
    enabled: boolean;
    menuName: string;
}

export function shouldShowVisualForMenu(dataView: DataView | undefined, options: MenuFilterOptions): boolean {
    if (!options.enabled) {
        return true;
    }

    const menuName = normalizeMenuText(options.menuName);

    if (!menuName) {
        return true;
    }

    const visibleMenus = collectMenuValues(dataView);

    if (visibleMenus.length === 0) {
        return false;
    }

    return visibleMenus.some((value) => normalizeMenuText(value) === menuName);
}

export function hideVisualElement(element: HTMLElement): void {
    element.style.display = "none";
    element.style.opacity = "0";
    element.style.pointerEvents = "none";
}

export function showVisualElement(element: HTMLElement): void {
    element.style.display = "";
    element.style.opacity = "";
    element.style.pointerEvents = "";
}

function collectMenuValues(dataView: DataView | undefined): string[] {
    const values: string[] = [];

    if (!dataView) {
        return values;
    }

    const table = dataView.table;

    if (table) {
        const menuIndexes = table.columns
            .map((column, index) => ({ column, index }))
            .filter((columnInfo) => Boolean(columnInfo.column.roles && columnInfo.column.roles.menu))
            .map((columnInfo) => columnInfo.index);

        table.rows.forEach((row) => {
            menuIndexes.forEach((index) => pushMenuValue(values, row[index]));
        });
    }

    const categorical = dataView.categorical;

    if (categorical) {
        categorical.categories?.forEach((category) => {
            if (category.source.roles?.menu) {
                category.values.forEach((value) => pushMenuValue(values, value));
            }
        });

        categorical.values?.forEach((column) => {
            if (column.source.roles?.menu) {
                column.values.forEach((value) => pushMenuValue(values, value));
            }
        });
    }

    return values;
}

function pushMenuValue(values: string[], value: PrimitiveValue): void {
    if (value === null || value === undefined) {
        return;
    }

    const text = value instanceof Date ? value.toLocaleDateString() : String(value);
    text.split(/[|,;\n\r]+/g)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => values.push(item));
}

function normalizeMenuText(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
