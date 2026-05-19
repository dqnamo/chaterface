import { id } from "@instantdb/admin";
import { getCurrentUserForApiRequest, unauthorizedResponse } from "@/lib/auth";
import {
  createDefaultFactorySnapshot,
  createFactoryBox,
} from "@/lib/codex/box-auth";
import { encryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";

export const runtime = "nodejs";

type CreateFactoryRequest = {
  codexAgent?: {
    authJson?: unknown;
    enabled?: boolean;
  };
  name?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  let body: CreateFactoryRequest;

  try {
    body = (await request.json()) as CreateFactoryRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();

  if (!name) {
    return Response.json(
      { error: "Factory name is required" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const agentId = id();
  const factoryId = id();
  const shouldCreateCodexAgent = body.codexAgent?.enabled === true;
  const codexAuthJson =
    shouldCreateCodexAgent && body.codexAgent ? body.codexAgent.authJson : null;

  if (shouldCreateCodexAgent && !isJsonObject(codexAuthJson)) {
    return Response.json(
      { error: "Codex auth JSON file is required" },
      { status: 400 },
    );
  }

  try {
    const box = await createFactoryBox(factoryId);
    const serializedCodexAuthJson = isJsonObject(codexAuthJson)
      ? JSON.stringify(codexAuthJson, null, 2)
      : undefined;
    const snapshot = await createDefaultFactorySnapshot({
      box,
      codexAuthJson: serializedCodexAuthJson,
      factoryId,
    });
    const factoryTransactions = [
      db.tx.factories[factoryId].update({
        defaultSanpshotId: snapshot.id,
        name,
        status: "ready",
      }),
      db.tx.factories[factoryId].link({
        owner: user.id,
      }),
    ];
    const transactions = shouldCreateCodexAgent
      ? [
          ...factoryTransactions,
          db.tx.agents[agentId].update({
            authEncrypted: encryptSecretValue(codexAuthJson),
            type: "codex",
          }),
          db.tx.agents[agentId].link({
            factory: factoryId,
          }),
        ]
      : factoryTransactions;

    await db.transact(transactions);

    return Response.json({
      agentId: shouldCreateCodexAgent ? agentId : undefined,
      factoryId,
      snapshotId: snapshot.id,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Factory could not be created",
      },
      { status: 500 },
    );
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
