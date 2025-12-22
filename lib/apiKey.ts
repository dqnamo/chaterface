"use client";

import { useState, useEffect } from "react";
import { getLocalApiKey } from "./crypto";

/**
 * Hook to get the current OpenRouter API key
 * Returns the key from local storage
 */
export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(() => getLocalApiKey());
  // Determine loading based on whether we've attempted to read from local storage
  // Since getLocalApiKey is synchronous, we can start with false, but for consistency with hydration we might want to check effects.
  // Actually, getLocalApiKey checks window, so it's safe.
  const [isLoading, setIsLoading] = useState(false);

  // Listen for storage events to update key across tabs/components if needed
  useEffect(() => {
    const handleStorageChange = () => {
      setApiKey(getLocalApiKey());
    };

    window.addEventListener("storage", handleStorageChange);
    // Custom event for same-window updates
    window.addEventListener("local-api-key-change", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-api-key-change", handleStorageChange);
    };
  }, []);

  return {
    apiKey,
    isLoading,
    hasKey: !!apiKey,
  };
}

/**
 * Get API key synchronously (for non-hook contexts)
 */
export function getApiKey(): string | null {
  return getLocalApiKey();
}


