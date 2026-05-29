"use client";

import NumberFlow from "@number-flow/react";
import {
  CaretDownIcon,
  ChatsTeardropIcon,
  CheckIcon,
  CircleNotchIcon,
  DesktopTowerIcon,
  FadersIcon,
  GearSixIcon,
  ListIcon,
  PlusIcon,
  SignOutIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import FactoryComputerSidebar from "@/components/factory/FactoryComputerSidebar";
import FactoryMonogram from "@/components/factory/FactoryMonogram";
import FactorySettingsSidebar from "@/components/factory/FactorySettingsSidebar";
import {
  type FactorySupervisorPresence,
  type SupervisorPresenceIdentity,
  useFactorySupervisorPresence,
  WorkerSupervisorPresenceStack,
} from "@/components/factory/presence";
import Logo from "@/components/Logo";
import Button from "@/components/public/Button";
import { Menu } from "@/components/public/Menu";
import UserAvatar from "@/components/UserAvatar";
import UserSettingsModal from "@/components/UserSettingsModal";
import { cn } from "@/helpers/classname-helper";
import type { FactoryColorValue } from "@/helpers/factory-colors";
import type { UserAvatarColorValue } from "@/helpers/user-avatar-colors";
import { getUserDisplayName } from "@/helpers/user-identity";
import {
  getWorkerActivityMessage,
  getWorkerFallbackName,
} from "@/helpers/worker-activity";
import { getWorkerStatusTone } from "@/helpers/worker-status";
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
  activityMessage?: string;
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

type UserRecord = {
  avatarColor?: UserAvatarColorValue;
  email?: string;
  id: string;
  ownedFactories?: FactoryRecord[];
  supervisedMemberships?: SupervisorMembershipRecord[];
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
        }
      : null,
  );
  const currentUser = data?.$users?.[0] as UserRecord | undefined;
  const factories = useMemo(() => {
    const ownedFactories = (currentUser?.ownedFactories ??
      []) as FactoryRecord[];
    const supervisedFactories = (
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

    for (const candidate of [...ownedFactories, ...supervisedFactories]) {
      factoriesById.set(candidate.id, candidate);
    }

    return [...factoriesById.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [
    currentUser?.ownedFactories,
    currentUser?.supervisedMemberships,
    data?.supervisors,
  ]);
  const factory = factories.find((candidate) => candidate.id === factoryId);
  const workers = useMemo(
    () =>
      [...(factory?.workers ?? [])].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [factory?.workers],
  );
  const isSettingsSection = isFactorySettingsPath(pathname, factoryId);
  const isComputerSection = isFactoryComputerPath(pathname, factoryId);
  const isSupervisorsSection = isFactorySupervisorsPath(pathname, factoryId);

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
      <aside className="hidden border-grayscale-3 dark:border-grayscale-3 border-r p-2 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <SidebarContent
          activeFactoryId={factoryId}
          factories={factories}
          instantDb={instantDb}
          userAvatarColor={currentUser?.avatarColor}
          userEmail={user.email}
          userId={user.id}
        />
      </aside>

      <aside className="hidden border-grayscale-3 border-r lg:sticky lg:top-0 lg:block lg:h-dvh">
        <FactoryToolsRail currentPathname={pathname} factoryId={factoryId} />
      </aside>

      {isSupervisorsSection ? null : (
        <aside className="hidden border-grayscale-3 border-r lg:sticky lg:top-0 lg:block lg:h-dvh">
          {isSettingsSection ? (
            <FactorySettingsSidebar factoryId={factoryId} />
          ) : isComputerSection ? (
            <FactoryComputerSidebar factoryId={factoryId} />
          ) : (
            <WorkerSidebar
              currentPathname={pathname}
              factoryId={factoryId}
              instantDb={instantDb}
              supervisorIdentity={{
                avatarColor: currentUser?.avatarColor,
                email: user.email,
                id: user.id,
              }}
              workers={workers}
            />
          )}
        </aside>
      )}

      <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col border-grayscale-3 border-r bg-grayscale-1 md:flex lg:hidden">
        <div className="flex items-center border-grayscale-3 border-b px-4 py-3">
          <FactorySwitcherMenu
            activeFactoryId={factoryId}
            currentFactory={factory}
            factories={factories}
            variant="wide"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CompactFactorySidebarBody
            currentPathname={pathname}
            factoryId={factoryId}
            instantDb={instantDb}
            supervisorIdentity={{
              avatarColor: currentUser?.avatarColor,
              email: user.email,
              id: user.id,
            }}
            workers={workers}
          />
        </div>
        <div className="flex items-center border-grayscale-3 border-t px-4 py-3">
          <UserRailMenu
            instantDb={instantDb}
            orientation="horizontal"
            userAvatarColor={currentUser?.avatarColor}
            userEmail={user.email}
            userId={user.id}
          />
        </div>
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
        <aside className="absolute inset-y-0 left-0 flex w-[min(24rem,94vw)] flex-col border-grayscale-3 border-r bg-grayscale-1 shadow-2xl">
          <div className="flex items-center justify-between gap-4 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <FactorySwitcherMenu
              activeFactoryId={factoryId}
              currentFactory={factory}
              factories={factories}
              variant="wide"
            />
            <button
              type="button"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-grayscale-4 text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12"
              aria-label="Close sidebar"
              onClick={() => setIsSidebarOpen(false)}
            >
              <XIcon size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CompactFactorySidebarBody
              currentPathname={pathname}
              factoryId={factoryId}
              instantDb={instantDb}
              onNavigate={() => setIsSidebarOpen(false)}
              supervisorIdentity={{
                avatarColor: currentUser?.avatarColor,
                email: user.email,
                id: user.id,
              }}
              workers={workers}
            />
          </div>
          <div className="flex items-center border-grayscale-3 border-t px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <UserRailMenu
              instantDb={instantDb}
              onNavigate={() => setIsSidebarOpen(false)}
              orientation="horizontal"
              userAvatarColor={currentUser?.avatarColor}
              userEmail={user.email}
              userId={user.id}
            />
          </div>
        </aside>
      </div>

      <main className="min-w-0 flex-1 pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
        <div className="fixed inset-x-0 top-0 z-30 grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-3 border-grayscale-3 border-b bg-grayscale-1/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-grayscale-4 text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12"
            aria-label="Open sidebar"
            onClick={() => setIsSidebarOpen(true)}
          >
            <ListIcon size={18} weight="bold" aria-hidden="true" />
          </button>
          <Logo className="size-8 justify-self-center" />
          <span aria-hidden="true" className="size-9" />
        </div>
        {isSettingsSection ? (
          <FactorySettingsSidebar
            className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-grayscale-3 border-b bg-grayscale-1/95 backdrop-blur md:hidden"
            factoryId={factoryId}
          />
        ) : isComputerSection ? (
          <FactoryComputerSidebar
            className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-grayscale-3 border-b bg-grayscale-1/95 backdrop-blur md:hidden"
            factoryId={factoryId}
          />
        ) : null}
        {children}
      </main>
    </div>
  );
}

function CompactFactorySidebarBody({
  currentPathname,
  factoryId,
  instantDb,
  onNavigate,
  supervisorIdentity,
  workers,
}: {
  currentPathname: string;
  factoryId: string;
  instantDb: AppDb;
  onNavigate?: () => void;
  supervisorIdentity: SupervisorPresenceIdentity;
  workers: WorkerRecord[];
}) {
  return (
    <>
      <FactoryToolsRail
        className="w-full"
        currentPathname={currentPathname}
        factoryId={factoryId}
        onNavigate={onNavigate}
        showWorkersLink={false}
        variant="list"
      />
      <WorkerSidebar
        className="w-full"
        currentPathname={currentPathname}
        factoryId={factoryId}
        instantDb={instantDb}
        onNavigate={onNavigate}
        supervisorIdentity={supervisorIdentity}
        workers={workers}
      />
    </>
  );
}

function FactorySwitcherMenu({
  activeFactoryId,
  currentFactory,
  factories,
  variant = "compact",
}: {
  activeFactoryId: string;
  currentFactory?: FactoryRecord;
  factories: FactoryRecord[];
  variant?: "compact" | "wide";
}) {
  const router = useRouter();
  const isWide = variant === "wide";

  function navigateToFactory(nextFactoryId: string) {
    router.push(`/factory/${nextFactoryId}`);
  }

  function createFactory() {
    router.push("/factories/new");
  }

  return (
    <Menu.Composed
      positionerProps={{ align: "end", side: "bottom", sideOffset: 8 }}
      popupProps={{ className: "min-w-64" }}
      trigger={
        <>
          {currentFactory ? (
            <FactoryMonogram
              badgeCount={getIdleWorkerCount(currentFactory.workers)}
              color={currentFactory.color}
              name={currentFactory.name}
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-grayscale-3 font-semibold text-grayscale-11 text-sm">
              FA
            </span>
          )}
          {isWide ? (
            <span className="min-w-0 flex-1 truncate text-left font-medium">
              {currentFactory?.name ?? "Factory"}
            </span>
          ) : null}
          <CaretDownIcon aria-hidden="true" size={13} weight="bold" />
        </>
      }
      triggerProps={{
        "aria-label": "Switch factory",
        className: cn(
          "h-10 border-grayscale-3 bg-grayscale-1 text-grayscale-11 hover:bg-grayscale-2 data-[popup-open]:bg-grayscale-2 dark:bg-grayscale-2 dark:hover:bg-grayscale-3 dark:data-[popup-open]:bg-grayscale-3",
          isWide
            ? "w-full justify-start gap-2 p-0 pr-2"
            : "justify-center gap-1 p-0 pr-1",
        ),
        title: currentFactory?.name ?? "Switch factory",
      }}
    >
      <Menu.Group>
        <Menu.GroupLabel>Factories</Menu.GroupLabel>
        {factories.map((candidate) => {
          const isActive = candidate.id === activeFactoryId;

          return (
            <Menu.Item
              className="min-h-11"
              key={candidate.id}
              onClick={() => navigateToFactory(candidate.id)}
            >
              <FactoryMonogram
                badgeCount={getIdleWorkerCount(candidate.workers)}
                color={candidate.color}
                name={candidate.name}
                selected={!isActive ? false : undefined}
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {candidate.name}
              </span>
              {isActive ? (
                <CheckIcon
                  aria-hidden="true"
                  className="text-accent-11"
                  size={15}
                  weight="bold"
                />
              ) : null}
            </Menu.Item>
          );
        })}
      </Menu.Group>
      <Menu.Separator />
      <Menu.Item onClick={createFactory}>
        <PlusIcon aria-hidden="true" size={14} weight="bold" />
        Create factory
      </Menu.Item>
    </Menu.Composed>
  );
}

function FactoryToolsRail({
  className,
  currentPathname,
  factoryId,
  onNavigate,
  showWorkersLink = true,
  variant = "rail",
}: {
  className?: string;
  currentPathname: string;
  factoryId: string;
  onNavigate?: () => void;
  showWorkersLink?: boolean;
  variant?: "list" | "rail";
}) {
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
      href: `/factory/${factoryId}/supervisors`,
      icon: <UsersThreeIcon aria-hidden="true" size={18} weight="bold" />,
      isActive: currentPathname === `/factory/${factoryId}/supervisors`,
      label: "Supervisors",
    },
    {
      href: `/factory/${factoryId}/mcp`,
      icon: <DesktopTowerIcon aria-hidden="true" size={18} weight="bold" />,
      isActive: [
        `/factory/${factoryId}/github`,
        `/factory/${factoryId}/secrets`,
        `/factory/${factoryId}/skills`,
        `/factory/${factoryId}/mcp`,
      ].includes(currentPathname),
      label: "Computer settings",
    },
    {
      href: `/factory/${factoryId}/settings/general`,
      icon: <FadersIcon aria-hidden="true" size={18} weight="bold" />,
      isActive: isFactorySettingsPath(currentPathname, factoryId),
      label: "Factory settings",
    },
  ];

  return (
    <nav
      aria-label="Factory tools"
      className={cn(
        variant === "list"
          ? "flex w-full shrink-0 flex-col gap-1 border-grayscale-3 border-b p-2"
          : "flex h-full w-14 shrink-0 flex-col items-center gap-1 border-grayscale-3 border-b p-2 lg:border-b-0",
        className,
      )}
    >
      {links
        .filter((link) => showWorkersLink || link.label !== "Workers")
        .map((link) => (
          <FactoryToolsRailLink
            href={link.href}
            icon={link.icon}
            isActive={link.isActive}
            key={link.href}
            label={link.label}
            onNavigate={onNavigate}
            variant={variant}
          />
        ))}
    </nav>
  );
}

