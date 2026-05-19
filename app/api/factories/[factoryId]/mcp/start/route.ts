import { getMcpCallbackUrl } from "@/lib/app-url";
import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  getErrorMessage,
  syncMcpConnection,
  validateMcpServerUrl,
} from "@/lib/mcp/client";
import {
  createMcpConnection,
  type McpAuthType,
  upsertMcpBearerToken,
} from "@/lib/mcp/records";

export const runtime = "nodejs";

type StartMcpRequest = {
  authType?: string;
  bearerToken?: string;
  name?: string;
  scopes?: string;
  url?: string;
};

type RouteContext = {
  params: Promise<{
    factoryId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId } = await context.params;
  let body: StartMcpRequest;

  try {
    body = (await request.json()) as StartMcpRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const scopes = body.scopes?.trim();
  const url = body.url?.trim();
  const authType = parseAuthType(body.authType);
  const bearerToken = body.bearerToken?.trim();

  if (!name || !url) {
    return Response.json(
      { error: "name and url are required" },
      { status: 400 },
    );
  }

  if (authType === "bearer_token" && !bearerToken) {
    return Response.json(
      { error: "Bearer token is required for bearer-token MCP servers." },
      { status: 400 },
    );
  }
  const validatedBearerToken =
    authType === "bearer_token" ? bearerToken : undefined;

  try {
    validateMcpServerUrl(url);
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 400 });
  }

  try {
    const factory = await getOwnedFactory(factoryId, user);

    if (!factory) {
      return Response.json({ error: "Factory not found" }, { status: 404 });
    }

    const mcpServerId = await createMcpConnection({
      authType,
      factoryId,
      name,
      scopes,
      url: validateMcpServerUrl(url),
    });

    if (authType === "bearer_token" && validatedBearerToken) {
      await upsertMcpBearerToken(mcpServerId, validatedBearerToken);
    }

    const result = await syncMcpConnection({
      callbackUrl: getMcpCallbackUrl({ factoryId, request }),
      factoryId,
      mcpServerId,
    });

    return Response.json({
      authUrl:
        result.status === "authorization_required" ? result.authUrl : null,
      id: mcpServerId,
      status: result.status,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "MCP setup could not be started",
      },
      { status: 500 },
    );
  }
}

function parseAuthType(value: string | undefined): McpAuthType {
  return value === "bearer_token" ? "bearer_token" : "oauth";
}
