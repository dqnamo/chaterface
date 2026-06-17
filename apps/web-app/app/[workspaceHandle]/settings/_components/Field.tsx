import type { ChangeEventHandler } from "react";
import { useId } from "react";
import { Input } from "@/components/Input";

export function Field({
	label,
	name,
	placeholder,
	defaultValue,
	value,
	onChange,
	type = "text",
}: {
	label: string;
	name: string;
	placeholder: string;
	defaultValue?: string;
	value?: string;
	onChange?: ChangeEventHandler<HTMLInputElement>;
	type?: string;
}) {
	const inputId = useId();

	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<label htmlFor={inputId} className="text-xs text-grayscale-11">
				{label}
			</label>
			<Input
				id={inputId}
				name={name}
				type={type}
				placeholder={placeholder}
				defaultValue={defaultValue}
				value={value}
				onChange={onChange}
			/>
		</div>
	);
}