function isFactorySettingsPath(pathname: string, factoryId: string) {
  const settingsPath = `/factory/${factoryId}/settings`;

  return pathname === settingsPath || pathname.startsWith(`${settingsPath}/`);
}

function isFactoryComputerPath(pathname: string, factoryId: string) {
  return [
    `/factory/${factoryId}/github`,
    `/factory/${factoryId}/secrets`,
    `/factory/${factoryId}/skills`,
    `/factory/${factoryId}/mcp`,
  ].includes(pathname);
}

function isFactorySupervisorsPath(pathname: string, factoryId: string) {
  return pathname === `/factory/${factoryId}/supervisors`;
}

function FactoryToolsRailLink({
  href,
  icon,
  isActive,
  label,
  onNavigate,
  variant = "rail",
}: {
  href: string;
  icon: ReactNode;
  isActive: boolean;
  label: string;
  onNavigate?: () => void;
  variant?: "list" | "rail";
}) {
  return (
    <Link
      aria-label={label}
      className={cn(
        variant === "list"
          ? "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-grayscale-11 text-sm transition-colors hover:bg-grayscale-2 hover:text-grayscale-12"
          : "flex size-10 shrink-0 items-center justify-center rounded-lg text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
        isActive && "bg-grayscale-3 text-grayscale-12 hover:bg-grayscale-3",
      )}
      href={href}
      onClick={onNavigate}
      title={label}
    >
      {icon}
      {variant === "list" ? <span className="font-medium">{label}</span> : null}
    </Link>
  );
}

