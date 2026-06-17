"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
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
				"group relative flex h-8 min-w-0 flex-row items-center justify-center gap-2 rounded-md border border-grayscale-12 bg-grayscale-12 px-3 text-xs font-medium whitespace-nowrap text-grayscale-1 transition-colors duration-150 hover:border-grayscale-11 hover:bg-grayscale-11 disabled:cursor-not-allowed disabled:opacity-50",
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
				"fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:bg-black/50",
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
				"fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-grayscale-4 bg-grayscale-1 shadow-xl shadow-black/10 outline-none transition-all duration-200 data-[ending-style]:scale-98 data-[starting-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:shadow-black/40",
				className,
			)}
			{...props}
		>
			{children}
		</BaseDialog.Popup>
	);
}

function Title({ className, ...props }: DialogTitleProps) {
	return (
		<BaseDialog.Title
			className={mergeClassName(
				"text-sm font-medium text-grayscale-12",
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
				"group relative flex h-8 min-w-0 flex-row items-center justify-center gap-2 rounded-md border border-grayscale-4 bg-grayscale-1 px-3 text-xs font-medium whitespace-nowrap text-grayscale-12 transition-colors duration-150 hover:border-grayscale-5 hover:bg-grayscale-2 disabled:cursor-not-allowed disabled:opacity-50",
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
