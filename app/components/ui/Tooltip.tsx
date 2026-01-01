"use client";

import { useState } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  Placement,
} from "@floating-ui/react";
import { motion, AnimatePresence } from "motion/react";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: Placement;
  className?: string;
}

export default function Tooltip({
  children,
  content,
  placement = "top",
  className = "",
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { x, y, strategy, refs, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(5), flip(), shift({ padding: 5 })],
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: 200, close: 0 },
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={`inline-flex ${className}`}
      >
        {children}
      </div>
      <FloatingPortal>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={refs.setFloating}
              style={{
                position: strategy,
                top: y ?? 0,
                left: x ?? 0,
              }}
              {...getFloatingProps()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="z-[100] px-2 py-1 text-xs font-medium text-gray-2 bg-gray-scale-12/90 rounded-lg shadow-xl backdrop-blur-sm border border-white/10 pointer-events-none whitespace-nowrap"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
