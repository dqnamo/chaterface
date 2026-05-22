import { authenticateFactoryWorkerApiRequest } from "@/lib/factory/worker-api-auth";
import {
  getAuthenticatedWorkerSandbox,
  parseWorkerPort,
} from "@/lib/factory/worker-control";
import {
  deleteWorkerPort,
  getPublicUrlAuthType,
  listWorkerPorts,
  upsertWorkerPort,
} from "@/lib/factory/worker-ports";
import {
  type AppSandbox,
  createPreviewUrl,
  runSandboxCommand,
} from "@/lib/sandbox/service";

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
    await getAuthenticatedWorkerSandbox(workerToken);
    const ports = await listWorkerPorts(workerToken.workerId);

    return Response.json({
      ports: ports.map((port) => ({
        authType: port.authType ?? "none",
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
    await assertSandboxPortIsPreviewable(sandbox, port);
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

    return Response.json({
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

async function assertSandboxPortIsPreviewable(
  sandbox: AppSandbox,
  port: number,
) {
  const socketResult = await runSandboxCommand(
    sandbox,
    "if command -v ss >/dev/null 2>&1; then ss -ltnH; elif command -v netstat >/dev/null 2>&1; then netstat -ltn; else echo __NO_SOCKET_TOOL__; fi",
    5_000,
  );
  const listeners = parseListeningAddresses(socketResult.output, port);

  if (listeners.length === 0) {
    throw new Error(
      `No service is listening on port ${port}. Start the dev server first and verify it with curl http://127.0.0.1:${port}.`,
    );
  }

  if (listeners.every(isLoopbackAddress)) {
    throw new Error(
      `Port ${port} is only listening on ${listeners.join(", ")}. Restart the dev server bound to 0.0.0.0, for example: npm run dev -- --host 0.0.0.0`,
    );
  }
}

function parseListeningAddresses(output: string, port: number) {
  const portSuffix = `:${port}`;

  return output
    .split(/\r?\n/)
    .filter((line) => /\bLISTEN\b/i.test(line))
    .flatMap((line) =>
      line
        .trim()
        .split(/\s+/)
        .filter(
          (token) => token.endsWith(portSuffix) || token.endsWith(`.${port}`),
        )
        .map((token) =>
          token
            .replace(/^\[([^\]]+)\]:(\d+)$/, "$1:$2")
            .replace(/^\*:/, "0.0.0.0:"),
        ),
    );
}

function isLoopbackAddress(address: string) {
  return (
    address.startsWith("127.") ||
    address.startsWith("localhost:") ||
    address.startsWith("::1:") ||
    address.startsWith("[::1]:")
  );
}
