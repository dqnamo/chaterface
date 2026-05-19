"use client";

import { useParams } from "next/navigation";
import Event, { type EventRecord } from "@/components/Event";
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

  return (
    <div className="flex flex-col w-full h-dvh">
      <div className="flex flex-col overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-3 pt-4 pb-20">
          {events.length > 0 ? (
            <ol className=" flex flex-col gap-4">
              {events.map((event) => (
                <Event event={event} key={event.id} />
              ))}
            </ol>
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
