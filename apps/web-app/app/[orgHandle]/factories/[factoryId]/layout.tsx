"use client";

import { AnimatePresence, motion } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/components/SidebarContext";

const MIN_SIDEBAR_SIZE = 160;
const MAX_SIDEBAR_SIZE = 480;
const DEFAULT_SIDEBAR_SIZE = 256;

export default function FactoryLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [sidebarSize, setSidebarSize] = useState(DEFAULT_SIDEBAR_SIZE);
	const isResizing = useRef(false);

	const collapse = useCallback(() => setIsSidebarCollapsed(true), []);
	const expand = useCallback(() => setIsSidebarCollapsed(false), []);
	const toggle = useCallback(
		() => setIsSidebarCollapsed((collapsed) => !collapsed),
		[],
	);

	const sidebarContext = useMemo(
		() => ({ isCollapsed: isSidebarCollapsed, collapse, expand, toggle }),
		[isSidebarCollapsed, collapse, expand, toggle],
	);

	const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (isSidebarCollapsed) {
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
		<SidebarProvider value={sidebarContext}>
			<div className="relative flex h-full w-full overflow-hidden">
				<motion.div
					className="relative shrink-0"
					style={{ width: sidebarSize }}
					initial={false}
					animate={{ marginLeft: isSidebarCollapsed ? -sidebarSize : 0 }}
					transition={{ type: "spring", stiffness: 420, damping: 42 }}
				>
					<div className="h-full" style={{ width: sidebarSize }}>
						<Sidebar onToggleCollapse={collapse} />
					</div>
				</motion.div>

				<AnimatePresence initial={false}>
					{!isSidebarCollapsed && (
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

				<div className="relative min-w-0 flex-1">{children}</div>
			</div>
		</SidebarProvider>
	);
}
