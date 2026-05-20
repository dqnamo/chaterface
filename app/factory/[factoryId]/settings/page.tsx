"use client";

import { SwatchesIcon } from "@phosphor-icons/react";
import { ThemeModeSelector } from "@/components/ThemeModeSelector";

export default function FactorySettingsPage() {
  return (
    <main className="min-h-dvh px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col py-2">
          <h1>Factory settings</h1>
          <p className="text-grayscale-10 text-sm">
            Configure preferences for this factory workspace.
          </p>
        </div>

        <section className="overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1">
          <div className="border-grayscale-3 border-b px-3 py-2">
            <h2 className="font-mono font-bold text-[11px] text-grayscale-10 uppercase tracking-wide">
              Appearance
            </h2>
          </div>
          <div className="flex flex-col gap-4 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-2 text-grayscale-11">
                <SwatchesIcon aria-hidden="true" size={16} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-grayscale-12 text-sm">Theme</p>
                <p className="text-grayscale-10 text-xs">
                  Choose a light, dark, or system-matched appearance.
                </p>
              </div>
            </div>
            <ThemeModeSelector />
          </div>
        </section>
      </div>
    </main>
  );
}
