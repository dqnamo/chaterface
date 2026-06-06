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

function outsideOffset(units: number): string {
	return `${units * 0.25}rem`;
}

function insideOffset(units: number): string {
	return `${units}px`;
}

function getOffset(placement: Placement, units: number): string {
	return placement === "outside" ? outsideOffset(units) : insideOffset(units);
}

function signedOffset(
	placement: Placement,
	units: number,
	sign: 1 | -1,
): string {
	const offset = getOffset(placement, units);
	return sign === -1 ? `calc(-1 * ${offset})` : offset;
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

		position[direction.xProperty] = signedOffset(
			placement,
			spacing,
			positionSign,
		);
		position[direction.yProperty] = signedOffset(
			placement,
			spacing,
			positionSign,
		);

		return {
			key: corner,
			position,
			translateX: signedOffset(placement, translate, translateXSign),
			translateY: signedOffset(placement, translate, translateYSign),
		};
	});
}

export function getCornerSizeStyle(size: number): CSSProperties {
	const dimension = outsideOffset(size);
	return { width: dimension, height: dimension };
}
