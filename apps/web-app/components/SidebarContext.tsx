"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext } from "react";
import { cn } from "@/helpers/classname-helper";

type SidebarContextValue = {
	isCollapsed: boolean;
	collapse: () => void;
	expand: () => void;
	toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
	value,
	children,
}: {
	value: SidebarContextValue;
	children: React.ReactNode;
}) {
	return (
		<SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
	);
}

export function useSidebar() {
	const context = useContext(SidebarContext);

	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider");
	}

	return context;
}

export function ExpandSidebarButton({ className }: { className?: string }) {
	const { isCollapsed, expand } = useSidebar();

	return (
		<AnimatePresence initial={false}>
			{isCollapsed && (
				<motion.button
					type="button"
					aria-label="Expand sidebar"
					onClick={expand}
					initial={{ width: 0, marginRight: 0, opacity: 0 }}
					animate={{ width: 24, marginRight: 6, opacity: 1 }}
					exit={{ width: 0, marginRight: 0, opacity: 0 }}
					transition={{ type: "spring", stiffness: 500, damping: 40 }}
					className={cn(
						"flex h-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden bg-grayscale-2 transition-colors duration-150 hover:bg-grayscale-3",
						className,
					)}
				>
					<span className="flex size-6 shrink-0 items-center justify-center">
						<SidebarSimpleIcon weight="bold" />
					</span>
				</motion.button>
			)}
		</AnimatePresence>
	);
}
