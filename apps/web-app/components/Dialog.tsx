"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
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

export type DialogRootProps = ComponentProps<typeof BaseDialog.Root>;
export type DialogTriggerProps = ComponentProps<typeof BaseDialog.Trigger>;
export type DialogPortalProps = ComponentProps<typeof BaseDialog.Portal>;
export type DialogBackdropProps = ComponentProps<typeof BaseDialog.Backdrop>;
export type DialogViewportProps = ComponentProps<typeof BaseDialog.Viewport>;
export type DialogPopupProps = ComponentProps<typeof BaseDialog.Popup>;
export type DialogTitleProps = ComponentProps<typeof BaseDialog.Title>;
export type DialogDescriptionProps = ComponentProps<
	typeof BaseDialog.Description
>;
export type DialogCloseProps = ComponentProps<typeof BaseDialog.Close>;

const Root = BaseDialog.Root;
const Portal = BaseDialog.Portal;
const Viewport = BaseDialog.Viewport;

function Trigger({ className, ...props }: DialogTriggerProps) {
	return (
		<BaseDialog.Trigger
			className={mergeClassName(
				"group relative flex flex-row items-center justify-center gap-2 overflow-visible bg-grayscale-12 px-3 py-1.5 text-xs font-medium text-grayscale-1 transition-transform duration-150 hover:scale-96",
				className,
			)}
			{...props}
		/>
	);
}

function Backdrop({ className, ...props }: DialogBackdropProps) {
	return (
		<BaseDialog.Backdrop
			className={mergeClassName(
				"fixed inset-0 z-40 bg-grayscale-1/60 backdrop-blur-[1px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
				className,
			)}
			{...props}
		/>
	);
}

function Popup({ className, children, ...props }: DialogPopupProps) {
	return (
		<BaseDialog.Popup
			className={mergeClassName(
				"group/popup fixed top-1/2 left-1/2 z-50 flex w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col border border-grayscale-4 bg-white outline-none transition-all duration-200 data-[ending-style]:scale-98 data-[starting-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
				className,
			)}
			{...props}
		>
			<div className="pointer-events-none absolute inset-0 scale-100 transition-transform duration-300 ease-out group-data-[ending-style]/popup:scale-90 group-data-[starting-style]/popup:scale-90">
				<CornerBrackets
					placement="outside"
					spacing={0.75}
					translate={3}
					size={2.5}
					color="var(--color-grayscale-10)"
					active={true}
				/>
			</div>
			{children}
		</BaseDialog.Popup>
	);
}

function Title({ className, ...props }: DialogTitleProps) {
	return (
		<BaseDialog.Title
			className={mergeClassName(
				"text-xs font-medium text-grayscale-12",
				className,
			)}
			{...props}
		/>
	);
}

function Description({ className, ...props }: DialogDescriptionProps) {
	return (
		<BaseDialog.Description
			className={mergeClassName("text-xs text-grayscale-10", className)}
			{...props}
		/>
	);
}

function Close({ className, ...props }: DialogCloseProps) {
	return (
		<BaseDialog.Close
			className={mergeClassName(
				"group relative flex flex-row items-center justify-center gap-2 overflow-visible border border-grayscale-4 px-3 py-1.5 text-xs font-medium text-grayscale-11 transition-colors duration-150 hover:text-grayscale-12",
				className,
			)}
			{...props}
		/>
	);
}

export const Dialog = {
	Root,
	Trigger,
	Portal,
	Backdrop,
	Viewport,
	Popup,
	Title,
	Description,
	Close,
};
