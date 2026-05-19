import { getCurrentUserForApiRequest, unauthorizedResponse } from "@/lib/auth";
import { getBox } from "@/lib/codex/box-auth";
import { getAdminDb } from "@/lib/db.server";

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
    const box = await getBox(worker.sandboxId);
    const snapshot = await box.snapshot({
      name: `factory-${factoryId.slice(0, 8)}-default`,
    });

    await db.transact(
      db.tx.factories[factoryId].update({
        defaultSanpshotId: snapshot.id,
      }),
    );

    return Response.json({ snapshotId: snapshot.id });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create snapshot",
      },
      { status: 500 },
    );
  }
}
