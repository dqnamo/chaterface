"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react";
import Logo from "@/components/Logo";
import { useSidebar } from "@/components/SidebarContext";

export default function MobileHeader() {
	const { isMobile, toggle, toggleRight, hasRightPanel } = useSidebar();

	if (!isMobile) {
		return null;
	}

	return (
		<header className="relative z-30 flex h-12 shrink-0 flex-row items-center justify-between border-b border-grayscale-4 bg-grayscale-1 px-2">
			<button
				type="button"
				aria-label="Toggle tasks sidebar"
				onClick={toggle}
				className="flex size-9 cursor-pointer items-center justify-center bg-grayscale-2 transition-colors duration-150 hover:bg-grayscale-3"
			>
				<SidebarSimpleIcon weight="bold" className="text-grayscale-11" />
			</button>

			<Logo size={5} />

			{hasRightPanel ? (
				<button
					type="button"
					aria-label="Toggle preview panel"
					onClick={toggleRight}
					className="flex size-9 cursor-pointer items-center justify-center bg-grayscale-2 transition-colors duration-150 hover:bg-grayscale-3"
				>
					<SidebarSimpleIcon
						weight="bold"
						className="-scale-x-100 text-grayscale-11"
					/>
				</button>
			) : (
				<div className="size-9" />
			)}
		</header>
	);
}
