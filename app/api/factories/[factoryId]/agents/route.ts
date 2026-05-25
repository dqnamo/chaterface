import { id } from "@instantdb/admin";
import {
  type FactoryAccessRecord,
  getAccessibleFactory,
  getCurrentUserForApiRequest,
  unauthorizedResponse,
} from "@/lib/auth";
import { encryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";

export const runtime = "nodejs";

const maxAgentNameLength = 80;

type RouteContext = {
  params: Promise<{
    factoryId: string;
  }>;
};

type CreateAgentRequest = {
  authJson?: unknown;
  name?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  let body: CreateAgentRequest;

  try {
    body = (await request.json()) as CreateAgentRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return Response.json({ error: "Agent name is required" }, { status: 400 });
  }

  if (name.length > maxAgentNameLength) {
    return Response.json(
      { error: "Agent name must be 80 characters or fewer" },
      { status: 400 },
    );
  }

  if (!isJsonObject(body.authJson)) {
    return Response.json(
      { error: "Codex auth JSON file is required" },
      { status: 400 },
    );
  }

  const { factoryId } = await context.params;
  const db = getAdminDb();
  const factory = await getAccessibleFactory<FactoryAccessRecord>(
    factoryId,
    user,
  );

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const agentId = id();

  await db.transact([
    db.tx.agents[agentId].update({
      authEncrypted: encryptSecretValue(body.authJson),
      codexModel: "gpt-5.5",
      codexReasoningLevel: "medium",
      codexSpeed: "standard",
      name,
      type: "codex",
    }),
    db.tx.agents[agentId].link({
      factory: factoryId,
    }),
  ]);

  return Response.json({
    agent: {
      codexModel: "gpt-5.5",
      codexReasoningLevel: "medium",
      codexSpeed: "standard",
      id: agentId,
      name,
      type: "codex",
    },
  });
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
