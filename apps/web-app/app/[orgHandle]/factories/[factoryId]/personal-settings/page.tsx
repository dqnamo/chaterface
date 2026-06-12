"use client";

import {
	CheckIcon,
	MoonIcon,
	SignOutIcon,
	SunIcon,
	UserCircleIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import CornerBrackets from "@/components/CornerBrackets";
import { ExpandSidebarButton } from "@/components/SidebarContext";
import SignOutButton from "@/components/SignOutButton";
import { cn } from "@/helpers/classname-helper";

const THEME_OPTIONS = [
	{
		value: "light",
		label: "Light",
		Icon: SunIcon,
	},
	{
		value: "dark",
		label: "Dark",
		Icon: MoonIcon,
	},
] as const;

export default function PersonalSettingsPage() {
	return (
		<div className="relative h-full w-full overflow-y-auto bg-grayscale-1">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-14 md:px-8">
				<div className="flex flex-col gap-1">
					<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
						Personal Settings
					</p>
					<h1 className="text-lg font-medium text-grayscale-12">
						Your preferences
					</h1>
					<p className="text-sm text-grayscale-10">
						Appearance and account controls for your workspace.
					</p>
				</div>

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
							<UserCircleIcon weight="bold" className="size-4" />
							Appearance
						</div>
					</div>
					<div className="flex flex-col gap-3 p-3">
						<Field label="Theme">
							<ThemeSetting />
						</Field>
					</div>
				</section>

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
							<SignOutIcon weight="bold" className="size-4" />
							Account
						</div>
					</div>
					<div className="flex p-3">
						<SignOutButton />
					</div>
				</section>
			</div>
		</div>
	);
}

function ThemeSetting() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const selectedTheme = mounted && theme === "dark" ? "dark" : "light";

	return (
		<div className="grid w-full gap-2 sm:grid-cols-2">
			{THEME_OPTIONS.map(({ value, label, Icon }) => {
				const selected = selectedTheme === value;

				return (
					<button
						key={value}
						type="button"
						aria-pressed={selected}
						onClick={() => setTheme(value)}
						className={cn(
							"group relative flex min-h-12 items-center justify-between gap-3 border border-grayscale-4 bg-grayscale-2 px-3 py-2 text-left transition-colors hover:border-grayscale-6 hover:bg-grayscale-3",
							selected ? "border-accent-8 bg-accent-2" : "",
						)}
					>
						<CornerBrackets
							placement="inside"
							color={selected ? "accent-9" : "grayscale-8"}
							size={6}
							active={selected}
						/>
						<span className="flex min-w-0 items-center gap-2">
							<Icon
								weight="bold"
								className="size-4 shrink-0 text-grayscale-11"
							/>
							<span className="truncate text-sm font-medium text-grayscale-12">
								{label}
							</span>
						</span>
						{selected ? (
							<CheckIcon
								weight="bold"
								className="size-4 shrink-0 text-accent-9"
							/>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<p className="text-xs text-grayscale-11">{label}</p>
			{children}
		</div>
	);
}
