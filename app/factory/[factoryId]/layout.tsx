"use client";

import {
  GearSixIcon,
  KeyIcon,
  ListIcon,
  PlugIcon,
  PuzzlePieceIcon,
  XIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import FactoryMonogram from "@/components/factory/FactoryMonogram";
import Button from "@/components/public/Button";
import { cn } from "@/helpers/classname-helper";
import type { FactoryColorValue } from "@/helpers/factory-colors";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type FactoryRecord = {
  color?: FactoryColorValue;
  id: string;
  name: string;
  status: string;
};

type WorkerRecord = {
  createdAt?: string;
  id: string;
  name?: string;
  status: string;
};

type WorkerStatusTone = {
  className: string;
  label: string;
};

type FactoryWithWorkersRecord = FactoryRecord & {
  workers?: WorkerRecord[];
};

export default function FactoryLayout({ children }: { children: ReactNode }) {
  if (!db) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4 text-sm text-grayscale-11">
        InstantDB is not configured.
      </div>
    );
  }

  return <FactoryLayoutContent instantDb={db}>{children}</FactoryLayoutContent>;
}

function FactoryLayoutContent({
  children,
  instantDb,
}: {
  children: ReactNode;
  instantDb: AppDb;
}) {
  const router = useRouter();
  const { factoryId } = useParams<{ factoryId: string }>();
  const pathname = usePathname();
  const { isLoading: isAuthLoading, user } = instantDb.useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data, isLoading, error } = instantDb.useQuery(
    user?.id
      ? {
          $users: {
            $: { where: { id: user.id } },
            ownedFactories: {},
          },
          factories: {
            $: { where: { id: factoryId } },
            workers: {},
          },
        }
      : null,
  );

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isAuthLoading || !user || isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-grayscale-1 text-grayscale-11 text-sm">
        Loading factory...
      </div>
    );
  }

  if (error) {
    return (
      <FactoryLoadState
        detail={error.message}
        title="Factory could not be loaded"
      />
    );
  }

  const currentUser = data?.$users?.[0];
  const factories = (
    (currentUser?.ownedFactories ?? []) as FactoryRecord[]
  ).sort((a, b) => a.name.localeCompare(b.name));
  const factory = factories.find((candidate) => candidate.id === factoryId);
  const factoryWithWorkers = data?.factories?.[0] as
    | FactoryWithWorkersRecord
    | undefined;
  const workers = [...(factoryWithWorkers?.workers ?? [])].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

  if (!factory) {
    return (
      <FactoryLoadState
        detail="This factory may have been deleted or the link may be wrong."
        title="Factory not found"
      />
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-row bg-grayscale-1 text-grayscale-12">
      <aside className="hidden border-grayscale-3 border-r md:sticky md:top-0 md:block md:h-dvh p-2">
        <SidebarContent factories={factories} />
      </aside>

      <aside className="hidden border-grayscale-3 border-r md:sticky md:top-0 md:block md:h-dvh">
        <WorkerSidebar
          currentPathname={pathname}
          factoryId={factoryId}
          workers={workers}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          isSidebarOpen ? "block" : "hidden",
        )}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/35"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
        <aside className="absolute inset-y-0 left-0 flex w-[min(22rem,92vw)] flex-col border-grayscale-3 border-r bg-grayscale-1 shadow-2xl">
          <div className="flex min-h-14 items-center justify-between border-grayscale-3 border-b px-4 pt-[env(safe-area-inset-top)]">
            <span className="font-semibold text-sm">Factory</span>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-lg border border-grayscale-4 text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12"
              aria-label="Close sidebar"
              onClick={() => setIsSidebarOpen(false)}
            >
              <XIcon size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-grayscale-3 border-b p-2">
              <SidebarContent factories={factories} />
            </div>
            <WorkerSidebar
              className="h-auto w-full"
              currentPathname={pathname}
              factoryId={factoryId}
              onNavigate={() => setIsSidebarOpen(false)}
              workers={workers}
            />
          </div>
        </aside>
      </div>

      <main className="min-w-0 flex-1 pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
        <div className="fixed inset-x-0 top-0 z-30 flex min-h-14 items-center gap-3 border-grayscale-3 border-b bg-grayscale-1/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-grayscale-4 text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12"
            aria-label="Open sidebar"
            onClick={() => setIsSidebarOpen(true)}
          >
            <ListIcon size={18} weight="bold" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm">{factory.name}</p>
            <p className="truncate text-grayscale-10 text-xs">
              Open menu for workers and settings
            </p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

