"use client";

import { useParams } from "next/navigation";
import { EventFeed, type EventRecord } from "@/components/Event";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { WorkerPromptForm, type WorkerRecord } from "../../worker-run-form";

type WorkerPageRecord = WorkerRecord & {
  events?: EventRecord[];
  factory?: {
    id: string;
  };
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
  const { data, isLoading, error } = instantDb.useQuery(
    workerId
      ? {
          workers: {
            $: { where: { id: workerId } },
            events: {},
            factory: {},
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
  const workerTitle = worker.name ?? `Worker ${worker.id.slice(0, 8)}`;

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
        <div className="flex shrink-0 items-center gap-2" />
      </header>

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
