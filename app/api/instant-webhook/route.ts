import { getAdminDb } from "@/lib/db.server";
import { sendSupervisorInviteEmail } from "@/lib/supervisor-invitations";
import {
  getWorkerForUserMessage,
  triggerWorkerRunTask,
  unretireWorkerForRun,
} from "@/lib/worker-run-trigger";

export const runtime = "nodejs";

type EventRecord = {
  id: string;
  source?: string;
  type?: string;
};

type SupervisorRecord = {
  email?: string;
  id: string;
  invitedByEmail?: string;
  status?: string;
};

type SupervisorWithFactory = SupervisorRecord & {
  factory?: {
    id?: string;
    name?: string;
  };
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
        await unretireWorkerForRun({
          workerId,
        });
        logInstantWebhook("info", "Worker unretired by user message", {
          userMessageEventId: event.id,
          workerId,
        });
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
    typedHandlers("supervisors", "create", async (record) => {
      const supervisor = record.after as SupervisorRecord | null;

      if (!supervisor || supervisor.status !== "invited" || !supervisor.email) {
        return;
      }

      const supervisorWithFactory = await getSupervisorWithFactory(
        db,
        supervisor.id,
      );
      const factory = supervisorWithFactory?.factory;

      if (!factory?.id || !factory.name) {
        logInstantWebhook("warn", "Supervisor invite has no factory link", {
          idempotencyKey: record.idempotencyKey,
          supervisorId: supervisor.id,
        });
        return;
      }

      try {
        const inviteResult = await sendSupervisorInviteEmail({
          factoryId: factory.id,
          factoryName: factory.name,
          invitedByEmail: supervisor.invitedByEmail,
          request,
          supervisorEmail: supervisor.email,
        });
        const now = new Date().toISOString();
        const emailUpdate = {
          inviteEmailSentAt: now,
          ...(inviteResult.skipped
            ? { inviteEmailError: inviteResult.reason }
            : {}),
          ...(!inviteResult.skipped && inviteResult.emailId
            ? { resendEmailId: inviteResult.emailId }
            : {}),
        };

        await db.transact(db.tx.supervisors[supervisor.id].update(emailUpdate));

        logInstantWebhook("info", "Supervisor invite email processed", {
          emailSkipped: inviteResult.skipped,
          factoryId: factory.id,
          supervisorId: supervisor.id,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Supervisor invite email could not be sent.";

        await db.transact(
          db.tx.supervisors[supervisor.id].update({
            inviteEmailError: message,
          }),
        );

        throw error;
      }
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

async function getSupervisorWithFactory(
  db: ReturnType<typeof getAdminDb>,
  supervisorId: string,
) {
  const result = await db.query({
    supervisors: {
      $: { where: { id: supervisorId } },
      factory: {},
    },
  });

  return result.supervisors[0] as SupervisorWithFactory | undefined;
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
