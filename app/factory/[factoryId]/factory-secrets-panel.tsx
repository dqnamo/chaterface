"use client";

import { KeyIcon, TrashIcon } from "@phosphor-icons/react";
import { type FormEvent, useMemo, useState } from "react";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import Input from "@/components/public/Input";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type SecretRecord = {
  createdAt?: string;
  id: string;
  name?: string;
  updatedAt?: string;
};

type FactoryWithSecretsRecord = {
  id: string;
  secrets?: SecretRecord[];
};

export function FactorySecretsPanel({ factoryId }: { factoryId: string }) {
  if (!db) {
    return null;
  }

  return <FactorySecretsPanelContent factoryId={factoryId} instantDb={db} />;
}

function FactorySecretsPanelContent({
  factoryId,
  instantDb,
}: {
  factoryId: string;
  instantDb: AppDb;
}) {
  const { user } = instantDb.useAuth();
  const { data, error, isLoading } = instantDb.useQuery(
    user?.id
      ? {
          factories: {
            $: { where: { id: factoryId } },
            secrets: {},
          },
        }
      : null,
  );
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingSecretId, setDeletingSecretId] = useState<string | null>(null);

  const factory = data?.factories?.[0] as FactoryWithSecretsRecord | undefined;
  const secrets = useMemo(
    () =>
      [...(factory?.secrets ?? [])].sort((first, second) =>
        (first.name ?? "").localeCompare(second.name ?? ""),
      ),
    [factory?.secrets],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.refresh_token) {
      setFormError("You must be signed in to save secrets.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/factories/${factoryId}/secrets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.refresh_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, value }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(body?.error ?? "Secret could not be saved.");
      }

      setName("");
      setValue("");
    } catch (saveError) {
      console.error(saveError);
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Secret could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete(secretId: string) {
    if (!user?.refresh_token) {
      setFormError("You must be signed in to delete secrets.");
      return;
    }

    setDeletingSecretId(secretId);
    setFormError(null);

    try {
      const response = await fetch(
        `/api/factories/${factoryId}/secrets/${secretId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.refresh_token}`,
          },
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(body?.error ?? "Secret could not be deleted.");
      }
    } catch (deleteError) {
      console.error(deleteError);
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Secret could not be deleted.",
      );
    } finally {
      setDeletingSecretId(null);
    }
  }

  return (
    <Card layer={0} className="w-full max-w-2xl gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-grayscale-12 text-sm">Secrets</h2>
          <p className="text-grayscale-10 text-xs">Environment variables</p>
        </div>
        <KeyIcon
          aria-hidden="true"
          className="shrink-0 text-grayscale-10"
          size={18}
          weight="bold"
        />
      </div>

      <form
        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={onSubmit}
      >
        <Input
          aria-label="Secret name"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="w-full bg-grayscale-1 font-mono"
          name="name"
          onChange={(event) => setName(event.target.value)}
          pattern="[A-Za-z_][A-Za-z0-9_]*"
          placeholder="OPENAI_API_KEY"
          spellCheck={false}
          value={name}
        />
        <Input
          aria-label="Secret value"
          autoComplete="off"
          className="w-full bg-grayscale-1 font-mono"
          name="value"
          onChange={(event) => setValue(event.target.value)}
          placeholder="Value"
          type="password"
          value={value}
        />
        <Button className="justify-center" disabled={isSaving} type="submit">
          {isSaving ? "Saving" : "Save"}
        </Button>
      </form>

      {formError ? (
        <p className="text-red-600 text-sm dark:text-red-400">{formError}</p>
      ) : null}
      {error ? (
        <p className="text-red-600 text-sm dark:text-red-400">
          {error.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        {isLoading ? (
          <p className="text-grayscale-10 text-sm">Loading secrets...</p>
        ) : secrets.length > 0 ? (
          secrets.map((secret) => (
            <div
              className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-grayscale-3 bg-grayscale-1 px-3"
              key={secret.id}
            >
              <span className="min-w-0 truncate font-mono text-grayscale-12 text-sm">
                {secret.name}
              </span>
              <button
                aria-label={`Delete ${secret.name ?? "secret"}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-grayscale-10 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={deletingSecretId === secret.id}
                onClick={() => onDelete(secret.id)}
                type="button"
              >
                <TrashIcon aria-hidden="true" size={16} weight="bold" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-grayscale-10 text-sm">No secrets yet.</p>
        )}
      </div>
    </Card>
  );
}
