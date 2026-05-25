export const defaultWorkerModel = "gpt-5.5";
export const defaultWorkerReasoningLevel = "medium";
export const defaultWorkerSpeed = "standard";

export const workerModelOptions = [
  { label: "GPT-5.5", value: "gpt-5.5" },
  { label: "GPT-5.4", value: "gpt-5.4" },
  { label: "GPT-5.3 Codex Spark", value: "gpt-5.3-codex-spark" },
] as const;

export const workerSpeedOptions = [
  { label: "Standard", value: "standard" },
  { label: "Fast", value: "fast" },
] as const;

export const workerReasoningLevelOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "X High", value: "xhigh" },
] as const;

export type WorkerModel = (typeof workerModelOptions)[number]["value"];
export type WorkerReasoningLevel =
  (typeof workerReasoningLevelOptions)[number]["value"];
export type WorkerSpeed = (typeof workerSpeedOptions)[number]["value"];

const workerModelValues = new Set<string>(
  workerModelOptions.map((option) => option.value),
);
const workerSpeedValues = new Set<string>(
  workerSpeedOptions.map((option) => option.value),
);
const workerReasoningLevelValues = new Set<string>(
  workerReasoningLevelOptions.map((option) => option.value),
);
const fastSupportedModels = new Set<string>(["gpt-5.5", "gpt-5.4"]);

export function normalizeWorkerModel(value?: null | string): WorkerModel {
  return workerModelValues.has(value ?? "")
    ? (value as WorkerModel)
    : defaultWorkerModel;
}

export function normalizeWorkerSpeed({
  model,
  speed,
}: {
  model?: null | string;
  speed?: null | string;
}): WorkerSpeed {
  if (!workerSpeedValues.has(speed ?? "")) {
    return defaultWorkerSpeed;
  }

  if (speed === "fast" && !isFastSupportedWorkerModel(model)) {
    return defaultWorkerSpeed;
  }

  return speed as WorkerSpeed;
}

export function normalizeWorkerReasoningLevel(
  value?: null | string,
): WorkerReasoningLevel {
  return workerReasoningLevelValues.has(value ?? "")
    ? (value as WorkerReasoningLevel)
    : defaultWorkerReasoningLevel;
}

export function isFastSupportedWorkerModel(value?: null | string) {
  return fastSupportedModels.has(value ?? "");
}
