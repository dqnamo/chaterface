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
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  let body: RunWorkerRequest;

  try {
    body = (await request.json()) as RunWorkerRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { workerId } = await context.params;
  const userMessageEventId = body.userMessageEventId?.trim();

  if (!userMessageEventId) {
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
      }
    | undefined;

  if (!worker || worker.factory?.owner?.id !== user.id) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  if (!worker.events?.some((event) => event.id === userMessageEventId)) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof runWorkerTask>("run-worker", {
    userMessageEventId,
    workerId,
  });

  return Response.json(handle);
}
