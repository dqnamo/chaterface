import { authenticateFactoryWorkerApiRequest } from "@/lib/factory/worker-api-auth";
import {
  getAuthenticatedWorkerBox,
  parseWorkerPort,
} from "@/lib/factory/worker-control";
import { deleteWorkerPort } from "@/lib/factory/worker-ports";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    port: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const workerToken = await authenticateFactoryWorkerApiRequest(request);

  if (!workerToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { port: portParam } = await context.params;

  try {
    const port = parseWorkerPort(portParam);
    const box = await getAuthenticatedWorkerBox(workerToken);

    await box.deletePublicURL(port);
    await deleteWorkerPort(workerToken.workerId, port);

    return Response.json({ deleted: true, port });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Port could not be deleted.",
      },
      { status: 500 },
    );
  }
}
