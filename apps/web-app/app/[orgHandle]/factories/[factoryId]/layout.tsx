"use client";

import { AnimatePresence, motion } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";
import MobileDrawer from "@/components/MobileDrawer";
import MobileHeader from "@/components/MobileHeader";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";

const MIN_SIDEBAR_SIZE = 160;
const MAX_SIDEBAR_SIZE = 480;
const DEFAULT_SIDEBAR_SIZE = 256;

export default function FactoryLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<FactoryLayoutChrome>{children}</FactoryLayoutChrome>
		</SidebarProvider>
	);
}

function FactoryLayoutChrome({ children }: { children: React.ReactNode }) {
	const { isMobile, isCollapsed, collapse } = useSidebar();
	const [sidebarSize, setSidebarSize] = useState(DEFAULT_SIDEBAR_SIZE);
	const isResizing = useRef(false);

	const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (isCollapsed) {
			return;
		}

		event.preventDefault();
		isResizing.current = true;
		const startX = event.clientX;
		const startSize = sidebarSize;

		const handleMove = (moveEvent: PointerEvent) => {
			if (!isResizing.current) {
				return;
			}

			const nextSize = Math.min(
				MAX_SIDEBAR_SIZE,
				Math.max(MIN_SIDEBAR_SIZE, startSize + (moveEvent.clientX - startX)),
			);
			setSidebarSize(nextSize);
		};

		const stopResize = () => {
			isResizing.current = false;
			window.removeEventListener("pointermove", handleMove);
			window.removeEventListener("pointerup", stopResize);
		};

		window.addEventListener("pointermove", handleMove);
		window.addEventListener("pointerup", stopResize);
	};

	return (
		<div className="relative flex h-full w-full flex-col overflow-hidden md:flex-row">
			<MobileHeader />

			{isMobile ? (
				<MobileDrawer side="left" isOpen={!isCollapsed} onClose={collapse}>
					<Sidebar onToggleCollapse={collapse} />
				</MobileDrawer>
			) : (
				<>
					<motion.div
						className="relative shrink-0"
						style={{ width: sidebarSize }}
						initial={false}
						animate={{ marginLeft: isCollapsed ? -sidebarSize : 0 }}
						transition={{ type: "spring", stiffness: 420, damping: 42 }}
					>
						<div className="h-full" style={{ width: sidebarSize }}>
							<Sidebar onToggleCollapse={collapse} />
						</div>
					</motion.div>

					<AnimatePresence initial={false}>
						{!isCollapsed && (
							<motion.div
								aria-label="Resize task sidebar"
								onPointerDown={startResize}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
								className="relative z-10 w-px shrink-0 cursor-col-resize bg-grayscale-4 transition-colors hover:bg-accent-8"
							/>
						)}
					</AnimatePresence>
				</>
			)}

			<div className="relative min-h-0 min-w-0 flex-1">{children}</div>
		</div>
	);
}
