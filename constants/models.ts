import type { LanguageModelUsage } from "ai";

export interface ModelPricingDetails {
  prompt: number | null;
  completion: number | null;
  image: number | null;
  request: number | null;
  inputCacheRead: number | null;
  inputCacheWrite: number | null;
  webSearch: number | null;
  internalReasoning: number | null;
}

export interface ModelSummary {
  id: string;
  name: string;
  description?: string;
  created?: number;
  provider: string;
  contextLength?: number | null;
  supportedParameters: string[];
  defaultParameters: Record<string, number | null> | null;
  pricing: ModelPricingDetails;
  free: boolean;
}

export interface ProviderSummary {
  id: string;
  name: string;
  models: string[];
}

interface OpenRouterModelResponse {
  data: Array<{
    id: string;
    name?: string;
    description?: string;
    created?: number;
    context_length?: number | null;
    supported_parameters?: string[];
    default_parameters?: Record<string, number | null> | null;
    pricing?: Partial<Record<keyof ModelPricingDetails, string | null>> & {
      prompt?: string | null;
      completion?: string | null;
    };
  }>;
}

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/models";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

let cachedModels: ModelSummary[] | null = null;
let cacheTimestamp = 0;
let inFlight: Promise<ModelSummary[]> | null = null;

function parsePrice(value?: string | null): number | null {
  if (!value) return null;

  // Extract numeric portion of the string (handles values like "$15 / 1M tokens")
  const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function normaliseModel(model: OpenRouterModelResponse["data"][number]): ModelSummary {
  const provider = model.id.includes("/") ? model.id.split("/")[0] : "unknown";

  const pricing: ModelPricingDetails = {
    prompt: parsePrice(model.pricing?.prompt ?? null),
    completion: parsePrice(model.pricing?.completion ?? null),
    image: parsePrice(model.pricing?.image ?? null),
    request: parsePrice(model.pricing?.request ?? null),
    inputCacheRead: parsePrice(model.pricing?.input_cache_read ?? null),
    inputCacheWrite: parsePrice(model.pricing?.input_cache_write ?? null),
    webSearch: parsePrice(model.pricing?.web_search ?? null),
    internalReasoning: parsePrice(model.pricing?.internal_reasoning ?? null),
  };

  const free = [
    pricing.prompt,
    pricing.completion,
    pricing.request,
    pricing.webSearch,
    pricing.internalReasoning
  ].every((value) => value === null || value === 0);

  return {
    id: model.id,
    name: model.name ?? model.id,
    description: model.description,
    created: model.created,
    provider,
    contextLength: model.context_length,
    supportedParameters: model.supported_parameters ?? [],
    defaultParameters: model.default_parameters ?? null,
    pricing,
    free,
  };
}

async function requestModelsFromApi(): Promise<ModelSummary[]> {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "GET",
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://chaterface.app",
      "X-Title": "Chaterface",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models from OpenRouter: ${response.status}`);
  }

  const data = (await response.json()) as OpenRouterModelResponse;
  const normalised = data.data.map(normaliseModel);
  normalised.sort((a, b) => a.name.localeCompare(b.name));
  return normalised;
}

export async function fetchModelCatalog(options: { force?: boolean } = {}): Promise<ModelSummary[]> {
  const { force = false } = options;
  const now = Date.now();

  if (!force && cachedModels && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedModels;
  }

  if (!force && inFlight) {
    return inFlight;
  }

  inFlight = requestModelsFromApi()
    .then((models) => {
      cachedModels = models;
      cacheTimestamp = Date.now();
      return models;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function groupProviders(models: ModelSummary[]): ProviderSummary[] {
  const providerMap = new Map<string, Set<string>>();

  models.forEach((model) => {
    if (!providerMap.has(model.provider)) {
      providerMap.set(model.provider, new Set());
    }
    providerMap.get(model.provider)?.add(model.id);
  });

  return Array.from(providerMap.entries()).map(([id, modelIds]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    models: Array.from(modelIds),
  }));
}

export async function fetchProviderCatalog(options: { force?: boolean } = {}): Promise<ProviderSummary[]> {
  const models = await fetchModelCatalog(options);
  return groupProviders(models);
}

interface UsageLike {
  promptTokens?: number;
  completionTokens?: number;
}

function ensureUsage(usage?: LanguageModelUsage | UsageLike): UsageLike {
  if (!usage) return { promptTokens: 0, completionTokens: 0 };

  const anyUsage = usage as any;

  const promptTokens =
    typeof anyUsage?.promptTokens === "number"
      ? anyUsage.promptTokens
      : typeof anyUsage?.prompt_tokens === "number"
        ? anyUsage.prompt_tokens
        : 0;

  const completionTokens =
    typeof anyUsage?.completionTokens === "number"
      ? anyUsage.completionTokens
      : typeof anyUsage?.completion_tokens === "number"
        ? anyUsage.completion_tokens
        : 0;

  return {
    promptTokens,
    completionTokens,
  };
}

export async function calculateCreditCost(
  modelId: string,
  usage?: LanguageModelUsage | UsageLike,
): Promise<number> {
  const models = await fetchModelCatalog();
  const model = models.find((item) => item.id === modelId);

  if (!model) {
    return 0;
  }

  const usageData = ensureUsage(usage);
  const promptRate = model.pricing.prompt ?? model.pricing.request ?? 0;
  const completionRate = model.pricing.completion ?? model.pricing.request ?? 0;

  const inputCost = promptRate * ((usageData.promptTokens ?? 0) / 1_000_000);
  const outputCost = completionRate * ((usageData.completionTokens ?? 0) / 1_000_000);
  const totalCost = inputCost + outputCost;
  const totalCostWithMarkup = totalCost * 2;
  const totalCostWithMarkupRounded = Math.ceil(totalCostWithMarkup * 1000) / 1000;

  return totalCostWithMarkupRounded * 1000;
}

export function clearModelCache() {
  cachedModels = null;
  cacheTimestamp = 0;
  inFlight = null;
}
