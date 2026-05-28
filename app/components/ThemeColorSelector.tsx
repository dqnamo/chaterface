"use client";

import { useEffect, useState } from "react";
import { cn } from "@/helpers/classname-helper";
import {
  THEME_COLOR_OPTIONS,
  type ThemeColorAxis,
  type ThemeColorValue,
} from "@/helpers/theme-options";

function getStoredValue<TAxis extends ThemeColorAxis>(
  axis: TAxis,
): ThemeColorValue<TAxis> {
  const config = THEME_COLOR_OPTIONS[axis];
  const allowed = new Set<string>(config.values.map((option) => option.id));

  try {
    const stored = window.localStorage.getItem(config.storageKey);

    if (stored !== null && allowed.has(stored)) {
      return stored as ThemeColorValue<TAxis>;
    }
  } catch {
    return config.defaultValue as ThemeColorValue<TAxis>;
  }

  return config.defaultValue as ThemeColorValue<TAxis>;
}

function setDocumentColor(axis: ThemeColorAxis, value: string) {
  document.documentElement.dataset[axis] = value;
}

type ThemeColorSelectorProps<TAxis extends ThemeColorAxis> = {
  axis: TAxis;
  variant?: "dot" | "badge";
};

export default function ThemeColorSelector<TAxis extends ThemeColorAxis>({
  axis,
  variant = "dot",
}: ThemeColorSelectorProps<TAxis>) {
  const config = THEME_COLOR_OPTIONS[axis];
  const [selected, setSelected] = useState<ThemeColorValue<TAxis>>(
    config.defaultValue as ThemeColorValue<TAxis>,
  );

  useEffect(() => {
    const initial = getStoredValue(axis);

    setSelected(initial);
    setDocumentColor(axis, initial);
  }, [axis]);

  function selectColor(value: ThemeColorValue<TAxis>) {
    setSelected(value);
    setDocumentColor(axis, value);

    try {
      window.localStorage.setItem(config.storageKey, value);
    } catch {
      // The visible theme should still update if storage is unavailable.
    }
  }

  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      {config.values.map((option) => {
        const isSelected = selected === option.id;

        if (variant === "badge") {
          return (
            <button
              aria-label={`Use ${option.label} ${axis}`}
              aria-pressed={isSelected}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md transition-colors cursor-pointer",
                isSelected
                  ? "bg-grayscale-5 text-grayscale-12 ring-1 ring-grayscale-7"
                  : "bg-grayscale-3 text-grayscale-11 hover:bg-grayscale-4",
              )}
              key={option.id}
              onClick={() => selectColor(option.id as ThemeColorValue<TAxis>)}
              type="button"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: `var(--${option.id}-9)` }}
              />
              {option.id}
            </button>
          );
        }

        return (
          <button
            aria-label={`Use ${option.label} ${axis}`}
            aria-pressed={isSelected}
            className={cn(
              "group relative flex size-5 aspect-square items-center justify-center  border-grayscale-6 bg-grayscale-2 transition-colors hover:border-grayscale-9 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-9",
            )}
            key={option.id}
            onClick={() => selectColor(option.id as ThemeColorValue<TAxis>)}
            title={option.label}
            type="button"
          >
            <span
              className="size-5 relative rounded-md aspect-square transition-transform group-hover:scale-110"
              style={{ backgroundColor: `var(--${option.id}-9)` }}
            />
            {isSelected ? (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 bg-white rounded-xs"
                style={{ backgroundColor: `var(--${option.id}-5)` }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
