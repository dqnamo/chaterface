"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { getLastFactoryId } from "@/lib/factory/last-factory";

type FactoryRecord = {
  id: string;
  name: string;
};

type SupervisorMembershipRecord = {
  factory?: FactoryRecord;
  id: string;
  status: string;
  user?: { id?: string };
};

export default function FactoriesPage() {
  return <FactoriesPageContent instantDb={db} />;
}

function FactoriesPageContent({ instantDb }: { instantDb: AppDb }) {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = instantDb.useAuth();
  const userEmail = user?.email ?? undefined;
  const userId = user?.id;
  const { data, isLoading, error } = instantDb.useQuery(
    userId
      ? {
          $users: {
            $: { where: { id: userId } },
            ownedFactories: {},
            supervisedMemberships: {
              factory: {},
            },
          },
          supervisors: {
            $: { where: { email: userEmail ?? "" } },
            factory: {},
            user: {},
          },
        }
      : null,
  );

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  const currentUser = data?.$users?.[0];
  const factories = useMemo(() => {
    const ownedFactories = (currentUser?.ownedFactories ??
      []) as FactoryRecord[];
    const supervisorFactories = (
      [
        ...(currentUser?.supervisedMemberships ?? []),
        ...(data?.supervisors ?? []),
      ] as SupervisorMembershipRecord[]
    )
      .filter(
        (membership) => membership.status !== "removed" && membership.factory,
      )
      .map((membership) => membership.factory as FactoryRecord);
    const factoriesById = new Map<string, FactoryRecord>();

    for (const factory of [...ownedFactories, ...supervisorFactories]) {
      factoriesById.set(factory.id, factory);
    }

    return [...factoriesById.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [
    currentUser?.ownedFactories,
    currentUser?.supervisedMemberships,
    data?.supervisors,
  ]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isCancelled = false;

    async function claimSupervisorInvites() {
      const invites = (data?.supervisors ?? []).filter(
        (membership) => membership.status === "invited" && !membership.user?.id,
      ) as SupervisorMembershipRecord[];

      if (invites.length === 0) {
        return;
      }

      const now = new Date().toISOString();

      await instantDb.transact(
        invites.flatMap((invite) => [
          instantDb.tx.supervisors[invite.id].update({
            acceptedAt: now,
            status: "active",
            updatedAt: now,
          }),
          instantDb.tx.supervisors[invite.id].link({
            user: userId,
          }),
        ]),
      );

      if (!isCancelled) {
        router.refresh();
      }
    }

    claimSupervisorInvites().catch(console.error);

    return () => {
      isCancelled = true;
    };
  }, [data?.supervisors, instantDb, router, userId]);

  useEffect(() => {
    if (isAuthLoading || isLoading || !user || error) {
      return;
    }

    if (factories.length === 0) {
      router.replace("/factories/new");
      return;
    }

    const lastFactoryId = getLastFactoryId();
    const targetFactory =
      factories.find((factory) => factory.id === lastFactoryId) ?? factories[0];

    router.replace(`/factory/${targetFactory.id}`);
  }, [error, factories, isAuthLoading, isLoading, router, user]);

  if (isAuthLoading || !user || isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-sm text-grayscale-11">
        Loading factories...
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <h1 className="font-semibold text-base text-grayscale-12">
            Factories could not be loaded
          </h1>
          <p className="mt-2 text-grayscale-11 text-sm">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4 text-sm text-grayscale-11">
      Opening factory...
    </main>
  );
}
