"use client";

import { useEffect, useState } from "react";
import { cn } from "@/helpers/classname-helper";
import {
  THEME_COLOR_OPTIONS,
  type ThemeColorAxis,
  type ThemeColorValue,
} from "@/helpers/theme-options";

type GrayscaleColor = ThemeColorValue<"grayscale">;
type AccentColor = ThemeColorValue<"accent">;

type NaturalPairing = {
  gray: GrayscaleColor;
  label: string;
  description: string;
  accents: AccentColor[];
};

const naturalPairings = [
  {
    gray: "gray",
    label: "Gray",
    description: "Neutral pairing — works with any accent color.",
    accents: [],
  },
  {
    gray: "mauve",
    label: "Mauve",
    description: "Pairs naturally with pink and purple hues.",
    accents: [
      "tomato",
      "red",
      "ruby",
      "crimson",
      "pink",
      "plum",
      "purple",
      "violet",
    ],
  },
  {
    gray: "slate",
    label: "Slate",
    description: "Pairs naturally with blue hues.",
    accents: ["iris", "indigo", "blue", "cyan"],
  },
  {
    gray: "sage",
    label: "Sage",
    description: "Pairs naturally with green hues.",
    accents: ["teal", "jade", "green"],
  },
  {
    gray: "olive",
    label: "Olive",
    description: "Pairs naturally with lime and grass hues.",
    accents: ["grass"],
  },
  {
    gray: "sand",
    label: "Sand",
    description: "Pairs naturally with warm, earthy hues.",
    accents: ["bronze", "gold", "brown", "orange"],
  },
] satisfies NaturalPairing[];

function getStoredValue<TAxis extends ThemeColorAxis>(
  axis: TAxis,
): ThemeColorValue<TAxis> {
  const config = THEME_COLOR_OPTIONS[axis];
  const allowed = new Set<string>(config.values.map((o) => o.id));

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

function persist<TAxis extends ThemeColorAxis>(
  axis: TAxis,
  value: ThemeColorValue<TAxis>,
) {
  const config = THEME_COLOR_OPTIONS[axis];
  try {
    window.localStorage.setItem(config.storageKey, value);
  } catch {
    /* noop */
  }
}

export default function ColorPairings() {
  const [selectedGray, setSelectedGray] = useState<GrayscaleColor>(
    THEME_COLOR_OPTIONS.grayscale.defaultValue,
  );
  const [selectedAccent, setSelectedAccent] = useState<AccentColor>(
    THEME_COLOR_OPTIONS.accent.defaultValue,
  );

  useEffect(() => {
    setSelectedGray(getStoredValue("grayscale"));
    setSelectedAccent(getStoredValue("accent"));
  }, []);

  function selectGray(value: GrayscaleColor) {
    setSelectedGray(value);
    setDocumentColor("grayscale", value);
    persist("grayscale", value);
  }

  function selectAccent(value: AccentColor) {
    setSelectedAccent(value);
    setDocumentColor("accent", value);
    persist("accent", value);
  }

  return (
    <div className="flex flex-col gap-4 mt-4">
      {naturalPairings.map((pairing) => (
        <div className="flex flex-col gap-1.5" key={pairing.gray}>
          <div className="flex flex-row items-center gap-2">
            <button
              aria-label={`Use ${pairing.label} grayscale`}
              aria-pressed={selectedGray === pairing.gray}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md transition-colors cursor-pointer",
                selectedGray === pairing.gray
                  ? "bg-grayscale-5 text-grayscale-12 ring-1 ring-grayscale-7"
                  : "bg-grayscale-3 text-grayscale-11 hover:bg-grayscale-4",
              )}
              onClick={() => selectGray(pairing.gray)}
              type="button"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: `var(--${pairing.gray}-9)` }}
              />
              {pairing.gray}
            </button>
            <span className="text-xs text-grayscale-10">
              {pairing.description}
            </span>
          </div>
          {pairing.accents.length > 0 ? (
            <div className="flex flex-row flex-wrap items-center gap-1.5">
              {pairing.accents.map((accent) => (
                <button
                  aria-label={`Use ${accent} accent`}
                  aria-pressed={selectedAccent === accent}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md transition-colors cursor-pointer",
                    selectedAccent === accent
                      ? "bg-grayscale-5 text-grayscale-12 ring-1 ring-grayscale-7"
                      : "bg-grayscale-3 text-grayscale-11 hover:bg-grayscale-4",
                  )}
                  key={accent}
                  onClick={() => selectAccent(accent)}
                  type="button"
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: `var(--${accent}-9)` }}
                  />
                  {accent}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-grayscale-9 italic">
              Works with all accent colors
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
