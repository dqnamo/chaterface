"use client";

import { Cursors } from "@instantdb/react";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import type { WorkerComposerPresenceControls } from "@/components/factory/WorkerComposer";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/helpers/classname-helper";
import {
  getUserAvatarColor,
  type UserAvatarColorValue,
} from "@/helpers/user-avatar-colors";
import { getUserDisplayName } from "@/helpers/user-identity";
import type { AppDb } from "@/lib/db.client";

export type SupervisorPresenceIdentity = {
  avatarColor?: UserAvatarColorValue | null | string;
  email?: null | string;
  id: string;
};

export type FactorySupervisorPresence = {
  avatarColor?: string;
  email?: string;
  name: string;
  peerId: string;
  supervisorId: string;
  workerId?: string;
};

type FactoryPresencePeer = {
  avatarColor?: string;
  email?: string;
  name?: string;
  peerId: string;
  supervisorId?: string;
  workerId?: string;
};

type WorkerChatPresencePeer = {
  avatarColor?: string;
  chatInput?: boolean;
  email?: string;
  focusedComposer?: boolean;
  name?: string;
  supervisorId?: string;
};

export function useFactorySupervisorPresence({
  factoryId,
  identity,
  instantDb,
  pathname,
}: {
  factoryId: string;
  identity: SupervisorPresenceIdentity;
  instantDb: AppDb;
  pathname: string;
}) {
  const room = instantDb.room(
    "factoryPresence",
    getFactoryPresenceRoomId(factoryId),
  );
  const { avatarColor, email, id: supervisorId } = identity;
  const workerId = getWorkerIdFromPath(pathname, factoryId);
  const presence = useMemo(
    () =>
      buildFactorySupervisorPresence(
        { avatarColor, email, id: supervisorId },
        workerId,
      ),
    [avatarColor, email, supervisorId, workerId],
  );
  const { peers, publishPresence } = instantDb.rooms.usePresence(room, {
    initialPresence: presence,
  });

  useEffect(() => {
    publishPresence(presence);
  }, [presence, publishPresence]);

  return useMemo(() => {
    const supervisors = Object.values(peers).flatMap((peer) => {
      if (!peer) {
        return [];
      }

      const normalizedPeer = normalizeFactoryPresencePeer(
        peer as FactoryPresencePeer,
      );

      return normalizedPeer && normalizedPeer.supervisorId !== supervisorId
        ? [normalizedPeer]
        : [];
    });
    const supervisorsByWorkerId: Record<string, FactorySupervisorPresence[]> =
      {};

    for (const supervisor of supervisors) {
      if (!supervisor.workerId) {
        continue;
      }

      supervisorsByWorkerId[supervisor.workerId] ??= [];
      supervisorsByWorkerId[supervisor.workerId].push(supervisor);
    }

    return {
      supervisors,
      supervisorsByWorkerId,
    };
  }, [peers, supervisorId]);
}

export function WorkerChatPresenceFrame({
  children,
  identity,
  instantDb,
  workerId,
}: {
  children: (controls: WorkerComposerPresenceControls) => ReactNode;
  identity: SupervisorPresenceIdentity;
  instantDb: AppDb;
  workerId: string;
}) {
  const room = instantDb.room("workerChat", getWorkerChatRoomId(workerId));
  const { avatarColor, email, id: supervisorId } = identity;
  const presence = useMemo(
    () => buildWorkerChatPresence({ avatarColor, email, id: supervisorId }),
    [avatarColor, email, supervisorId],
  );
  const { publishPresence } = instantDb.rooms.usePresence(room, {
    initialPresence: {
      ...presence,
      focusedComposer: false,
    },
  });
  const typing = instantDb.rooms.useTypingIndicator(room, "chatInput", {
    stopOnEnter: true,
  });
  const visibleTypingUsers = typing.active.filter(
    (peer) => peer.supervisorId !== supervisorId,
  );
  const cursorColor = getPresenceColor(avatarColor);

  useEffect(() => {
    publishPresence({
      ...presence,
      focusedComposer: false,
    });
  }, [presence, publishPresence]);

  const controls = useMemo<WorkerComposerPresenceControls>(
    () => ({
      onAfterSend: () => typing.setActive(false),
      onPromptBlur: () => {
        typing.inputProps.onBlur();
        publishPresence({ cursor: undefined, focusedComposer: false });
      },
      onPromptFocus: () => {
        publishPresence({ cursor: undefined, focusedComposer: true });
      },
      onPromptKeyDown: (event) => typing.inputProps.onKeyDown(event),
      status:
        visibleTypingUsers.length > 0 ? (
          <WorkerTypingStatus users={visibleTypingUsers} />
        ) : null,
    }),
    [publishPresence, typing, visibleTypingUsers],
  );

  return (
    <Cursors
      className="h-dvh w-full"
      renderCursor={({ color, presence: peerPresence }) => (
        <WorkerCursor
          color={color}
          presence={peerPresence}
          supervisorId={supervisorId}
        />
      )}
      room={room}
      spaceId="cursor"
      userCursorColor={cursorColor}
      zIndex={60}
    >
      {children(controls)}
    </Cursors>
  );
}

