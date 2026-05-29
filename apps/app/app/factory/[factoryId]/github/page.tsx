"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  type ApiError,
  Field,
  getApiError,
  getJsonAuthHeaders,
  Notice,
} from "@/components/factory/capabilities/shared";
import {
  FactorySectionCard,
  FactorySectionPageShell,
} from "@/components/factory/FactorySectionLayout";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type GithubRepositoryRow = {
  id: string;
  path: string;
  url: string;
};

type GithubSettingsRecord = {
  appliedAt?: string;
  gitEmail?: string;
  gitName?: string;
  hasToken?: boolean;
  lastError?: string;
  repositories?: unknown;
  status?: string;
  updatedAt?: string;
};

export default function FactoryGithubPage() {
  const { factoryId } = useParams<{ factoryId: string }>();

  return <FactoryGithubPageContent factoryId={factoryId} instantDb={db} />;
}

function FactoryGithubPageContent({
  factoryId,
  instantDb,
}: {
  factoryId: string;
  instantDb: AppDb;
}) {
  const { user } = instantDb.useAuth();
  const { data, error, isLoading } = instantDb.useQuery(
    factoryId
      ? {
          factories: {
            $: { where: { id: factoryId } },
            githubSettings: {},
          },
        }
      : null,
  );
  const settings = data?.factories?.[0]?.githubSettings as
    | GithubSettingsRecord
    | undefined;
  const settingsRows = useMemo(
    () => toRepositoryRows(settings?.repositories),
    [settings?.repositories],
  );
  const [gitName, setGitName] = useState("");
  const [gitEmail, setGitEmail] = useState("");
  const [token, setToken] = useState("");
  const [repositories, setRepositories] = useState<GithubRepositoryRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setGitName(settings?.gitName ?? "");
    setGitEmail(settings?.gitEmail ?? "");
    setToken("");
    setRepositories(settingsRows);
  }, [settings?.gitEmail, settings?.gitName, settingsRows]);

  async function saveGithubSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    if (!user?.refresh_token) {
      setFormError("You must be signed in to save GitHub setup.");
      return;
    }

    setIsSaving(true);

    try {
      const trimmedToken = token.trim();
      const response = await fetch(`/api/factories/${factoryId}/github`, {
        method: "POST",
        headers: getJsonAuthHeaders(user.refresh_token),
        body: JSON.stringify({
          gitEmail,
          gitName,
          repositories: repositories.map((repository) => ({
            path: repository.path,
            url: repository.url,
          })),
          ...(trimmedToken ? { token: trimmedToken } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        throw new Error(
          getApiError(body) ?? "GitHub setup could not be saved.",
        );
      }

      setToken("");
      setNotice("GitHub setup will be applied before workers run.");
    } catch (saveError) {
      console.error(saveError);
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "GitHub setup could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateRepository(id: string, field: "path" | "url", value: string) {
    setRepositories((current) =>
      current.map((repository) =>
        repository.id === id ? { ...repository, [field]: value } : repository,
      ),
    );
  }

  function addRepository() {
    setRepositories((current) => [
      ...current,
      { id: createRowId(), path: "", url: "" },
    ]);
  }

  function removeRepository(id: string) {
    setRepositories((current) =>
      current.filter((repository) => repository.id !== id),
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-grayscale-11">
        Loading GitHub setup...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-semibold text-base text-grayscale-12">
            GitHub setup could not be loaded
          </h1>
          <p className="mt-2 text-grayscale-11 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <FactorySectionPageShell
      title="GitHub"
      description="Configure git identity, repository access, and repository setup for workers."
    >
      <FactorySectionCard>
        <form className="flex flex-col gap-5" onSubmit={saveGithubSettings}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Git name">
              <Input
                value={gitName}
                onChange={(event) => setGitName(event.target.value)}
                placeholder="Ada Lovelace"
                disabled={isSaving}
              />
            </Field>
            <Field label="Git email">
              <Input
                value={gitEmail}
                onChange={(event) => setGitEmail(event.target.value)}
                placeholder="ada@example.com"
                disabled={isSaving}
              />
            </Field>
          </div>

          <Field
            label="GitHub token"
            hint={
              settings?.hasToken
                ? "A token is already configured. Enter a new one to replace it."
                : "Used for HTTPS clones and git fetches inside the factory computer."
            }
          >
            <Input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={settings?.hasToken ? "Token configured" : "ghp_..."}
              type="password"
              disabled={isSaving}
            />
          </Field>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-medium text-grayscale-12 text-sm">
                  Repositories
                </h2>
                <p className="text-grayscale-10 text-xs">
                  Clone paths can be relative to /workspace/home.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={addRepository}
                disabled={isSaving}
              >
                <PlusIcon size={14} weight="bold" aria-hidden="true" />
                Add repo
              </Button>
            </div>

            {repositories.length === 0 ? (
              <div className="rounded-lg border border-grayscale-3 bg-grayscale-1 px-3 py-4 text-center text-grayscale-10 text-sm">
                No repositories configured.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {repositories.map((repository) => (
                  <div
                    key={repository.id}
                    className="grid gap-2 rounded-lg border border-grayscale-3 bg-grayscale-1 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
                  >
                    <Input
                      value={repository.url}
                      onChange={(event) =>
                        updateRepository(
                          repository.id,
                          "url",
                          event.target.value,
                        )
                      }
                      placeholder="https://github.com/org/repo.git"
                      disabled={isSaving}
                    />
                    <Input
                      value={repository.path}
                      onChange={(event) =>
                        updateRepository(
                          repository.id,
                          "path",
                          event.target.value,
                        )
                      }
                      placeholder="code/repo"
                      disabled={isSaving}
                    />
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center rounded-lg border border-grayscale-4 text-grayscale-10 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12"
                      aria-label="Remove repository"
                      onClick={() => removeRepository(repository.id)}
                      disabled={isSaving}
                    >
                      <TrashIcon size={15} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {settings?.lastError ? (
            <Notice tone="error">{settings.lastError}</Notice>
          ) : null}
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          {notice ? <Notice tone="accent">{notice}</Notice> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Applying..." : "Apply GitHub setup"}
            </Button>
          </div>
        </form>
      </FactorySectionCard>
    </FactorySectionPageShell>
  );
}

function toRepositoryRows(value: unknown): GithubRepositoryRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (repository): repository is { path: string; url: string } =>
        Boolean(repository) &&
        typeof repository === "object" &&
        "path" in repository &&
        "url" in repository &&
        typeof repository.path === "string" &&
        typeof repository.url === "string",
    )
    .map((repository) => ({
      id: createRowId(),
      path: repository.path,
      url: repository.url,
    }));
}

function createRowId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())
  );
}
