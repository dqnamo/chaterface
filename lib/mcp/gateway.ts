import "server-only";

import { id } from "@instantdb/admin";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getAdminDbCore } from "@/lib/admin-db-core";
import { getMcpCallbackUrl } from "@/lib/app-url";
import { callRemoteMcpTool, getErrorMessage } from "@/lib/mcp/client";
import {
  getMcpCapabilityByNamespacedName,
  getMcpConnection,
  listMcpCapabilitiesByIds,
  type McpCapabilityRecord,
  type McpConnectionRecord,
  updateMcpConnection,
} from "@/lib/mcp/records";
import { authenticateMcpWorkerToken } from "@/lib/mcp/run-tokens";

export async function handleFactoryMcpGatewayRequest(request: Request) {
  const workerToken = await authenticateMcpWorkerToken(request);

  if (!workerToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createGatewayServer(request, workerToken);

  await server.connect(transport);

  return transport.handleRequest(request);
}

function createGatewayServer(
  request: Request,
  workerToken: NonNullable<
    Awaited<ReturnType<typeof authenticateMcpWorkerToken>>
  >,
) {
  const server = new Server(
    { name: "software-factory-mcp-gateway", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const capabilities = await listMcpCapabilitiesByIds(
      workerToken.capabilityIds,
    );

    return {
      tools: capabilities
        .filter((capability) => capability.enabled)
        .filter((capability) => capability.capabilityType === "tool")
        .map((capability) => toGatewayTool(capability)),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (toolRequest) => {
    const capability = await getMcpCapabilityByNamespacedName(
      workerToken.capabilityIds,
      toolRequest.params.name,
    );

    if (!capability) {
      return createToolError("MCP tool is not enabled for this worker.");
    }

    const connection = await getMcpConnection({
      factoryId: workerToken.factoryId,
      mcpServerId: capability.mcpServerId,
    });

    if (!connection || connection.enabled === false) {
      return createToolError("MCP connection is not enabled for this worker.");
    }

    return callGatewayTool({
      args: toolRequest.params.arguments,
      capability,
      connection,
      request,
      workerToken,
    });
  });

  return server;
}

async function callGatewayTool({
  args,
  capability,
  connection,
  request,
  workerToken,
}: {
  args: unknown;
  capability: McpCapabilityRecord;
  connection: McpConnectionRecord;
  request: Request;
  workerToken: NonNullable<
    Awaited<ReturnType<typeof authenticateMcpWorkerToken>>
  >;
}): Promise<CallToolResult> {
  const startedAt = Date.now();

  try {
    const result = await callRemoteMcpTool({
      args,
      callbackUrl: getMcpCallbackUrl({
        factoryId: workerToken.factoryId,
        request,
      }),
      capability,
      connection,
    });

    await createWorkerMcpEvent({
      capability,
      connection,
      data: {
        durationMs: Date.now() - startedAt,
        status: "success",
        toolName: capability.upstreamName,
      },
      workerId: workerToken.workerId,
      type: "mcp.tool.called",
    });

    return result;
  } catch (error) {
    const message =
      error instanceof UnauthorizedError &&
      connection.authType === "bearer_token"
        ? "Bearer token was rejected or expired."
        : getErrorMessage(error);

    if (error instanceof UnauthorizedError) {
      await updateMcpConnection(connection.id, {
        authStatus: "authorization_required",
        lastError: message,
        status:
          connection.authType === "bearer_token" ? "failed" : connection.status,
        syncStatus:
          connection.authType === "bearer_token" ? "failed" : "pending",
      });
      await createWorkerMcpEvent({
        capability,
        connection,
        data: {
          status: "auth_failed",
          toolName: capability.upstreamName,
        },
        workerId: workerToken.workerId,
        type: "mcp.auth.failed",
      });
    }

    await createWorkerMcpEvent({
      capability,
      connection,
      data: {
        durationMs: Date.now() - startedAt,
        error: message,
        status: "failed",
        toolName: capability.upstreamName,
      },
      workerId: workerToken.workerId,
      type: "mcp.tool.failed",
    });

    return createToolError(message);
  }
}

function toGatewayTool(capability: McpCapabilityRecord) {
  return {
    description:
      capability.description ?? `MCP tool ${capability.upstreamName}`,
    inputSchema: getInputSchema(capability),
    name: capability.namespacedName,
  };
}

function getInputSchema(capability: McpCapabilityRecord) {
  if (isObjectSchema(capability.inputSchema)) {
    return capability.inputSchema;
  }

  return {
    properties: {},
    type: "object" as const,
  };
}

async function createWorkerMcpEvent({
  capability,
  connection,
  data,
  workerId,
  type,
}: {
  capability: McpCapabilityRecord;
  connection: McpConnectionRecord;
  data: Record<string, unknown>;
  workerId: string;
  type: "mcp.auth.failed" | "mcp.tool.called" | "mcp.tool.failed";
}) {
  const db = getAdminDbCore();
  const eventId = id();

  await db.transact([
    db.tx.events[eventId].update({
      createdAt: new Date().toISOString(),
      data: {
        ...data,
        connectionId: connection.id,
        connectionName: connection.name,
        namespacedName: capability.namespacedName,
      },
      source: "mcp",
      type,
    }),
    db.tx.events[eventId].link({ worker: workerId }),
  ]);
}

function createToolError(message: string): CallToolResult {
  return {
    content: [{ text: message, type: "text" }],
    isError: true,
  };
}

function isObjectSchema(value: unknown): value is {
  properties?: Record<string, object>;
  required?: string[];
  type: "object";
} {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "type" in value &&
    value.type === "object"
  );
}
