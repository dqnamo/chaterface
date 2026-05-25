"use client";

import { CaretDown, Lightning } from "@phosphor-icons/react";
import { Menu } from "@/components/public/Menu";
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
  const modelLabel = getWorkerOptionLabel(workerModelOptions, model);
  const reasoningLabel = getWorkerOptionLabel(
    workerReasoningLevelOptions,
    reasoningLevel,
  );
  const speedLabel = getWorkerOptionLabel(workerSpeedOptions, speed);

  function onModelChange(nextModel: WorkerModel) {
    setModel(nextModel);

    if (!isFastSupportedWorkerModel(nextModel)) {
      setSpeed("standard");
    }
  }

  return (
    <Menu.Composed
      modal={false}
      popupProps={{ className: "w-64" }}
      positionerProps={{ sideOffset: 8 }}
      showArrow={false}
      trigger={
        <>
          <Lightning size={16} weight="bold" aria-hidden="true" />
          <span className="font-semibold text-grayscale-12">
            {getCompactModelLabel(model)}
          </span>
          <span>{reasoningLabel}</span>
          <span className="sr-only">worker settings</span>
          <CaretDown size={14} weight="bold" aria-hidden="true" />
        </>
      }
      triggerProps={{
        "aria-label": `Worker settings: ${modelLabel}, ${reasoningLabel}, ${speedLabel}`,
        className:
          "h-9 text-grayscale-10 disabled:cursor-not-allowed disabled:opacity-60",
        disabled,
        type: "button",
      }}
    >
      <WorkerRunOptionsSubmenu
        label="Model"
        selectedLabel={modelLabel}
        value={model}
        onValueChange={(value) => onModelChange(value as WorkerModel)}
        options={workerModelOptions}
      />
      <WorkerRunOptionsSubmenu
        label="Reasoning"
        selectedLabel={reasoningLabel}
        value={reasoningLevel}
        onValueChange={(value) =>
          setReasoningLevel(value as WorkerReasoningLevel)
        }
        options={workerReasoningLevelOptions}
      />
      <WorkerRunOptionsSubmenu
        getDisabled={(value) =>
          value === "fast" && !isFastAvailable
            ? "Fast mode is available for GPT-5.5 and GPT-5.4."
            : undefined
        }
        label="Speed"
        selectedLabel={speedLabel}
        value={speed}
        onValueChange={(value) => setSpeed(value as WorkerSpeed)}
        options={workerSpeedOptions}
      />
    </Menu.Composed>
  );
}

function WorkerRunOptionsSubmenu<TValue extends string>({
  getDisabled,
  label,
  onValueChange,
  options,
  selectedLabel,
  value,
}: {
  getDisabled?: (value: TValue) => string | undefined;
  label: string;
  onValueChange: (value: TValue) => void;
  options: readonly { label: string; value: TValue }[];
  selectedLabel: string;
  value: TValue;
}) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <span>{label}</span>
        <span className="ml-auto mr-4 text-grayscale-9 text-xs">
          {selectedLabel}
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup className="w-48">
            <Menu.Viewport>
              <Menu.RadioGroup value={value} onValueChange={onValueChange}>
                {options.map((option) => {
                  const disabledReason = getDisabled?.(option.value);

                  return (
                    <Menu.RadioItem
                      disabled={Boolean(disabledReason)}
                      key={option.value}
                      title={disabledReason}
                      value={option.value}
                    >
                      <Menu.RadioItemIndicator />
                      <span>{option.label}</span>
                    </Menu.RadioItem>
                  );
                })}
              </Menu.RadioGroup>
            </Menu.Viewport>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

function getWorkerOptionLabel<TValue extends string>(
  options: readonly { label: string; value: TValue }[],
  value: TValue,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getCompactModelLabel(model: WorkerModel) {
  return model.replace(/^gpt-/, "").replace(/-codex-spark$/, " Spark");
}
