import {
  getAccessibleFactory,
  getCurrentUserForApiRequest,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  deleteMcpConnection,
  getMcpConnection,
  updateMcpConnection,
} from "@/lib/mcp/records";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    factoryId: string;
    mcpServerId: string;
  }>;
};

type UpdateMcpRequest = {
  enabled?: boolean;
  name?: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId, mcpServerId } = await context.params;
  const factory = await getAccessibleFactory(factoryId, user);

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const connection = await getMcpConnection({ factoryId, mcpServerId });

  if (!connection) {
    return Response.json({ error: "MCP server not found" }, { status: 404 });
  }

  let body: UpdateMcpRequest;

  try {
    body = (await request.json()) as UpdateMcpRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await updateMcpConnection(connection.id, {
    ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
    ...(typeof body.name === "string" && body.name.trim()
      ? { name: body.name.trim() }
      : {}),
  });

  return Response.json({ status: "updated" });
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId, mcpServerId } = await context.params;
  const factory = await getAccessibleFactory(factoryId, user);

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const connection = await getMcpConnection({ factoryId, mcpServerId });

  if (!connection) {
    return Response.json({ error: "MCP server not found" }, { status: 404 });
  }

  await deleteMcpConnection(connection);

  return Response.json({ status: "deleted" });
}
