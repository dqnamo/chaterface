"use client";

import { id } from "@instantdb/react";
import { UserPlusIcon, XIcon } from "@phosphor-icons/react";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import Button from "@/components/public/Button";
import {
  BASIC_SUPERVISOR_LIMIT,
  getEffectiveBillingPlan,
  PRO_BILLING_PLAN,
} from "@/lib/billing";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type FactoryRecord = {
  billingPlan?: string;
  id: string;
  supervisors?: SupervisorRecord[];
  trialEndsAt?: string;
};

type SupervisorRecord = {
  email: string;
  id: string;
  status: string;
};

export default function FactorySupervisorsPage() {
  const { factoryId } = useParams<{ factoryId: string }>();

  return <FactorySupervisorsPageContent factoryId={factoryId} instantDb={db} />;
}

function FactorySupervisorsPageContent({
  factoryId,
  instantDb,
}: {
  factoryId: string;
  instantDb: AppDb;
}) {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = instantDb.useAuth();
  const userEmail = user?.email ?? undefined;
  const { data, error, isLoading } = instantDb.useQuery(
    user?.id
      ? {
          $users: {
            $: { where: { id: user.id } },
            ownedFactories: {
              $: { where: { id: factoryId } },
            },
          },
          factories: {
            $: { where: { id: factoryId } },
            supervisors: {},
          },
        }
      : null,
  );
  const factory = data?.factories?.[0] as FactoryRecord | undefined;
  const currentUser = data?.$users?.[0] as
    | { ownedFactories?: FactoryRecord[] }
    | undefined;
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorNotice, setSupervisorNotice] = useState<string | null>(null);
  const [isInvitingSupervisor, setIsInvitingSupervisor] = useState(false);
  const [isOpeningUpgrade, setIsOpeningUpgrade] = useState(false);
  const [removingSupervisorId, setRemovingSupervisorId] = useState<
    string | null
  >(null);
  const isOwner = (currentUser?.ownedFactories ?? []).some(
    (ownedFactory) => ownedFactory.id === factoryId,
  );
  const supervisors = [...(factory?.supervisors ?? [])]
    .filter((supervisor) => supervisor.status !== "removed")
    .sort((a, b) => a.email.localeCompare(b.email));
  const isPro =
    factory?.billingPlan === PRO_BILLING_PLAN ||
    getEffectiveBillingPlan(factory) === PRO_BILLING_PLAN;
  const supervisorLimitReached =
    !isPro && supervisors.length >= BASIC_SUPERVISOR_LIMIT;

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  async function inviteSupervisor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOwner) {
      setSupervisorError("Only the factory owner can invite supervisors.");
      return;
    }

    if (supervisorLimitReached) {
      setSupervisorError("Upgrade to Pro to add more supervisors.");
      return;
    }

    const email = normalizeSupervisorEmail(supervisorEmail);

    if (!isValidEmail(email)) {
      setSupervisorError("Enter a valid supervisor email.");
      return;
    }

    if (userEmail && normalizeSupervisorEmail(userEmail) === email) {
      setSupervisorError("Factory owners are already supervisors.");
      return;
    }

    if (
      supervisors.some(
        (supervisor) =>
          normalizeSupervisorEmail(supervisor.email) === email &&
          supervisor.status !== "removed",
      )
    ) {
      setSupervisorError("That supervisor has already been invited.");
      return;
    }

    setIsInvitingSupervisor(true);
    setSupervisorError(null);
    setSupervisorNotice(null);

    try {
      const supervisorId = id();
      const now = new Date().toISOString();

      await instantDb.transact([
        instantDb.tx.supervisors[supervisorId].update({
          email,
          invitedAt: now,
          invitedByEmail: userEmail,
          status: "invited",
          updatedAt: now,
        }),
        instantDb.tx.supervisors[supervisorId].link({
          factory: factoryId,
        }),
      ]);

      setSupervisorEmail("");
      setSupervisorNotice("Supervisor invite created.");
      router.refresh();
    } catch (inviteError) {
      console.error(inviteError);
      setSupervisorError(
        inviteError instanceof Error
          ? inviteError.message
          : "Supervisor could not be invited.",
      );
    } finally {
      setIsInvitingSupervisor(false);
    }
  }

  async function removeSupervisor(supervisorId: string) {
    if (!isOwner) {
      setSupervisorError("Only the factory owner can remove supervisors.");
      return;
    }

    setRemovingSupervisorId(supervisorId);
    setSupervisorError(null);
    setSupervisorNotice(null);

    try {
      await instantDb.transact(
        instantDb.tx.supervisors[supervisorId].update({
          status: "removed",
          updatedAt: new Date().toISOString(),
        }),
      );

      setSupervisorNotice("Supervisor removed.");
      router.refresh();
    } catch (removeError) {
      console.error(removeError);
      setSupervisorError(
        removeError instanceof Error
          ? removeError.message
          : "Supervisor could not be removed.",
      );
    } finally {
      setRemovingSupervisorId(null);
    }
  }

  async function openUpgrade() {
    if (!user?.refresh_token) {
      setSupervisorError("You must be signed in to manage billing.");
      return;
    }

    setIsOpeningUpgrade(true);
    setSupervisorError(null);

    try {
      const response = await fetch(
        `/api/factories/${factoryId}/billing/upgrade`,
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
    } catch (upgradeError) {
      setSupervisorError(
        upgradeError instanceof Error
          ? upgradeError.message
          : "Billing could not be opened.",
      );
      setIsOpeningUpgrade(false);
    }
  }

  if (isAuthLoading || !user || isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-grayscale-11 text-sm">
        Loading supervisors...
      </main>
    );
  }

  if (error || !factory) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <h1 className="font-semibold text-base text-grayscale-12">
            Supervisors could not be loaded
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
          <h1>Supervisors</h1>
          <p className="text-grayscale-10 text-sm">
            Manage who can access and operate this factory.
          </p>
        </div>

        <section className="overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1">
          <div className="border-grayscale-3 border-b px-3 py-2">
            <h2 className="font-mono font-bold text-[11px] text-grayscale-10 uppercase tracking-wide">
              Access
            </h2>
          </div>
          <div className="flex flex-col gap-4 px-3 py-3">
            {isOwner ? (
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={inviteSupervisor}
              >
                <label className="sr-only" htmlFor="supervisor-email">
                  Supervisor email
                </label>
                <input
                  className="min-h-9 min-w-0 flex-1 rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 text-grayscale-12 text-sm outline-none transition-colors placeholder:text-grayscale-9 focus:border-accent-8"
                  id="supervisor-email"
                  onChange={(event) => setSupervisorEmail(event.target.value)}
                  placeholder="teammate@example.com"
                  type="email"
                  value={supervisorEmail}
                />
                {supervisorLimitReached ? (
                  <Button
                    disabled={isOpeningUpgrade}
                    onClick={openUpgrade}
                    type="button"
                  >
                    {isOpeningUpgrade ? "Opening..." : "Upgrade"}
                  </Button>
                ) : (
                  <Button disabled={isInvitingSupervisor} type="submit">
                    <UserPlusIcon aria-hidden="true" size={14} weight="bold" />
                    {isInvitingSupervisor ? "Inviting..." : "Invite"}
                  </Button>
                )}
              </form>
            ) : (
              <p className="text-grayscale-10 text-sm">
                Factory owners manage supervisor access.
              </p>
            )}

            {supervisorError ? (
              <p className="text-red-11 text-sm" role="alert">
                {supervisorError}
              </p>
            ) : null}
            {supervisorNotice ? (
              <p className="text-green-11 text-sm" role="status">
                {supervisorNotice}
              </p>
            ) : null}
            {!isPro ? (
              <p className="text-grayscale-10 text-xs">
                Basic includes {BASIC_SUPERVISOR_LIMIT} supervisors. Workers are
                unlimited.
              </p>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-grayscale-3">
              {supervisors.length > 0 ? (
                supervisors.map((supervisor) => (
                  <div
                    className="flex min-h-12 items-center justify-between gap-3 border-grayscale-3 border-b px-3 py-2 last:border-b-0"
                    key={supervisor.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-grayscale-12 text-sm">
                        {supervisor.email}
                      </p>
                      <p className="text-grayscale-10 text-xs">
                        {supervisor.status === "active"
                          ? "Active"
                          : "Invite pending"}
                      </p>
                    </div>
                    {isOwner && supervisor.status !== "removed" ? (
                      <button
                        aria-label={`Remove ${supervisor.email}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-grayscale-4 text-grayscale-10 transition-colors hover:border-red-7 hover:bg-red-2 hover:text-red-11 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={removingSupervisorId === supervisor.id}
                        onClick={() => removeSupervisor(supervisor.id)}
                        title="Remove supervisor"
                        type="button"
                      >
                        <XIcon aria-hidden="true" size={14} weight="bold" />
                      </button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-grayscale-10 text-sm">
                  No supervisors yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function normalizeSupervisorEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
