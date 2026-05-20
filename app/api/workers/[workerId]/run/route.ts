import { tasks } from "@trigger.dev/sdk";
import type { runWorkerTask } from "@/jobs/run-worker";
import { getCurrentUserForApiRequest, unauthorizedResponse } from "@/lib/auth";
import { getAdminDb } from "@/lib/db.server";

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
  const worker = result.workers[0] as
    | {
        events?: { id: string; type?: string }[];
        factory?: { owner?: { id?: string } };
        status?: string;
      }
    | undefined;

  if (!worker || worker.factory?.owner?.id !== user.id) {
    logWorkerRunRoute("warn", "Worker run request worker not found", {
      userId: user.id,
      userMessageEventId,
      workerFound: Boolean(worker),
      workerId,
    });
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  if (worker.status === "retired") {
    logWorkerRunRoute("warn", "Worker run request worker retired", {
      userId: user.id,
      userMessageEventId,
      workerId,
    });
    return Response.json(
      { error: "This worker has been retired." },
      { status: 400 },
    );
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
    const handle = await tasks.trigger<typeof runWorkerTask>(
      "run-worker",
      {
        userMessageEventId,
        workerId,
      },
      {
        metadata: {
          requestedAt,
          userId: user.id,
          userMessageEventId,
          workerId,
        },
        tags: [`worker:${workerId}`],
      },
    );

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
