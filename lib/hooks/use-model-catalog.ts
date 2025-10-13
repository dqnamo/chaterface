import { useCallback, useEffect, useMemo, useState } from "react";
import type { ModelSummary, ProviderSummary } from "@/constants/models";

interface CatalogResponse {
  models: ModelSummary[];
  providers: ProviderSummary[];
  error?: string;
}

let cachedModels: ModelSummary[] | null = null;
let cachedProviders: ProviderSummary[] | null = null;
let cachedError: string | null = null;
let inFlightRequest: Promise<void> | null = null;

async function fetchCatalog(): Promise<void> {
  if (!inFlightRequest) {
    inFlightRequest = fetch("/api/models")
      .then(async (response) => {
        if (!response.ok) {
          const errorBody = (await response.json().catch(() => ({ error: response.statusText }))) as CatalogResponse;
          throw new Error(errorBody.error || "Unable to load models");
        }

        const data = (await response.json()) as CatalogResponse;
        cachedModels = data.models ?? [];
        cachedProviders = data.providers ?? [];
        cachedError = data.error ?? null;
      })
      .catch((error: unknown) => {
        cachedModels = [];
        cachedProviders = [];
        cachedError = error instanceof Error ? error.message : "Unknown error";
      })
      .finally(() => {
        inFlightRequest = null;
      });
  }

  return inFlightRequest;
}

export function useModelCatalog() {
  const [loading, setLoading] = useState(!cachedModels);
  const [error, setError] = useState<string | null>(cachedError);
  const [models, setModels] = useState<ModelSummary[]>(cachedModels ?? []);
  const [providers, setProviders] = useState<ProviderSummary[]>(cachedProviders ?? []);

  useEffect(() => {
    let isMounted = true;

    if (!cachedModels) {
      setLoading(true);
    }

    fetchCatalog()
      ?.then(() => {
        if (!isMounted) return;
        setModels(cachedModels ?? []);
        setProviders(cachedProviders ?? []);
        setError(cachedError);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refresh = useCallback(() => {
    cachedModels = null;
    cachedProviders = null;
    cachedError = null;
    return fetchCatalog().then(() => {
      setModels(cachedModels ?? []);
      setProviders(cachedProviders ?? []);
      setError(cachedError);
    });
  }, []);

  return useMemo(
    () => ({
      models,
      providers,
      loading,
      error,
      refresh,
    }),
    [models, providers, loading, error, refresh],
  );
}
