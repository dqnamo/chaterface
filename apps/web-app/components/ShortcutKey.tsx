"use client";

import type { ComponentProps } from "react";
import { cn } from "@/helpers/classname-helper";

type ShortcutKeyProps = ComponentProps<"kbd">;

export function ShortcutKey({
	className,
	children,
	...props
}: ShortcutKeyProps) {
	return (
		<kbd
			className={cn(
				"hidden h-5 min-w-5 shrink-0 items-center justify-center rounded-[3px] border border-grayscale-6 bg-grayscale-2 px-1.5 font-mono text-[11px] font-medium leading-none text-grayscale-11 uppercase shadow-[inset_0_-1px_0_var(--color-grayscale-6)] sm:inline-flex",
				className,
			)}
			{...props}
		>
			{children}
		</kbd>
	);
}
