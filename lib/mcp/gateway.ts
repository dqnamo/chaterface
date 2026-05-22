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
import {
  deleteWorkerPort,
  getPublicUrlAuthType,
  listWorkerPorts,
  upsertWorkerPort,
} from "@/lib/factory/worker-ports";
import {
  callRemoteMcpTool,
  getErrorMessage,
  validateMcpServerUrl,
} from "@/lib/mcp/client";
import {
  getMcpCapabilityByNamespacedName,
  getMcpConnection,
  listMcpCapabilitiesByIds,
  type McpCapabilityRecord,
  type McpConnectionRecord,
  updateMcpConnection,
} from "@/lib/mcp/records";
import { authenticateMcpWorkerToken } from "@/lib/mcp/run-tokens";
import {
  connectSandbox,
  createPreviewUrl,
  deletePreviewUrl,
} from "@/lib/sandbox/service";

const factoryControlTools = [
  {
    description:
      "Expose a TCP port from this worker sandbox as a temporary public URL. The process must already be listening on the port.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        basicAuth: {
          description: "Require generated basic authentication credentials.",
          type: "boolean",
        },
        bearerToken: {
          description: "Require a generated bearer token.",
          type: "boolean",
        },
        port: {
          description: "Port number to expose from the worker sandbox.",
          maximum: 65535,
          minimum: 1,
          type: "integer",
        },
      },
      required: ["port"],
      type: "object",
    },
    name: "factory__expose_port",
  },
  {
    description:
      "List temporary public URLs currently exposed for this worker sandbox.",
    inputSchema: {
      additionalProperties: false,
      properties: {},
      type: "object",
    },
    name: "factory__list_public_urls",
  },
  {
    description:
      "Delete a temporary public URL for a port on this worker sandbox.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        port: {
          description: "Port number whose public URL should be deleted.",
          maximum: 65535,
          minimum: 1,
          type: "integer",
        },
      },
      required: ["port"],
      type: "object",
    },
    name: "factory__delete_public_url",
  },
  {
    description:
      "Request that the factory owner connect an MCP server. This creates a chat event with a connect action; it does not connect or authorize the MCP server automatically.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        authType: {
          description: "Authentication type the MCP server expects.",
          enum: ["oauth", "bearer_token"],
          type: "string",
        },
        name: {
          description: "Human-readable MCP server name.",
          minLength: 1,
          type: "string",
        },
        reason: {
          description: "Why this MCP server would help the worker.",
          type: "string",
        },
        scopes: {
          description: "Optional OAuth scopes to request.",
          type: "string",
        },
        url: {
          description: "HTTP MCP endpoint URL.",
          minLength: 1,
          type: "string",
        },
      },
      required: ["name", "url"],
      type: "object",
    },
    name: "factory__request_mcp_connection",
  },
] as const;

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
    const capabilities = await listMcpCapabilitiesByIds({
      capabilityIds: workerToken.capabilityIds,
      factoryId: workerToken.factoryId,
    });

    return {
      tools: [
        ...factoryControlTools,
        ...capabilities
          .filter((capability) => capability.enabled)
          .filter((capability) => capability.capabilityType === "tool")
          .map((capability) => toGatewayTool(capability)),
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (toolRequest) => {
    const factoryControlTool = factoryControlTools.find(
      (tool) => tool.name === toolRequest.params.name,
    );

    if (factoryControlTool) {
      return callFactoryControlTool({
        args: toolRequest.params.arguments,
        name: factoryControlTool.name,
        workerToken,
      });
    }

    const capability = await getMcpCapabilityByNamespacedName(
      workerToken.capabilityIds,
      workerToken.factoryId,
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

async function callFactoryControlTool({
  args,
  name,
  workerToken,
}: {
  args: unknown;
  name: (typeof factoryControlTools)[number]["name"];
  workerToken: NonNullable<
    Awaited<ReturnType<typeof authenticateMcpWorkerToken>>
  >;
}): Promise<CallToolResult> {
  const startedAt = Date.now();

  try {
    if (name === "factory__request_mcp_connection") {
      const request = getMcpConnectionRequestArgs(args);

      await createWorkerFactoryControlEvent({
        data: {
          ...request,
          durationMs: Date.now() - startedAt,
          status: "requested",
          toolName: name,
        },
        type: "factory.mcp.connection.requested",
        workerId: workerToken.workerId,
      });

      return createJsonToolResult({
        requested: true,
        ...request,
      });
    }

    const sandbox = await getWorkerSandbox({
      factoryId: workerToken.factoryId,
      workerId: workerToken.workerId,
    });

    if (name === "factory__list_public_urls") {
      const publicUrls = await listWorkerPorts(workerToken.workerId);

      await createWorkerFactoryControlEvent({
        data: {
          durationMs: Date.now() - startedAt,
          publicUrlCount: publicUrls.length,
          status: "success",
          toolName: name,
        },
        type: "factory.control.called",
        workerId: workerToken.workerId,
      });

      return createJsonToolResult({
        publicUrls: publicUrls.map((publicUrl) => ({
          port: publicUrl.port,
          url: publicUrl.url,
        })),
      });
    }

    const port = getPortArg(args);

    if (name === "factory__delete_public_url") {
      await deletePreviewUrl(sandbox, port);
      await deleteWorkerPort(workerToken.workerId, port);
      await createWorkerFactoryControlEvent({
        data: {
          durationMs: Date.now() - startedAt,
          port,
          status: "success",
          toolName: name,
        },
        type: "factory.control.called",
        workerId: workerToken.workerId,
      });

      return createJsonToolResult({ deleted: true, port });
    }

    const options = isRecord(args)
      ? {
          basicAuth: args.basicAuth === true,
          bearerToken: args.bearerToken === true,
        }
      : {};
    const publicUrl = await createPreviewUrl(sandbox, port, options);
    await upsertWorkerPort({
      authType: getPublicUrlAuthType(publicUrl),
      port: publicUrl.port,
      url: publicUrl.url,
      workerId: workerToken.workerId,
    });

    await createWorkerFactoryControlEvent({
      data: {
        auth: {
          basicAuth: publicUrl.authConfig?.basicAuth === true,
          bearerToken: publicUrl.authConfig?.bearerToken === true,
        },
        durationMs: Date.now() - startedAt,
        port,
        status: "success",
        toolName: name,
        url: publicUrl.url,
      },
      type: "factory.control.called",
      workerId: workerToken.workerId,
    });

    return createJsonToolResult({
      port: publicUrl.port,
      url: publicUrl.url,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    await createWorkerFactoryControlEvent({
      data: {
        durationMs: Date.now() - startedAt,
        error: message,
        status: "failed",
        toolName: name,
      },
      type: "factory.control.failed",
      workerId: workerToken.workerId,
    });

    return createToolError(message);
  }
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

async function getWorkerSandbox({
  factoryId,
  workerId,
}: {
  factoryId: string;
  workerId: string;
}) {
  const db = getAdminDbCore();
  const result = await db.query({
    workers: {
      $: { where: { id: workerId } },
      factory: {},
    },
  });
  const worker = result.workers[0] as
    | { factory?: { id?: string }; sandboxId?: string }
    | undefined;

  if (!worker || worker.factory?.id !== factoryId) {
    throw new Error("Worker not found.");
  }

  if (!worker.sandboxId) {
    throw new Error("Worker does not have a sandbox yet.");
  }

  return connectSandbox(worker.sandboxId);
}

async function createWorkerFactoryControlEvent({
  data,
  workerId,
  type,
}: {
  data: Record<string, unknown>;
  workerId: string;
  type:
    | "factory.control.called"
    | "factory.control.failed"
    | "factory.mcp.connection.requested";
}) {
  const db = getAdminDbCore();
  const eventId = id();

  await db.transact([
    db.tx.events[eventId].update({
      createdAt: new Date().toISOString(),
      data,
      source: "factory",
      type,
    }),
    db.tx.events[eventId].link({ worker: workerId }),
  ]);
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

function createJsonToolResult(value: unknown): CallToolResult {
  return {
    content: [{ text: JSON.stringify(value, null, 2), type: "text" }],
  };
}

function getMcpConnectionRequestArgs(args: unknown) {
  if (!isRecord(args)) {
    throw new Error("Expected arguments object.");
  }

  const name = typeof args.name === "string" ? args.name.trim() : "";
  const rawUrl = typeof args.url === "string" ? args.url.trim() : "";
  const authType = args.authType === "bearer_token" ? "bearer_token" : "oauth";
  const scopes = typeof args.scopes === "string" ? args.scopes.trim() : "";
  const reason = typeof args.reason === "string" ? args.reason.trim() : "";

  if (!name) {
    throw new Error("MCP name is required.");
  }

  if (!rawUrl) {
    throw new Error("MCP URL is required.");
  }

  return {
    authType,
    name,
    reason: reason || undefined,
    scopes: scopes || undefined,
    url: validateMcpServerUrl(rawUrl),
  };
}

function getPortArg(args: unknown): number {
  if (!isRecord(args)) {
    throw new Error("Expected arguments object.");
  }

  const port = args.port;

  if (
    typeof port !== "number" ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("Port must be an integer from 1 to 65535.");
  }

  return port;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
