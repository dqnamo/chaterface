import {
  type FactoryAccessRecord,
  getAccessibleFactory,
  getCurrentUserForApiRequest,
  unauthorizedResponse,
} from "@/lib/auth";
import { encryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";

export const runtime = "nodejs";

type AgentRecord = {
  id: string;
};

type FactoryWithAgents = FactoryAccessRecord & {
  agents?: AgentRecord[];
};

type RouteContext = {
  params: Promise<{
    agentId: string;
    factoryId: string;
  }>;
};

type UpdateAgentRequest = {
  accessToken?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  let body: UpdateAgentRequest;

  try {
    body = (await request.json()) as UpdateAgentRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const accessToken = parseCodexAccessToken(body.accessToken);

  if (!accessToken) {
    return Response.json(
      { error: "Codex access token is required" },
      { status: 400 },
    );
  }

  const { agentId, factoryId } = await context.params;
  const factory = await getAccessibleFactory<FactoryWithAgents>(
    factoryId,
    user,
    {
      agents: {},
    },
  );

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const agent = factory.agents?.find((candidate) => candidate.id === agentId);

  if (!agent) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const db = getAdminDb();

  await db.transact(
    db.tx.agents[agent.id].update({
      authEncrypted: encryptSecretValue(accessToken),
    }),
  );

  return Response.json({ ok: true });
}

function parseCodexAccessToken(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
