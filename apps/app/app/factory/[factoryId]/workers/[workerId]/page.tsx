"use client";

import { useParams } from "next/navigation";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EventFeed, type EventRecord } from "@/components/Event";
import {
  getEventAttachments,
  getUserPrompt,
} from "@/components/events/event-utils";
import { WorkerChatPresenceFrame } from "@/components/factory/presence";
import WorkerStatusIndicator from "@/components/factory/WorkerStatusIndicator";
import Button from "@/components/public/Button";
import type { UserAvatarColorValue } from "@/helpers/user-avatar-colors";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { WorkerPromptForm, type WorkerRecord } from "../../worker-run-form";

type WorkerPageRecord = WorkerRecord & {
  factory?: {
    id: string;
  };
  ports?: PortRecord[];
  sandboxId?: string;
};

type PortRecord = {
  authType?: string;
  id: string;
  port: number;
  updatedAt: string;
  url: string;
};

type UserRecord = {
  avatarColor?: UserAvatarColorValue;
  email?: string;
  id: string;
};

const eventPageSize = 75;

export default function WorkerPage() {
  return <WorkerPageContent instantDb={db} />;
}

function WorkerPageContent({ instantDb }: { instantDb: AppDb }) {
  const { factoryId, workerId } = useParams<{
    factoryId: string;
    workerId: string;
  }>();
  const { user } = instantDb.useAuth();
  const [retireError, setRetireError] = useState<string | null>(null);
  const [isRetiring, setIsRetiring] = useState(false);
  const [isUnretiring, setIsUnretiring] = useState(false);
  const [isLoadingOlderEvents, setIsLoadingOlderEvents] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isNearChatBottomRef = useRef(true);
  const hasScrolledToInitialBottomRef = useRef(false);
  const pendingScrollRestoreRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const { data, isLoading, error } = instantDb.useQuery(
    workerId
      ? {
          workers: {
            $: { where: { id: workerId } },
            agent: {},
            factory: {},
            ports: {},
          },
          $users: {
            $: { where: { id: user?.id ?? "" } },
          },
        }
      : null,
  );
  const {
    data: eventData,
    isLoading: isLoadingEvents,
    error: eventsError,
    canLoadNextPage,
    loadNextPage,
  } = instantDb.useInfiniteQuery({
    events: {
      $: {
        limit: eventPageSize,
        order: {
          createdAt: "desc",
        },
        where: {
          "worker.id": workerId,
        },
      },
      attachments: {},
    },
  });
  const events = useMemo(
    () =>
      ([...((eventData?.events ?? []) as EventRecord[])] as EventRecord[])
        .reverse()
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")),
    [eventData?.events],
  );
  const oldestEventId = events[0]?.id ?? null;
  const latestEventId = events.at(-1)?.id ?? null;

  const updateNearChatBottom = useCallback(() => {
    const scrollElement = chatScrollRef.current;

    if (!scrollElement) {
      isNearChatBottomRef.current = true;
      return;
    }

    isNearChatBottomRef.current =
      scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight <
      120;
  }, []);

  const scrollChatToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      requestAnimationFrame(() => {
        const scrollElement = chatScrollRef.current;

        if (!scrollElement) {
          return;
        }

        scrollElement.scrollTo({
          behavior,
          top: scrollElement.scrollHeight,
        });
        updateNearChatBottom();
      });
    },
    [updateNearChatBottom],
  );

  const loadOlderEvents = useCallback(() => {
    const scrollElement = chatScrollRef.current;

    if (!canLoadNextPage || isLoadingOlderEvents || !scrollElement) {
      return;
    }

    pendingScrollRestoreRef.current = {
      scrollHeight: scrollElement.scrollHeight,
      scrollTop: scrollElement.scrollTop,
    };
    setIsLoadingOlderEvents(true);

    Promise.resolve(loadNextPage()).finally(() => {
      setIsLoadingOlderEvents(false);
    });
  }, [canLoadNextPage, isLoadingOlderEvents, loadNextPage]);

  const onChatScroll = useCallback(() => {
    const scrollElement = chatScrollRef.current;

    updateNearChatBottom();

    if (scrollElement && scrollElement.scrollTop <= 160) {
      loadOlderEvents();
    }
  }, [loadOlderEvents, updateNearChatBottom]);

  useLayoutEffect(() => {
    const scrollRestore = pendingScrollRestoreRef.current;
    const scrollElement = chatScrollRef.current;

    if (!scrollRestore || !scrollElement || !oldestEventId) {
      return;
    }

    const heightDelta = scrollElement.scrollHeight - scrollRestore.scrollHeight;
    scrollElement.scrollTop = scrollRestore.scrollTop + heightDelta;
    pendingScrollRestoreRef.current = null;
  }, [oldestEventId]);

  useLayoutEffect(() => {
    if (isLoadingEvents || events.length === 0 || !latestEventId) {
      return;
    }

    if (!hasScrolledToInitialBottomRef.current) {
      scrollChatToBottom();
      hasScrolledToInitialBottomRef.current = true;
      return;
    }

    if (isNearChatBottomRef.current) {
      scrollChatToBottom();
    }
  }, [events.length, isLoadingEvents, latestEventId, scrollChatToBottom]);

  if (isLoading) {
    return <p>Loading worker...</p>;
  }

  if (error) {
    return <p>{error.message}</p>;
  }

  const worker = data?.workers?.[0] as WorkerPageRecord | undefined;

  if (!worker || worker.factory?.id !== factoryId) {
    return <p>Worker not found.</p>;
  }

  if (!user) {
    return <p>Loading session...</p>;
  }

  const feedEvents = events.filter(
    (event) => event.type !== "queued_user_message",
  );
  const queuedMessages = events.flatMap((event) => {
    if (event.type !== "queued_user_message") {
      return [];
    }

    const message = getUserPrompt(event.data)?.trim();

    if (!message) {
      return [];
    }

    return [
      {
        attachmentCount: getEventAttachments(event).length,
        id: event.id,
        message,
      },
    ];
  });
  const currentUser = data?.$users?.[0] as UserRecord | undefined;
  const workerTitle = worker.name ?? `Worker ${worker.id.slice(0, 8)}`;
  const selectedWorkerId = worker.id;
  const isRetired = worker.status === "retired";

  async function onRetireWorker() {
    if (isRetired || isRetiring) {
      return;
    }

    if (!user) {
      setRetireError("You must be signed in to retire a worker.");
      return;
    }

    const now = new Date().toISOString();

    setIsRetiring(true);
    setRetireError(null);

    try {
      await instantDb.transact(
        instantDb.tx.workers[selectedWorkerId].update({
          activeCommandId: null,
          activePid: null,
          retiredAt: now,
          status: "retired",
          updatedAt: now,
        }),
      );
    } catch (retireWorkerError) {
      console.error(retireWorkerError);
      setRetireError(
        retireWorkerError instanceof Error
          ? retireWorkerError.message
          : "Worker could not be retired.",
      );
    } finally {
      setIsRetiring(false);
    }
  }

  async function onUnretireWorker() {
    if (!isRetired || isUnretiring) {
      return;
    }

    if (!user) {
      setRetireError("You must be signed in to unretire a worker.");
      return;
    }

    const now = new Date().toISOString();

    setIsUnretiring(true);
    setRetireError(null);

    try {
      await instantDb.transact(
        instantDb.tx.workers[selectedWorkerId].update({
          activeCommandId: null,
          activePid: null,
          retiredAt: null,
          status: "idle",
          updatedAt: now,
        }),
      );
    } catch (unretireWorkerError) {
      console.error(unretireWorkerError);
      setRetireError(
        unretireWorkerError instanceof Error
          ? unretireWorkerError.message
          : "Worker could not be unretired.",
      );
    } finally {
      setIsUnretiring(false);
    }
  }

  const composerHeader = (
    <section className="flex flex-col gap-3 p-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 px-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="min-w-0 truncate font-medium text-xs text-grayscale-12">
            {workerTitle}
          </h1>
          <WorkerStatusIndicator showLabel status={worker.status} />
        </div>
        {retireError ? (
          <p className="mt-1 text-red-500 text-xs">{retireError}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {isRetired ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isUnretiring}
            onClick={onUnretireWorker}
            className="whitespace-nowrap text-xs"
          >
            {isUnretiring ? "Unretiring..." : "Unretire worker"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={isRetiring}
            onClick={onRetireWorker}
            className="whitespace-nowrap text-xs"
          >
            {isRetiring ? "Retiring..." : "Retire worker"}
          </Button>
        )}
      </div>
    </section>
  );

  return (
    <WorkerChatPresenceFrame
      identity={{
        avatarColor: currentUser?.avatarColor,
        email: user.email,
        id: user.id,
      }}
      instantDb={instantDb}
      workerId={worker.id}
    >
      {(presence) => (
        <div className="flex h-dvh w-full flex-col">
          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            onScroll={onChatScroll}
            ref={chatScrollRef}
          >
            <div className="max-w-2xl mx-auto w-full px-3 pt-4 pb-20">
              {canLoadNextPage ? (
                <div className="mb-4 flex justify-center">
                  <Button
                    className="text-xs"
                    disabled={isLoadingOlderEvents}
                    onClick={loadOlderEvents}
                    type="button"
                    variant="secondary"
                  >
                    {isLoadingOlderEvents
                      ? "Loading earlier..."
                      : "Load earlier"}
                  </Button>
                </div>
              ) : null}
              {eventsError ? (
                <p className="text-red-500 text-sm">{eventsError.message}</p>
              ) : isLoadingEvents ? (
                <p>Loading events...</p>
              ) : feedEvents.length > 0 ? (
                <EventFeed
                  events={feedEvents}
                  factoryId={factoryId}
                  userRefreshToken={user.refresh_token}
                />
              ) : (
                <p>No events yet.</p>
              )}
            </div>
          </div>

          <div className="w-full mt-auto mb-4">
            <WorkerPromptForm
              factoryId={factoryId}
              presence={{
                ...presence,
                onAfterSend: () => {
                  presence.onAfterSend?.();
                  isNearChatBottomRef.current = true;
                  scrollChatToBottom("smooth");
                },
              }}
              queuedMessages={queuedMessages}
              topSection={composerHeader}
              worker={worker}
            />
          </div>
        </div>
      )}
    </WorkerChatPresenceFrame>
  );
}
