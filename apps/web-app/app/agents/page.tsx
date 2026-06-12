"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function GlobalAgentsPage() {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 px-4 text-center">
			<Logo size={8} />
			<div className="flex max-w-sm flex-col gap-1">
				<h1 className="text-lg font-medium text-grayscale-12">
					Agents moved into organisations
				</h1>
				<p className="text-sm text-grayscale-10">
					Open a factory and use the sidebar Agents page to create Codex or
					Cursor agents for that organisation.
				</p>
			</div>
			<Link
				href="/"
				className="border border-grayscale-4 px-3 py-1.5 text-xs font-medium text-grayscale-11 transition-colors hover:text-grayscale-12"
			>
				View Organisations
			</Link>
		</div>
	);
}
