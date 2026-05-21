import "server-only";

import { tasks } from "@trigger.dev/sdk";
import type { runWorkerTask } from "@/jobs/run-worker";
import { getAdminDb } from "@/lib/db.server";

type WorkerRunTriggerInput = {
  requestedAt?: string;
  triggerSource: "api" | "instant-webhook";
  userId?: string;
  userMessageEventId: string;
  workerId: string;
  idempotencyKey?: string;
};

type WorkerForMessage = {
  events?: { id: string; type?: string }[];
  factory?: { owner?: { id?: string } };
  status?: string;
};

export async function getWorkerForUserMessage({
  userMessageEventId,
  workerId,
}: {
  userMessageEventId: string;
  workerId: string;
}) {
  const db = getAdminDb();
  const result = await db.query({
    workers: {
      $: { where: { id: workerId } },
      events: {
        $: { where: { id: userMessageEventId } },
      },
      factory: {
        owner: {},
      },
    },
  });

  return result.workers[0] as WorkerForMessage | undefined;
}

export async function triggerWorkerRunTask({
  idempotencyKey,
  requestedAt = new Date().toISOString(),
  triggerSource,
  userId,
  userMessageEventId,
  workerId,
}: WorkerRunTriggerInput) {
  return tasks.trigger<typeof runWorkerTask>(
    "run-worker",
    {
      userMessageEventId,
      workerId,
    },
    {
      idempotencyKey,
      metadata: {
        requestedAt,
        triggerSource,
        userId,
        userMessageEventId,
        workerId,
      },
      tags: [`worker:${workerId}`],
    },
  );
}
