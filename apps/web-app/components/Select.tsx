"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
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

export type SelectRootProps<
	Value,
	Multiple extends boolean | undefined = false,
> = ComponentProps<typeof BaseSelect.Root<Value, Multiple>>;
export type SelectTriggerProps = ComponentProps<typeof BaseSelect.Trigger>;
export type SelectValueProps = ComponentProps<typeof BaseSelect.Value>;
export type SelectIconProps = ComponentProps<typeof BaseSelect.Icon>;
export type SelectPortalProps = ComponentProps<typeof BaseSelect.Portal>;
export type SelectPositionerProps = ComponentProps<
	typeof BaseSelect.Positioner
>;
export type SelectPopupProps = ComponentProps<typeof BaseSelect.Popup>;
export type SelectListProps = ComponentProps<typeof BaseSelect.List>;
export type SelectItemProps = ComponentProps<typeof BaseSelect.Item>;
export type SelectItemTextProps = ComponentProps<typeof BaseSelect.ItemText>;
export type SelectItemIndicatorProps = ComponentProps<
	typeof BaseSelect.ItemIndicator
>;
export type SelectGroupProps = ComponentProps<typeof BaseSelect.Group>;
export type SelectGroupLabelProps = ComponentProps<
	typeof BaseSelect.GroupLabel
>;
export type SelectSeparatorProps = ComponentProps<typeof BaseSelect.Separator>;

const Root = BaseSelect.Root;
const Portal = BaseSelect.Portal;
const Value = BaseSelect.Value;
const List = BaseSelect.List;
const Group = BaseSelect.Group;

function Trigger({ className, children, ...props }: SelectTriggerProps) {
	return (
		<BaseSelect.Trigger
			className={mergeClassName(
				"group relative flex flex-row items-center justify-between gap-2 rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 text-xs text-grayscale-11 outline-none transition-colors duration-150 hover:border-grayscale-7 hover:bg-grayscale-2 hover:text-grayscale-12 data-[popup-open]:border-grayscale-8 data-[popup-open]:text-grayscale-12 data-[placeholder]:text-grayscale-10",
				className,
			)}
			{...props}
		>
			{children}
		</BaseSelect.Trigger>
	);
}

function Icon({ className, children, ...props }: SelectIconProps) {
	return (
		<BaseSelect.Icon
			className={mergeClassName(
				"flex items-center justify-center text-grayscale-9 transition-transform duration-150",
				className,
			)}
			{...props}
		>
			{children ?? <CaretUpDownIcon size={12} weight="bold" />}
		</BaseSelect.Icon>
	);
}

function Positioner({
	className,
	sideOffset,
	...props
}: SelectPositionerProps) {
	return (
		<BaseSelect.Positioner
			className={mergeClassName("z-50 outline-none", className)}
			alignItemWithTrigger={false}
			sideOffset={sideOffset ?? 6}
			{...props}
		/>
	);
}

function Popup({ className, children, ...props }: SelectPopupProps) {
	return (
		<BaseSelect.Popup
			className={mergeClassName(
				"relative flex max-h-[var(--available-height)] min-w-[var(--anchor-width)] flex-col rounded-md border border-grayscale-4 bg-grayscale-1 py-1 outline-none transition-all duration-150 data-[ending-style]:scale-98 data-[starting-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
				className,
			)}
			{...props}
		>
			{children}
		</BaseSelect.Popup>
	);
}

function Item({ className, children, ...props }: SelectItemProps) {
	return (
		<BaseSelect.Item
			className={mergeClassName(
				"group relative mx-1 flex cursor-default flex-row items-center gap-2 rounded px-2 py-1.5 text-xs text-grayscale-11 outline-none select-none transition-colors duration-100 data-[highlighted]:bg-grayscale-2 data-[highlighted]:text-grayscale-12 data-[selected]:bg-grayscale-2 data-[selected]:text-grayscale-12",
				className,
			)}
			{...props}
		>
			{children}
		</BaseSelect.Item>
	);
}

function ItemText({ className, ...props }: SelectItemTextProps) {
	return <BaseSelect.ItemText className={cn(className)} {...props} />;
}

function ItemIndicator({ className, ...props }: SelectItemIndicatorProps) {
	return (
		<BaseSelect.ItemIndicator
			className={mergeClassName(
				"pointer-events-none absolute inset-y-1 left-1 w-0.5 rounded-full bg-accent-9",
				className,
			)}
			{...props}
		/>
	);
}

function GroupLabel({ className, ...props }: SelectGroupLabelProps) {
	return (
		<BaseSelect.GroupLabel
			className={mergeClassName(
				"px-2 py-1 text-xs font-medium text-grayscale-10",
				className,
			)}
			{...props}
		/>
	);
}

function Separator({ className, ...props }: SelectSeparatorProps) {
	return (
		<BaseSelect.Separator
			className={mergeClassName("my-1 h-px bg-grayscale-4", className)}
			{...props}
		/>
	);
}

export const Select = {
	Root,
	Trigger,
	Value,
	Icon,
	Portal,
	Positioner,
	Popup,
	List,
	Item,
	ItemText,
	ItemIndicator,
	Group,
	GroupLabel,
	Separator,
};
