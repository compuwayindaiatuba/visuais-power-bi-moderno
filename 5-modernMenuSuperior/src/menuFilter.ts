"use strict";

import powerbi from "powerbi-visuals-api";

import PrimitiveValue = powerbi.PrimitiveValue;

export interface MenuFilterState {
    enabled: boolean;
    menuName: string;
}

export function shouldShowVisualForMenu(
    dataView: powerbi.DataView | undefined,
    state: MenuFilterState,
    roleName: string = "menu"
): boolean {
    if (!state.enabled) {
        return true;
    }

    const expectedMenu = normalizeMenuValue(state.menuName);

    if (!expectedMenu) {
        return true;
    }

    const menuValues = collectMenuValues(dataView, roleName);

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

function collectMenuValues(dataView: powerbi.DataView | undefined, roleName: string): PrimitiveValue[] {
    const values: PrimitiveValue[] = [];
    const table = dataView?.table;

    if (table?.columns && table.rows) {
        const indexes = table.columns
            .map((column, index) => ({ column, index }))
            .filter((columnInfo) => hasRole(columnInfo.column.roles, roleName))
            .map((columnInfo) => columnInfo.index);

        table.rows.forEach((row) => {
            indexes.forEach((index) => values.push(row[index]));
        });
    }

    dataView?.categorical?.categories?.forEach((category) => {
        if (hasRole(category.source.roles, roleName)) {
            category.values.forEach((value) => values.push(value));
        }
    });

    dataView?.categorical?.values?.forEach((column) => {
        if (hasRole(column.source.roles, roleName)) {
            column.values.forEach((value) => values.push(value));
        }
    });

    return values;
}

function hasRole(roles: { [name: string]: boolean } | undefined, roleName: string): boolean {
    return Boolean(roles && roles[roleName]);
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
