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
	"group relative flex min-w-0 flex-row items-center justify-center gap-4 overflow-visible bg-black p-2 pr-2 pl-3 transition-transform duration-150 hover:scale-96";

const variantClassName: Record<ButtonVariant, string> = {
	primary: "",
};

export type ButtonProps = ComponentProps<typeof BaseButton> & {
	shortcut?: string;
	variant?: ButtonVariant;
};

export function Button({
	variant = "primary",
	className,
	children,
	shortcut,
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
				spacing={4}
				translate={6}
				color="black"
			/>
			<span className="min-w-0 truncate text-sm text-grayscale-2 transition-colors group-hover:text-grayscale-1">
				{children}
			</span>
			{shortcut ? (
				<span className="flex aspect-square size-5 shrink-0 items-center justify-center bg-grayscale-11/50 font-mono text-xs leading-none text-grayscale-8 uppercase">
					{shortcut}
				</span>
			) : null}
		</BaseButton>
	);
}
