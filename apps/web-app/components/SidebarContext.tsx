"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { cn } from "@/helpers/classname-helper";

const MOBILE_QUERY = "(max-width: 767px)";

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia(MOBILE_QUERY);
		const handleChange = (event: MediaQueryListEvent) =>
			setIsMobile(event.matches);

		setIsMobile(mediaQuery.matches);
		mediaQuery.addEventListener("change", handleChange);

		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	return isMobile;
}

type SidebarContextValue = {
	isMobile: boolean;
	// Left task sidebar
	isCollapsed: boolean;
	collapse: () => void;
	expand: () => void;
	toggle: () => void;
	// Right preview panel (registered by pages that render one)
	hasRightPanel: boolean;
	setHasRightPanel: (value: boolean) => void;
	isRightCollapsed: boolean;
	collapseRight: () => void;
	expandRight: () => void;
	toggleRight: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
	const isMobile = useIsMobile();

	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isRightCollapsed, setIsRightCollapsed] = useState(false);
	const [hasRightPanel, setHasRightPanel] = useState(false);

	// Default both drawers closed on mobile and open on desktop. Re-applied
	// whenever we cross the mobile breakpoint.
	useEffect(() => {
		setIsCollapsed(isMobile);
		setIsRightCollapsed(isMobile);
	}, [isMobile]);

	const collapse = useCallback(() => setIsCollapsed(true), []);
	const expand = useCallback(() => setIsCollapsed(false), []);
	const toggle = useCallback(
		() => setIsCollapsed((collapsed) => !collapsed),
		[],
	);

	const collapseRight = useCallback(() => setIsRightCollapsed(true), []);
	const expandRight = useCallback(() => setIsRightCollapsed(false), []);
	const toggleRight = useCallback(
		() => setIsRightCollapsed((collapsed) => !collapsed),
		[],
	);

	const value: SidebarContextValue = {
		isMobile,
		isCollapsed,
		collapse,
		expand,
		toggle,
		hasRightPanel,
		setHasRightPanel,
		isRightCollapsed,
		collapseRight,
		expandRight,
		toggleRight,
	};

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
	const { isCollapsed, expand, isMobile } = useSidebar();

	// On mobile the header owns the sidebar toggle.
	if (isMobile) {
		return null;
	}

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
						"flex h-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden text-grayscale-11 transition-colors duration-150 hover:text-grayscale-12",
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
