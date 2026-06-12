"use client";

import {
	FadersHorizontalIcon,
	FileTextIcon,
	GitBranchIcon,
	KeyIcon,
	PackageIcon,
	TerminalIcon,
	TerminalWindowIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import CornerBrackets from "@/components/CornerBrackets";
import { ExpandSidebarButton } from "@/components/SidebarContext";
import { cn } from "@/helpers/classname-helper";

const SETTINGS_ITEMS = [
	{
		label: "GitHub Access",
		slug: "",
		Icon: KeyIcon,
	},
	{
		label: "Developer Access",
		slug: "developer-access",
		Icon: TerminalIcon,
	},
	{
		label: "Sandbox Packages",
		slug: "packages",
		Icon: PackageIcon,
	},
	{
		label: "Setup Scripts",
		slug: "setup-scripts",
		Icon: TerminalWindowIcon,
	},
	{
		label: "Repositories",
		slug: "repositories",
		Icon: GitBranchIcon,
	},
	{
		label: "Environment Files",
		slug: "environment-files",
		Icon: FileTextIcon,
	},
] as const;

export default function FactorySettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { orgHandle, factoryId } = useParams();
	const pathname = usePathname();
	const baseHref = `/${orgHandle as string}/factories/${factoryId as string}/settings`;

	return (
		<div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-grayscale-1">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<div className="flex min-h-0 flex-1 flex-col md:flex-row">
				<aside className="w-full shrink-0 border-b border-grayscale-4 bg-grayscale-1 px-2 py-3 md:w-64 md:border-r md:border-b-0">
					<div className="mb-3 flex items-center gap-2 px-3">
						<FadersHorizontalIcon
							weight="bold"
							className="size-4 text-grayscale-10"
						/>
						<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
							Factory Settings
						</p>
					</div>
					<nav className="flex flex-col gap-px">
						{SETTINGS_ITEMS.map(({ label, slug, Icon }) => {
							const href = slug ? `${baseHref}/${slug}` : baseHref;
							const selected =
								pathname === href ||
								(slug !== "" && pathname.startsWith(`${href}/`));

							return (
								<Link
									key={label}
									href={href}
									className={cn(
										"group relative flex items-center gap-2.5 px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
										selected ? "bg-grayscale-3" : "",
									)}
								>
									<CornerBrackets
										placement="inside"
										color={selected ? "accent-9" : "grayscale-8"}
										size={6}
										active={selected}
									/>
									<Icon weight="bold" className="size-4 shrink-0" />
									<span className="min-w-0 flex-1 truncate">{label}</span>
								</Link>
							);
						})}
					</nav>
				</aside>
				<main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
					{children}
				</main>
			</div>
		</div>
	);
}
