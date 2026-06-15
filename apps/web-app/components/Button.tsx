"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { type ComponentProps, isValidElement, type ReactNode } from "react";
import { ShortcutKey, type ShortcutKeyTone } from "@/components/ShortcutKey";
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
		"border-grayscale-4 bg-grayscale-1 text-grayscale-12 hover:bg-grayscale-2 hover:border-grayscale-5",
};

export type ButtonProps = ComponentProps<typeof BaseButton> & {
	shortcut?: ReactNode;
	shortcutClassName?: string;
	shortcutTone?: ShortcutKeyTone;
	variant?: ButtonVariant;
};

export function Button({
	variant = "primary",
	className,
	children,
	shortcut,
	shortcutClassName,
	shortcutTone,
	...props
}: ButtonProps) {
	const shortcutBadge = isValidElement(shortcut) ? (
		shortcut
	) : shortcut ? (
		<ShortcutKey
			tone={shortcutTone}
			className={cn(
				variant === "primary"
					? "border-grayscale-11 bg-grayscale-11 text-grayscale-1 hover:bg-grayscale-11 hover:text-grayscale-1 group-hover:bg-grayscale-11 group-hover:text-grayscale-1"
					: "",
				shortcutClassName,
			)}
		>
			{shortcut}
		</ShortcutKey>
	) : null;

	return (
		<BaseButton
			className={mergeClassName(
				cn(
					baseClassName,
					variantClassName[variant],
					shortcutBadge ? "pr-1.5" : "",
				),
				className,
			)}
			{...props}
		>
			{children}
			{shortcutBadge}
		</BaseButton>
	);
}
