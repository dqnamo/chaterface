import { getAdminDbCore } from "@/lib/admin-db-core";
import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import { getMcpConnectionById, updateMcpCapability } from "@/lib/mcp/records";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    capabilityId: string;
    factoryId: string;
  }>;
};

type UpdateCapabilityRequest = {
  enabled?: boolean;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { capabilityId, factoryId } = await context.params;
  const factory = await getOwnedFactory(factoryId, user);

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpCapabilities: {
      $: { where: { id: capabilityId } },
    },
  });
  const capability = result.factoryMcpCapabilities[0] as
    | { mcpServerId?: string }
    | undefined;

  if (!capability?.mcpServerId) {
    return Response.json(
      { error: "MCP capability not found" },
      { status: 404 },
    );
  }

  const connection = await getMcpConnectionById(capability.mcpServerId);

  if (!connection || connection.factory?.id !== factoryId) {
    return Response.json(
      { error: "MCP capability not found" },
      { status: 404 },
    );
  }

  let body: UpdateCapabilityRequest;

  try {
    body = (await request.json()) as UpdateCapabilityRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return Response.json({ error: "enabled is required" }, { status: 400 });
  }

  await updateMcpCapability(capabilityId, { enabled: body.enabled });

  return Response.json({ status: "updated" });
}
