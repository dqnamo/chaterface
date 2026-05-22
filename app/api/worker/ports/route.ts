import { authenticateFactoryWorkerApiRequest } from "@/lib/factory/worker-api-auth";
import {
  getAuthenticatedWorkerSandbox,
  parseWorkerPort,
} from "@/lib/factory/worker-control";
import {
  deleteWorkerPort,
  getPublicUrlAuthType,
  syncWorkerPorts,
  upsertWorkerPort,
} from "@/lib/factory/worker-ports";
import { createPreviewUrl, listPreviewUrls } from "@/lib/sandbox/service";

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
    const sandbox = await getAuthenticatedWorkerSandbox(workerToken);
    const ports = await listPreviewUrls(sandbox);

    await syncWorkerPorts(workerToken.workerId, ports);

    return Response.json({
      ports: ports.map((port) => ({
        authType: getPublicUrlAuthType(port),
        port: port.port,
        url: port.url,
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
    const sandbox = await getAuthenticatedWorkerSandbox(workerToken);
    const publicUrl = await createPreviewUrl(sandbox, port, {
      basicAuth: body.basicAuth === true,
      bearerToken: body.bearerToken === true,
    });

    await upsertWorkerPort({
      authType: getPublicUrlAuthType(publicUrl),
      port: publicUrl.port,
      url: publicUrl.url,
      workerId: workerToken.workerId,
    });

    const origin = new URL(publicUrl.url).origin;

    return Response.json({
      allowedOriginsHint: `If the app enforces host or origin checks, add ${origin} to its allowed hosts/origins configuration.`,
      authConfig: publicUrl.authConfig,
      message: `Save this URL and share it with the user: ${publicUrl.url}`,
      origin,
      port: publicUrl.port,
      url: publicUrl.url,
    });
  } catch (error) {
    await deleteStalePortOnMissingPreviewUrl(workerToken.workerId, error, body);

    return errorResponse(error, "Port could not be exposed.");
  }
}

async function deleteStalePortOnMissingPreviewUrl(
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
