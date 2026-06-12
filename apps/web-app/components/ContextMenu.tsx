"use client";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { CaretRightIcon } from "@phosphor-icons/react";
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

export type ContextMenuRootProps = ComponentProps<typeof BaseContextMenu.Root>;
export type ContextMenuTriggerProps = ComponentProps<
	typeof BaseContextMenu.Trigger
>;
export type ContextMenuBackdropProps = ComponentProps<
	typeof BaseContextMenu.Backdrop
>;
export type ContextMenuPortalProps = ComponentProps<
	typeof BaseContextMenu.Portal
>;
export type ContextMenuPositionerProps = ComponentProps<
	typeof BaseContextMenu.Positioner
>;
export type ContextMenuPopupProps = ComponentProps<
	typeof BaseContextMenu.Popup
>;
export type ContextMenuArrowProps = ComponentProps<
	typeof BaseContextMenu.Arrow
>;
export type ContextMenuItemProps = ComponentProps<typeof BaseContextMenu.Item>;
export type ContextMenuLinkItemProps = ComponentProps<
	typeof BaseContextMenu.LinkItem
>;
export type ContextMenuGroupProps = ComponentProps<
	typeof BaseContextMenu.Group
>;
export type ContextMenuGroupLabelProps = ComponentProps<
	typeof BaseContextMenu.GroupLabel
>;
export type ContextMenuSeparatorProps = ComponentProps<
	typeof BaseContextMenu.Separator
>;
export type ContextMenuSubmenuRootProps = ComponentProps<
	typeof BaseContextMenu.SubmenuRoot
>;
export type ContextMenuSubmenuTriggerProps = ComponentProps<
	typeof BaseContextMenu.SubmenuTrigger
>;
export type ContextMenuRadioGroupProps = ComponentProps<
	typeof BaseContextMenu.RadioGroup
>;
export type ContextMenuRadioItemProps = ComponentProps<
	typeof BaseContextMenu.RadioItem
>;
export type ContextMenuRadioItemIndicatorProps = ComponentProps<
	typeof BaseContextMenu.RadioItemIndicator
>;
export type ContextMenuCheckboxItemProps = ComponentProps<
	typeof BaseContextMenu.CheckboxItem
>;
export type ContextMenuCheckboxItemIndicatorProps = ComponentProps<
	typeof BaseContextMenu.CheckboxItemIndicator
>;

type ContextMenuItemDecorProps = {
	cornerColor?: string;
	cornerClassName?: string;
};

const Root = BaseContextMenu.Root;
const Portal = BaseContextMenu.Portal;
const Group = BaseContextMenu.Group;
const SubmenuRoot = BaseContextMenu.SubmenuRoot;
const RadioGroup = BaseContextMenu.RadioGroup;

function Trigger({ className, ...props }: ContextMenuTriggerProps) {
	return (
		<BaseContextMenu.Trigger
			className={mergeClassName("outline-none", className)}
			{...props}
		/>
	);
}

function Backdrop({ className, ...props }: ContextMenuBackdropProps) {
	return (
		<BaseContextMenu.Backdrop
			className={mergeClassName("fixed inset-0 z-40", className)}
			{...props}
		/>
	);
}

function Positioner({
	className,
	sideOffset,
	...props
}: ContextMenuPositionerProps) {
	return (
		<BaseContextMenu.Positioner
			className={mergeClassName("z-50 outline-none", className)}
			sideOffset={sideOffset ?? 6}
			{...props}
		/>
	);
}

function Popup({ className, ...props }: ContextMenuPopupProps) {
	return (
		<BaseContextMenu.Popup
			className={mergeClassName(
				"flex min-w-[8rem] flex-col border border-grayscale-4 bg-grayscale-1 p-1 outline-none transition-all duration-150 data-[ending-style]:scale-98 data-[starting-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
				className,
			)}
			{...props}
		/>
	);
}

function Arrow({ className, ...props }: ContextMenuArrowProps) {
	return (
		<BaseContextMenu.Arrow
			className={mergeClassName("fill-white", className)}
			{...props}
		/>
	);
}

