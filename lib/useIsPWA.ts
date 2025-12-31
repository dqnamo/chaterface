"use client";

import { useState, useEffect } from "react";

export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as standalone (iOS/iPadOS or generic PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsPWA(isStandalone);
  }, []);

  return isPWA;
}



