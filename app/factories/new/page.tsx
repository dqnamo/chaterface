"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  CpuIcon,
  GithubLogoIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useId,
  useState,
} from "react";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import { cn } from "@/helpers/classname-helper";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { saveLastFactoryId } from "@/lib/factory/last-factory";

type WizardStep = "factory" | "github" | "agent";

type GithubRepositoryRow = {
  id: string;
  path: string;
  url: string;
};

export default function NewFactoryPage() {
  return <NewFactoryWizard instantDb={db} />;
}

function NewFactoryWizard({ instantDb }: { instantDb: AppDb }) {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = instantDb.useAuth();
  const [step, setStep] = useState<WizardStep>("factory");
  const [name, setName] = useState("");
  const [gitName, setGitName] = useState("");
  const [gitEmail, setGitEmail] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepositories, setGithubRepositories] = useState<
    GithubRepositoryRow[]
  >([]);
  const [addCodexAgent, setAddCodexAgent] = useState(true);
  const [codexAuthJsonText, setCodexAuthJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const nameId = useId();
  const gitNameId = useId();
  const gitEmailId = useId();
  const githubTokenId = useId();
  const authJsonId = useId();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  function goToGithubStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Name the factory before continuing.");
      return;
    }

    setError(null);
    setStep("github");
  }

  function goToAgentStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStep("agent");
  }

  async function createFactory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Name the factory before creating it.");
      setStep("factory");
      return;
    }

    if (!user?.refresh_token) {
      setError("You must be signed in to create a factory.");
      return;
    }

    const parsedCodexAuthJson = parseCodexAuthJson({
      enabled: addCodexAgent,
      value: codexAuthJsonText,
    });

    if ("error" in parsedCodexAuthJson) {
      setError(parsedCodexAuthJson.error);
      return;
    }
    setIsSaving(true);

    try {
      const response = await fetch("/api/factories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.refresh_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codexAgent: {
            authJson: parsedCodexAuthJson.authJson,
            enabled: addCodexAgent,
          },
          github: {
            gitEmail,
            gitName,
            repositories: githubRepositories.map((repository) => ({
              path: repository.path,
              url: repository.url,
            })),
            token: githubToken,
          },
          name: trimmedName,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        factoryId?: string;
      } | null;

      if (!response.ok || !body?.factoryId) {
        throw new Error(body?.error ?? "Factory could not be created.");
      }

      saveLastFactoryId(body.factoryId);
      router.push(`/factory/${body.factoryId}`);
      router.refresh();
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Factory could not be created.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isAuthLoading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-sm text-grayscale-11">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-grayscale-1 px-4 py-6 text-grayscale-12 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link
            href="/factories"
            className="inline-flex items-center gap-2 text-grayscale-11 text-sm transition-colors hover:text-grayscale-12"
          >
            <ArrowLeftIcon size={16} aria-hidden="true" />
            Factories
          </Link>
          <div className="mt-5 flex flex-col gap-2">
            <h1 className="font-mono font-bold text-base text-grayscale-12 uppercase">
              New factory
            </h1>
            <p className="text-grayscale-11 text-sm">
              Create the factory, prepare its default snapshot, and add the
              first agent.
            </p>
          </div>
        </div>

        <StepRail activeStep={step} />

        {step === "factory" ? (
          <form
            className="rounded-lg border border-grayscale-3 bg-grayscale-1"
            onSubmit={goToGithubStep}
          >
            <div className="border-grayscale-3 border-b px-4 py-3">
              <h2 className="font-semibold text-sm">Factory details</h2>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <label className="flex flex-col gap-1.5" htmlFor={nameId}>
                <span className="font-medium text-sm">Factory name</span>
                <Input
                  id={nameId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Web platform"
                  autoComplete="off"
                  disabled={isSaving}
                  className="w-full"
                />
              </label>

              {error ? <ErrorNotice>{error}</ErrorNotice> : null}

              <div className="flex justify-end">
                <Button type="submit">Continue</Button>
              </div>
            </div>
          </form>
        ) : step === "github" ? (
          <form
            className="rounded-lg border border-grayscale-3 bg-grayscale-1"
            onSubmit={goToAgentStep}
          >
            <div className="border-grayscale-3 border-b px-4 py-3">
              <h2 className="font-semibold text-sm">GitHub setup</h2>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5" htmlFor={gitNameId}>
                  <span className="font-medium text-sm">Git name</span>
                  <Input
                    id={gitNameId}
                    value={gitName}
                    onChange={(event) => setGitName(event.target.value)}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                    disabled={isSaving}
                  />
                </label>
                <label className="flex flex-col gap-1.5" htmlFor={gitEmailId}>
                  <span className="font-medium text-sm">Git email</span>
                  <Input
                    id={gitEmailId}
                    value={gitEmail}
                    onChange={(event) => setGitEmail(event.target.value)}
                    placeholder="ada@example.com"
                    autoComplete="email"
                    disabled={isSaving}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5" htmlFor={githubTokenId}>
                <span className="font-medium text-sm">GitHub token</span>
                <Input
                  id={githubTokenId}
                  value={githubToken}
                  onChange={(event) => setGithubToken(event.target.value)}
                  placeholder="ghp_..."
                  type="password"
                  autoComplete="off"
                  disabled={isSaving}
                />
                <span className="text-grayscale-10 text-xs">
                  Used for HTTPS clones and saved in the factory computer.
                </span>
              </label>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-sm">Repositories</h3>
                    <p className="text-grayscale-10 text-xs">
                      Clone paths can be relative to /workspace/home.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setGithubRepositories((current) => [
                        ...current,
                        { id: createRowId(), path: "", url: "" },
                      ])
                    }
                    disabled={isSaving}
                  >
                    <PlusIcon size={14} weight="bold" aria-hidden="true" />
                    Add repo
                  </Button>
                </div>

                {githubRepositories.length === 0 ? (
                  <div className="rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-4 text-center text-grayscale-10 text-sm">
                    No repositories configured.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {githubRepositories.map((repository) => (
                      <div
                        key={repository.id}
                        className="grid gap-2 rounded-lg border border-grayscale-3 bg-grayscale-2 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
                      >
                        <Input
                          value={repository.url}
                          onChange={(event) =>
                            updateGithubRepository(
                              setGithubRepositories,
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
                            updateGithubRepository(
                              setGithubRepositories,
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
                          className="flex size-9 items-center justify-center rounded-lg border border-grayscale-4 text-grayscale-10 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12"
                          aria-label="Remove repository"
                          onClick={() =>
                            setGithubRepositories((current) =>
                              current.filter(
                                (candidate) => candidate.id !== repository.id,
                              ),
                            )
                          }
                          disabled={isSaving}
                        >
                          <TrashIcon
                            size={15}
                            weight="bold"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error ? <ErrorNotice>{error}</ErrorNotice> : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("factory")}
                  disabled={isSaving}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isSaving}>
                  Continue
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form
            className="rounded-lg border border-grayscale-3 bg-grayscale-1"
            onSubmit={createFactory}
          >
            <div className="border-grayscale-3 border-b px-4 py-3">
              <h2 className="font-semibold text-sm">Codex agent</h2>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <label className="flex items-start gap-3 rounded-lg border border-grayscale-3 bg-grayscale-2 p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-accent-9"
                  checked={addCodexAgent}
                  onChange={(event) => setAddCodexAgent(event.target.checked)}
                  disabled={isSaving}
                />
                <span className="min-w-0">
                  <span className="block font-medium text-sm">
                    Add a Codex agent
                  </span>
                  <span className="block text-grayscale-11 text-sm">
                    Paste the contents of{" "}
                    <code className="rounded bg-grayscale-3 px-1 py-0.5 text-xs">
                      auth.json
                    </code>{" "}
                    from{" "}
                    <code className="rounded bg-grayscale-3 px-1 py-0.5 text-xs">
                      ~/.codex
                    </code>
                    . The encrypted copy is saved on the Agent and the raw file
                    is added to the default snapshot.
                  </span>
                  <span className="mt-1 block text-grayscale-10 text-xs">
                    The agent is linked to this factory as type{" "}
                    <code className="rounded bg-grayscale-3 px-1 py-0.5 text-xs">
                      codex
                    </code>
                    .
                  </span>
                </span>
              </label>

              {addCodexAgent ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-grayscale-3 bg-grayscale-2 p-3">
                    <p className="font-medium text-sm">
                      Copy from this machine
                    </p>
                    <code className="mt-2 block overflow-x-auto rounded-lg bg-grayscale-1 px-3 py-2 font-mono text-grayscale-11 text-xs">
                      pbcopy &lt; ~/.codex/auth.json
                    </code>
                  </div>
                  <label className="flex flex-col gap-1.5" htmlFor={authJsonId}>
                    <span className="font-medium text-sm">Codex auth JSON</span>
                    <textarea
                      id={authJsonId}
                      value={codexAuthJsonText}
                      onChange={(event) =>
                        setCodexAuthJsonText(event.target.value)
                      }
                      placeholder='{"tokens":{}}'
                      autoComplete="off"
                      disabled={isSaving}
                      spellCheck={false}
                      className="min-h-48 w-full resize-y rounded-lg border border-grayscale-3 bg-grayscale-1 p-2 font-mono text-xs text-grayscale-12 outline-none transition-colors placeholder:text-grayscale-9 focus:border-accent-9"
                    />
                  </label>
                </div>
              ) : null}

              {error ? <ErrorNotice>{error}</ErrorNotice> : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("github")}
                  disabled={isSaving}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isSaving}>
                  <PlusIcon size={16} weight="bold" aria-hidden="true" />
                  {isSaving ? "Creating..." : "Create factory"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function StepRail({ activeStep }: { activeStep: WizardStep }) {
  const steps = [
    { icon: CheckIcon, id: "factory", label: "Factory" },
    { icon: GithubLogoIcon, id: "github", label: "GitHub" },
    { icon: CpuIcon, id: "agent", label: "Agent" },
  ] as const;

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-3 gap-px">
      {steps.map((step) => {
        const Icon = step.icon;
        const isActive = activeStep === step.id;

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2 bg-grayscale-1 px-3 py-2 text-sm",
              isActive ? "text-grayscale-12" : "text-grayscale-10",
            )}
          >
            <Icon
              size={16}
              weight={isActive ? "bold" : "regular"}
              aria-hidden="true"
            />
            <span className="font-medium">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function updateGithubRepository(
  setGithubRepositories: Dispatch<SetStateAction<GithubRepositoryRow[]>>,
  id: string,
  field: "path" | "url",
  value: string,
) {
  setGithubRepositories((current) =>
    current.map((repository) =>
      repository.id === id ? { ...repository, [field]: value } : repository,
    ),
  );
}

function createRowId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())
  );
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseCodexAuthJson({
  enabled,
  value,
}: {
  enabled: boolean;
  value: string;
}): { authJson?: Record<string, unknown> } | { error: string } {
  if (!enabled) {
    return {};
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { error: "Paste the Codex auth JSON before creating the factory." };
  }

  try {
    const parsed = JSON.parse(trimmedValue) as unknown;

    if (!isJsonObject(parsed)) {
      return { error: "Codex auth JSON must be a JSON object." };
    }

    return { authJson: parsed };
  } catch {
    return { error: "Codex auth JSON is not valid JSON." };
  }
}

function ErrorNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-red-11 text-sm">
      {children}
    </p>
  );
}