function WorkerSidebar({
  className,
  currentPathname,
  factoryId,
  instantDb,
  onNavigate,
  supervisorIdentity,
  workers,
}: {
  className?: string;
  currentPathname: string;
  factoryId: string;
  instantDb: AppDb;
  onNavigate?: () => void;
  supervisorIdentity: SupervisorPresenceIdentity;
  workers: WorkerRecord[];
}) {
  const activeWorkers = workers.filter((worker) => worker.status !== "retired");
  const retiredWorkers = workers.filter(
    (worker) => worker.status === "retired",
  );
  const { supervisorsByWorkerId } = useFactorySupervisorPresence({
    factoryId,
    identity: supervisorIdentity,
    instantDb,
    pathname: currentPathname,
  });

  return (
    <div className={cn("flex h-full min-h-0 w-64 flex-col", className)}>
      <nav className="flex min-h-0 flex-1 flex-col">
        <div className="p-2 scroll-mask-y scroll-mask-y-from-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <Button
            href={`/factory/${factoryId}`}
            onClick={onNavigate}
            variant="primary"
            className="w-full text-sm"
            shortcut="n"
          >
            New worker
          </Button>
          <WorkerSidebarSection
            currentPathname={currentPathname}
            factoryId={factoryId}
            onNavigate={onNavigate}
            supervisorsByWorkerId={supervisorsByWorkerId}
            title="Active workers"
            workers={activeWorkers}
          />
          <WorkerSidebarSection
            collapsible
            currentPathname={currentPathname}
            defaultCollapsed
            factoryId={factoryId}
            onNavigate={onNavigate}
            supervisorsByWorkerId={supervisorsByWorkerId}
            title="Retired workers"
            workers={retiredWorkers}
          />
        </div>
      </nav>
    </div>
  );
}

