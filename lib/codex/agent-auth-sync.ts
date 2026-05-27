import { createHash } from "node:crypto";

export type WorkerAgentAuthSyncToken = {
  factoryId: string;
  workerId: string;
};

export type WorkerAgentAuthSyncAgent = {
  authSyncHash?: string;
  authSyncedAt?: string;
  id: string;
};

export type WorkerAgentAuthSyncWorker = {
  agent?: WorkerAgentAuthSyncAgent;
  factory?: {
    id?: string;
  };
  id: string;
};

export type SaveWorkerAgentAuthSyncInput = {
  agentId: string;
  authJson: Record<string, unknown>;
  authSyncHash: string;
  authSyncedAt: string;
  workerId: string;
};

export type WorkerAgentAuthSyncDeps = {
  authenticate: (request: Request) => Promise<WorkerAgentAuthSyncToken | null>;
  getWorker: (
    token: WorkerAgentAuthSyncToken,
  ) => Promise<WorkerAgentAuthSyncWorker | undefined>;
  now?: () => Date;
  saveAgentAuth: (input: SaveWorkerAgentAuthSyncInput) => Promise<void>;
};

export type WorkerAgentAuthSyncResult = {
  body: {
    authSyncHash?: string;
    authSyncedAt?: string;
    error?: string;
    ok?: boolean;
  };
  status: number;
};

export async function handleWorkerAgentAuthSyncRequest(
  request: Request,
  deps: WorkerAgentAuthSyncDeps,
): Promise<WorkerAgentAuthSyncResult> {
  const token = await deps.authenticate(request);

  if (!token) {
    return { body: { error: "Unauthorized" }, status: 401 };
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { body: { error: "Invalid JSON body" }, status: 400 };
  }

  const authJson = parseWorkerAgentAuthSyncBody(body);

  if (!authJson) {
    return { body: { error: "authJson must be a JSON object" }, status: 400 };
  }

  const worker = await deps.getWorker(token);

  if (!worker || worker.factory?.id !== token.factoryId) {
    return { body: { error: "Worker not found" }, status: 404 };
  }

  if (!worker.agent?.id) {
    return { body: { error: "Worker does not have an agent" }, status: 404 };
  }

  const authSyncHash = createAuthSyncHash(authJson);

  if (worker.agent.authSyncHash === authSyncHash) {
    return {
      body: {
        authSyncHash,
        authSyncedAt: worker.agent.authSyncedAt,
        ok: true,
      },
      status: 200,
    };
  }

  const authSyncedAt = (deps.now?.() ?? new Date()).toISOString();

  try {
    await deps.saveAgentAuth({
      agentId: worker.agent.id,
      authJson,
      authSyncHash,
      authSyncedAt,
      workerId: token.workerId,
    });
  } catch {
    return {
      body: { error: "Agent auth could not be synced" },
      status: 500,
    };
  }

  return {
    body: {
      authSyncHash,
      authSyncedAt,
      ok: true,
    },
    status: 200,
  };
}

export function parseWorkerAgentAuthSyncBody(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!isJsonObject(value) || !isJsonObject(value.authJson)) {
    return undefined;
  }

  return value.authJson;
}

export function createAuthSyncHash(authJson: Record<string, unknown>) {
  return createHash("sha256").update(stableStringify(authJson)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([first], [second]) => first.localeCompare(second));

  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
