"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { EventFeed, type EventRecord } from "@/components/Event";
import Button from "@/components/public/Button";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { WorkerPromptForm, type WorkerRecord } from "../../worker-run-form";

type WorkerPageRecord = WorkerRecord & {
  events?: EventRecord[];
  factory?: {
    id: string;
  };
  ports?: PortRecord[];
};

type PortRecord = {
  authType?: string;
  id: string;
  port: number;
  updatedAt: string;
  url: string;
};

export default function WorkerPage() {
  if (!db) {
    return <p>InstantDB is not configured.</p>;
  }

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
  const { data, isLoading, error } = instantDb.useQuery(
    workerId
      ? {
          workers: {
            $: { where: { id: workerId } },
            events: {},
            factory: {},
            ports: {},
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

  const events = [...(worker.events ?? [])].sort((a, b) =>
    (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  );
  const ports = [...(worker.ports ?? [])].sort((a, b) => a.port - b.port);
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

  return (
    <div className="flex h-dvh w-full flex-col">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-grayscale-3 border-b px-4">
        <div className="min-w-0">
          <h1 className="truncate font-semibold text-base text-grayscale-12">
            {workerTitle}
          </h1>
          <p className="text-grayscale-10 text-xs capitalize">
            {worker.status}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {ports.map((port) => (
            <a
              href={port.url}
              target="_blank"
              rel="noreferrer"
              key={port.id}
              className="inline-flex items-center gap-1 rounded-lg border border-grayscale-4 bg-grayscale-1 px-2 py-1 font-medium text-grayscale-11 text-xs transition-colors hover:bg-grayscale-2 hover:text-grayscale-12"
              title={port.url}
            >
              {port.port}
              <ArrowSquareOut size={12} weight="bold" aria-hidden="true" />
            </a>
          ))}
          <Button
            type="button"
            variant="secondary"
            disabled={isRetired || isRetiring}
            onClick={onRetireWorker}
          >
            {isRetiring ? "Retiring..." : "Retire worker"}
          </Button>
        </div>
      </header>
      {retireError ? (
        <p className="border-grayscale-3 border-b px-4 py-2 text-red-11 text-sm">
          {retireError}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-3 pt-4 pb-20">
          {events.length > 0 ? (
            <EventFeed
              events={events}
              factoryId={factoryId}
              userRefreshToken={user?.refresh_token}
            />
          ) : (
            <p>No events yet.</p>
          )}
        </div>
      </div>

      <div className="w-full mt-auto mb-4">
        <WorkerPromptForm worker={worker} />
      </div>
    </div>
  );
}
