import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import { getMcpConnection } from "@/lib/mcp/records";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    factoryId: string;
    mcpServerId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId, mcpServerId } = await context.params;
  const factory = await getOwnedFactory(factoryId, user);

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const connection = await getMcpConnection({ factoryId, mcpServerId });

  if (!connection) {
    return Response.json({ error: "MCP server not found" }, { status: 404 });
  }

  return Response.json({
    authType: connection.authType,
    authStatus: connection.authStatus,
    lastError: connection.lastError,
    loginUrl: connection.loginUrl,
    status: connection.status,
    syncStatus: connection.syncStatus,
  });
}
