import { authenticateFactoryWorkerApiRequest } from "@/lib/factory/worker-api-auth";
import {
  createWorkerMcpConnectionRequestEvent,
  parseMcpConnectionRequest,
} from "@/lib/factory/worker-control";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const workerToken = await authenticateFactoryWorkerApiRequest(request);

  if (!workerToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const mcpRequest = parseMcpConnectionRequest(body);

    await createWorkerMcpConnectionRequestEvent({
      ...workerToken,
      ...mcpRequest,
    });

    return Response.json({ requested: true, ...mcpRequest });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "MCP request could not be created.",
      },
      { status: 500 },
    );
  }
}