function WorkerSidebar({
  className,
  currentPathname,
  factoryId,
  onNavigate,
  workers,
}: {
  className?: string;
  currentPathname: string;
  factoryId: string;
  onNavigate?: () => void;
  workers: WorkerRecord[];
}) {
  return (
    <div className={cn("flex h-dvh min-h-0 w-64 flex-col", className)}>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <Link
          href={`/factory/${factoryId}`}
          onClick={onNavigate}
          className={cn(
            "",
            currentPathname === `/factory/${factoryId}` && "bg-grayscale-3",
          )}
        >
          <Button variant="secondary" className="w-full">
            New worker
          </Button>
        </Link>
        <Link href={`/factory/${factoryId}/secrets`} onClick={onNavigate}>
          <Button
            variant="secondary"
            className={cn(
              "mt-2 w-full",
              currentPathname === `/factory/${factoryId}/secrets` &&
                "bg-grayscale-3",
            )}
          >
            <KeyIcon aria-hidden="true" size={14} weight="bold" />
            Secrets
          </Button>
        </Link>
        <Link href={`/factory/${factoryId}/skills`} onClick={onNavigate}>
          <Button
            variant="secondary"
            className={cn(
              "mt-2 w-full",
              currentPathname === `/factory/${factoryId}/skills` &&
                "bg-grayscale-3",
            )}
          >
            <PuzzlePieceIcon aria-hidden="true" size={14} weight="bold" />
            Skills
          </Button>
        </Link>
        <Link href={`/factory/${factoryId}/mcp`} onClick={onNavigate}>
          <Button
            variant="secondary"
            className={cn(
              "mt-2 w-full",
              currentPathname === `/factory/${factoryId}/mcp` &&
                "bg-grayscale-3",
            )}
          >
            <PlugIcon aria-hidden="true" size={14} weight="bold" />
            MCP
          </Button>
        </Link>
        <Link href={`/factory/${factoryId}/settings`} onClick={onNavigate}>
          <Button
            variant="secondary"
            className={cn(
              "mt-2 w-full",
              currentPathname === `/factory/${factoryId}/settings` &&
                "bg-grayscale-3",
            )}
          >
            <GearSixIcon aria-hidden="true" size={14} weight="bold" />
            Settings
          </Button>
        </Link>
        <div className="flex flex-col gap-px">
          {workers.map((worker) => {
            const href = `/factory/${factoryId}/workers/${worker.id}`;
            const statusTone = getWorkerStatusTone(worker.status);

            return (
              <Link
                href={href}
                key={worker.id}
                onClick={onNavigate}
                className={cn(
                  "block rounded-lg p-2 text-sm transition-colors hover:bg-grayscale-2",
                  currentPathname === href && "bg-grayscale-2",
                )}
              >
                <span className="flex min-w-0 items-start gap-2">
                  <span
                    aria-label={statusTone.label}
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      statusTone.className,
                    )}
                    role="img"
                    title={statusTone.label}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">
                      {worker.name ?? `Worker ${worker.id.slice(0, 8)}`}
                    </span>
                    <span className="block truncate text-grayscale-10 text-xs">
                      {DateTime.fromISO(worker.createdAt ?? "").toRelative()}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function getWorkerStatusTone(status: string): WorkerStatusTone {
  switch (status) {
    case "failed":
      return {
        className: "bg-red-9",
        label: "Failed",
      };
    case "idle":
      return {
        className: "bg-green-9",
        label: "Idle and awaiting input",
      };
    case "queued":
    case "running":
      return {
        className: "bg-orange-9",
        label: "Working",
      };
    default:
      return {
        className: "bg-grayscale-8",
        label: status || "Status unknown",
      };
  }
}

function SidebarContent({ factories }: { factories: FactoryRecord[] }) {
  return (
    <nav>
      <ul className="flex flex-col gap-2">
        {factories.map((candidate) => (
          <Link href={`/factory/${candidate.id}`} key={candidate.id}>
            <FactoryMonogram color={candidate.color} name={candidate.name} />
          </Link>
        ))}
      </ul>
    </nav>
  );
}

function FactoryLoadState({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-grayscale-1 px-6 text-center">
      <div className="max-w-md">
        <h1 className="font-semibold text-base text-grayscale-12">{title}</h1>
        <p className="mt-2 text-grayscale-11 text-sm">{detail}</p>
        <Link
          href="/factories"
          className="mt-4 inline-flex font-medium text-accent-11 text-sm hover:text-accent-12"
        >
          Back to factories
        </Link>
      </div>
    </div>
  );
}
