"use client";

import { useState, useEffect } from "react";
import { useData } from "@/app/providers/DataProvider";
import { decrypt, getLocalApiKey } from "./crypto";

/**
 * Hook to get the current OpenRouter API key
 * Returns the key from cloud storage (if signed in and saved there) or local storage
 */
export function useApiKey() {
  const { user, db, isAuthLoading } = useData();
  const [apiKey, setApiKey] = useState<string | null>(() => getLocalApiKey());
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<"local" | "cloud" | null>(
    getLocalApiKey() ? "local" : null
  );

  useEffect(() => {
    async function loadCloudApiKey() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await db.queryOnce({
          $users: { $: { where: { id: user.id } } },
        });
        const userData = data?.$users?.[0];
        const settings = userData?.settings as {
          encryptedApiKey?: string;
        } | null;

        if (settings?.encryptedApiKey) {
          const decrypted = await decrypt(settings.encryptedApiKey, user.id);
          setApiKey(decrypted);
          setSource("cloud");
        }
      } catch (error) {
        console.error("Failed to load cloud API key:", error);
      }
      setIsLoading(false);
    }

    if (!isAuthLoading) {
      loadCloudApiKey();
    }
  }, [user, db, isAuthLoading]);

  return {
    apiKey,
    isLoading: isLoading || isAuthLoading,
    source,
    hasKey: !!apiKey,
  };
}

/**
 * Get API key synchronously (for non-hook contexts)
 * Only returns local storage key - use the hook for full functionality
 */
export function getApiKey(): string | null {
  return getLocalApiKey();
}


