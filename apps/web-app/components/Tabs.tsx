"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
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

export type TabsRootProps = ComponentProps<typeof BaseTabs.Root>;
export type TabsListProps = ComponentProps<typeof BaseTabs.List>;
export type TabsTabProps = ComponentProps<typeof BaseTabs.Tab>;
export type TabsIndicatorProps = ComponentProps<typeof BaseTabs.Indicator>;
export type TabsPanelProps = ComponentProps<typeof BaseTabs.Panel>;

function Root({ className, ...props }: TabsRootProps) {
	return (
		<BaseTabs.Root
			className={mergeClassName("flex min-h-0 flex-col", className)}
			{...props}
		/>
	);
}

function List({ className, ...props }: TabsListProps) {
	return (
		<BaseTabs.List
			className={mergeClassName(
				"relative flex flex-row items-center gap-1.5 overflow-x-auto",
				className,
			)}
			{...props}
		/>
	);
}

function Tab({ className, render, children, ...props }: TabsTabProps) {
	const resolvedClassName = mergeClassName(
		"group relative z-10 shrink-0 cursor-pointer overflow-visible p-1.5 px-3 text-xs text-grayscale-10 transition-colors duration-150 hover:text-grayscale-12 data-[active]:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-50",
		className,
	);

	if (render) {
		return (
			<BaseTabs.Tab
				className={resolvedClassName}
				render={render}
				{...props}
			>
				{children}
			</BaseTabs.Tab>
		);
	}

	return (
		<BaseTabs.Tab
			className={resolvedClassName}
			render={(tabProps, state) => (
				<button {...tabProps}>
					<CornerBrackets
						placement="inside"
						spacing={1}
						translate={1.5}
						size={1.5}
						color={
							state.active
								? "var(--color-accent-9)"
								: "var(--color-grayscale-9)"
						}
						active={state.active}
						className="z-10"
					/>
					<span className="relative z-10">{tabProps.children}</span>
				</button>
			)}
			{...props}
		>
			{children}
		</BaseTabs.Tab>
	);
}

function Indicator({ className, ...props }: TabsIndicatorProps) {
	return (
		<BaseTabs.Indicator
			className={mergeClassName(
				"absolute top-[var(--active-tab-top)] left-[var(--active-tab-left)] z-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)] bg-grayscale-3 transition-[top,left,width,height] duration-200 ease-out",
				className,
			)}
			{...props}
		/>
	);
}

function Panel({ className, ...props }: TabsPanelProps) {
	return (
		<BaseTabs.Panel
			className={mergeClassName("min-h-0 flex-1 outline-none", className)}
			{...props}
		/>
	);
}

export const Tabs = {
	Root,
	List,
	Tab,
	Indicator,
	Panel,
};
