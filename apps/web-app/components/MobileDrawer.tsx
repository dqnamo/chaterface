"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/helpers/classname-helper";

type MobileDrawerProps = {
	side: "left" | "right";
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
};

export default function MobileDrawer({
	side,
	isOpen,
	onClose,
	children,
}: MobileDrawerProps) {
	const closedOffset = side === "left" ? "-100%" : "100%";

	return (
		<>
			<AnimatePresence>
				{isOpen && (
					<motion.button
						type="button"
						aria-label="Close panel"
						onClick={onClose}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-40 bg-grayscale-12/30"
					/>
				)}
			</AnimatePresence>

			<motion.div
				className={cn(
					"fixed inset-y-0 z-50 flex w-full flex-col bg-grayscale-1",
					side === "left" ? "left-0" : "right-0",
				)}
				initial={false}
				animate={{ x: isOpen ? "0%" : closedOffset }}
				transition={{ type: "spring", stiffness: 420, damping: 42 }}
			>
				{children}
			</motion.div>
		</>
	);
}
