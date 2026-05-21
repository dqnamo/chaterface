import { getAdminDb } from "@/lib/db.server";
import {
  getWorkerForUserMessage,
  triggerWorkerRunTask,
} from "@/lib/worker-run-trigger";

export const runtime = "nodejs";

type EventRecord = {
  id: string;
  source?: string;
  type?: string;
};

export async function POST(request: Request) {
  const db = getAdminDb();
  const { combineHandlers, typedHandlers } = db.webhooks.helpers();

  const handlers = combineHandlers(
    typedHandlers("events", "create", async (record) => {
      const event = record.after as EventRecord | null;

      if (
        !event ||
        event.source !== "factory" ||
        event.type !== "user_message"
      ) {
        return;
      }

      const workerId = await findWorkerIdForUserMessage(db, event.id);

      if (!workerId) {
        logInstantWebhook("warn", "User message event has no worker link", {
          idempotencyKey: record.idempotencyKey,
          userMessageEventId: event.id,
        });
        return;
      }

      const worker = await getWorkerForUserMessage({
        userMessageEventId: event.id,
        workerId,
      });

      if (!worker?.events?.some((workerEvent) => workerEvent.id === event.id)) {
        throw new Error(
          `User message event ${event.id} is not linked to worker`,
        );
      }

      if (worker.status === "retired") {
        logInstantWebhook(
          "warn",
          "User message event ignored for retired worker",
          {
            userMessageEventId: event.id,
            workerId,
          },
        );
        return;
      }

      const handle = await triggerWorkerRunTask({
        idempotencyKey: record.idempotencyKey,
        triggerSource: "instant-webhook",
        userId: worker.factory?.owner?.id,
        userMessageEventId: event.id,
        workerId,
      });

      logInstantWebhook("info", "Worker run task triggered from user message", {
        runId: handle.id,
        userMessageEventId: event.id,
        workerId,
      });
    }),
  );

  try {
    await db.webhooks.processRequest(handlers, request);
    return new Response("ok");
  } catch (error) {
    logInstantWebhook("error", "Webhook processing failed", {
      error: serializeError(error),
    });
    return Response.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

async function findWorkerIdForUserMessage(
  db: ReturnType<typeof getAdminDb>,
  userMessageEventId: string,
) {
  const result = await db.query({
    events: {
      $: { where: { id: userMessageEventId } },
      worker: {},
    },
  });
  const event = result.events[0] as { worker?: { id?: string } } | undefined;

  return event?.worker?.id;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Invalid Instant webhook";
}

function logInstantWebhook(
  level: "error" | "info" | "warn",
  message: string,
  details: Record<string, unknown>,
) {
  console[level](`[instant-webhook] ${message}`, details);
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}
