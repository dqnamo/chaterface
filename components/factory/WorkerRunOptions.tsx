"use client";

import {
  isFastSupportedWorkerModel,
  type WorkerModel,
  type WorkerReasoningLevel,
  type WorkerSpeed,
  workerModelOptions,
  workerReasoningLevelOptions,
  workerSpeedOptions,
} from "@/lib/codex/worker-options";

export function WorkerRunOptions({
  disabled,
  model,
  reasoningLevel,
  setModel,
  setReasoningLevel,
  setSpeed,
  speed,
}: {
  disabled?: boolean;
  model: WorkerModel;
  reasoningLevel: WorkerReasoningLevel;
  setModel: (model: WorkerModel) => void;
  setReasoningLevel: (reasoningLevel: WorkerReasoningLevel) => void;
  setSpeed: (speed: WorkerSpeed) => void;
  speed: WorkerSpeed;
}) {
  const isFastAvailable = isFastSupportedWorkerModel(model);

  function onModelChange(nextModel: WorkerModel) {
    setModel(nextModel);

    if (!isFastSupportedWorkerModel(nextModel)) {
      setSpeed("standard");
    }
  }

  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-grayscale-11 text-xs">
        <span className="font-medium">Model</span>
        <select
          className="h-9 rounded-lg border border-grayscale-3 bg-grayscale-1 px-2 text-grayscale-12 text-sm outline-none focus:border-accent-9 disabled:cursor-not-allowed disabled:text-grayscale-10 dark:bg-grayscale-3"
          disabled={disabled}
          onChange={(event) => onModelChange(event.target.value as WorkerModel)}
          value={model}
        >
          {workerModelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-grayscale-11 text-xs">
        <span className="font-medium">Thinking</span>
        <select
          className="h-9 rounded-lg border border-grayscale-3 bg-grayscale-1 px-2 text-grayscale-12 text-sm outline-none focus:border-accent-9 disabled:cursor-not-allowed disabled:text-grayscale-10 dark:bg-grayscale-3"
          disabled={disabled}
          onChange={(event) =>
            setReasoningLevel(event.target.value as WorkerReasoningLevel)
          }
          value={reasoningLevel}
        >
          {workerReasoningLevelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-grayscale-11 text-xs">
        <span className="font-medium">Speed</span>
        <select
          className="h-9 rounded-lg border border-grayscale-3 bg-grayscale-1 px-2 text-grayscale-12 text-sm outline-none focus:border-accent-9 disabled:cursor-not-allowed disabled:text-grayscale-10 dark:bg-grayscale-3"
          disabled={disabled}
          onChange={(event) => setSpeed(event.target.value as WorkerSpeed)}
          value={speed}
        >
          {workerSpeedOptions.map((option) => (
            <option
              disabled={option.value === "fast" && !isFastAvailable}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
