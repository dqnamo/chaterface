"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  CpuIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useState } from "react";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import { cn } from "@/helpers/classname-helper";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type WizardStep = "factory" | "agent";

export default function NewFactoryPage() {
  return <NewFactoryWizard instantDb={db} />;
}

function NewFactoryWizard({ instantDb }: { instantDb: AppDb }) {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = instantDb.useAuth();
  const [step, setStep] = useState<WizardStep>("factory");
  const [name, setName] = useState("");
  const [addCodexAgent, setAddCodexAgent] = useState(true);
  const [codexAuthJsonText, setCodexAuthJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const nameId = useId();
  const authJsonId = useId();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  function goToAgentStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Name the factory before continuing.");
      return;
    }

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
            onSubmit={goToAgentStep}
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
                  onClick={() => setStep("factory")}
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
    { icon: CpuIcon, id: "agent", label: "Agent" },
  ] as const;

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-3 gap-px">
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
