"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/helpers/classname-helper";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type Position = {
  x: number;
  y: number;
};

const EDGE_GAP = 16;
const STORAGE_KEY = "dynamo-panel-corner";
const DEFAULT_CORNER: Corner = "top-left";
const XL_BREAKPOINT_QUERY = "(min-width: 80rem)";

function isXlViewport() {
  return window.matchMedia(XL_BREAKPOINT_QUERY).matches;
}

function getResponsiveCorner(corner: Corner): Corner {
  if (corner === "top-left" && !isXlViewport()) {
    return "bottom-left";
  }

  return corner;
}

function getCornerPosition(corner: Corner, width: number, height: number) {
  const responsiveCorner = getResponsiveCorner(corner);
  const x = responsiveCorner.endsWith("left")
    ? EDGE_GAP
    : window.innerWidth - width - EDGE_GAP;
  const y = responsiveCorner.startsWith("top")
    ? EDGE_GAP
    : window.innerHeight - height - EDGE_GAP;

  return {
    x: Math.max(EDGE_GAP, x),
    y: Math.max(EDGE_GAP, y),
  };
}

function getClosestCorner(position: Position, width: number, height: number) {
  const corners: Corner[] = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ];
  const center = {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };

  return corners.reduce((closest, corner) => {
    const cornerPosition = getCornerPosition(corner, width, height);
    const cornerCenter = {
      x: cornerPosition.x + width / 2,
      y: cornerPosition.y + height / 2,
    };
    const closestPosition = getCornerPosition(closest, width, height);
    const closestCenter = {
      x: closestPosition.x + width / 2,
      y: closestPosition.y + height / 2,
    };

    const cornerDistance =
      (center.x - cornerCenter.x) ** 2 + (center.y - cornerCenter.y) ** 2;
    const closestDistance =
      (center.x - closestCenter.x) ** 2 + (center.y - closestCenter.y) ** 2;

    return cornerDistance < closestDistance ? corner : closest;
  }, DEFAULT_CORNER);
}

function isInteractiveElement(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest("button, a, input, select, textarea, [role='switch']"),
    )
  );
}

function getStoredCorner(): Corner {
  const storedCorner = window.localStorage.getItem(STORAGE_KEY);

  if (
    storedCorner === "top-left" ||
    storedCorner === "top-right" ||
    storedCorner === "bottom-left" ||
    storedCorner === "bottom-right"
  ) {
    return storedCorner;
  }

  return DEFAULT_CORNER;
}

export function DqnamoPanel() {
  const panelRef = useRef<HTMLElement>(null);
  const positionRef = useRef<Position>({
    x: EDGE_GAP,
    y: EDGE_GAP,
  });
  const dragStartRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    position: Position;
  } | null>(null);
  const [corner, setCorner] = useState<Corner>(DEFAULT_CORNER);
  const [position, setPosition] = useState<Position>({
    x: EDGE_GAP,
    y: EDGE_GAP,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isRightAligned, setIsRightAligned] = useState(false);
  const [hasMeasured, setHasMeasured] = useState(false);

  const updatePosition = useCallback(function updatePosition(
    nextPosition: Position,
  ) {
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, []);

  const updateAlignment = useCallback(function updateAlignment(
    nextPosition: Position,
    width: number,
  ) {
    setIsRightAligned(nextPosition.x + width / 2 > window.innerWidth / 2);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const storedCorner = getStoredCorner();
    const storedPosition = getCornerPosition(storedCorner, width, height);
    const responsiveCorner = getResponsiveCorner(storedCorner);

    setCorner(storedCorner);
    setIsRightAligned(responsiveCorner.endsWith("right"));
    updatePosition(storedPosition);
    setHasMeasured(true);
  }, [updatePosition]);

  useEffect(() => {
    function snapCurrentCorner() {
      const panel = panelRef.current;

      if (!panel) {
        return;
      }

      const nextPosition = getCornerPosition(
        corner,
        panel.offsetWidth,
        panel.offsetHeight,
      );
      const responsiveCorner = getResponsiveCorner(corner);

      updatePosition(nextPosition);
      setIsRightAligned(responsiveCorner.endsWith("right"));
    }

    window.addEventListener("resize", snapCurrentCorner);

    return () => window.removeEventListener("resize", snapCurrentCorner);
  }, [corner, updatePosition]);

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || isInteractiveElement(event.target)) {
      return;
    }

    dragStartRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      position: positionRef.current,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const dragStart = dragStartRef.current;
    const panel = panelRef.current;

    if (!dragStart || !panel || dragStart.pointerId !== event.pointerId) {
      return;
    }

    const nextX = dragStart.position.x + event.clientX - dragStart.pointerX;
    const nextY = dragStart.position.y + event.clientY - dragStart.pointerY;
    const maxX = window.innerWidth - panel.offsetWidth - EDGE_GAP;
    const maxY = window.innerHeight - panel.offsetHeight - EDGE_GAP;

    const nextPosition = {
      x: Math.min(Math.max(EDGE_GAP, nextX), Math.max(EDGE_GAP, maxX)),
      y: Math.min(Math.max(EDGE_GAP, nextY), Math.max(EDGE_GAP, maxY)),
    };

    updatePosition(nextPosition);
    updateAlignment(nextPosition, panel.offsetWidth);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    const dragStart = dragStartRef.current;
    const panel = panelRef.current;

    if (!dragStart || !panel || dragStart.pointerId !== event.pointerId) {
      return;
    }

    const nextCorner = getClosestCorner(
      positionRef.current,
      panel.offsetWidth,
      panel.offsetHeight,
    );
    const nextPosition = getCornerPosition(
      nextCorner,
      panel.offsetWidth,
      panel.offsetHeight,
    );
    const responsiveCorner = getResponsiveCorner(nextCorner);

    dragStartRef.current = null;
    setIsDragging(false);
    setCorner(nextCorner);
    setIsRightAligned(responsiveCorner.endsWith("right"));
    updatePosition(nextPosition);
    window.localStorage.setItem(STORAGE_KEY, nextCorner);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <aside
      aria-label="dqnamo controls"
      className={cn(
        "small-shadow fixed top-0 left-0 z-100 hidden w-full max-w-60 divide-y divide-grayscale-3 rounded-lg border border-grayscale-3 bg-white md:block dark:bg-grayscale-2",
        "cursor-grab touch-none select-none active:cursor-grabbing",
        hasMeasured ? "opacity-100" : "pointer-events-none opacity-0",
        isDragging ? "" : "transition-transform duration-300 ease-out",
      )}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={panelRef}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
    >
      <div
        className={cn(
          "flex flex-col p-2",
          isRightAligned ? "items-end text-right" : "items-start text-left",
        )}
      >
        <h1 className="font-pirata font-bold text-xl">
          <a
            className="text-grayscale-11 transition-colors duration-200 hover:text-grayscale-12"
            href="https://dqnamo.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            dqnamo
          </a>
        </h1>
        <div
          className={cn(
            "flex w-full flex-row items-center justify-between gap-3",
            isRightAligned && "flex-row-reverse",
          )}
        >
          <p className="font-medium font-mono text-grayscale-10 text-xs">
            dqnamo/factory
          </p>
          <p className="font-mono font-semibold text-grayscale-8 text-tiny">
            V1
          </p>
        </div>
      </div>
      <div
        className={cn(
          "flex flex-row items-center justify-between gap-2 p-2",
          isRightAligned && "flex-row-reverse",
        )}
      >
        <p className="font-medium font-mono text-grayscale-10 text-tiny uppercase">
          Dark Mode
        </p>
        <ThemeToggle />
      </div>
    </aside>
  );
}