const itemClassName =
	"group relative flex cursor-default flex-row items-center gap-2 overflow-visible px-3 py-1.5 text-xs text-grayscale-11 outline-none select-none transition-colors duration-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:text-grayscale-12";

function Item({
	className,
	children,
	cornerColor = "grayscale-8",
	cornerClassName,
	...props
}: ContextMenuItemProps & ContextMenuItemDecorProps) {
	return (
		<BaseContextMenu.Item
			className={mergeClassName(itemClassName, className)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={6}
				color={cornerColor}
				active={false}
				className={cornerClassName}
			/>
			{children}
		</BaseContextMenu.Item>
	);
}

function LinkItem({ className, children, ...props }: ContextMenuLinkItemProps) {
	return (
		<BaseContextMenu.LinkItem
			className={mergeClassName(itemClassName, className)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={6}
				color="grayscale-8"
				active={false}
			/>
			{children}
		</BaseContextMenu.LinkItem>
	);
}

function SubmenuTrigger({
	className,
	children,
	...props
}: ContextMenuSubmenuTriggerProps) {
	return (
		<BaseContextMenu.SubmenuTrigger
			className={mergeClassName(
				cn(itemClassName, "data-[popup-open]:text-grayscale-12"),
				className,
			)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={6}
				color="grayscale-8"
				active={false}
				className="group-data-[popup-open]:opacity-100 group-data-[popup-open]:translate-x-0 group-data-[popup-open]:translate-y-0"
			/>
			{children}
			<CaretRightIcon
				size={12}
				weight="bold"
				className="ml-auto text-grayscale-9"
			/>
		</BaseContextMenu.SubmenuTrigger>
	);
}

function RadioItem({
	className,
	children,
	...props
}: ContextMenuRadioItemProps) {
	return (
		<BaseContextMenu.RadioItem
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
				size={6}
				color="grayscale-8"
				active={false}
				className="group-data-[checked]:hidden"
			/>
			{children}
		</BaseContextMenu.RadioItem>
	);
}

function RadioItemIndicator({
	className,
	...props
}: ContextMenuRadioItemIndicatorProps) {
	return (
		<BaseContextMenu.RadioItemIndicator
			className={mergeClassName(
				"pointer-events-none absolute inset-0",
				className,
			)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={6}
				color="accent-9"
				active={true}
			/>
		</BaseContextMenu.RadioItemIndicator>
	);
}

function CheckboxItem({
	className,
	children,
	...props
}: ContextMenuCheckboxItemProps) {
	return (
		<BaseContextMenu.CheckboxItem
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
				size={6}
				color="grayscale-8"
				active={false}
				className="group-data-[checked]:hidden"
			/>
			{children}
		</BaseContextMenu.CheckboxItem>
	);
}

function CheckboxItemIndicator({
	className,
	...props
}: ContextMenuCheckboxItemIndicatorProps) {
	return (
		<BaseContextMenu.CheckboxItemIndicator
			className={mergeClassName(
				"pointer-events-none absolute inset-0",
				className,
			)}
			{...props}
		>
			<CornerBrackets
				placement="inside"
				size={6}
				color="accent-9"
				active={true}
			/>
		</BaseContextMenu.CheckboxItemIndicator>
	);
}

function GroupLabel({ className, ...props }: ContextMenuGroupLabelProps) {
	return (
		<BaseContextMenu.GroupLabel
			className={mergeClassName(
				"px-3 py-1 text-xs font-medium text-grayscale-10",
				className,
			)}
			{...props}
		/>
	);
}

function Separator({ className, ...props }: ContextMenuSeparatorProps) {
	return (
		<BaseContextMenu.Separator
			className={mergeClassName("my-1 h-px bg-grayscale-4", className)}
			{...props}
		/>
	);
}

export const ContextMenu = {
	Root,
	Trigger,
	Backdrop,
	Portal,
	Positioner,
	Popup,
	Arrow,
	Item,
	LinkItem,
	Group,
	GroupLabel,
	Separator,
	SubmenuRoot,
	SubmenuTrigger,
	RadioGroup,
	RadioItem,
	RadioItemIndicator,
	CheckboxItem,
	CheckboxItemIndicator,
};