export function WorkerSupervisorPresenceStack({
  className,
  supervisors,
}: {
  className?: string;
  supervisors: FactorySupervisorPresence[];
}) {
  if (supervisors.length === 0) {
    return null;
  }

  const visibleSupervisors = supervisors.slice(0, 3);
  const extraCount = supervisors.length - visibleSupervisors.length;
  const title = formatSupervisorList(supervisors);

  return (
    <span
      aria-label={title}
      className={cn("flex shrink-0 items-center -space-x-1", className)}
      role="img"
      title={title}
    >
      {visibleSupervisors.map((supervisor) => (
        <UserAvatar
          className="rounded-[5px] ring-2 ring-white dark:ring-grayscale-2"
          color={supervisor.avatarColor}
          key={supervisor.peerId}
          name={getPresenceDisplayName(supervisor)}
          seed={supervisor.supervisorId}
          size={18}
        />
      ))}
      {extraCount > 0 ? (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-white bg-grayscale-4 px-1 font-medium text-[10px] text-grayscale-11 ring-2 ring-white dark:border-grayscale-2 dark:ring-grayscale-2">
          +{extraCount}
        </span>
      ) : null}
    </span>
  );
}

function WorkerTypingStatus({ users }: { users: WorkerChatPresencePeer[] }) {
  const typingText = formatTypingUsers(users);

  if (!typingText) {
    return null;
  }

  return (
    <span className="block truncate text-grayscale-10 text-xs">
      {typingText}
    </span>
  );
}

function WorkerCursor({
  color,
  presence,
  supervisorId,
}: {
  color: string;
  presence?: WorkerChatPresencePeer;
  supervisorId: string;
}) {
  if (
    !presence ||
    presence.focusedComposer ||
    presence.supervisorId === supervisorId
  ) {
    return null;
  }

  const name = getPresenceDisplayName(presence);

  return (
    <div className="pointer-events-none flex translate-x-0 translate-y-0 items-start">
      <svg
        aria-hidden="true"
        className="h-7 w-7 drop-shadow-sm"
        fill="none"
        viewBox="0 0 28 28"
      >
        <path
          d="M5 3.5v18.25l5.3-5.2h6.98L5 3.5Z"
          fill="white"
          stroke="rgba(0,0,0,0.18)"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path d="M7.2 8.8v7.62l2.2-2.17h5.02L7.2 8.8Z" fill={color} />
      </svg>
      <span
        className="-ml-1 mt-4 max-w-32 truncate rounded-md px-1.5 py-0.5 font-medium text-[11px] text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
}

function buildFactorySupervisorPresence(
  identity: SupervisorPresenceIdentity,
  workerId?: null | string,
) {
  return {
    ...buildWorkerChatPresence(identity),
    workerId: workerId ?? "",
  };
}

function buildWorkerChatPresence(identity: SupervisorPresenceIdentity) {
  return {
    avatarColor: getUserAvatarColor(identity.avatarColor),
    email: identity.email ?? undefined,
    name: getPresenceDisplayName(identity),
    supervisorId: identity.id,
  };
}

function normalizeFactoryPresencePeer(
  peer: FactoryPresencePeer,
): FactorySupervisorPresence | null {
  if (!peer.supervisorId) {
    return null;
  }

  return {
    avatarColor: peer.avatarColor,
    email: peer.email,
    name: getPresenceDisplayName(peer),
    peerId: peer.peerId,
    supervisorId: peer.supervisorId,
    workerId: peer.workerId || undefined,
  };
}

function getPresenceDisplayName({
  email,
  name,
}: {
  email?: null | string;
  name?: null | string;
}) {
  if (name) {
    return name;
  }

  if (email) {
    return getUserDisplayName({ email });
  }

  return getUserDisplayName({ name });
}

function getPresenceColor(color: unknown) {
  return `var(--${getUserAvatarColor(color)}-9)`;
}

function getFactoryPresenceRoomId(factoryId: string) {
  return `factory:${factoryId}:presence`;
}

function getWorkerChatRoomId(workerId: string) {
  return `worker:${workerId}:chat`;
}

function getWorkerIdFromPath(pathname: string, factoryId: string) {
  const workerPath = `/factory/${factoryId}/workers/`;

  if (!pathname.startsWith(workerPath)) {
    return "";
  }

  return pathname.slice(workerPath.length).split("/")[0] ?? "";
}

function formatTypingUsers(users: WorkerChatPresencePeer[]) {
  const names = users.map(getPresenceDisplayName).filter(Boolean);

  if (names.length === 0) {
    return null;
  }

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  return `${names[0]} and ${names.length - 1} others are typing...`;
}

function formatSupervisorList(supervisors: FactorySupervisorPresence[]) {
  const names = supervisors.map((supervisor) =>
    getPresenceDisplayName(supervisor),
  );

  if (names.length === 1) {
    return `${names[0]} is viewing this worker`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are viewing this worker`;
  }

  return `${names[0]} and ${names.length - 1} others are viewing this worker`;
}
