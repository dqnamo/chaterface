"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { CaretRightIcon, CaretUpDownIcon } from "@phosphor-icons/react";
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

export type MenuRootProps = ComponentProps<typeof BaseMenu.Root>;
export type MenuTriggerProps = ComponentProps<typeof BaseMenu.Trigger>;
export type MenuPortalProps = ComponentProps<typeof BaseMenu.Portal>;
export type MenuPositionerProps = ComponentProps<typeof BaseMenu.Positioner>;
export type MenuPopupProps = ComponentProps<typeof BaseMenu.Popup>;
export type MenuItemProps = ComponentProps<typeof BaseMenu.Item>;
export type MenuGroupProps = ComponentProps<typeof BaseMenu.Group>;
export type MenuGroupLabelProps = ComponentProps<typeof BaseMenu.GroupLabel>;
export type MenuSeparatorProps = ComponentProps<typeof BaseMenu.Separator>;
export type MenuSubmenuRootProps = ComponentProps<typeof BaseMenu.SubmenuRoot>;
export type MenuSubmenuTriggerProps = ComponentProps<
	typeof BaseMenu.SubmenuTrigger
>;
export type MenuRadioGroupProps = ComponentProps<typeof BaseMenu.RadioGroup>;
export type MenuRadioItemProps = ComponentProps<typeof BaseMenu.RadioItem>;
export type MenuRadioItemIndicatorProps = ComponentProps<
	typeof BaseMenu.RadioItemIndicator
>;

const Root = BaseMenu.Root;
const Portal = BaseMenu.Portal;
const Group = BaseMenu.Group;
const SubmenuRoot = BaseMenu.SubmenuRoot;
const RadioGroup = BaseMenu.RadioGroup;

function Trigger({ className, ...props }: MenuTriggerProps) {
	return (
		<BaseMenu.Trigger
			className={mergeClassName(
				"group relative flex flex-row items-center justify-between gap-2 overflow-visible border border-grayscale-4 bg-white px-2 py-1.5 text-xs text-grayscale-11 outline-none transition-colors duration-150 hover:text-grayscale-12 data-[popup-open]:text-grayscale-12",
				className,
			)}
			{...props}
		>
			<CornerBrackets
				placement="outside"
				spacing={1}
				translate={1.5}
				size={1.5}
				color="grayscale-8"
				active={false}
			/>
			{props.children}
		</BaseMenu.Trigger>
	);
}

function TriggerIcon({ className }: { className?: string }) {
	return (
		<CaretUpDownIcon
			size={12}
			weight="bold"
			className={cn("shrink-0 text-grayscale-9", className)}
		/>
	);
}

function Positioner({ className, sideOffset, ...props }: MenuPositionerProps) {
	return (
		<BaseMenu.Positioner
			className={mergeClassName("z-50 outline-none", className)}
			sideOffset={sideOffset ?? 6}
			{...props}
		/>
	);
}

function Popup({ className, ...props }: MenuPopupProps) {
	return (
		<BaseMenu.Popup
			className={mergeClassName(
				"flex min-w-[7rem] flex-col border border-grayscale-4 bg-white py-1 outline-none transition-all duration-150 data-[ending-style]:scale-98 data-[starting-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
				className,
			)}
			{...props}
		/>
	);
}

const itemClassName =
	"group relative flex cursor-default flex-row items-center gap-2 overflow-visible px-3 py-1.5 text-xs text-grayscale-11 outline-none select-none transition-colors duration-100 data-[highlighted]:text-grayscale-12";

function Item({ className, children, ...props }: MenuItemProps) {
	return (
		<BaseMenu.Item
			className={mergeClassName(itemClassName, className)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={1.5}
				color="grayscale-8"
				active={false}
			/>
			{children}
		</BaseMenu.Item>
	);
}

function SubmenuTrigger({
	className,
	children,
	...props
}: MenuSubmenuTriggerProps) {
	return (
		<BaseMenu.SubmenuTrigger
			className={mergeClassName(
				cn(itemClassName, "data-[popup-open]:text-grayscale-12"),
				className,
			)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={1.5}
				color="grayscale-8"
				active={false}
				className="group-data-[popup-open]:opacity-100 group-data-[popup-open]:translate-x-0 group-data-[popup-open]:translate-y-0"
			/>
			{children}
			<CaretRightIcon size={12} weight="bold" className="text-grayscale-9" />
		</BaseMenu.SubmenuTrigger>
	);
}

function RadioItem({ className, children, ...props }: MenuRadioItemProps) {
	return (
		<BaseMenu.RadioItem
			className={mergeClassName(
				cn(
					itemClassName,
					"data-[checked]:bg-grayscale-2 data-[checked]:text-grayscale-12",
				),
				className,
			)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={1.5}
				color="grayscale-8"
				active={false}
				className="group-data-[checked]:hidden"
			/>
			{children}
		</BaseMenu.RadioItem>
	);
}

function RadioItemIndicator({
	className,
	...props
}: MenuRadioItemIndicatorProps) {
	return (
		<BaseMenu.RadioItemIndicator
			className={mergeClassName(
				"pointer-events-none absolute inset-0",
				className,
			)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={1.5}
				color="accent-9"
				active={true}
			/>
		</BaseMenu.RadioItemIndicator>
	);
}

function GroupLabel({ className, ...props }: MenuGroupLabelProps) {
	return (
		<BaseMenu.GroupLabel
			className={mergeClassName(
				"px-3 py-1 text-xs font-medium text-grayscale-10",
				className,
			)}
			{...props}
		/>
	);
}

function Separator({ className, ...props }: MenuSeparatorProps) {
	return (
		<BaseMenu.Separator
			className={mergeClassName("my-1 h-px bg-grayscale-4", className)}
			{...props}
		/>
	);
}

export const Menu = {
	Root,
	Trigger,
	TriggerIcon,
	Portal,
	Positioner,
	Popup,
	Item,
	Group,
	GroupLabel,
	Separator,
	SubmenuRoot,
	SubmenuTrigger,
	RadioGroup,
	RadioItem,
	RadioItemIndicator,
};
