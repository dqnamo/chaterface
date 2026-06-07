import type { CSSProperties } from "react";

export type Placement = "inside" | "outside";

export type CornerKey = "tl" | "br" | "bl" | "tr";

export type CornerLayout = {
	key: CornerKey;
	position: CSSProperties;
	translateX: string;
	translateY: string;
};

const CORNER_KEYS: CornerKey[] = ["tl", "br", "bl", "tr"];

const CORNER_DIRECTIONS: Record<
	CornerKey,
	{
		xProperty: "left" | "right";
		yProperty: "top" | "bottom";
		outsideTranslateX: 1 | -1;
		outsideTranslateY: 1 | -1;
	}
> = {
	tl: {
		xProperty: "left",
		yProperty: "top",
		outsideTranslateX: -1,
		outsideTranslateY: -1,
	},
	br: {
		xProperty: "right",
		yProperty: "bottom",
		outsideTranslateX: 1,
		outsideTranslateY: 1,
	},
	bl: {
		xProperty: "left",
		yProperty: "bottom",
		outsideTranslateX: -1,
		outsideTranslateY: 1,
	},
	tr: {
		xProperty: "right",
		yProperty: "top",
		outsideTranslateX: 1,
		outsideTranslateY: -1,
	},
};

function offset(units: number): string {
	return `${units}px`;
}

function signedOffset(units: number, sign: 1 | -1): string {
	const value = offset(units);
	return sign === -1 ? `calc(-1 * ${value})` : value;
}

export function getCornerLayouts({
	placement,
	spacing,
	translate,
}: {
	placement: Placement;
	spacing: number;
	translate: number;
}): CornerLayout[] {
	return CORNER_KEYS.map((corner) => {
		const direction = CORNER_DIRECTIONS[corner];
		const positionSign = placement === "outside" ? -1 : 1;
		const translateXSign =
			placement === "outside"
				? direction.outsideTranslateX
				: ((direction.outsideTranslateX * -1) as 1 | -1);
		const translateYSign =
			placement === "outside"
				? direction.outsideTranslateY
				: ((direction.outsideTranslateY * -1) as 1 | -1);
		const position: CSSProperties = {};

		position[direction.xProperty] = signedOffset(spacing, positionSign);
		position[direction.yProperty] = signedOffset(spacing, positionSign);

		return {
			key: corner,
			position,
			translateX: signedOffset(translate, translateXSign),
			translateY: signedOffset(translate, translateYSign),
		};
	});
}

export function getCornerSizeStyle(size: number): CSSProperties {
	const dimension = offset(size);
	return { width: dimension, height: dimension };
}
