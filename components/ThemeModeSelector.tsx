"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/helpers/classname-helper";

const THEME_OPTIONS = [
  {
    icon: SunIcon,
    label: "Light",
    value: "light",
  },
  {
    icon: MoonIcon,
    label: "Dark",
    value: "dark",
  },
  {
    icon: MonitorIcon,
    label: "Auto",
    value: "system",
  },
] as const;

export function ThemeModeSelector() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? (theme ?? "system") : "system";

  return (
    <fieldset className="grid w-full grid-cols-3 rounded-lg border border-grayscale-3 bg-grayscale-2 p-1 sm:w-auto">
      <legend className="sr-only">Theme mode</legend>
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = activeTheme === option.value;

        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "flex min-h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 font-medium text-grayscale-10 text-xs transition-colors hover:text-grayscale-12",
              isActive && "bg-grayscale-1 text-grayscale-12 shadow-sm",
              !mounted && "cursor-not-allowed opacity-70",
            )}
            disabled={!mounted}
            key={option.value}
            onClick={() => setTheme(option.value)}
            type="button"
          >
            <Icon aria-hidden="true" size={14} weight="bold" />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </fieldset>
  );
}
