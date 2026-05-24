"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useParams } from "next/navigation";
import { useState } from "react";
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
  events?: EventRecord[];
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

export default function WorkerPage() {
  return <WorkerPageContent instantDb={db} />;
}

function WorkerPageContent({ instantDb }: { instantDb: AppDb }) {
  const { factoryId, workerId } = useParams<{
    factoryId: string;
    workerId: string;
  }>();
  const { user } = instantDb.useAuth();
  const [baselineDialogOpen, setBaselineDialogOpen] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [baselineStatus, setBaselineStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [retireError, setRetireError] = useState<string | null>(null);
  const [isRetiring, setIsRetiring] = useState(false);
  const [isUnretiring, setIsUnretiring] = useState(false);
  const { data, isLoading, error } = instantDb.useQuery(
    workerId
      ? {
          workers: {
            $: { where: { id: workerId } },
            events: {
              attachments: {},
            },
            factory: {},
            ports: {},
          },
          $users: {
            $: { where: { id: user?.id ?? "" } },
          },
        }
      : null,
  );

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

  const events = [...(worker.events ?? [])].sort((a, b) =>
    (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  );
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
  const isUpdatingBaseline = baselineStatus === "saving";
  const baselineButtonLabel = isUpdatingBaseline
    ? "Updating baseline..."
    : "Set as factory baseline";
  const baselineDisabled = isRetired || isUpdatingBaseline || !worker.sandboxId;

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

  async function onSetFactoryBaseline() {
    if (isUpdatingBaseline) {
      return;
    }

    if (!user?.refresh_token) {
      setBaselineError("You must be signed in to update the factory baseline.");
      setBaselineDialogOpen(false);
      return;
    }

    setBaselineStatus("saving");
    setBaselineError(null);

    try {
      const response = await fetch(
        `/api/workers/${selectedWorkerId}/snapshot`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.refresh_token}`,
          },
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          body?.error ?? "Factory baseline could not be updated.",
        );
      }

      setBaselineStatus("saved");
      setBaselineDialogOpen(false);
    } catch (baselineUpdateError) {
      console.error(baselineUpdateError);
      setBaselineStatus("idle");
      setBaselineError(
        baselineUpdateError instanceof Error
          ? baselineUpdateError.message
          : "Factory baseline could not be updated.",
      );
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
        <Button
          type="button"
          variant="secondary"
          disabled={baselineDisabled}
          onClick={() => {
            setBaselineError(null);
            setBaselineDialogOpen(true);
          }}
          className="whitespace-nowrap text-xs"
          title={
            worker.sandboxId
              ? "Set this worker's current files as the starting point for new workers"
              : "This worker does not have a sandbox yet"
          }
        >
          {baselineButtonLabel}
        </Button>
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
          <Dialog.Root
            open={baselineDialogOpen}
            onOpenChange={(nextOpen) => setBaselineDialogOpen(nextOpen)}
          >
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 z-100 bg-grayscale-12/20 backdrop-blur-sm" />
              <Dialog.Popup className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-100 w-[calc(100vw-2rem)] max-w-md rounded-lg border border-grayscale-3 bg-white p-4 shadow-xl outline-none">
                <Dialog.Title className="font-semibold text-base text-grayscale-12">
                  Update factory baseline?
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-grayscale-11 text-sm">
                  New workers will start from this worker's current files.
                  Existing workers will not change.
                </Dialog.Description>
                {baselineError ? (
                  <p className="mt-3 text-red-500 text-sm">{baselineError}</p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <Dialog.Close
                    className="flex cursor-pointer flex-row gap-1.5 rounded-lg border border-b-2 border-grayscale-3 bg-white px-2 py-1 font-medium text-grayscale-11 text-sm transition-colors hover:bg-grayscale-2 hover:border-grayscale-4"
                    disabled={isUpdatingBaseline}
                  >
                    Cancel
                  </Dialog.Close>
                  <Button
                    type="button"
                    disabled={isUpdatingBaseline}
                    onClick={onSetFactoryBaseline}
                  >
                    {isUpdatingBaseline ? "Updating..." : "Update baseline"}
                  </Button>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full px-3 pt-4 pb-20">
              {feedEvents.length > 0 ? (
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
              presence={presence}
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
