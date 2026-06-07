import type { CSSProperties } from "react";
import {
	resolveColorInput,
	resolveHoverColorInput,
} from "@/helpers/corner-color-helper";
import {
	getCornerLayouts,
	getCornerSizeStyle,
	type Placement,
} from "@/helpers/corner-layout-helper";

type CornerCubesProps = {
	size?: number;
	spacing?: number;
	translate?: number;
	color?: string;
	hoverColor?: string;
	placement?: Placement;
	duration?: number;
	enterDuration?: number;
	exitDuration?: number;
	active?: boolean;
	className?: string;
};

export default function CornerCubes({
	size = 8,
	spacing,
	translate,
	color = "grayscale-4",
	hoverColor,
	placement = "outside",
	duration,
	enterDuration = duration ?? 300,
	exitDuration = 100,
	active = false,
	className = "",
}: CornerCubesProps) {
	const resolvedSpacing = spacing ?? (placement === "outside" ? 4 : 1.5);
	const resolvedTranslate = translate ?? (placement === "outside" ? 6 : 1);

	const corners = getCornerLayouts({
		placement,
		spacing: resolvedSpacing,
		translate: resolvedTranslate,
	});

	const { className: colorClassName, style: colorStyle } = resolveColorInput(
		color,
		"background",
	);
	const { className: hoverColorClassName, style: hoverColorStyle } = hoverColor
		? resolveHoverColorInput(hoverColor, "background")
		: { className: "", style: {} };

	const easingClass = placement === "outside" ? "ease-out" : "";

	return (
		<>
			{corners.map((corner) => (
				<div
					key={corner.key}
					className={[
						"absolute transition-all",
						active
							? "opacity-100 translate-x-0 translate-y-0"
							: "opacity-0 translate-x-[var(--corner-tx)] translate-y-[var(--corner-ty)] group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:[transition-duration:var(--corner-enter-duration)]",
						easingClass,
						colorClassName,
						hoverColorClassName,
						className,
					]
						.filter(Boolean)
						.join(" ")}
					style={
						{
							...corner.position,
							...getCornerSizeStyle(size),
							...colorStyle,
							...hoverColorStyle,
							...(!active && {
								"--corner-tx": corner.translateX,
								"--corner-ty": corner.translateY,
							}),
							"--corner-enter-duration": `${enterDuration}ms`,
							"--corner-exit-duration": `${exitDuration}ms`,
							transitionDuration: "var(--corner-exit-duration)",
						} as CSSProperties
					}
				/>
			))}
		</>
	);
}
