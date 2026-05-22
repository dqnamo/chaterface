import "server-only";

import { id } from "@instantdb/admin";
import { getAdminDbCore } from "@/lib/admin-db-core";
import { validateMcpServerUrl } from "@/lib/mcp/client";
import { connectSandbox } from "@/lib/sandbox/service";

export type AuthenticatedFactoryWorker = {
  factoryId: string;
  workerId: string;
};

export async function getAuthenticatedWorkerSandbox({
  factoryId,
  workerId,
}: AuthenticatedFactoryWorker) {
  const db = getAdminDbCore();
  const result = await db.query({
    workers: {
      $: { where: { id: workerId } },
      factory: {},
    },
  });
  const worker = result.workers[0] as
    | { factory?: { id?: string }; sandboxId?: string }
    | undefined;

  if (!worker || worker.factory?.id !== factoryId) {
    throw new Error("Worker not found.");
  }

  if (!worker.sandboxId) {
    throw new Error("Worker does not have a sandbox yet.");
  }

  return connectSandbox(worker.sandboxId);
}

export async function createWorkerMcpConnectionRequestEvent({
  authType,
  factoryId,
  name,
  reason,
  scopes,
  url,
  workerId,
}: AuthenticatedFactoryWorker & {
  authType: string;
  name: string;
  reason?: string;
  scopes?: string;
  url: string;
}) {
  const db = getAdminDbCore();
  const eventId = id();

  await db.transact([
    db.tx.events[eventId].update({
      createdAt: new Date().toISOString(),
      data: {
        authType,
        factoryId,
        name,
        reason,
        scopes,
        status: "requested",
        url,
      },
      source: "factory",
      type: "factory.mcp.connection.requested",
    }),
    db.tx.events[eventId].link({ worker: workerId }),
  ]);
}

export function parseWorkerPort(value: unknown) {
  const port = typeof value === "string" ? Number(value) : value;

  if (
    typeof port !== "number" ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("Port must be an integer from 1 to 65535.");
  }

  return port;
}

export function parseMcpConnectionRequest(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("Expected JSON object.");
  }

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const rawUrl = typeof value.url === "string" ? value.url.trim() : "";
  const authType = value.authType === "bearer_token" ? "bearer_token" : "oauth";
  const scopes = typeof value.scopes === "string" ? value.scopes.trim() : "";
  const reason = typeof value.reason === "string" ? value.reason.trim() : "";

  if (!name) {
    throw new Error("MCP name is required.");
  }

  if (!rawUrl) {
    throw new Error("MCP URL is required.");
  }

  return {
    authType,
    name,
    reason: reason || undefined,
    scopes: scopes || undefined,
    url: validateMcpServerUrl(rawUrl),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
