"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { ShortcutKey } from "@/components/ShortcutKey";
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

export type ButtonVariant = "primary" | "secondary";

const baseClassName =
	"group relative flex h-8 min-w-0 flex-row items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:shrink-0";

const variantClassName: Record<ButtonVariant, string> = {
	primary:
		"border-grayscale-12 bg-grayscale-12 text-grayscale-1 hover:bg-grayscale-11 hover:border-grayscale-11",
	secondary:
		"border-grayscale-6 bg-grayscale-1 text-grayscale-12 hover:bg-grayscale-2 hover:border-grayscale-7",
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
			{children}
			{shortcut ? <ShortcutKey>{shortcut}</ShortcutKey> : null}
		</BaseButton>
	);
}
