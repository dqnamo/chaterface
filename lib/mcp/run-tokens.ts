import { id } from "@instantdb/admin";
import { getAdminDbCore } from "@/lib/admin-db-core";
import { createSecureToken, hashSecureToken } from "@/lib/mcp/crypto";

export type McpWorkerTokenRecord = {
  capabilityIds?: unknown;
  createdAt: string;
  expiresAt: string;
  factoryId: string;
  id: string;
  revokedAt?: null | string;
  tokenHash: string;
  workerId: string;
};

const workerTokenTtlMs = 60 * 60 * 1_000;

export async function createMcpWorkerToken({
  capabilityIds,
  factoryId,
  workerId,
}: {
  capabilityIds: string[];
  factoryId: string;
  workerId: string;
}) {
  const db = getAdminDbCore();
  const token = createSecureToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + workerTokenTtlMs);

  await db.transact(
    db.tx.factoryMcpWorkerTokens[id()].update({
      capabilityIds,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      factoryId,
      tokenHash: hashSecureToken(token),
      workerId,
    }),
  );

  return token;
}

export async function authenticateMcpWorkerToken(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpWorkerTokens: {
      $: {
        where: {
          tokenHash: hashSecureToken(token),
        },
      },
    },
  });
  const workerToken = result.factoryMcpWorkerTokens[0] as
    | McpWorkerTokenRecord
    | undefined;

  if (!workerToken || workerToken.revokedAt) {
    return null;
  }

  if (new Date(workerToken.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return {
    ...workerToken,
    capabilityIds: Array.isArray(workerToken.capabilityIds)
      ? workerToken.capabilityIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  };
}
