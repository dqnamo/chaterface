"use client";

import NumberFlow from "@number-flow/react";
import {
  ChatsTeardropIcon,
  CircleNotchIcon,
  DesktopTowerIcon,
  FadersIcon,
  GearSixIcon,
  ListIcon,
  PlusIcon,
  SignOutIcon,
  UserIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import FactoryComputerSidebar from "@/components/factory/FactoryComputerSidebar";
import FactoryMonogram from "@/components/factory/FactoryMonogram";
import FactorySettingsSidebar from "@/components/factory/FactorySettingsSidebar";
import Button from "@/components/public/Button";
import { Menu } from "@/components/public/Menu";
import { cn } from "@/helpers/classname-helper";
import type { FactoryColorValue } from "@/helpers/factory-colors";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { saveLastFactoryId } from "@/lib/factory/last-factory";

type FactoryRecord = {
  color?: FactoryColorValue;
  id: string;
  name: string;
  status: string;
  workers?: WorkerRecord[];
};

type WorkerRecord = {
  createdAt?: string;
  id: string;
  name?: string;
  status: string;
};

type SupervisorMembershipRecord = {
  factory?: FactoryRecord;
  id: string;
  status: string;
  user?: { id?: string };
};

type WorkerStatusTone = {
  className: string;
  isSpinner?: boolean;
  label: string;
};

type FactoryWithWorkersRecord = FactoryRecord & {
  workers?: WorkerRecord[];
};

export default function FactoryLayout({ children }: { children: ReactNode }) {
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
  const userEmail = user?.email ?? undefined;
  const userId = user?.id;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data, isLoading, error } = instantDb.useQuery(
    userId
      ? {
          $users: {
            $: { where: { id: userId } },
            ownedFactories: {
              workers: {},
            },
            supervisedMemberships: {
              factory: {
                workers: {},
              },
            },
          },
          supervisors: {
            $: { where: { email: userEmail ?? "" } },
            factory: {
              workers: {},
            },
            user: {},
          },
          factories: {
            $: { where: { id: factoryId } },
            workers: {},
          },
        }
      : null,
  );
  const currentUser = data?.$users?.[0];
  const ownedFactories = (
    (currentUser?.ownedFactories ?? []) as FactoryRecord[]
  ).sort((a, b) => a.name.localeCompare(b.name));
  const supervisedFactories = (
    [
      ...(currentUser?.supervisedMemberships ?? []),
      ...(data?.supervisors ?? []),
    ] as SupervisorMembershipRecord[]
  )
    .filter(
      (membership) => membership.status !== "removed" && membership.factory,
    )
    .map((membership) => membership.factory as FactoryRecord)
    .sort((a, b) => a.name.localeCompare(b.name));
  const factoriesById = new Map<string, FactoryRecord>();

  for (const candidate of [...ownedFactories, ...supervisedFactories]) {
    factoriesById.set(candidate.id, candidate);
  }

  const factories = [...factoriesById.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const factory = factories.find((candidate) => candidate.id === factoryId);
  const factoryWithWorkers = data?.factories?.[0] as
    | FactoryWithWorkersRecord
    | undefined;
  const workers = [...(factoryWithWorkers?.workers ?? [])].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  const isSettingsSection = isFactorySettingsPath(pathname, factoryId);
  const isComputerSection = isFactoryComputerPath(pathname, factoryId);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, router, user]);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && factory?.id) {
      saveLastFactoryId(factory.id);
    }
  }, [factory?.id, isLoading]);

  if (isAuthLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-grayscale-1 text-grayscale-11 text-sm">
        Loading session...
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

  if (!isLoading && !factory) {
    return (
      <FactoryLoadState
        detail="This factory may have been deleted or the link may be wrong."
        title="Factory not found"
      />
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-row bg-grayscale-1 text-grayscale-12">
      <aside className="hidden border-grayscale-3 dark:border-grayscale-3 border-r p-2 md:sticky md:top-0 md:flex md:h-dvh md:flex-col">
        <SidebarContent
          activeFactoryId={factoryId}
          factories={factories}
          instantDb={instantDb}
          userEmail={user.email}
        />
      </aside>

      <aside className="hidden border-grayscale-3 border-r md:sticky md:top-0 md:block md:h-dvh">
        <FactoryToolsRail currentPathname={pathname} factoryId={factoryId} />
      </aside>

      <aside className="hidden border-grayscale-3 border-r md:sticky md:top-0 md:block md:h-dvh">
        {isSettingsSection ? (
          <FactorySettingsSidebar factoryId={factoryId} />
        ) : isComputerSection ? (
          <FactoryComputerSidebar factoryId={factoryId} />
        ) : (
          <WorkerSidebar
            currentPathname={pathname}
            factoryId={factoryId}
            workers={workers}
          />
        )}
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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-grayscale-3 border-b p-2">
              <SidebarContent
                activeFactoryId={factoryId}
                factories={factories}
                instantDb={instantDb}
                onNavigate={() => setIsSidebarOpen(false)}
                userEmail={user.email}
              />
            </div>
            <FactoryToolsRail
              className="w-full"
              currentPathname={pathname}
              factoryId={factoryId}
              onNavigate={() => setIsSidebarOpen(false)}
            />
            {isSettingsSection ? (
              <FactorySettingsSidebar
                className="w-full"
                factoryId={factoryId}
                onNavigate={() => setIsSidebarOpen(false)}
              />
            ) : isComputerSection ? (
              <FactoryComputerSidebar
                className="w-full"
                factoryId={factoryId}
                onNavigate={() => setIsSidebarOpen(false)}
              />
            ) : (
              <WorkerSidebar
                className="w-full"
                currentPathname={pathname}
                factoryId={factoryId}
                onNavigate={() => setIsSidebarOpen(false)}
                workers={workers}
              />
            )}
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
            <p className="truncate font-semibold text-sm">
              {factory?.name ?? "Factory"}
            </p>
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

function FactoryToolsRail({
  className,
  currentPathname,
  factoryId,
  onNavigate,
}: {
  className?: string;
  currentPathname: string;
  factoryId: string;
  onNavigate?: () => void;
}) {
  const [hash, setHash] = useState("");

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const links = [
    {
      href: `/factory/${factoryId}`,
      icon: <ChatsTeardropIcon aria-hidden="true" size={18} weight="bold" />,
      isActive:
        currentPathname === `/factory/${factoryId}` ||
        currentPathname.startsWith(`/factory/${factoryId}/workers/`),
      label: "Workers",
    },
    {
      href: `/factory/${factoryId}/mcp`,
      icon: <DesktopTowerIcon aria-hidden="true" size={18} weight="bold" />,
      isActive: [
        `/factory/${factoryId}/secrets`,
        `/factory/${factoryId}/skills`,
        `/factory/${factoryId}/mcp`,
      ].includes(currentPathname),
      label: "Computer",
    },
    {
      href: `/factory/${factoryId}/settings`,
      icon: <FadersIcon aria-hidden="true" size={18} weight="bold" />,
      isActive:
        currentPathname === `/factory/${factoryId}/settings` &&
        hash !== "#supervisors",
      label: "Settings",
    },
    {
      href: `/factory/${factoryId}/settings#supervisors`,
      icon: <UsersThreeIcon aria-hidden="true" size={18} weight="bold" />,
      isActive:
        currentPathname === `/factory/${factoryId}/settings` &&
        hash === "#supervisors",
      label: "Supervisors",
    },
  ];

  return (
    <nav
      aria-label="Factory tools"
      className={cn(
        "flex h-full w-14 shrink-0 flex-col items-center gap-1 border-grayscale-3 border-b p-2 md:border-b-0",
        "max-md:h-auto max-md:w-full max-md:flex-row max-md:justify-between",
        className,
      )}
    >
      {links.map((link) => (
        <FactoryToolsRailLink
          href={link.href}
          icon={link.icon}
          isActive={link.isActive}
          key={link.href}
          label={link.label}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function isFactorySettingsPath(pathname: string, factoryId: string) {
  return pathname === `/factory/${factoryId}/settings`;
}

function isFactoryComputerPath(pathname: string, factoryId: string) {
  return [
    `/factory/${factoryId}/secrets`,
    `/factory/${factoryId}/skills`,
    `/factory/${factoryId}/mcp`,
  ].includes(pathname);
}

function FactoryToolsRailLink({
  href,
  icon,
  isActive,
  label,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  isActive: boolean;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      aria-label={label}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
        isActive && "bg-grayscale-3 text-grayscale-12 hover:bg-grayscale-3",
      )}
      href={href}
      onClick={onNavigate}
      title={label}
    >
      {icon}
    </Link>
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
  const activeWorkers = workers.filter((worker) => worker.status !== "retired");
  const retiredWorkers = workers.filter(
    (worker) => worker.status === "retired",
  );

  return (
    <div className={cn("flex h-full min-h-0 w-64 flex-col", className)}>
      <nav className="flex min-h-0 flex-1 flex-col">
        <div className="p-2 scroll-mask-y scroll-mask-y-from-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <Button
            href={`/factory/${factoryId}`}
            onClick={onNavigate}
            variant="secondary"
            className="w-full text-sm"
          >
            New worker
          </Button>
          <WorkerSidebarSection
            currentPathname={currentPathname}
            factoryId={factoryId}
            onNavigate={onNavigate}
            title="Active workers"
            workers={activeWorkers}
          />
          <WorkerSidebarSection
            currentPathname={currentPathname}
            factoryId={factoryId}
            onNavigate={onNavigate}
            title="Retired workers"
            workers={retiredWorkers}
          />
        </div>
      </nav>
    </div>
  );
}

function WorkerSidebarSection({
  currentPathname,
  factoryId,
  onNavigate,
  title,
  workers,
}: {
  currentPathname: string;
  factoryId: string;
  onNavigate?: () => void;
  title: string;
  workers: WorkerRecord[];
}) {
  if (workers.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="px-2 pb-1 font-mono font-semibold text-grayscale-10 text-xs uppercase">
        <span>{title}</span>
        <NumberFlow className="ml-2 tabular-nums" value={workers.length} />
      </h2>
      <div className="flex flex-col gap-px">
        {workers.map((worker) => (
          <WorkerSidebarLink
            currentPathname={currentPathname}
            factoryId={factoryId}
            key={worker.id}
            onNavigate={onNavigate}
            worker={worker}
          />
        ))}
      </div>
    </section>
  );
}

function WorkerSidebarLink({
  currentPathname,
  factoryId,
  onNavigate,
  worker,
}: {
  currentPathname: string;
  factoryId: string;
  onNavigate?: () => void;
  worker: WorkerRecord;
}) {
  const href = `/factory/${factoryId}/workers/${worker.id}`;
  const statusTone = getWorkerStatusTone(worker.status);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block rounded-lg p-2 text-sm transition-colors hover:bg-grayscale-2",
        currentPathname === href && "bg-grayscale-3 hover:bg-grayscale-3",
      )}
    >
      <span className="flex min-w-0 items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate">
            {worker.name ?? `Worker ${worker.id.slice(0, 8)}`}
          </span>
          <span className="block truncate text-grayscale-10 text-xs">
            {DateTime.fromISO(worker.createdAt ?? "").toRelative()}
          </span>
        </span>
        {statusTone.isSpinner ? (
          <CircleNotchIcon
            aria-label={statusTone.label}
            className={cn(
              "mt-1 size-3 shrink-0 animate-spin",
              statusTone.className,
            )}
            role="img"
            weight="bold"
          />
        ) : (
          <span
            aria-label={statusTone.label}
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              statusTone.className,
            )}
            role="img"
            title={statusTone.label}
          />
        )}
      </span>
    </Link>
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
    case "retired":
      return {
        className: "bg-grayscale-8",
        label: "Retired",
      };
    case "queued":
    case "running":
      return {
        className: "text-orange-9",
        isSpinner: true,
        label: "Working",
      };
    default:
      return {
        className: "bg-grayscale-8",
        label: status || "Status unknown",
      };
  }
}

function SidebarContent({
  activeFactoryId,
  factories,
  instantDb,
  onNavigate,
  userEmail,
}: {
  activeFactoryId: string;
  factories: FactoryRecord[];
  instantDb: AppDb;
  onNavigate?: () => void;
  userEmail?: null | string;
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <nav>
        <ul className="flex flex-col gap-2">
          <Link
            aria-label="Create factory"
            className="flex aspect-square w-full items-center justify-center rounded-lg border border-b-2 border-grayscale-3 bg-white text-grayscale-11 transition-colors hover:border-grayscale-4 hover:bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-grayscale-5 dark:hover:bg-grayscale-4"
            href="/factories/new"
            onClick={onNavigate}
            title="Create factory"
          >
            <PlusIcon aria-hidden="true" size={16} weight="bold" />
          </Link>
          {factories.map((candidate) => (
            <Link
              href={`/factory/${candidate.id}`}
              key={candidate.id}
              onClick={onNavigate}
            >
              <FactoryMonogram
                badgeCount={getIdleWorkerCount(candidate.workers)}
                color={candidate.color}
                name={candidate.name}
                selected={candidate.id === activeFactoryId}
              />
            </Link>
          ))}
        </ul>
      </nav>
      <UserRailMenu
        instantDb={instantDb}
        onNavigate={onNavigate}
        userEmail={userEmail}
      />
    </div>
  );
}

function getIdleWorkerCount(workers?: WorkerRecord[]) {
  return (workers ?? []).filter((worker) => worker.status === "idle").length;
}

function UserRailMenu({
  instantDb,
  onNavigate,
  userEmail,
}: {
  instantDb: AppDb;
  onNavigate?: () => void;
  userEmail?: null | string;
}) {
  const router = useRouter();

  async function logOut() {
    try {
      await instantDb.auth.signOut();
    } finally {
      onNavigate?.();
      router.replace("/login");
    }
  }

  function openSettings() {
    onNavigate?.();
    router.push("/settings");
  }

  return (
    <Menu.Composed
      positionerProps={{ align: "end", side: "right", sideOffset: 8 }}
      popupProps={{ className: "min-w-48" }}
      trigger={
        <div className="size-10 flex items-center justify-center rounded-lg border-grayscale-3 bg-grayscale-1 p-0 text-grayscale-11 hover:bg-grayscale-2 data-[popup-open]:bg-grayscale-2 dark:bg-grayscale-2 dark:hover:bg-grayscale-3 dark:data-[popup-open]:bg-grayscale-3">
          <UserIcon aria-hidden="true" size={22} weight="bold" />
        </div>
      }
      triggerProps={{
        "aria-label": "Open user menu",
        className:
          "size-10 justify-center rounded-lg border-grayscale-3 bg-grayscale-1 p-0 text-grayscale-11 hover:bg-grayscale-2 data-[popup-open]:bg-grayscale-2 dark:bg-grayscale-2 dark:hover:bg-grayscale-3 dark:data-[popup-open]:bg-grayscale-3",
        title: userEmail ?? "User menu",
      }}
    >
      {userEmail ? (
        <>
          <Menu.Group>
            <Menu.GroupLabel className="normal-case tracking-normal">
              Signed in as
            </Menu.GroupLabel>
            <div className="max-w-56 truncate px-2 pb-1 text-grayscale-11 text-sm">
              {userEmail}
            </div>
          </Menu.Group>
          <Menu.Separator />
        </>
      ) : null}
      <Menu.Item onClick={openSettings}>
        <GearSixIcon aria-hidden="true" size={14} weight="bold" />
        Settings
      </Menu.Item>
      <Menu.Item onClick={logOut}>
        <SignOutIcon aria-hidden="true" size={14} weight="bold" />
        Log out
      </Menu.Item>
    </Menu.Composed>
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
