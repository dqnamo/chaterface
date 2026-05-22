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

export default function FactoriesPage() {
  return <FactoriesPageContent instantDb={db} />;
}

function FactoriesPageContent({ instantDb }: { instantDb: AppDb }) {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = instantDb.useAuth();
  const { data, isLoading, error } = instantDb.useQuery(
    user?.id
      ? {
          $users: {
            $: { where: { id: user.id } },
            ownedFactories: {},
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
  const factories = useMemo(
    () =>
      [...((currentUser?.ownedFactories ?? []) as FactoryRecord[])].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    [currentUser?.ownedFactories],
  );

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
