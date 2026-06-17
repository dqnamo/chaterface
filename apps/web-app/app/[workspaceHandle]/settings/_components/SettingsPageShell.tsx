import type { ComponentType, ReactNode } from "react";
import CornerBrackets from "@/components/CornerBrackets";

type SettingsPageShellProps = {
	eyebrow: string;
	title: string;
	description: string;
	children: ReactNode;
};

type SettingsSectionProps = {
	title: string;
	Icon: ComponentType<{ weight?: "bold"; className?: string }>;
	children: ReactNode;
};

export function SettingsPageShell({
	eyebrow,
	title,
	description,
	children,
}: SettingsPageShellProps) {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-14 md:px-8">
			<div className="flex flex-col gap-1">
				<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
					{eyebrow}
				</p>
				<h1 className="text-lg font-medium text-grayscale-12">{title}</h1>
				<p className="text-sm text-grayscale-10">{description}</p>
			</div>
			{children}
		</div>
	);
}

export function SettingsSection({
	title,
	Icon,
	children,
}: SettingsSectionProps) {
	return (
		<section className="relative border border-grayscale-4 bg-grayscale-1">
			<CornerBrackets
				placement="outside"
				spacing={3}
				translate={12}
				size={6}
				color="var(--color-grayscale-6)"
				active={true}
			/>
			<div className="border-b border-grayscale-4 p-3">
				<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
					<Icon weight="bold" className="size-4" />
					{title}
				</div>
			</div>
			{children}
		</section>
	);
}
