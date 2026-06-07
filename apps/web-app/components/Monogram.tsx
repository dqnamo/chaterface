"use client";

import { monogramColors } from "@/helpers/colors-helper";
import { cn } from "@/helpers/classname-helper";

function hashSeed(seed: string): number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

export default function Monogram({
	className,
	seed,
	letters = 2,
}: {
	className?: string;
	seed?: string;
	letters?: number;
}) {
	const color =
		monogramColors[hashSeed(seed ?? "") % monogramColors.length];
	return (
		<div
			className={cn("size-10 flex items-center justify-center", className)}
			style={{ backgroundColor: `var(--${color}-9)` }}
		>
      <p className="text-sm font-medium" style={{ color: `var(--${color}-1)` }}>{seed?.substring(0, letters).toUpperCase()}</p>
    </div>
	);
}
