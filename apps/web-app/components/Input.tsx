"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps, KeyboardEvent } from "react";
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

const fieldClassName =
	"w-full rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 text-xs text-grayscale-12 outline-none transition-colors duration-150 placeholder:text-grayscale-10 hover:bg-grayscale-2 focus:border-grayscale-8 focus:bg-grayscale-1 focus:ring-2 focus:ring-grayscale-4/60";

function handleSubmitKeyDown(
	event: KeyboardEvent,
	onSubmit?: () => void,
	multiline = false,
) {
	if (!onSubmit || event.key !== "Enter") {
		return;
	}

	if (multiline && (event.metaKey || event.ctrlKey)) {
		return;
	}

	event.preventDefault();
	onSubmit();
}

export type InputProps = ComponentProps<typeof BaseInput> & {
	containerClassName?: string;
	onSubmit?: () => void;
};

export function Input({
	className,
	containerClassName,
	onSubmit,
	onKeyDown,
	...props
}: InputProps) {
	return (
		<div className={cn("relative flex w-full", containerClassName)}>
			<BaseInput
				className={mergeClassName(fieldClassName, className)}
				onKeyDown={(event) => {
					handleSubmitKeyDown(event, onSubmit);
					onKeyDown?.(event);
				}}
				{...props}
			/>
		</div>
	);
}

export type TextareaProps = ComponentProps<typeof BaseInput> & {
	containerClassName?: string;
	onSubmit?: () => void;
};

export function Textarea({
	className,
	containerClassName,
	onSubmit,
	onKeyDown,
	...props
}: TextareaProps) {
	return (
		<div className={cn("relative flex w-full", containerClassName)}>
			<BaseInput
				render={<textarea />}
				className={mergeClassName(
					cn(fieldClassName, "min-h-24 resize-none"),
					className,
				)}
				onKeyDown={(event) => {
					handleSubmitKeyDown(event, onSubmit, true);
					onKeyDown?.(event);
				}}
				{...props}
			/>
		</div>
	);
}
