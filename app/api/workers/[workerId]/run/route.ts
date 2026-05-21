import { getCurrentUserForApiRequest, unauthorizedResponse } from "@/lib/auth";
import {
  getWorkerForUserMessage,
  triggerWorkerRunTask,
} from "@/lib/worker-run-trigger";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workerId: string;
  }>;
};

type RunWorkerRequest = {
  userMessageEventId?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const requestedAt = new Date().toISOString();
  const { workerId } = await context.params;

  logWorkerRunRoute("info", "Worker run request received", {
    requestedAt,
    workerId,
  });

  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    logWorkerRunRoute("warn", "Worker run request unauthorized", {
      workerId,
    });
    return unauthorizedResponse();
  }

  let body: RunWorkerRequest;

  try {
    body = (await request.json()) as RunWorkerRequest;
  } catch {
    logWorkerRunRoute("warn", "Worker run request invalid JSON", {
      userId: user.id,
      workerId,
    });
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userMessageEventId = body.userMessageEventId?.trim();

  if (!userMessageEventId) {
    logWorkerRunRoute("warn", "Worker run request missing message event", {
      userId: user.id,
      workerId,
    });
    return Response.json(
      { error: "userMessageEventId is required" },
      { status: 400 },
    );
  }

  const worker = await getWorkerForUserMessage({
    userMessageEventId,
    workerId,
  });

  if (!worker || worker.factory?.owner?.id !== user.id) {
    logWorkerRunRoute("warn", "Worker run request worker not found", {
      userId: user.id,
      userMessageEventId,
      workerFound: Boolean(worker),
      workerId,
    });
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  if (!worker.events?.some((event) => event.id === userMessageEventId)) {
    logWorkerRunRoute("warn", "Worker run request message not found", {
      userId: user.id,
      userMessageEventId,
      workerId,
    });
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  try {
    const handle = await triggerWorkerRunTask({
      idempotencyKey: `api:${userMessageEventId}`,
      requestedAt,
      triggerSource: "api",
      userId: user.id,
      userMessageEventId,
      workerId,
    });

    logWorkerRunRoute("info", "Worker run task triggered", {
      runId: handle.id,
      userId: user.id,
      userMessageEventId,
      workerId,
    });

    return Response.json(handle);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Worker could not be started.";

    logWorkerRunRoute("error", "Worker run task trigger failed", {
      error: serializeError(error),
      userId: user.id,
      userMessageEventId,
      workerId,
    });

    return Response.json({ error: message }, { status: 500 });
  }
}

function logWorkerRunRoute(
  level: "error" | "info" | "warn",
  message: string,
  details: Record<string, unknown>,
) {
  console[level](`[worker-run-route] ${message}`, details);
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
