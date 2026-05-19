import "server-only";

import { id } from "@instantdb/admin";
import { getAdminDbCore } from "@/lib/admin-db-core";
import { decryptMcpValue, encryptMcpValue } from "@/lib/mcp/crypto";

export type McpAuthType = "bearer_token" | "oauth";
export type McpAuthStatus =
  | "authorization_required"
  | "authorized"
  | "failed"
  | "none";
export type McpCapabilityType = "prompt" | "resource" | "tool";
export type McpSyncStatus = "failed" | "pending" | "ready";

export type McpConnectionRecord = {
  authType?: McpAuthType;
  authStatus?: McpAuthStatus;
  authenticatedAt?: string;
  enabled?: boolean;
  id: string;
  lastError?: null | string;
  lastSyncAt?: string;
  loginUrl?: null | string;
  name: string;
  scopes?: string;
  status: string;
  syncStatus?: McpSyncStatus;
  url: string;
};

export type McpCredentialRecord = {
  connectionId: string;
  createdAt: string;
  credentialType: "bearer_token";
  encryptedBearerToken?: null | string;
  id: string;
  updatedAt: string;
};

export type McpCapabilityRecord = {
  capabilityType: McpCapabilityType;
  createdAt: string;
  description?: string;
  enabled: boolean;
  id: string;
  inputSchema?: unknown;
  mcpServerId: string;
  namespacedName: string;
  outputSchema?: unknown;
  updatedAt: string;
  upstreamName: string;
};

export type McpOauthStateRecord = {
  authorizationUrl?: null | string;
  connectionId: string;
  createdAt: string;
  discoveryState?: unknown;
  encryptedClientInformation?: null | string;
  encryptedCodeVerifier?: null | string;
  encryptedTokens?: null | string;
  id: string;
  state: string;
  updatedAt: string;
};

type SyncedCapability = {
  capabilityType: McpCapabilityType;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  upstreamName: string;
};

export async function getMcpConnection({
  factoryId,
  mcpServerId,
}: {
  factoryId: string;
  mcpServerId: string;
}) {
  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpServers: {
      $: { where: { id: mcpServerId } },
      factory: {},
    },
  });
  const connection = result.factoryMcpServers[0] as
    | (McpConnectionRecord & { factory?: { id?: string } })
    | undefined;

  if (!connection || connection.factory?.id !== factoryId) {
    return undefined;
  }

  return connection;
}

export async function getMcpConnectionById(mcpServerId: string) {
  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpServers: {
      $: { where: { id: mcpServerId } },
      factory: {},
    },
  });

  return result.factoryMcpServers[0] as
    | (McpConnectionRecord & { factory?: { id?: string } })
    | undefined;
}

export async function createMcpConnection({
  authType = "oauth",
  factoryId,
  name,
  scopes,
  url,
}: {
  authType?: McpAuthType;
  factoryId: string;
  name: string;
  scopes?: string;
  url: string;
}) {
  const db = getAdminDbCore();
  const mcpServerId = id();

  await db.transact([
    db.tx.factoryMcpServers[mcpServerId].update({
      authType,
      authStatus: "none",
      enabled: true,
      lastError: null,
      name,
      scopes,
      status: "pending",
      syncStatus: "pending",
      url,
    }),
    db.tx.factories[factoryId].link({ mcpServers: mcpServerId }),
  ]);

  return mcpServerId;
}

export async function updateMcpConnection(
  mcpServerId: string,
  values: Partial<
    Pick<
      McpConnectionRecord,
      | "authStatus"
      | "authType"
      | "authenticatedAt"
      | "enabled"
      | "lastError"
      | "lastSyncAt"
      | "loginUrl"
      | "name"
      | "status"
      | "syncStatus"
    >
  >,
) {
  const db = getAdminDbCore();

  await db.transact(db.tx.factoryMcpServers[mcpServerId].update(values));
}

export async function deleteMcpConnection(connection: McpConnectionRecord) {
  const db = getAdminDbCore();
  const capabilities = await listMcpCapabilitiesForConnection(connection.id);
  const oauthState = await getMcpOauthState(connection.id);
  const credential = await getMcpCredential(connection.id);

  await db.transact([
    ...capabilities.map((capability) =>
      db.tx.factoryMcpCapabilities[capability.id].delete(),
    ),
    ...(oauthState
      ? [db.tx.factoryMcpOauthStates[oauthState.id].delete()]
      : []),
    ...(credential
      ? [db.tx.factoryMcpCredentials[credential.id].delete()]
      : []),
    db.tx.factoryMcpServers[connection.id].delete(),
  ]);
}

export async function listMcpCapabilitiesForConnection(mcpServerId: string) {
  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpCapabilities: {
      $: { where: { mcpServerId } },
    },
  });

  return result.factoryMcpCapabilities as McpCapabilityRecord[];
}

export async function listMcpCapabilitiesByIds(capabilityIds: string[]) {
  if (capabilityIds.length === 0) {
    return [];
  }

  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpCapabilities: {},
  });
  const ids = new Set(capabilityIds);

  return (result.factoryMcpCapabilities as McpCapabilityRecord[]).filter(
    (capability) => ids.has(capability.id),
  );
}

