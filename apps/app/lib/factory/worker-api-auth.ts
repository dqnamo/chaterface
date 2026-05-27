import "server-only";

import { id } from "@instantdb/admin";
import { getAdminDbCore } from "@/lib/admin-db-core";
import { createSecureToken, hashSecureToken } from "@/lib/mcp/crypto";

export type FactoryWorkerApiTokenRecord = {
  createdAt: string;
  factoryId: string;
  id: string;
  revokedAt?: null | string;
  tokenHash: string;
  workerId: string;
};

export const factoryWorkerTokenHeader = "x-factory-worker-token";

export async function createFactoryWorkerApiToken({
  factoryId,
  workerId,
}: {
  factoryId: string;
  workerId: string;
}) {
  const db = getAdminDbCore();
  const token = createSecureToken();

  await db.transact(
    db.tx.factoryWorkerApiTokens[id()].update({
      createdAt: new Date().toISOString(),
      factoryId,
      tokenHash: hashSecureToken(token),
      workerId,
    }),
  );

  return token;
}

export async function authenticateFactoryWorkerApiRequest(request: Request) {
  const token = request.headers.get(factoryWorkerTokenHeader);

  if (!token) {
    return null;
  }

  const db = getAdminDbCore();
  const result = await db.query({
    factoryWorkerApiTokens: {
      $: {
        where: {
          tokenHash: hashSecureToken(token),
        },
      },
    },
  });
  const workerToken = result.factoryWorkerApiTokens[0] as
    | FactoryWorkerApiTokenRecord
    | undefined;

  if (!workerToken || workerToken.revokedAt) {
    return null;
  }

  return workerToken;
}
