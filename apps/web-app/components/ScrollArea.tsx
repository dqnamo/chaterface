"use client";

import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { type ComponentProps, forwardRef } from "react";
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

export type ScrollAreaRootProps = ComponentProps<typeof BaseScrollArea.Root>;
export type ScrollAreaViewportProps = ComponentProps<
	typeof BaseScrollArea.Viewport
>;
export type ScrollAreaContentProps = ComponentProps<
	typeof BaseScrollArea.Content
>;
export type ScrollAreaScrollbarProps = ComponentProps<
	typeof BaseScrollArea.Scrollbar
>;
export type ScrollAreaThumbProps = ComponentProps<typeof BaseScrollArea.Thumb>;
export type ScrollAreaCornerProps = ComponentProps<
	typeof BaseScrollArea.Corner
>;

function Root({
	className,
	overflowEdgeThreshold = 16,
	...props
}: ScrollAreaRootProps) {
	return (
		<BaseScrollArea.Root
			className={mergeClassName("relative min-h-0 overflow-hidden", className)}
			overflowEdgeThreshold={overflowEdgeThreshold}
			{...props}
		/>
	);
}

const Viewport = forwardRef<HTMLDivElement, ScrollAreaViewportProps>(
	({ className, ...props }, ref) => (
		<BaseScrollArea.Viewport
			ref={ref}
			className={mergeClassName(
				"h-full w-full min-w-0 overflow-x-hidden overscroll-contain outline-none",
				className,
			)}
			{...props}
		/>
	),
);
Viewport.displayName = "ScrollAreaViewport";

function Content({ className, style, ...props }: ScrollAreaContentProps) {
	return (
		<BaseScrollArea.Content
			className={mergeClassName("min-w-0", className)}
			style={{ minWidth: 0, maxWidth: "100%", ...style }}
			{...props}
		/>
	);
}

function Scrollbar({ className, ...props }: ScrollAreaScrollbarProps) {
	return (
		<BaseScrollArea.Scrollbar
			className={mergeClassName(
				"z-20 flex touch-none select-none p-1 opacity-0 transition-opacity duration-150 data-[hovering]:opacity-100 data-[scrolling]:opacity-100 data-[orientation=horizontal]:h-3 data-[orientation=vertical]:w-3",
				className,
			)}
			{...props}
		/>
	);
}

function Thumb({ className, ...props }: ScrollAreaThumbProps) {
	return (
		<BaseScrollArea.Thumb
			className={mergeClassName(
				"bg-grayscale-4 transition-colors duration-150 hover:bg-grayscale-10 data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
				className,
			)}
			{...props}
		/>
	);
}

function Corner({ className, ...props }: ScrollAreaCornerProps) {
	return (
		<BaseScrollArea.Corner
			className={mergeClassName("bg-transparent", className)}
			{...props}
		/>
	);
}

export const ScrollArea = {
	Root,
	Viewport,
	Content,
	Scrollbar,
	Thumb,
	Corner,
};