function WorkerSidebarSection({
  collapsible = false,
  currentPathname,
  defaultCollapsed = false,
  factoryId,
  onNavigate,
  supervisorsByWorkerId,
  title,
  workers,
}: {
  collapsible?: boolean;
  currentPathname: string;
  defaultCollapsed?: boolean;
  factoryId: string;
  onNavigate?: () => void;
  supervisorsByWorkerId: Record<string, FactorySupervisorPresence[]>;
  title: string;
  workers: WorkerRecord[];
}) {
  const currentWorkerId = workers.find(
    (worker) =>
      currentPathname === `/factory/${factoryId}/workers/${worker.id}`,
  )?.id;
  const sectionId = useId();
  const workerListId = `${sectionId}-worker-list`;
  const [isCollapsed, setIsCollapsed] = useState(
    collapsible && defaultCollapsed && !currentWorkerId,
  );

  useEffect(() => {
    if (currentWorkerId) {
      setIsCollapsed(false);
    }
  }, [currentWorkerId]);

  if (workers.length === 0) {
    return null;
  }

  return (
    <section className="min-w-0">
      {collapsible ? (
        <h2>
          <button
            aria-controls={workerListId}
            aria-expanded={!isCollapsed}
            className="flex w-full flex-row items-center justify-between rounded-md px-2 pb-1 font-mono font-semibold text-grayscale-10 text-xs uppercase transition-colors hover:bg-grayscale-2 hover:text-grayscale-12"
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-1">
              <CaretDownIcon
                className={cn(
                  "size-3 shrink-0 transition-transform",
                  isCollapsed && "-rotate-90",
                )}
                weight="bold"
              />
              <span className="truncate">{title}</span>
            </span>
            <NumberFlow className="ml-2 tabular-nums" value={workers.length} />
          </button>
        </h2>
      ) : (
        <h2 className="flex flex-row items-center justify-between px-2 pb-1 font-mono font-semibold text-grayscale-10 text-xs uppercase">
          <span>{title}</span>
          <NumberFlow className="ml-2 tabular-nums" value={workers.length} />
        </h2>
      )}
      <div
        className={cn("flex flex-col gap-px", isCollapsed && "hidden")}
        id={workerListId}
      >
        {workers.map((worker) => (
          <WorkerSidebarLink
            currentPathname={currentPathname}
            factoryId={factoryId}
            key={worker.id}
            onNavigate={onNavigate}
            supervisors={supervisorsByWorkerId[worker.id] ?? []}
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
  supervisors,
  worker,
}: {
  currentPathname: string;
  factoryId: string;
  onNavigate?: () => void;
  supervisors: FactorySupervisorPresence[];
  worker: WorkerRecord;
}) {
  const href = `/factory/${factoryId}/workers/${worker.id}`;
  const statusTone = getWorkerStatusTone(worker.status);
  const workerName = getWorkerFallbackName(worker);
  const activityMessage = getWorkerActivityMessage(worker);
  const createdAtLabel = DateTime.fromISO(worker.createdAt ?? "").toRelative();
  const secondaryLabel = createdAtLabel
    ? `${workerName} · ${createdAtLabel}`
    : workerName;

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
          <span className="block truncate">{activityMessage}</span>
          {secondaryLabel ? (
            <span className="block truncate text-grayscale-10 text-xs">
              {secondaryLabel}
            </span>
          ) : null}
        </span>
        <WorkerSupervisorPresenceStack supervisors={supervisors} />
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

function SidebarContent({
  activeFactoryId,
  factories,
  instantDb,
  onNavigate,
  orientation = "vertical",
  showUserMenu = true,
  userAvatarColor,
  userEmail,
  userId,
}: {
  activeFactoryId: string;
  factories: FactoryRecord[];
  instantDb: AppDb;
  onNavigate?: () => void;
  orientation?: "horizontal" | "vertical";
  showUserMenu?: boolean;
  userAvatarColor?: UserAvatarColorValue | null | string;
  userEmail?: null | string;
  userId?: null | string;
}) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        "flex gap-4",
        isHorizontal
          ? "h-auto min-w-0 flex-row items-center"
          : "h-full flex-col justify-between",
      )}
    >
      <nav
        className={cn(
          isHorizontal &&
            "scrollbar-none min-w-0 flex-1 overflow-x-auto overscroll-x-contain",
        )}
      >
        <ul
          className={cn(
            "flex gap-2",
            isHorizontal ? "min-w-max flex-row items-center pr-1" : "flex-col",
          )}
        >
          <Link
            aria-label="Create factory"
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border border-b-2 border-grayscale-3 bg-white text-grayscale-11 transition-colors hover:border-grayscale-4 hover:bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-grayscale-5 dark:hover:bg-grayscale-4",
              isHorizontal ? "size-10" : "aspect-square w-full",
            )}
            href="/factories/new"
            onClick={onNavigate}
            title="Create factory"
          >
            <PlusIcon aria-hidden="true" size={16} weight="bold" />
          </Link>
          {factories.map((candidate) => (
            <Link
              className="shrink-0"
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
      {showUserMenu ? (
        <UserRailMenu
          instantDb={instantDb}
          onNavigate={onNavigate}
          orientation={orientation}
          userAvatarColor={userAvatarColor}
          userEmail={userEmail}
          userId={userId}
        />
      ) : null}
    </div>
  );
}

function getIdleWorkerCount(workers?: WorkerRecord[]) {
  return (workers ?? []).filter((worker) => worker.status === "idle").length;
}

function UserRailMenu({
  instantDb,
  onNavigate,
  orientation = "vertical",
  userAvatarColor,
  userEmail,
  userId,
}: {
  instantDb: AppDb;
  onNavigate?: () => void;
  orientation?: "horizontal" | "vertical";
  userAvatarColor?: UserAvatarColorValue | null | string;
  userEmail?: null | string;
  userId?: null | string;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    setSettingsOpen(true);
  }

  return (
    <>
      <Menu.Composed
        positionerProps={{
          align: "end",
          side: orientation === "horizontal" ? "bottom" : "right",
          sideOffset: 8,
        }}
        popupProps={{ className: "min-w-48" }}
        trigger={
          <div className="flex size-10 items-center justify-center">
            <UserAvatar
              color={userAvatarColor}
              name={getUserDisplayName({ email: userEmail, id: userId })}
              seed={userId ?? userEmail ?? undefined}
              size={40}
            />
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
      <UserSettingsModal
        instantDb={instantDb}
        onOpenChange={setSettingsOpen}
        open={settingsOpen}
      />
    </>
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
