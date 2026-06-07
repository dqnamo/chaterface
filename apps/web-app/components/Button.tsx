"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import CornerBrackets from "@/components/CornerBrackets";
import { cn } from "@/helpers/classname-helper";

type ClassName<TState> = string | ((state: TState) => string | undefined);

const mergeClassName = <TState,>(
	defaultClassName: string,
	className?: ClassName<TState>,
) => {
	if (typeof className === "function") {
		return (state: TState) => cn(defaultClassName, className(state));
	}

	return cn(defaultClassName, className);
};

export type ButtonVariant = "primary";

const baseClassName =
	"group relative flex flex-row items-center justify-center gap-2 overflow-visible px-3 py-1.5 text-xs font-medium transition-transform duration-150 hover:scale-96";

const variantClassName: Record<ButtonVariant, string> = {
	primary: "bg-grayscale-12 text-grayscale-1",
};

export type ButtonProps = ComponentProps<typeof BaseButton> & {
	variant?: ButtonVariant;
};

export function Button({
	variant = "primary",
	className,
	children,
	...props
}: ButtonProps) {
	return (
		<BaseButton
			className={mergeClassName(
				cn(baseClassName, variantClassName[variant]),
				className,
			)}
			{...props}
		>
			<CornerBrackets
				placement="outside"
				spacing={1}
				translate={1.5}
				size={1.5}
				color="grayscale-12"
			/>
			{children}
		</BaseButton>
	);
}