export async function listEnabledMcpCapabilitiesForFactory(factoryId: string) {
  const db = getAdminDbCore();
  const result = await db.query({
    factories: {
      $: { where: { id: factoryId } },
      mcpServers: {},
    },
    factoryMcpCapabilities: {},
  });
  const factory = result.factories[0] as
    | { mcpServers?: McpConnectionRecord[] }
    | undefined;
  const readyServerIds = new Set(
    (factory?.mcpServers ?? [])
      .filter((server) => server.enabled !== false)
      .filter(
        (server) =>
          server.authStatus !== "authorization_required" &&
          server.authStatus !== "failed",
      )
      .filter(
        (server) =>
          server.status === "authenticated" || server.syncStatus === "ready",
      )
      .map((server) => server.id),
  );

  return (result.factoryMcpCapabilities as McpCapabilityRecord[])
    .filter((capability) => readyServerIds.has(capability.mcpServerId))
    .filter((capability) => capability.enabled)
    .filter((capability) => capability.capabilityType === "tool");
}

export async function getMcpCapabilityByNamespacedName(
  capabilityIds: string[],
  namespacedName: string,
) {
  const capabilities = await listMcpCapabilitiesByIds(capabilityIds);

  return capabilities.find(
    (capability) =>
      capability.enabled &&
      capability.capabilityType === "tool" &&
      capability.namespacedName === namespacedName,
  );
}

export async function updateMcpCapability(
  capabilityId: string,
  values: Pick<McpCapabilityRecord, "enabled">,
) {
  const db = getAdminDbCore();

  await db.transact(
    db.tx.factoryMcpCapabilities[capabilityId].update({
      ...values,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export async function saveMcpCapabilities(
  connection: McpConnectionRecord,
  capabilities: SyncedCapability[],
) {
  const db = getAdminDbCore();
  const existing = await listMcpCapabilitiesForConnection(connection.id);
  const now = new Date().toISOString();
  const nextKeys = new Set(
    capabilities.map(
      (capability) => `${capability.capabilityType}:${capability.upstreamName}`,
    ),
  );
  const nextCapabilities = capabilities.map((capability) => {
    const current = existing.find(
      (item) =>
        item.capabilityType === capability.capabilityType &&
        item.upstreamName === capability.upstreamName,
    );

    return {
      capability,
      capabilityId: current?.id ?? id(),
      current,
    };
  });

  const transactions = [
    ...nextCapabilities.map(({ capability, capabilityId, current }) =>
      db.tx.factoryMcpCapabilities[capabilityId].update({
        capabilityType: capability.capabilityType,
        createdAt: current?.createdAt ?? now,
        description: capability.description,
        enabled: current?.enabled ?? true,
        inputSchema: capability.inputSchema as never,
        mcpServerId: connection.id,
        namespacedName:
          current?.namespacedName ??
          createNamespacedCapabilityName(
            connection.id,
            capability.upstreamName,
          ),
        outputSchema: capability.outputSchema as never,
        upstreamName: capability.upstreamName,
        updatedAt: now,
      }),
    ),
    ...nextCapabilities.map(({ capabilityId }) =>
      db.tx.factoryMcpServers[connection.id].link({
        capabilities: capabilityId,
      }),
    ),
    ...existing
      .filter(
        (capability) =>
          !nextKeys.has(
            `${capability.capabilityType}:${capability.upstreamName}`,
          ),
      )
      .map((capability) =>
        db.tx.factoryMcpCapabilities[capability.id].delete(),
      ),
  ];

  if (transactions.length > 0) {
    await db.transact(transactions);
  }
}

export async function getMcpOauthState(connectionId: string) {
  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpOauthStates: {
      $: { where: { connectionId } },
    },
  });

  return result.factoryMcpOauthStates[0] as McpOauthStateRecord | undefined;
}

export async function getMcpOauthStateByState(state: string) {
  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpOauthStates: {
      $: { where: { state } },
    },
  });

  return result.factoryMcpOauthStates[0] as McpOauthStateRecord | undefined;
}

export async function upsertMcpOauthState(
  connectionId: string,
  values: Partial<
    Omit<McpOauthStateRecord, "connectionId" | "createdAt" | "id" | "updatedAt">
  >,
) {
  const db = getAdminDbCore();
  const existing = await getMcpOauthState(connectionId);
  const now = new Date().toISOString();
  const stateId = existing?.id ?? id();

  await db.transact(
    db.tx.factoryMcpOauthStates[stateId].update({
      ...values,
      connectionId,
      createdAt: existing?.createdAt ?? now,
      state: values.state ?? existing?.state ?? crypto.randomUUID(),
      updatedAt: now,
    }),
  );

  return getMcpOauthState(connectionId);
}

export async function getMcpBearerToken(connectionId: string) {
  const credential = await getMcpCredential(connectionId);

  return decryptMcpValue<string>(credential?.encryptedBearerToken);
}

export async function upsertMcpBearerToken(
  connectionId: string,
  bearerToken: string,
) {
  const db = getAdminDbCore();
  const existing = await getMcpCredential(connectionId);
  const credentialId = existing?.id ?? id();
  const now = new Date().toISOString();

  await db.transact(
    db.tx.factoryMcpCredentials[credentialId].update({
      connectionId,
      createdAt: existing?.createdAt ?? now,
      credentialType: "bearer_token",
      encryptedBearerToken: encryptMcpValue(bearerToken),
      updatedAt: now,
    }),
  );
}

async function getMcpCredential(connectionId: string) {
  const db = getAdminDbCore();
  const result = await db.query({
    factoryMcpCredentials: {
      $: { where: { connectionId } },
    },
  });

  return result.factoryMcpCredentials[0] as McpCredentialRecord | undefined;
}

function createNamespacedCapabilityName(
  connectionId: string,
  upstreamName: string,
) {
  const safeName = upstreamName
    .toLowerCase()
    .replaceAll(/[^a-z0-9_]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");

  return `mcp_${connectionId.slice(0, 8)}_${safeName || "tool"}`;
}
