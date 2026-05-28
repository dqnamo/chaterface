"use client";

import {
  CpuIcon,
  CreditCardIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useParams, useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import FactoryMonogram from "@/components/factory/FactoryMonogram";
import {
  FactorySectionCard,
  FactorySectionPageShell,
} from "@/components/factory/FactorySectionLayout";
import { WorkerRunOptions } from "@/components/factory/WorkerRunOptions";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import { cn } from "@/helpers/classname-helper";
import {
  DEFAULT_FACTORY_COLOR,
  FACTORY_COLOR_OPTIONS,
  type FactoryColorValue,
  getFactoryColor,
} from "@/helpers/factory-colors";
import {
  BASIC_SUPERVISOR_LIMIT,
  getEffectiveBillingPlan,
  isFactoryTrialing,
  PRO_BILLING_PLAN,
} from "@/lib/billing";
import {
  normalizeWorkerModel,
  normalizeWorkerReasoningLevel,
  normalizeWorkerSpeed,
  type WorkerModel,
  type WorkerReasoningLevel,
  type WorkerSpeed,
} from "@/lib/codex/worker-options";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { clearLastFactoryId } from "@/lib/factory/last-factory";

type FactoryRecord = {
  agents?: AgentRecord[];
  billingPlan?: string;
  billingUpdatedAt?: string;
  color?: FactoryColorValue;
  id: string;
  name: string;
  owner?: { id?: string };
  supervisors?: SupervisorRecord[];
  trialEndsAt?: string;
};

type SupervisorRecord = {
  id: string;
  status: string;
  user?: { id?: string };
};

type AgentRecord = {
  authStatus?: string;
  codexModel?: string;
  codexReasoningLevel?: string;
  codexSpeed?: string;
  gitEmail?: string;
  gitName?: string;
  id: string;
  name?: string;
  type?: string;
};

export type FactorySettingsSection =
  | "general"
  | "billing"
  | "agents"
  | "danger-zone";

const settingsSectionCopy = {
  agents: {
    description: "Add and view the coding agents connected to this factory.",
    title: "Agents",
  },
  billing: {
    description: "Manage this factory's plan and seats.",
    title: "Billing",
  },
  "danger-zone": {
    description: "Delete this factory and manage destructive actions.",
    title: "Danger zone",
  },
  general: {
    description: "Configure this factory workspace.",
    title: "General",
  },
} satisfies Record<
  FactorySettingsSection,
  {
    description: string;
    title: string;
  }
>;

export default function FactorySettingsSectionPage({
  section,
}: {
  section: FactorySettingsSection;
}) {
  const { factoryId } = useParams<{ factoryId: string }>();

  return (
    <FactorySettingsPageContent
      factoryId={factoryId}
      instantDb={db}
      section={section}
    />
  );
}

function FactorySettingsPageContent({
  factoryId,
  instantDb,
  section,
}: {
  factoryId: string;
  instantDb: AppDb;
  section: FactorySettingsSection;
}) {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = instantDb.useAuth();
  const { data, error, isLoading } = instantDb.useQuery(
    user?.id
      ? {
          factories: {
            $: { where: { id: factoryId } },
            ...(section === "agents" ? { agents: {} } : {}),
            owner: {},
            supervisors: {
              user: {},
            },
          },
        }
      : null,
  );
  const factory = data?.factories?.[0] as FactoryRecord | undefined;
  const agents = useMemo(
    () =>
      [...(factory?.agents ?? [])].sort((first, second) =>
        getAgentDisplayName(first).localeCompare(getAgentDisplayName(second)),
      ),
    [factory?.agents],
  );
  const currentColor = getFactoryColor(factory?.color);
  const activeSupervisorCount = (factory?.supervisors ?? []).filter(
    (supervisor) => supervisor.status !== "removed",
  ).length;
  const isOwner = Boolean(user?.id) && factory?.owner?.id === user?.id;
  const isActiveSupervisor =
    Boolean(user?.id) &&
    (factory?.supervisors ?? []).some(
      (supervisor) =>
        supervisor.status === "active" && supervisor.user?.id === user?.id,
    );
  const canManageAgents = isOwner || isActiveSupervisor;
  const effectiveBillingPlan = getEffectiveBillingPlan(factory);
  const isPaidPro = factory?.billingPlan === PRO_BILLING_PLAN;
  const isTrialing = !isPaidPro && isFactoryTrialing(factory);
  const isPro = effectiveBillingPlan === PRO_BILLING_PLAN;
  const [selectedColor, setSelectedColor] = useState<FactoryColorValue>(
    DEFAULT_FACTORY_COLOR,
  );
  const [factoryName, setFactoryName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [billingAction, setBillingAction] = useState<
    "portal" | "upgrade" | null
  >(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const lastSavedNameRef = useRef("");
  const factoryNameId = useId();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  useEffect(() => {
    setSelectedColor(currentColor);
  }, [currentColor]);

  useEffect(() => {
    if (!factory?.name) {
      return;
    }

    setFactoryName(factory.name);
    lastSavedNameRef.current = factory.name;
  }, [factory?.name]);

  useEffect(() => {
    if (!factory || section !== "general") {
      return;
    }

    const trimmedName = factoryName.trim();

    if (trimmedName === lastSavedNameRef.current) {
      return;
    }

    if (!trimmedName) {
      setNameStatus("idle");
      setNameError("Factory name is required.");
      return;
    }

    setNameStatus("saving");
    setNameError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        await instantDb.transact(
          instantDb.tx.factories[factoryId].update({
            name: trimmedName,
          }),
        );
        lastSavedNameRef.current = trimmedName;
        setNameStatus("saved");
      } catch (saveError) {
        console.error(saveError);
        setNameStatus("idle");
        setNameError(
          saveError instanceof Error
            ? saveError.message
            : "Factory name could not be saved.",
        );
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [factory, factoryId, factoryName, instantDb, section]);

  async function saveColor(color: FactoryColorValue) {
    setSelectedColor(color);
    setFormError(null);

    try {
      await instantDb.transact(
        instantDb.tx.factories[factoryId].update({
          color,
        }),
      );
    } catch (saveError) {
      console.error(saveError);
      setSelectedColor(currentColor);
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Factory settings could not be saved.",
      );
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
      clearLastFactoryId(factoryId);
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

  async function deleteAgent(agent: AgentRecord) {
    const confirmed = window.confirm(
      `Delete ${formatAgentType(agent.type)} "${agent.id}"? This permanently removes the agent from this factory.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingAgentId(agent.id);
    setAgentError(null);

    try {
      await instantDb.transact(instantDb.tx.agents[agent.id].delete());
    } catch (deleteAgentError) {
      console.error(deleteAgentError);
      setAgentError(
        deleteAgentError instanceof Error
          ? deleteAgentError.message
          : "Agent could not be deleted.",
      );
    } finally {
      setDeletingAgentId(null);
    }
  }

  async function openBillingUrl(action: "portal" | "upgrade") {
    if (!user?.refresh_token) {
      setBillingError("You must be signed in to manage billing.");
      return;
    }

    setBillingAction(action);
    setBillingError(null);

    try {
      const response = await fetch(
        `/api/factories/${factoryId}/billing/${action}`,
        {
          headers: {
            Authorization: `Bearer ${user.refresh_token}`,
          },
          method: "POST",
        },
      );
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;

      if (!response.ok || !body?.url) {
        throw new Error(body?.error ?? "Billing could not be opened.");
      }

      window.location.href = body.url;
    } catch (openError) {
      setBillingError(
        openError instanceof Error
          ? openError.message
          : "Billing could not be opened.",
      );
      setBillingAction(null);
    }
  }
  const copy = settingsSectionCopy[section];

  if (isAuthLoading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-sm text-grayscale-11">
        Loading settings...
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <h1 className="font-semibold text-base text-grayscale-12">
            Settings could not be loaded
          </h1>
          <p className="mt-2 text-grayscale-11 text-sm">{error.message}</p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-sm text-grayscale-11">
        Loading settings...
      </main>
    );
  }

  if (!factory) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <h1 className="font-semibold text-base text-grayscale-12">
            Settings could not be loaded
          </h1>
          <p className="mt-2 text-grayscale-11 text-sm">Factory not found.</p>
        </div>
      </main>
    );
  }

  return (
    <FactorySectionPageShell title={copy.title} description={copy.description}>
      {section === "general" ? (
        <FactorySectionCard>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5" htmlFor={factoryNameId}>
              <span className="font-medium text-grayscale-12 text-sm">
                Factory name
              </span>
              <Input
                id={factoryNameId}
                autoComplete="off"
                className="w-full bg-grayscale-2"
                onChange={(event) => {
                  setFactoryName(event.target.value);
                  setNameStatus("idle");
                  setNameError(null);
                }}
                placeholder="Factory name"
                value={factoryName}
              />
              <span className="min-h-4 text-xs">
                {nameError ? (
                  <span className="text-red-11">{nameError}</span>
                ) : nameStatus === "saving" ? (
                  <span className="text-grayscale-10">Saving...</span>
                ) : nameStatus === "saved" ? (
                  <span className="text-grayscale-10">Saved.</span>
                ) : null}
              </span>
            </label>

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

            <div className="flex flex-row flex-wrap items-center gap-2">
              {FACTORY_COLOR_OPTIONS.map((option) => {
                const isSelected = selectedColor === option.id;

                return (
                  <button
                    aria-label={`Use ${option.label} factory color`}
                    aria-pressed={isSelected}
                    className={cn(
                      "group relative flex size-5 aspect-square items-center justify-center border-grayscale-6 bg-grayscale-2 transition-colors hover:border-grayscale-9 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-9 focus-visible:outline-offset-2",
                    )}
                    key={option.id}
                    onClick={() => saveColor(option.id)}
                    title={option.label}
                    type="button"
                  >
                    <span
                      className="relative size-5 aspect-square rounded-md transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `var(--${option.id}-9)` }}
                    />
                    {isSelected ? (
                      <span
                        aria-hidden="true"
                        className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 size-2 rounded-xs"
                        style={{ backgroundColor: `var(--${option.id}-5)` }}
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
          </div>
        </FactorySectionCard>
      ) : null}

      {section === "agents" ? (
        <FactoryAgentsPanel
          agents={agents}
          canManageAgents={canManageAgents}
          deletingAgentId={deletingAgentId}
          error={agentError}
          factoryId={factoryId}
          instantDb={instantDb}
          isLoading={isLoading}
          onDeleteAgent={deleteAgent}
        />
      ) : null}

      {section === "billing" ? (
        <FactorySectionCard>
          <div className="flex flex-col gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-2 text-grayscale-11">
                <CreditCardIcon aria-hidden="true" size={16} weight="bold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-grayscale-12 text-sm">
                  {isPaidPro ? "Pro" : isTrialing ? "Trial" : "Basic"}
                </p>
                <p className="text-grayscale-10 text-xs">
                  {isPro
                    ? "Unlimited supervisors and unlimited workers."
                    : `${activeSupervisorCount}/${BASIC_SUPERVISOR_LIMIT} supervisors, unlimited workers.`}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <BillingStat
                label="Supervisor seats"
                value={`Owner + ${activeSupervisorCount}`}
              />
              <BillingStat label="Workers" value="Unlimited" />
            </div>

            {factory.trialEndsAt && isTrialing ? (
              <p className="text-grayscale-10 text-xs">
                Trial ends {formatBillingDate(factory.trialEndsAt)}.
              </p>
            ) : null}

            {billingError ? (
              <p className="text-red-11 text-sm" role="alert">
                {billingError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {isPaidPro ? (
                <Button
                  disabled={billingAction !== null}
                  onClick={() => openBillingUrl("portal")}
                  type="button"
                  variant="secondary"
                >
                  {billingAction === "portal" ? "Opening..." : "Manage billing"}
                </Button>
              ) : null}
              {!isPaidPro ? (
                <Button
                  disabled={billingAction !== null}
                  onClick={() => openBillingUrl("upgrade")}
                  type="button"
                >
                  {billingAction === "upgrade" ? "Opening..." : "Upgrade"}
                </Button>
              ) : null}
            </div>
          </div>
        </FactorySectionCard>
      ) : null}

      {section === "danger-zone" ? (
        <FactorySectionCard innerClassName="border-red-6 bg-red-2 dark:bg-red-2">
          <div className="flex flex-col gap-4">
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
        </FactorySectionCard>
      ) : null}
    </FactorySectionPageShell>
  );
}

function FactoryAgentsPanel({
  agents,
  canManageAgents,
  deletingAgentId,
  error,
  factoryId,
  instantDb,
  isLoading,
  onDeleteAgent,
}: {
  agents: AgentRecord[];
  canManageAgents: boolean;
  deletingAgentId: string | null;
  error: string | null;
  factoryId: string;
  instantDb: AppDb;
  isLoading: boolean;
  onDeleteAgent: (agent: AgentRecord) => void;
}) {
  return (
    <FactorySectionCard>
      <div className="flex flex-col gap-4">
        {canManageAgents ? (
          <AddAgentForm factoryId={factoryId} instantDb={instantDb} />
        ) : (
          <p className="rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-2 text-grayscale-10 text-sm">
            Only factory owners and supervisors can manage agents.
          </p>
        )}

        {error ? (
          <p className="text-red-11 text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-grayscale-10 text-sm">Loading agents...</p>
        ) : agents.length > 0 ? (
          <div className="flex flex-col gap-1">
            {agents.map((agent) => (
              <div
                className="flex flex-col gap-3 rounded-lg border border-grayscale-3 bg-grayscale-1 p-3"
                key={agent.id}
              >
                {agent.authStatus === "unauthenticated" ? (
                  <div
                    className="rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-red-11 text-sm"
                    role="alert"
                  >
                    This agent needs a fresh Codex login before it can run.
                  </div>
                ) : null}
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-grayscale-3 bg-grayscale-2 text-grayscale-11">
                      <CpuIcon aria-hidden="true" size={16} weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-grayscale-12 text-sm">
                        {getAgentDisplayName(agent)}
                      </p>
                      <p className="truncate font-mono text-grayscale-10 text-xs">
                        {formatAgentType(agent.type)} · {agent.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <AgentDefaultOptions
                      agent={agent}
                      disabled={!canManageAgents}
                      instantDb={instantDb}
                    />
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 font-medium text-xs",
                        agent.authStatus === "unauthenticated"
                          ? "border-red-6 bg-red-2 text-red-11"
                          : "border-grayscale-3 bg-grayscale-2 text-grayscale-10",
                      )}
                    >
                      {agent.authStatus === "unauthenticated"
                        ? "Unauthenticated"
                        : "Connected"}
                    </span>
                    {canManageAgents ? (
                      <button
                        aria-label={`Delete ${getAgentDisplayName(agent)} agent`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-grayscale-4 text-grayscale-10 transition-colors hover:border-red-7 hover:bg-red-2 hover:text-red-11 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={deletingAgentId === agent.id}
                        onClick={() => onDeleteAgent(agent)}
                        title="Delete agent"
                        type="button"
                      >
                        <TrashIcon aria-hidden="true" size={14} weight="bold" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <AgentIdentityOptions
                  agent={agent}
                  disabled={!canManageAgents}
                  instantDb={instantDb}
                />
                {agent.authStatus === "unauthenticated" && canManageAgents ? (
                  <AgentAuthJsonForm
                    agent={agent}
                    factoryId={factoryId}
                    instantDb={instantDb}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16">
            <p className="font-medium text-grayscale-11 text-sm">
              No agents connected yet.
            </p>
            <p className="max-w-sm text-balance text-center text-grayscale-10 text-xs">
              Add an agent to connect it here.
            </p>
          </div>
        )}
      </div>
    </FactorySectionCard>
  );
}

function AddAgentForm({
  factoryId,
  instantDb,
}: {
  factoryId: string;
  instantDb: AppDb;
}) {
  const { user } = instantDb.useAuth();
  const nameId = useId();
  const authJsonId = useId();
  const [name, setName] = useState("");
  const [authJsonText, setAuthJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Agent name is required.");
      return;
    }

    if (!user?.refresh_token) {
      setError("You must be signed in to add an agent.");
      return;
    }

    let authJson: unknown;

    try {
      authJson = JSON.parse(authJsonText);
    } catch {
      setError("Codex auth JSON must be valid JSON.");
      return;
    }

    if (!isJsonObject(authJson)) {
      setError("Codex auth JSON must be a JSON object.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/factories/${factoryId}/agents`, {
        body: JSON.stringify({
          authJson,
          name: trimmedName,
        }),
        headers: {
          authorization: `Bearer ${user.refresh_token}`,
          "content-type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Agent could not be added.");
        return;
      }

      setName("");
      setAuthJsonText("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="grid gap-3 rounded-lg border border-grayscale-3 border-dashed bg-grayscale-2/60 p-3"
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] sm:items-end">
        <label className="flex min-w-0 flex-col gap-1.5" htmlFor={nameId}>
          <span className="font-medium text-grayscale-12 text-xs">
            Agent name
          </span>
          <Input
            className="h-9 bg-grayscale-1 dark:bg-grayscale-1"
            disabled={isSaving}
            id={nameId}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Research"
            value={name}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5" htmlFor={authJsonId}>
          <span className="font-medium text-grayscale-12 text-xs">
            Codex auth JSON
          </span>
          <textarea
            autoComplete="off"
            className="min-h-24 resize-y rounded-lg border border-grayscale-3 bg-grayscale-1 px-3 py-2 font-mono text-grayscale-12 text-xs outline-none placeholder:text-grayscale-9 focus:border-accent-9 dark:bg-grayscale-1"
            disabled={isSaving}
            id={authJsonId}
            onChange={(event) => setAuthJsonText(event.target.value)}
            placeholder='{"tokens":{}}'
            spellCheck={false}
            value={authJsonText}
          />
        </label>
        <Button
          className="h-9 justify-center"
          disabled={isSaving}
          type="submit"
        >
          <CpuIcon aria-hidden="true" size={14} weight="bold" />
          {isSaving ? "Adding..." : "Add agent"}
        </Button>
      </div>
      {error ? (
        <p className="text-red-11 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function AgentIdentityOptions({
  agent,
  disabled,
  instantDb,
}: {
  agent: AgentRecord;
  disabled?: boolean;
  instantDb: AppDb;
}) {
  const nameId = useId();
  const gitNameId = useId();
  const gitEmailId = useId();
  const [name, setName] = useState(agent.name ?? "");
  const [gitName, setGitName] = useState(agent.gitName ?? "");
  const [gitEmail, setGitEmail] = useState(agent.gitEmail ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(agent.name ?? "");
    setGitName(agent.gitName ?? "");
    setGitEmail(agent.gitEmail ?? "");
  }, [agent.gitEmail, agent.gitName, agent.name]);

  const trimmedName = name.trim();
  const trimmedGitName = gitName.trim();
  const trimmedGitEmail = gitEmail.trim();
  const hasChanges =
    trimmedName !== (agent.name ?? "") ||
    trimmedGitName !== (agent.gitName ?? "") ||
    trimmedGitEmail !== (agent.gitEmail ?? "");

  async function saveIdentity() {
    setIsSaving(true);

    try {
      await instantDb.transact(
        instantDb.tx.agents[agent.id].update({
          gitEmail: trimmedGitEmail,
          gitName: trimmedGitName,
          name: trimmedName,
        }),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-2 border-grayscale-3 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <label className="flex min-w-0 flex-col gap-1.5" htmlFor={nameId}>
        <span className="font-medium text-grayscale-12 text-xs">
          Agent name
        </span>
        <Input
          className="h-9 bg-grayscale-1 dark:bg-grayscale-1"
          disabled={disabled || isSaving}
          id={nameId}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          placeholder={formatAgentType(agent.type)}
          value={name}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5" htmlFor={gitNameId}>
        <span className="font-medium text-grayscale-12 text-xs">Git name</span>
        <Input
          className="h-9 bg-grayscale-1 dark:bg-grayscale-1"
          disabled={disabled || isSaving}
          id={gitNameId}
          onChange={(event) => setGitName(event.target.value)}
          placeholder="Factory default"
          value={gitName}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5" htmlFor={gitEmailId}>
        <span className="font-medium text-grayscale-12 text-xs">Git email</span>
        <Input
          autoComplete="email"
          className="h-9 bg-grayscale-1 dark:bg-grayscale-1"
          disabled={disabled || isSaving}
          id={gitEmailId}
          onChange={(event) => setGitEmail(event.target.value)}
          placeholder="Factory default"
          value={gitEmail}
        />
      </label>
      <Button
        className="h-9 justify-center"
        disabled={disabled || isSaving || !hasChanges}
        onClick={saveIdentity}
        type="button"
        variant="secondary"
      >
        {isSaving ? "Saving..." : "Save details"}
      </Button>
    </div>
  );
}

function AgentAuthJsonForm({
  agent,
  factoryId,
  instantDb,
}: {
  agent: AgentRecord;
  factoryId: string;
  instantDb: AppDb;
}) {
  const { user } = instantDb.useAuth();
  const authJsonId = useId();
  const [authJsonText, setAuthJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.refresh_token) {
      setError("You must be signed in to reconnect this agent.");
      return;
    }

    let authJson: unknown;

    try {
      authJson = JSON.parse(authJsonText);
    } catch {
      setError("Codex auth JSON must be valid JSON.");
      return;
    }

    if (!isJsonObject(authJson)) {
      setError("Codex auth JSON must be a JSON object.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/factories/${factoryId}/agents/${agent.id}`,
        {
          body: JSON.stringify({ authJson }),
          headers: {
            authorization: `Bearer ${user.refresh_token}`,
            "content-type": "application/json",
          },
          method: "PATCH",
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Agent could not be reconnected.");
        return;
      }

      setAuthJsonText("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="grid gap-2 border-grayscale-3 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      onSubmit={onSubmit}
    >
      <label className="flex min-w-0 flex-col gap-1.5" htmlFor={authJsonId}>
        <span className="font-medium text-grayscale-12 text-xs">
          Fresh Codex auth JSON
        </span>
        <textarea
          autoComplete="off"
          className="min-h-24 resize-y rounded-lg border border-grayscale-3 bg-grayscale-1 px-3 py-2 font-mono text-grayscale-12 text-xs outline-none placeholder:text-grayscale-9 focus:border-accent-9 dark:bg-grayscale-1"
          disabled={isSaving}
          id={authJsonId}
          onChange={(event) => setAuthJsonText(event.target.value)}
          placeholder='{"tokens":{}}'
          spellCheck={false}
          value={authJsonText}
        />
        {error ? (
          <span className="text-red-11 text-xs" role="alert">
            {error}
          </span>
        ) : (
          <span className="text-grayscale-10 text-xs">
            Log in again locally, then paste the fresh{" "}
            <code className="rounded bg-grayscale-3 px-1 py-0.5 font-mono text-xs">
              ~/.codex/auth.json
            </code>
            .
          </span>
        )}
      </label>
      <Button
        className="h-9 justify-center"
        disabled={isSaving || !authJsonText.trim()}
        type="submit"
        variant="secondary"
      >
        {isSaving ? "Reconnecting..." : "Reconnect"}
      </Button>
    </form>
  );
}

function AgentDefaultOptions({
  agent,
  disabled,
  instantDb,
}: {
  agent: AgentRecord;
  disabled?: boolean;
  instantDb: AppDb;
}) {
  const model = normalizeWorkerModel(agent.codexModel);
  const reasoningLevel = normalizeWorkerReasoningLevel(
    agent.codexReasoningLevel,
  );
  const speed = normalizeWorkerSpeed({
    model,
    speed: agent.codexSpeed,
  });
  const [isSaving, setIsSaving] = useState(false);

  async function updateDefaults(updates: {
    codexModel?: WorkerModel;
    codexReasoningLevel?: WorkerReasoningLevel;
    codexSpeed?: WorkerSpeed;
  }) {
    setIsSaving(true);

    try {
      await instantDb.transact(instantDb.tx.agents[agent.id].update(updates));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WorkerRunOptions
      disabled={disabled || isSaving}
      model={model}
      reasoningLevel={reasoningLevel}
      setModel={(nextModel) =>
        updateDefaults({
          codexModel: nextModel,
        })
      }
      setReasoningLevel={(nextReasoningLevel) =>
        updateDefaults({
          codexReasoningLevel: nextReasoningLevel,
        })
      }
      setSpeed={(nextSpeed) =>
        updateDefaults({
          codexSpeed: nextSpeed,
        })
      }
      speed={speed}
    />
  );
}

function BillingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-2">
      <p className="font-medium text-grayscale-12 text-sm">{value}</p>
      <p className="text-grayscale-10 text-xs">{label}</p>
    </div>
  );
}

function formatAgentType(type?: string) {
  if (!type) {
    return "Agent";
  }

  return `${type.charAt(0).toUpperCase()}${type.slice(1)} agent`;
}

function getAgentDisplayName(agent: AgentRecord) {
  return agent.name?.trim() || formatAgentType(agent.type);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatBillingDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}
