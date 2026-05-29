"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingsIcon,
  CheckIcon,
  CircleNotchIcon,
  CopyIcon,
  CpuIcon,
  FolderSimpleIcon,
  GithubLogoIcon,
  InfoIcon,
  type Icon as PhosphorIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useId,
  useMemo,
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
  pathTouched: boolean;
  url: string;
};

type StepDefinition = {
  description: string;
  icon: PhosphorIcon;
  id: WizardStep;
  label: string;
  optional?: boolean;
  title: string;
};

const STEP_DEFINITIONS: readonly StepDefinition[] = [
  {
    description:
      "Give your factory a recognizable name. You can change this and pick a color later.",
    icon: BuildingsIcon,
    id: "factory",
    label: "Factory",
    title: "Name your factory",
  },
  {
    description:
      "Add the credentials and repositories workers should apply before they run.",
    icon: GithubLogoIcon,
    id: "github",
    label: "GitHub",
    optional: true,
    title: "Connect GitHub",
  },
  {
    description:
      "Connect a Codex agent so it can run inside this factory's sandboxes.",
    icon: CpuIcon,
    id: "agent",
    label: "Agent",
    optional: true,
    title: "Add your first agent",
  },
] as const;

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

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  const trimmedName = name.trim();
  const completedSteps = useMemo(() => {
    const completed = new Set<WizardStep>();

    if (trimmedName) {
      completed.add("factory");
    }
    if (step === "agent") {
      completed.add("github");
    }

    return completed;
  }, [step, trimmedName]);

  function advanceToStep(target: WizardStep) {
    setError(null);
    setStep(target);
  }

  function goToStep(target: WizardStep) {
    if (isSaving) {
      return;
    }

    const stepOrder = STEP_DEFINITIONS.map((definition) => definition.id);
    const currentIndex = stepOrder.indexOf(step);
    const targetIndex = stepOrder.indexOf(target);

    if (targetIndex <= currentIndex) {
      advanceToStep(target);
      return;
    }

    if (!trimmedName) {
      setError("Name the factory before continuing.");
      setStep("factory");
      return;
    }

    advanceToStep(target);
  }

  function goToGithubStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedName) {
      setError("Name the factory before continuing.");
      return;
    }

    advanceToStep("github");
  }

  function goToAgentStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    advanceToStep("agent");
  }

  async function createFactory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

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
      <main className="flex min-h-dvh items-center justify-center p-4 text-grayscale-11 text-sm">
        Loading...
      </main>
    );
  }

  const stepDefinition =
    STEP_DEFINITIONS.find((definition) => definition.id === step) ??
    STEP_DEFINITIONS[0];
  const stepIndex = STEP_DEFINITIONS.indexOf(stepDefinition);
  const filledRepositories = githubRepositories.filter(
    (repository) => repository.url.trim() || repository.path.trim(),
  );

  return (
    <main className="min-h-dvh bg-grayscale-1 px-4 py-6 text-grayscale-12 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link
            href="/factories"
            className="inline-flex items-center gap-1.5 text-grayscale-11 text-sm transition-colors hover:text-grayscale-12"
          >
            <ArrowLeftIcon size={14} aria-hidden="true" />
            All factories
          </Link>
          <div className="mt-5 flex flex-col gap-1.5">
            <h1 className="font-mono font-bold text-base text-grayscale-12 uppercase">
              New factory
            </h1>
            <p className="text-grayscale-11 text-sm">
              A factory is a workspace with its own workers, agents, and
              supervisors. Three quick steps and you're in.
            </p>
          </div>
        </div>

        <StepRail
          activeStep={step}
          completedSteps={completedSteps}
          onSelect={goToStep}
        />

        <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 dark:bg-grayscale-2">
          <StepHeader
            description={stepDefinition.description}
            icon={stepDefinition.icon}
            optional={stepDefinition.optional}
            stepNumber={stepIndex + 1}
            title={stepDefinition.title}
            totalSteps={STEP_DEFINITIONS.length}
          />

          {step === "factory" ? (
            <FactoryStep
              error={error}
              isSaving={isSaving}
              name={name}
              onSubmit={goToGithubStep}
              setName={setName}
            />
          ) : null}

          {step === "github" ? (
            <GithubStep
              error={error}
              filledRepositoryCount={filledRepositories.length}
              gitEmail={gitEmail}
              gitName={gitName}
              githubRepositories={githubRepositories}
              githubToken={githubToken}
              isSaving={isSaving}
              onBack={() => advanceToStep("factory")}
              onSubmit={goToAgentStep}
              setGitEmail={setGitEmail}
              setGitName={setGitName}
              setGithubRepositories={setGithubRepositories}
              setGithubToken={setGithubToken}
            />
          ) : null}

          {step === "agent" ? (
            <AgentStep
              addCodexAgent={addCodexAgent}
              codexAuthJsonText={codexAuthJsonText}
              error={error}
              factoryName={trimmedName || "Untitled factory"}
              filledRepositoryCount={filledRepositories.length}
              gitEmail={gitEmail.trim()}
              gitName={gitName.trim()}
              hasGithubToken={Boolean(githubToken.trim())}
              isSaving={isSaving}
              onBack={() => advanceToStep("github")}
              onSubmit={createFactory}
              setAddCodexAgent={setAddCodexAgent}
              setCodexAuthJsonText={setCodexAuthJsonText}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function StepRail({
  activeStep,
  completedSteps,
  onSelect,
}: {
  activeStep: WizardStep;
  completedSteps: Set<WizardStep>;
  onSelect: (step: WizardStep) => void;
}) {
  return (
    <ol aria-label="Wizard progress" className="flex items-center gap-2">
      {STEP_DEFINITIONS.map((definition, index) => {
        const isActive = activeStep === definition.id;
        const isCompleted = completedSteps.has(definition.id) && !isActive;
        const isReachable = index === 0 || completedSteps.has("factory");

        return (
          <li key={definition.id} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              aria-current={isActive ? "step" : undefined}
              disabled={!isReachable}
              onClick={() => onSelect(definition.id)}
              className={cn(
                "group flex flex-1 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                isActive
                  ? "border-accent-7 bg-accent-2 text-grayscale-12"
                  : isCompleted
                    ? "border-grayscale-3 bg-grayscale-2 text-grayscale-12 hover:border-grayscale-5 hover:bg-grayscale-3"
                    : "border-grayscale-3 bg-grayscale-1 text-grayscale-10 dark:bg-grayscale-2",
                !isReachable && "cursor-not-allowed opacity-60",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border font-semibold text-xs transition-colors",
                  isActive
                    ? "border-accent-9 bg-accent-9 text-white"
                    : isCompleted
                      ? "border-accent-9 bg-accent-9 text-white"
                      : "border-grayscale-5 bg-grayscale-1 text-grayscale-10 dark:bg-grayscale-2",
                )}
              >
                {isCompleted ? (
                  <CheckIcon size={12} weight="bold" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-sm leading-tight">
                  {definition.label}
                </span>
                <span
                  className={cn(
                    "text-xs leading-tight",
                    isActive ? "text-grayscale-11" : "text-grayscale-10",
                  )}
                >
                  {isCompleted
                    ? "Done"
                    : isActive
                      ? "In progress"
                      : definition.optional
                        ? "Optional"
                        : "Up next"}
                </span>
              </span>
            </button>
            {index < STEP_DEFINITIONS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px w-4 shrink-0 sm:block",
                  isCompleted ? "bg-accent-9" : "bg-grayscale-4",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepHeader({
  description,
  icon: Icon,
  optional,
  stepNumber,
  title,
  totalSteps,
}: {
  description: string;
  icon: PhosphorIcon;
  optional?: boolean;
  stepNumber: number;
  title: string;
  totalSteps: number;
}) {
  return (
    <div className="flex items-start gap-3 border-grayscale-3 border-b px-4 py-4">
      <div
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-2 text-grayscale-12"
      >
        <Icon size={18} weight="bold" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-grayscale-10 text-xs uppercase tracking-wide">
            Step {stepNumber} of {totalSteps}
          </span>
          {optional ? (
            <span className="rounded-full border border-grayscale-4 bg-grayscale-2 px-2 py-0.5 font-medium text-[10px] text-grayscale-11 uppercase tracking-wide">
              Optional
            </span>
          ) : null}
        </div>
        <h2 className="font-semibold text-grayscale-12 text-base leading-snug">
          {title}
        </h2>
        <p className="text-grayscale-11 text-sm">{description}</p>
      </div>
    </div>
  );
}

function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-grayscale-3 border-t bg-grayscale-2/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-grayscale-3/30">
      {children}
    </div>
  );
}

function FactoryStep({
  error,
  isSaving,
  name,
  onSubmit,
  setName,
}: {
  error: string | null;
  isSaving: boolean;
  name: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setName: Dispatch<SetStateAction<string>>;
}) {
  const nameId = useId();

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-4 p-4">
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}

        <label className="flex flex-col gap-1.5" htmlFor={nameId}>
          <span className="font-medium text-grayscale-12 text-sm">
            Factory name
          </span>
          <Input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Web platform"
            autoComplete="off"
            disabled={isSaving}
            className="w-full bg-grayscale-1 dark:bg-grayscale-1"
            autoFocus
          />
          <span className="text-grayscale-10 text-xs">
            Try a team or product name like "Acme web" or "iOS app".
          </span>
        </label>

        <InfoCallout>
          The next two steps are optional — you can skip GitHub and Codex setup
          and configure them later from this factory's settings.
        </InfoCallout>
      </div>
      <StepFooter>
        <span className="text-grayscale-10 text-xs">
          Press <KeyboardHint>Enter</KeyboardHint> to continue.
        </span>
        <Button type="submit" disabled={isSaving || !name.trim()}>
          Continue
          <ArrowRightIcon size={14} weight="bold" aria-hidden="true" />
        </Button>
      </StepFooter>
    </form>
  );
}

function GithubStep({
  error,
  filledRepositoryCount,
  gitEmail,
  gitName,
  githubRepositories,
  githubToken,
  isSaving,
  onBack,
  onSubmit,
  setGitEmail,
  setGitName,
  setGithubRepositories,
  setGithubToken,
}: {
  error: string | null;
  filledRepositoryCount: number;
  gitEmail: string;
  gitName: string;
  githubRepositories: GithubRepositoryRow[];
  githubToken: string;
  isSaving: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setGitEmail: Dispatch<SetStateAction<string>>;
  setGitName: Dispatch<SetStateAction<string>>;
  setGithubRepositories: Dispatch<SetStateAction<GithubRepositoryRow[]>>;
  setGithubToken: Dispatch<SetStateAction<string>>;
}) {
  const gitNameId = useId();
  const gitEmailId = useId();
  const githubTokenId = useId();

  const hasAnyGithubInput =
    Boolean(gitName.trim()) ||
    Boolean(gitEmail.trim()) ||
    Boolean(githubToken.trim()) ||
    filledRepositoryCount > 0;

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-5 p-4">
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}

        <FieldGroup
          description="Used when this factory's agents author commits."
          title="Git identity"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5" htmlFor={gitNameId}>
              <span className="font-medium text-grayscale-12 text-sm">
                Git name
              </span>
              <Input
                id={gitNameId}
                value={gitName}
                onChange={(event) => setGitName(event.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                disabled={isSaving}
                className="bg-grayscale-1 dark:bg-grayscale-1"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5" htmlFor={gitEmailId}>
              <span className="font-medium text-grayscale-12 text-sm">
                Git email
              </span>
              <Input
                id={gitEmailId}
                value={gitEmail}
                onChange={(event) => setGitEmail(event.target.value)}
                placeholder="ada@example.com"
                autoComplete="email"
                disabled={isSaving}
                className="bg-grayscale-1 dark:bg-grayscale-1"
              />
            </label>
          </div>
        </FieldGroup>

        <FieldGroup
          description="Personal access tokens with the repo scope work best. The token is encrypted before it's stored."
          title="GitHub access"
        >
          <label className="flex flex-col gap-1.5" htmlFor={githubTokenId}>
            <span className="font-medium text-grayscale-12 text-sm">
              Personal access token
            </span>
            <Input
              id={githubTokenId}
              value={githubToken}
              onChange={(event) => setGithubToken(event.target.value)}
              placeholder="ghp_••••••••••••••••••••"
              type="password"
              autoComplete="off"
              disabled={isSaving}
              className="bg-grayscale-1 font-mono dark:bg-grayscale-1"
            />
          </label>
        </FieldGroup>

        <FieldGroup
          description="Applied before workers run. Clone paths can be relative (e.g. code/repo) or under /workspace/home."
          title={`Repositories${filledRepositoryCount > 0 ? ` (${filledRepositoryCount})` : ""}`}
          trailing={
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setGithubRepositories((current) => [
                  ...current,
                  {
                    id: createRowId(),
                    path: "",
                    pathTouched: false,
                    url: "",
                  },
                ])
              }
              disabled={isSaving}
            >
              <PlusIcon size={14} weight="bold" aria-hidden="true" />
              Add repository
            </Button>
          }
        >
          {githubRepositories.length === 0 ? (
            <button
              type="button"
              onClick={() =>
                setGithubRepositories([
                  {
                    id: createRowId(),
                    path: "",
                    pathTouched: false,
                    url: "",
                  },
                ])
              }
              disabled={isSaving}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-grayscale-4 border-dashed bg-grayscale-1 px-4 py-6 text-center transition-colors hover:border-grayscale-6 hover:bg-grayscale-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-grayscale-2"
            >
              <FolderSimpleIcon
                size={20}
                weight="bold"
                aria-hidden="true"
                className="text-grayscale-10"
              />
              <span className="font-medium text-grayscale-12 text-sm">
                Add your first repository
              </span>
              <span className="text-grayscale-10 text-xs">
                Or skip — you can add repositories later from the GitHub
                settings.
              </span>
            </button>
          ) : (
            <ul className="flex flex-col gap-2">
              {githubRepositories.map((repository, index) => (
                <RepositoryRow
                  index={index}
                  isSaving={isSaving}
                  key={repository.id}
                  onChange={(field, value) =>
                    updateGithubRepository(
                      setGithubRepositories,
                      repository.id,
                      field,
                      value,
                    )
                  }
                  onRemove={() =>
                    setGithubRepositories((current) =>
                      current.filter(
                        (candidate) => candidate.id !== repository.id,
                      ),
                    )
                  }
                  repository={repository}
                />
              ))}
            </ul>
          )}
        </FieldGroup>
      </div>
      <StepFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={isSaving}
        >
          <ArrowLeftIcon size={14} weight="bold" aria-hidden="true" />
          Back
        </Button>
        <Button type="submit" disabled={isSaving}>
          {hasAnyGithubInput ? "Continue" : "Skip for now"}
          <ArrowRightIcon size={14} weight="bold" aria-hidden="true" />
        </Button>
      </StepFooter>
    </form>
  );
}

function RepositoryRow({
  index,
  isSaving,
  onChange,
  onRemove,
  repository,
}: {
  index: number;
  isSaving: boolean;
  onChange: (
    field: "path" | "pathTouched" | "url",
    value: string | boolean,
  ) => void;
  onRemove: () => void;
  repository: GithubRepositoryRow;
}) {
  const urlId = useId();
  const pathId = useId();

  return (
    <li className="rounded-lg border border-grayscale-3 bg-grayscale-2 p-3 dark:bg-grayscale-3/40">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-grayscale-11 text-xs">
          Repository {index + 1}
        </span>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-md text-grayscale-10 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Remove repository ${index + 1}`}
          onClick={onRemove}
          disabled={isSaving}
        >
          <TrashIcon size={14} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <label className="flex flex-col gap-1" htmlFor={urlId}>
          <span className="text-grayscale-10 text-xs">Repository URL</span>
          <Input
            id={urlId}
            value={repository.url}
            onChange={(event) => {
              const nextUrl = event.target.value;
              onChange("url", nextUrl);

              if (!repository.pathTouched) {
                const derived = extractRepoPathFromUrl(nextUrl);
                onChange("path", derived);
              }
            }}
            placeholder="https://github.com/org/repo.git"
            disabled={isSaving}
            className="bg-grayscale-1 font-mono text-xs dark:bg-grayscale-1"
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor={pathId}>
          <span className="text-grayscale-10 text-xs">Clone path</span>
          <Input
            id={pathId}
            value={repository.path}
            onChange={(event) => {
              onChange("path", event.target.value);
              onChange("pathTouched", true);
            }}
            placeholder="repo"
            disabled={isSaving}
            className="bg-grayscale-1 font-mono text-xs dark:bg-grayscale-1"
          />
        </label>
      </div>
    </li>
  );
}

function AgentStep({
  addCodexAgent,
  codexAuthJsonText,
  error,
  factoryName,
  filledRepositoryCount,
  gitEmail,
  gitName,
  hasGithubToken,
  isSaving,
  onBack,
  onSubmit,
  setAddCodexAgent,
  setCodexAuthJsonText,
}: {
  addCodexAgent: boolean;
  codexAuthJsonText: string;
  error: string | null;
  factoryName: string;
  filledRepositoryCount: number;
  gitEmail: string;
  gitName: string;
  hasGithubToken: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setAddCodexAgent: Dispatch<SetStateAction<boolean>>;
  setCodexAuthJsonText: Dispatch<SetStateAction<string>>;
}) {
  const authJsonId = useId();
  const toggleId = useId();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText("pbcopy < ~/.codex/auth.json");
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  const githubSummary =
    filledRepositoryCount > 0
      ? `${filledRepositoryCount} repository${filledRepositoryCount === 1 ? "" : "s"}`
      : gitName || gitEmail || hasGithubToken
        ? "Credentials only"
        : "Skipped";

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-5 p-4">
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}

        <SummaryCard>
          <SummaryRow label="Factory" value={factoryName} />
          <SummaryRow label="GitHub" value={githubSummary} />
          <SummaryRow
            label="Codex agent"
            value={addCodexAgent ? "Will be added" : "Not now"}
          />
        </SummaryCard>

        <FieldGroup title="Codex agent">
          <label
            htmlFor={toggleId}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              addCodexAgent
                ? "border-accent-7 bg-accent-2"
                : "border-grayscale-3 bg-grayscale-2 hover:border-grayscale-5 dark:bg-grayscale-3/40",
            )}
          >
            <span className="relative mt-0.5 flex h-5 w-9 shrink-0 items-center">
              <input
                id={toggleId}
                type="checkbox"
                className="peer sr-only"
                checked={addCodexAgent}
                onChange={(event) => setAddCodexAgent(event.target.checked)}
                disabled={isSaving}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 rounded-full border transition-colors",
                  addCodexAgent
                    ? "border-accent-9 bg-accent-9"
                    : "border-grayscale-5 bg-grayscale-4",
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
                  addCodexAgent ? "translate-x-4" : "translate-x-0",
                )}
              />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-medium text-grayscale-12 text-sm">
                Add a Codex agent now
              </span>
              <span className="text-grayscale-11 text-sm">
                Paste{" "}
                <code className="rounded bg-grayscale-3 px-1 py-0.5 font-mono text-xs">
                  auth.json
                </code>{" "}
                from{" "}
                <code className="rounded bg-grayscale-3 px-1 py-0.5 font-mono text-xs">
                  ~/.codex
                </code>{" "}
                so the agent can sign into Codex from this factory's sandboxes.
              </span>
            </span>
          </label>

          {addCodexAgent ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="rounded-lg border border-grayscale-3 bg-grayscale-2 p-3 dark:bg-grayscale-3/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-grayscale-12 text-sm">
                      Copy from this machine
                    </p>
                    <p className="text-grayscale-10 text-xs">
                      Runs locally and copies your existing Codex auth into the
                      clipboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyCommand}
                    disabled={isSaving}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-grayscale-4 bg-grayscale-1 px-2 py-1 font-medium text-grayscale-11 text-xs transition-colors hover:border-grayscale-6 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-grayscale-2"
                  >
                    {copyState === "copied" ? (
                      <>
                        <CheckIcon size={12} weight="bold" aria-hidden="true" />
                        Copied
                      </>
                    ) : copyState === "error" ? (
                      <>
                        <WarningCircleIcon
                          size={12}
                          weight="bold"
                          aria-hidden="true"
                        />
                        Try again
                      </>
                    ) : (
                      <>
                        <CopyIcon size={12} weight="bold" aria-hidden="true" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <code className="mt-2 block overflow-x-auto rounded-md bg-grayscale-1 px-3 py-2 font-mono text-grayscale-11 text-xs">
                  pbcopy &lt; ~/.codex/auth.json
                </code>
              </div>

              <label className="flex flex-col gap-1.5" htmlFor={authJsonId}>
                <span className="font-medium text-grayscale-12 text-sm">
                  Codex auth JSON
                </span>
                <textarea
                  id={authJsonId}
                  value={codexAuthJsonText}
                  onChange={(event) => setCodexAuthJsonText(event.target.value)}
                  placeholder='{"tokens":{}}'
                  autoComplete="off"
                  disabled={isSaving}
                  spellCheck={false}
                  className="min-h-48 w-full resize-y rounded-lg border border-grayscale-3 bg-grayscale-1 p-3 font-mono text-grayscale-12 text-xs outline-none transition-colors placeholder:text-grayscale-9 focus:border-accent-9 dark:bg-grayscale-1"
                />
                <span className="text-grayscale-10 text-xs">
                  Saved encrypted on the agent and installed into worker
                  sandboxes created with that agent.
                </span>
              </label>
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-grayscale-3 border-dashed bg-grayscale-2 px-3 py-2 text-grayscale-11 text-xs dark:bg-grayscale-3/40">
              Skipping for now. You can connect an agent any time from the
              factory's agents settings.
            </p>
          )}
        </FieldGroup>
      </div>
      <StepFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={isSaving}
        >
          <ArrowLeftIcon size={14} weight="bold" aria-hidden="true" />
          Back
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <CircleNotchIcon
                size={14}
                weight="bold"
                aria-hidden="true"
                className="animate-spin"
              />
              Creating factory...
            </>
          ) : (
            <>
              <SparkleIcon size={14} weight="bold" aria-hidden="true" />
              Create factory
            </>
          )}
        </Button>
      </StepFooter>
    </form>
  );
}

function FieldGroup({
  children,
  description,
  title,
  trailing,
}: {
  children: ReactNode;
  description?: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-grayscale-12 text-sm">{title}</h3>
          {description ? (
            <p className="text-grayscale-10 text-xs">{description}</p>
          ) : null}
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-grayscale-3 bg-grayscale-2 p-3 dark:bg-grayscale-3/40">
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-grayscale-10 text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="truncate text-right font-medium text-grayscale-12">
        {value}
      </span>
    </div>
  );
}

function InfoCallout({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-2 text-grayscale-11 text-xs dark:bg-grayscale-3/40">
      <InfoIcon
        size={14}
        weight="bold"
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-grayscale-10"
      />
      <span>{children}</span>
    </div>
  );
}

function KeyboardHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-grayscale-4 bg-grayscale-1 px-1.5 py-0.5 font-mono text-[10px] text-grayscale-11 dark:bg-grayscale-2">
      {children}
    </kbd>
  );
}

function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-red-11 text-sm"
    >
      <WarningCircleIcon
        size={14}
        weight="bold"
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      />
      <span>{children}</span>
    </p>
  );
}

function updateGithubRepository(
  setGithubRepositories: Dispatch<SetStateAction<GithubRepositoryRow[]>>,
  id: string,
  field: "path" | "pathTouched" | "url",
  value: string | boolean,
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

function extractRepoPathFromUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const withoutSuffix = trimmed.replace(/\.git\/?$/, "").replace(/\/$/, "");

  try {
    const url = new URL(withoutSuffix);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments.at(-1);

    if (last) {
      return last;
    }
  } catch {
    // Fall through to non-URL handling.
  }

  const segments = withoutSuffix.split(/[/:]/).filter(Boolean);

  return segments.at(-1) ?? "";
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
