"use client";

import type { ComponentProps } from "react";
import { cn } from "@/helpers/classname-helper";

type ShortcutKeyTone = "neutral" | "accent" | "green" | "blue";

type ShortcutKeyProps = ComponentProps<"kbd"> & {
	tone?: ShortcutKeyTone;
};

const toneClassName: Record<ShortcutKeyTone, string> = {
	neutral:
		"border-grayscale-4 bg-grayscale-2 hover:bg-grayscale-3 group-hover:bg-grayscale-3",
	accent:
		"border-accent-7 bg-accent-5 hover:bg-accent-8 group-hover:bg-accent-8",
	green: "border-green-7 bg-green-5 hover:bg-green-8 group-hover:bg-green-8",
	blue: "border-blue-7 bg-blue-5 hover:bg-blue-8 group-hover:bg-blue-8",
};

export function ShortcutKey({
	className,
	children,
	tone = "neutral",
	...props
}: ShortcutKeyProps) {
	return (
		<kbd
			className={cn(
				"hidden min-h-5 min-w-5 shrink-0 items-center justify-center rounded border px-1.5 py-1 font-mono text-[11px] font-medium leading-none text-grayscale-11 uppercase transition-colors hover:text-grayscale-12 group-hover:text-grayscale-12 sm:inline-flex",
				toneClassName[tone],
				className,
			)}
			{...props}
		>
			{children}
		</kbd>
	);
}
