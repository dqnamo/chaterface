"use client";

import { PuzzlePiece } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import {
  type ApiError,
  CapabilityList,
  Field,
  getApiError,
  getJsonAuthHeaders,
  Notice,
  type SkillCandidate,
} from "@/components/factory/capabilities/shared";
import { FactorySectionCard } from "@/components/factory/FactorySectionLayout";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import Input from "@/components/public/Input";
import type { AppDb } from "@/lib/db.client";

type SkillRecord = {
  id: string;
  installedAt?: string;
  lastError?: string;
  name: string;
  repoUrl: string;
  skillPath?: string;
  status: string;
};

export function SkillsPanel({
  factoryId,
  instantDb,
  skills,
  variant = "default",
}: {
  factoryId: string;
  instantDb: AppDb;
  skills: SkillRecord[];
  variant?: "computer" | "default";
}) {
  const { user } = instantDb.useAuth();
  const [repoUrl, setRepoUrl] = useState("");
  const [candidates, setCandidates] = useState<SkillCandidate[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isListing, setIsListing] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  async function handleList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedRepoUrl = repoUrl.trim();

    if (!trimmedRepoUrl) {
      setError("Enter a skills repo URL.");
      return;
    }

    setCandidates([]);
    setSelectedPaths(new Set());
    setError(null);
    setNotice(null);
    setIsListing(true);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to list skills.");
      }

      const response = await fetch(`/api/factories/${factoryId}/skills/list`, {
        method: "POST",
        headers: getJsonAuthHeaders(user.refresh_token),
        body: JSON.stringify({ repoUrl: trimmedRepoUrl }),
      });
      const body = (await response.json().catch(() => null)) as
        | { skills?: SkillCandidate[] }
        | ApiError
        | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "Skills could not be listed.");
      }

      const nextCandidates =
        body && "skills" in body && Array.isArray(body.skills)
          ? body.skills
          : [];
      setCandidates(nextCandidates);
      setSelectedPaths(
        new Set(nextCandidates.map((skill: SkillCandidate) => skill.path)),
      );
      setNotice(
        nextCandidates.length === 0
          ? "No SKILL.md files were found in that repo."
          : null,
      );
    } catch (listError) {
      console.error(listError);
      setNotice(null);
      setError(
        listError instanceof Error
          ? listError.message
          : "Skills could not be listed.",
      );
    } finally {
      setIsListing(false);
    }
  }

  async function handleInstall() {
    const selectedSkills = candidates.filter((skill) =>
      selectedPaths.has(skill.path),
    );

    if (selectedSkills.length === 0) {
      setError("Select at least one skill to install.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsInstalling(true);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to install skills.");
      }

      const response = await fetch(
        `/api/factories/${factoryId}/skills/install`,
        {
          method: "POST",
          headers: getJsonAuthHeaders(user.refresh_token),
          body: JSON.stringify({
            repoUrl: repoUrl.trim(),
            skills: selectedSkills,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Skills could not be installed.");
      }

      setCandidates([]);
      setSelectedPaths(new Set());
      setNotice("Selected skills were installed for new workers.");
    } catch (installError) {
      console.error(installError);
      setNotice(null);
      setError(
        installError instanceof Error
          ? installError.message
          : "Skills could not be installed.",
      );
    } finally {
      setIsInstalling(false);
    }
  }

  function toggleSkill(skillPath: string) {
    setSelectedPaths((current) => {
      const next = new Set(current);

      if (next.has(skillPath)) {
        next.delete(skillPath);
      } else {
        next.add(skillPath);
      }

      return next;
    });
  }

  const content = (
    <>
      {variant === "default" ? (
        <div className="mb-4 flex items-center gap-2">
          <PuzzlePiece size={16} weight="bold" aria-hidden="true" />
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-wide text-grayscale-10">
            Skills
          </h3>
        </div>
      ) : null}
      <form className="flex flex-col gap-3" onSubmit={handleList}>
        <Field label="Skills repo URL">
          <Input
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/org/skills"
            disabled={isListing || isInstalling}
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={isListing}>
            {isListing ? "Listing..." : "List skills"}
          </Button>
        </div>
      </form>

      {candidates.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="max-h-64 overflow-y-auto rounded-lg border border-grayscale-3">
            {candidates.map((skill) => (
              <label
                key={skill.path}
                className="flex cursor-pointer gap-3 border-b border-grayscale-3 p-3 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedPaths.has(skill.path)}
                  onChange={() => toggleSkill(skill.path)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {skill.name}
                  </span>
                  <span className="block truncate text-xs text-grayscale-10">
                    {skill.path}
                  </span>
                  {skill.description ? (
                    <span className="mt-1 block text-sm text-grayscale-11">
                      {skill.description}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={isInstalling}
              onClick={handleInstall}
            >
              {isInstalling ? "Installing..." : "Install selected"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <Notice className="mt-3" tone="error">
          {error}
        </Notice>
      ) : null}

      {notice ? <Notice className="mt-3">{notice}</Notice> : null}

      <CapabilityList
        emptyText="No skills installed yet."
        items={skills.map((skill) => ({
          id: skill.id,
          meta: skill.skillPath ?? skill.repoUrl,
          status: skill.status,
          title: skill.name,
          error: skill.lastError,
        }))}
      />
    </>
  );

  if (variant === "computer") {
    return <FactorySectionCard>{content}</FactorySectionCard>;
  }

  return <Card className="p-4">{content}</Card>;
}
