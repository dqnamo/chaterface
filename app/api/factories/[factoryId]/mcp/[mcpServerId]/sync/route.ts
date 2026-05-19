import { getMcpCallbackUrl } from "@/lib/app-url";
import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import { syncMcpConnection } from "@/lib/mcp/client";
import { getMcpConnection, upsertMcpBearerToken } from "@/lib/mcp/records";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    factoryId: string;
    mcpServerId: string;
  }>;
};

type SyncMcpRequest = {
  bearerToken?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId, mcpServerId } = await context.params;

  try {
    const factory = await getOwnedFactory(factoryId, user);

    if (!factory) {
      return Response.json({ error: "Factory not found" }, { status: 404 });
    }

    const body = (await request
      .json()
      .catch(() => null)) as SyncMcpRequest | null;
    const bearerToken = body?.bearerToken?.trim();

    if (bearerToken) {
      const connection = await getMcpConnection({ factoryId, mcpServerId });

      if (!connection) {
        return Response.json(
          { error: "MCP server not found" },
          { status: 404 },
        );
      }

      if (connection.authType !== "bearer_token") {
        return Response.json(
          {
            error:
              "Bearer tokens can only be updated for bearer-token MCP servers.",
          },
          { status: 400 },
        );
      }

      await upsertMcpBearerToken(connection.id, bearerToken);
    }

    const result = await syncMcpConnection({
      callbackUrl: getMcpCallbackUrl({ factoryId, request }),
      factoryId,
      mcpServerId,
    });

    return Response.json({
      authUrl:
        result.status === "authorization_required" ? result.authUrl : null,
      status: result.status,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "MCP sync could not be started",
      },
      { status: 500 },
    );
  }
}
