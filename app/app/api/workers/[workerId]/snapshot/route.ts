import { getCurrentUserForApiRequest, unauthorizedResponse } from "@/lib/auth";
import { getAdminDb } from "@/lib/db.server";
import { connectSandbox, createCheckpoint } from "@/lib/sandbox/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workerId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { workerId } = await context.params;
  const db = getAdminDb();
  const result = await db.query({
    workers: {
      $: { where: { id: workerId } },
      factory: {
        owner: {},
      },
    },
  });
  const worker = result.workers[0] as
    | {
        factory?: { id: string; owner?: { id?: string } };
        id: string;
        sandboxId?: string;
      }
    | undefined;

  if (!worker || worker.factory?.owner?.id !== user.id) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  if (!worker.sandboxId) {
    return Response.json(
      { error: "Worker has no sandbox to snapshot" },
      { status: 400 },
    );
  }

  const factoryId = worker.factory?.id;

  if (!factoryId) {
    return Response.json(
      { error: "Worker is not linked to a factory" },
      { status: 400 },
    );
  }

  try {
    const sandbox = await connectSandbox(worker.sandboxId);
    const checkpoint = await createCheckpoint(
      sandbox,
      `factory-${factoryId.slice(0, 8)}-default`,
    );

    await db.transact(
      db.tx.factories[factoryId].update({
        defaultSandboxCheckpointId: checkpoint.id,
      }),
    );

    return Response.json({ checkpointId: checkpoint.id });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create sandbox checkpoint",
      },
      { status: 500 },
    );
  }
}
