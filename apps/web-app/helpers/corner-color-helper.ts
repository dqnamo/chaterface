import type { CSSProperties } from "react";

type ColorProperty = "border" | "background";

const NAMED_COLORS: Record<string, string> = {
	black: "#000000",
	white: "#ffffff",
	transparent: "transparent",
};

function isRawColor(color: string): boolean {
	return (
		color.startsWith("#") ||
		color.startsWith("rgb") ||
		color.startsWith("hsl") ||
		color.startsWith("var(") ||
		color in NAMED_COLORS
	);
}

function isColorClass(color: string, property: ColorProperty): boolean {
	const prefix = property === "border" ? "border" : "bg";
	return (
		color.startsWith(`${prefix}-`) || color.startsWith(`group-hover:${prefix}-`)
	);
}

function resolveColorValue(color: string): string {
	const namedColor = NAMED_COLORS[color];

	if (namedColor) {
		return namedColor;
	}

	if (isRawColor(color)) {
		return color;
	}

	return `var(--color-${color})`;
}

export function resolveColorInput(
	color: string,
	property: ColorProperty,
): { className: string; style: CSSProperties } {
	if (isColorClass(color, property)) {
		return { className: color, style: {} };
	}

	const cssVar =
		property === "border"
			? "--corner-border-color"
			: "--corner-background-color";
	const value = resolveColorValue(color);

	return {
		className: "",
		style: {
			[cssVar]: value,
			...(property === "border"
				? { borderColor: `var(${cssVar})` }
				: { backgroundColor: `var(${cssVar})` }),
		},
	};
}

export function resolveHoverColorInput(
	hoverColor: string,
	property: ColorProperty,
): { className: string; style: CSSProperties } {
	const prefix = property === "border" ? "border" : "bg";

	if (hoverColor.startsWith("group-hover:")) {
		return { className: hoverColor, style: {} };
	}

	if (hoverColor.startsWith(`${prefix}-`)) {
		return { className: `group-hover:${hoverColor}`, style: {} };
	}

	const cssVar =
		property === "border"
			? "--corner-hover-border-color"
			: "--corner-hover-background-color";
	const value = resolveColorValue(hoverColor);

	return {
		className:
			property === "border"
				? "group-hover:[border-color:var(--corner-hover-border-color)]"
				: "group-hover:[background-color:var(--corner-hover-background-color)]",
		style: { [cssVar]: value },
	};
}
