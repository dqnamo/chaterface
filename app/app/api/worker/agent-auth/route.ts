import { getAdminDbCore } from "@/lib/admin-db-core";
import {
  handleWorkerAgentAuthSyncRequest,
  type WorkerAgentAuthSyncToken,
} from "@/lib/codex/agent-auth-sync";
import { encryptSecretValue } from "@/lib/crypto.server";
import { authenticateFactoryWorkerApiRequest } from "@/lib/factory/worker-api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const result = await handleWorkerAgentAuthSyncRequest(request, {
    authenticate: authenticateFactoryWorkerApiRequest,
    getWorker: getWorkerForAuthSync,
    saveAgentAuth: async ({
      agentId,
      authJson,
      authSyncHash,
      authSyncedAt,
      workerId,
    }) => {
      const db = getAdminDbCore();

      await db.transact(
        db.tx.agents[agentId].update({
          authEncrypted: encryptSecretValue(authJson),
          authStatus: "authenticated",
          authSyncHash,
          authSyncedAt,
          authSyncedByWorkerId: workerId,
        }),
      );
    },
  });

  return Response.json(result.body, { status: result.status });
}

async function getWorkerForAuthSync(token: WorkerAgentAuthSyncToken) {
  const db = getAdminDbCore();
  const result = await db.query({
    workers: {
      $: { where: { id: token.workerId } },
      agent: {},
      factory: {},
    },
  });

  return result.workers[0] as
    | {
        agent?: {
          authSyncHash?: string;
          authSyncedAt?: string;
          id: string;
        };
        factory?: { id?: string };
        id: string;
      }
    | undefined;
}
