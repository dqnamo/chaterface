"use client";

import { ArrowRightIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import FactoryMonogram from "@/components/factory/FactoryMonogram";
import type { FactoryColorValue } from "@/helpers/factory-colors";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type FactoryRecord = {
  color?: FactoryColorValue;
  defaultSanpshotId?: string;
  id: string;
  name: string;
  status: string;
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

  const currentUser = data?.$users?.[0];
  const factories = (
    (currentUser?.ownedFactories ?? []) as FactoryRecord[]
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="min-h-dvh bg-grayscale-1 px-4 py-6 text-grayscale-12 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 p-2">
            <h1 className="font-mono font-bold text-base text-grayscale-12 uppercase">
              Factories
            </h1>
            <p className="max-w-md text-grayscale-11 text-sm">
              Create and manage the factories that run your software workflows.
            </p>
          </div>

          <Link
            href="/factories/new"
            className="flex w-full cursor-pointer flex-row items-center justify-center gap-2 rounded-lg border border-grayscale-12 bg-grayscale-12 px-3 py-2 text-grayscale-1 text-sm leading-none transition-colors hover:border-grayscale-11 hover:bg-grayscale-11 sm:w-max"
          >
            <PlusIcon size={16} weight="bold" aria-hidden="true" />
            New factory
          </Link>
        </div>

        {factories.length > 0 ? (
          <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-3 gap-px sm:grid-cols-3">
            <div className="col-span-1 bg-grayscale-1 px-3 py-2 sm:col-span-3">
              <p className="font-mono font-bold text-[11px] text-grayscale-10 uppercase tracking-wide">
                Your Factories
              </p>
            </div>
            {factories.map((factory) => (
              <FactoryCard key={factory.id} factory={factory} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-grayscale-4 bg-grayscale-2 px-4 py-12 text-center text-grayscale-11 text-sm">
            No factories yet.
          </div>
        )}
      </div>
    </main>
  );
}

function FactoryCard({ factory }: { factory: FactoryRecord }) {
  const hasSnapshot = Boolean(factory.defaultSanpshotId);

  return (
    <div className="group flex min-h-48 flex-col justify-between bg-grayscale-1 transition-colors hover:bg-grayscale-2">
      <div className="flex flex-col items-start gap-3 p-3">
        <FactoryMonogram color={factory.color} name={factory.name} />
        <div className="min-w-0">
          <h2 className="font-medium text-grayscale-12 text-sm">
            {factory.name}
          </h2>
          <p className="mt-1 text-grayscale-10 text-xs">
            {hasSnapshot ? "Default snapshot ready" : "Snapshot pending"}
          </p>
        </div>
      </div>
      <Link
        href={`/factory/${factory.id}`}
        className="flex flex-row items-center justify-between border-grayscale-3 border-t px-3 py-2"
      >
        <span className="font-mono font-bold text-[11px] text-grayscale-10 uppercase tracking-wide transition-colors group-hover:text-grayscale-11">
          Open Factory
        </span>
        <ArrowRightIcon
          size={14}
          weight="bold"
          aria-hidden="true"
          className="text-grayscale-10 transition-colors group-hover:text-accent-9"
        />
      </Link>
    </div>
  );
}
