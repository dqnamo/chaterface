"use client";

import {
  CheckIcon,
  SwatchesIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useParams, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import FactoryMonogram from "@/components/factory/FactoryMonogram";
import Button from "@/components/public/Button";
import { ThemeModeSelector } from "@/components/ThemeModeSelector";
import { cn } from "@/helpers/classname-helper";
import {
  DEFAULT_FACTORY_COLOR,
  FACTORY_COLOR_OPTIONS,
  type FactoryColorValue,
  getFactoryColor,
} from "@/helpers/factory-colors";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type FactoryRecord = {
  color?: FactoryColorValue;
  id: string;
  name: string;
};

export default function FactorySettingsPage() {
  const { factoryId } = useParams<{ factoryId: string }>();

  if (!db) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-sm text-grayscale-11">
        InstantDB is not configured.
      </main>
    );
  }

  return <FactorySettingsPageContent factoryId={factoryId} instantDb={db} />;
}

function FactorySettingsPageContent({
  factoryId,
  instantDb,
}: {
  factoryId: string;
  instantDb: AppDb;
}) {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = instantDb.useAuth();
  const { data, error, isLoading } = instantDb.useQuery(
    user?.id
      ? {
          factories: {
            $: { where: { id: factoryId } },
          },
        }
      : null,
  );
  const factory = data?.factories?.[0] as FactoryRecord | undefined;
  const currentColor = getFactoryColor(factory?.color);
  const [selectedColor, setSelectedColor] = useState<FactoryColorValue>(
    DEFAULT_FACTORY_COLOR,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  useEffect(() => {
    setSelectedColor(currentColor);
  }, [currentColor]);

  async function saveColor(color: FactoryColorValue) {
    if (!user?.refresh_token) {
      setFormError("You must be signed in to update factory settings.");
      return;
    }

    setSelectedColor(color);
    setIsSaving(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/factories/${factoryId}/settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${user.refresh_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ color }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(body?.error ?? "Factory settings could not be saved.");
      }
    } catch (saveError) {
      console.error(saveError);
      setSelectedColor(currentColor);
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Factory settings could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteFactory() {
    if (!factory) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${factory.name}"? This permanently removes the factory from Factoryplane.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await instantDb.transact(instantDb.tx.factories[factoryId].delete());
      router.replace("/factories");
      router.refresh();
    } catch (deleteFactoryError) {
      console.error(deleteFactoryError);
      setDeleteError(
        deleteFactoryError instanceof Error
          ? deleteFactoryError.message
          : "Factory could not be deleted.",
      );
      setIsDeleting(false);
    }
  }

  if (isAuthLoading || !user || isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-sm text-grayscale-11">
        Loading settings...
      </main>
    );
  }

  if (error || !factory) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <h1 className="font-semibold text-base text-grayscale-12">
            Settings could not be loaded
          </h1>
          <p className="mt-2 text-grayscale-11 text-sm">
            {error?.message ?? "Factory not found."}
          </p>
        </div>
      </main>
    );
  }

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

        <section className="overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1">
          <div className="border-grayscale-3 border-b px-3 py-2">
            <h2 className="font-mono font-bold text-[11px] text-grayscale-10 uppercase tracking-wide">
              Factory color
            </h2>
          </div>
          <div className="flex flex-col gap-4 px-3 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-grayscale-12 text-sm">
                  Monogram
                </p>
                <p className="text-grayscale-10 text-xs">
                  Used for this factory in the rail.
                </p>
              </div>
              <FactoryMonogram color={selectedColor} name={factory.name} />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FACTORY_COLOR_OPTIONS.map((option) => {
                const isSelected = selectedColor === option.id;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      "flex min-h-10 items-center justify-between gap-2 rounded-lg border bg-grayscale-1 px-2 py-2 text-left text-sm transition-colors hover:bg-grayscale-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-9 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                      isSelected
                        ? "border-grayscale-8 text-grayscale-12"
                        : "border-grayscale-3 text-grayscale-11",
                    )}
                    disabled={isSaving}
                    key={option.id}
                    onClick={() => saveColor(option.id)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-4 shrink-0 rounded-md border"
                        style={getColorSwatchStyle(option.id)}
                      />
                      <span className="truncate">{option.label}</span>
                    </span>
                    {isSelected ? (
                      <CheckIcon
                        aria-hidden="true"
                        className="shrink-0 text-grayscale-11"
                        size={14}
                        weight="bold"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {formError ? (
              <p className="text-red-11 text-sm" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button disabled className="w-max opacity-70" variant="secondary">
                {isSaving ? "Saving..." : "Saved automatically"}
              </Button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-red-6 bg-red-2">
          <div className="border-red-6 border-b px-3 py-2">
            <h2 className="font-mono font-bold text-[11px] text-red-11 uppercase tracking-wide">
              Danger zone
            </h2>
          </div>
          <div className="flex flex-col gap-4 px-3 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-red-6 bg-red-3 text-red-11">
                <WarningIcon aria-hidden="true" size={16} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-red-12 text-sm">
                  Delete factory
                </p>
                <p className="text-red-11 text-xs">
                  Permanently removes this factory. Downstream cleanup should
                  run from the factory delete event.
                </p>
              </div>
            </div>

            {deleteError ? (
              <p className="text-red-11 text-sm" role="alert">
                {deleteError}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                className="border-red-8 bg-red-9 text-white hover:border-red-9 hover:bg-red-10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
                onClick={deleteFactory}
                type="button"
              >
                <TrashIcon aria-hidden="true" size={14} weight="bold" />
                {isDeleting ? "Deleting..." : "Delete factory"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function getColorSwatchStyle(color: FactoryColorValue): CSSProperties {
  return {
    backgroundColor: `var(--${color}-9)`,
    borderColor: `var(--${color}-7)`,
  };
}
