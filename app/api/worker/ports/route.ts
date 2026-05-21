import { authenticateFactoryWorkerApiRequest } from "@/lib/factory/worker-api-auth";
import {
  getAuthenticatedWorkerBox,
  parseWorkerPort,
} from "@/lib/factory/worker-control";
import {
  deleteWorkerPort,
  getPublicUrlAuthType,
  syncWorkerPorts,
  upsertWorkerPort,
} from "@/lib/factory/worker-ports";

export const runtime = "nodejs";

type ExposePortRequest = {
  basicAuth?: boolean;
  bearerToken?: boolean;
  port?: number;
};

export async function GET(request: Request) {
  const workerToken = await authenticateFactoryWorkerApiRequest(request);

  if (!workerToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const box = await getAuthenticatedWorkerBox(workerToken);
    const result = await box.listPublicURLs();

    await syncWorkerPorts(workerToken.workerId, result.publicURLs);

    return Response.json({
      ports: result.publicURLs.map((publicUrl) => ({
        authType: getPublicUrlAuthType(publicUrl),
        port: publicUrl.port,
        url: publicUrl.url,
      })),
    });
  } catch (error) {
    return errorResponse(error, "Ports could not be listed.");
  }
}

export async function POST(request: Request) {
  const workerToken = await authenticateFactoryWorkerApiRequest(request);

  if (!workerToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ExposePortRequest;

  try {
    body = (await request.json()) as ExposePortRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const port = parseWorkerPort(body.port);
    const box = await getAuthenticatedWorkerBox(workerToken);
    const publicUrl = await box.getPublicURL(port, {
      basicAuth: body.basicAuth === true,
      bearerToken: body.bearerToken === true,
    });

    await upsertWorkerPort({
      authType: getPublicUrlAuthType(publicUrl),
      port: publicUrl.port,
      url: publicUrl.url,
      workerId: workerToken.workerId,
    });

    return Response.json({
      password: publicUrl.password,
      port: publicUrl.port,
      token: publicUrl.token,
      url: publicUrl.url,
      username: publicUrl.username,
    });
  } catch (error) {
    await deleteStalePortOnMissingUpstashUrl(workerToken.workerId, error, body);

    return errorResponse(error, "Port could not be exposed.");
  }
}

async function deleteStalePortOnMissingUpstashUrl(
  workerId: string,
  error: unknown,
  body: ExposePortRequest,
) {
  if (!(error instanceof Error) || !/not found/i.test(error.message)) {
    return;
  }

  try {
    await deleteWorkerPort(workerId, parseWorkerPort(body.port));
  } catch {
    // Best-effort cleanup only.
  }
}

function errorResponse(error: unknown, fallback: string) {
  return Response.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}
