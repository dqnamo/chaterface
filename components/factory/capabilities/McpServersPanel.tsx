"use client";

import {
  ArrowsClockwise,
  CheckCircle,
  Plug,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import {
  type ApiError,
  EmptyState,
  Field,
  getApiError,
  getAuthHeaders,
  getJsonAuthHeaders,
  type McpAuthType,
  type McpCapability,
  type McpServer,
  Notice,
} from "@/components/factory/capabilities/shared";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import Input from "@/components/public/Input";
import type { AppDb } from "@/lib/db.client";

export function McpServersPanel({
  factoryId,
  instantDb,
  servers,
}: {
  factoryId: string;
  instantDb: AppDb;
  servers: (McpServer & { capabilities: McpCapability[] })[];
}) {
  const { user } = instantDb.useAuth();
  const [authType, setAuthType] = useState<McpAuthType>("oauth");
  const [bearerToken, setBearerToken] = useState("");
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("");
  const [url, setUrl] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [rotationTokens, setRotationTokens] = useState<Record<string, string>>(
    {},
  );
  const [isStarting, setIsStarting] = useState(false);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName || !trimmedUrl) {
      setError("Enter an MCP name and URL.");
      return;
    }

    if (authType === "bearer_token" && !bearerToken.trim()) {
      setError("Enter a bearer token for this MCP server.");
      return;
    }

    setError(null);
    setAuthUrl(null);
    setIsStarting(true);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to add MCP servers.");
      }

      const response = await fetch(`/api/factories/${factoryId}/mcp/start`, {
        method: "POST",
        headers: getJsonAuthHeaders(user.refresh_token),
        body: JSON.stringify({
          authType,
          bearerToken:
            authType === "bearer_token" ? bearerToken.trim() : undefined,
          name: trimmedName,
          scopes: scopes.trim() || undefined,
          url: trimmedUrl,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { authUrl?: null | string; status?: string }
        | ApiError
        | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "MCP setup could not be started.");
      }

      setAuthUrl(body && "authUrl" in body ? (body.authUrl ?? null) : null);
      setAuthType("oauth");
      setBearerToken("");
      setName("");
      setScopes("");
      setUrl("");
    } catch (startError) {
      console.error(startError);
      setError(
        startError instanceof Error
          ? startError.message
          : "MCP setup could not be started.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function syncServer(mcpServerId: string, nextBearerToken?: string) {
    setActionId(mcpServerId);
    setError(null);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to sync MCP servers.");
      }

      const response = await fetch(
        `/api/factories/${factoryId}/mcp/${mcpServerId}/sync`,
        {
          method: "POST",
          headers: nextBearerToken
            ? getJsonAuthHeaders(user.refresh_token)
            : getAuthHeaders(user.refresh_token),
          ...(nextBearerToken
            ? { body: JSON.stringify({ bearerToken: nextBearerToken }) }
            : {}),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | { authUrl?: string | null }
        | ApiError
        | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "MCP sync failed.");
      }

      setAuthUrl(body && "authUrl" in body ? (body.authUrl ?? null) : null);
      if (nextBearerToken) {
        setRotationTokens((current) => ({ ...current, [mcpServerId]: "" }));
      }
    } catch (syncError) {
      console.error(syncError);
      setError(
        syncError instanceof Error ? syncError.message : "MCP sync failed.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function toggleServer(server: McpServer) {
    setActionId(server.id);
    setError(null);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to update MCP servers.");
      }

      const response = await fetch(
        `/api/factories/${factoryId}/mcp/${server.id}`,
        {
          method: "PATCH",
          headers: getJsonAuthHeaders(user.refresh_token),
          body: JSON.stringify({ enabled: server.enabled === false }),
        },
      );
      const body = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "MCP update failed.");
      }
    } catch (toggleError) {
      console.error(toggleError);
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "MCP update failed.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function deleteServer(mcpServerId: string) {
    setActionId(mcpServerId);
    setError(null);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to disconnect MCP servers.");
      }

      const response = await fetch(
        `/api/factories/${factoryId}/mcp/${mcpServerId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(user.refresh_token),
        },
      );
      const body = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "MCP disconnect failed.");
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "MCP disconnect failed.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function toggleCapability(capability: McpCapability) {
    setActionId(capability.id);
    setError(null);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to update MCP tools.");
      }

      const response = await fetch(
        `/api/factories/${factoryId}/mcp/capabilities/${capability.id}`,
        {
          method: "PATCH",
          headers: getJsonAuthHeaders(user.refresh_token),
          body: JSON.stringify({ enabled: !capability.enabled }),
        },
      );
      const body = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "MCP tool update failed.");
      }
    } catch (capabilityError) {
      console.error(capabilityError);
      setError(
        capabilityError instanceof Error
          ? capabilityError.message
          : "MCP tool update failed.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Plug size={16} weight="bold" aria-hidden="true" />
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wide text-grayscale-10">
          MCP Servers
        </h3>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleStart}>
        <Field label="Name">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="linear"
            disabled={isStarting}
          />
        </Field>
        <Field label="HTTP URL">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/mcp"
            disabled={isStarting}
          />
        </Field>
        <Field label="OAuth scopes">
          <Input
            value={scopes}
            onChange={(event) => setScopes(event.target.value)}
            placeholder="Optional"
            disabled={isStarting}
          />
        </Field>
        <fieldset className="flex flex-col gap-2 text-sm font-medium">
          <legend>Auth method</legend>
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-grayscale-4">
            {(["oauth", "bearer_token"] as const).map((nextAuthType) => (
              <button
                key={nextAuthType}
                type="button"
                className={
                  authType === nextAuthType
                    ? "bg-grayscale-12 px-3 py-2 text-sm text-grayscale-1 transition-colors"
                    : "bg-grayscale-1 px-3 py-2 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2"
                }
                disabled={isStarting}
                onClick={() => setAuthType(nextAuthType)}
              >
                {nextAuthType === "oauth" ? "OAuth" : "Bearer token"}
              </button>
            ))}
          </div>
        </fieldset>
        {authType === "bearer_token" ? (
          <Field
            label="Bearer token"
            hint="GitHub hosted MCP uses https://api.githubcopilot.com/mcp/."
          >
            <Input
              value={bearerToken}
              onChange={(event) => setBearerToken(event.target.value)}
              placeholder="GitHub PAT or upstream bearer token"
              type="password"
              autoComplete="off"
              disabled={isStarting}
            />
          </Field>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={isStarting}>
            {isStarting ? "Starting..." : "Add MCP"}
          </Button>
        </div>
      </form>

      {authUrl ? (
        <Notice className="mt-3 p-0" tone="accent">
          <a
            href={authUrl}
            target="_blank"
            rel="noreferrer"
            className="block px-3 py-2 hover:text-accent-12"
          >
            Open MCP OAuth login
          </a>
        </Notice>
      ) : null}

      {error ? (
        <Notice className="mt-3" tone="error">
          {error}
        </Notice>
      ) : null}

      <McpConnectionList
        actionId={actionId}
        connections={servers}
        onDelete={deleteServer}
        onSync={syncServer}
        onSetRotationToken={(serverId, token) =>
          setRotationTokens((current) => ({
            ...current,
            [serverId]: token,
          }))
        }
        onToggleCapability={toggleCapability}
        onToggleConnection={toggleServer}
        rotationTokens={rotationTokens}
      />
    </Card>
  );
}

function McpConnectionList({
  actionId,
  connections,
  onDelete,
  onSetRotationToken,
  onSync,
  onToggleCapability,
  onToggleConnection,
  rotationTokens,
}: {
  actionId: string | null;
  connections: (McpServer & { capabilities: McpCapability[] })[];
  onDelete: (mcpServerId: string) => Promise<void>;
  onSetRotationToken: (mcpServerId: string, token: string) => void;
  onSync: (mcpServerId: string, bearerToken?: string) => Promise<void>;
  onToggleCapability: (capability: McpCapability) => Promise<void>;
  onToggleConnection: (server: McpServer) => Promise<void>;
  rotationTokens: Record<string, string>;
}) {
  if (connections.length === 0) {
    return (
      <EmptyState className="mt-4 px-3 py-4">
        No MCP servers connected yet.
      </EmptyState>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-grayscale-3">
      {connections.map((server) => {
        const tools = server.capabilities.filter(
          (capability) => capability.capabilityType === "tool",
        );
        const status = getMcpStatus(server);
        const isBusy = actionId === server.id;

        return (
          <div
            key={server.id}
            className="border-b border-grayscale-3 p-3 last:border-b-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {status === "connected" ? (
                    <CheckCircle
                      size={14}
                      weight="fill"
                      className="text-accent-10"
                      aria-hidden="true"
                    />
                  ) : status === "failed" ? (
                    <WarningCircle
                      size={14}
                      weight="fill"
                      className="text-grayscale-10"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="size-2 rounded-full bg-accent-9" />
                  )}
                  <span className="truncate text-sm font-medium">
                    {server.name}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-grayscale-10">
                  {server.url}
                </p>
                <p className="mt-1 text-xs text-grayscale-10">
                  {server.authType === "bearer_token"
                    ? "Bearer token"
                    : "OAuth"}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-grayscale-3 px-2 py-1 text-xs text-grayscale-11">
                {status}
              </span>
            </div>

            {server.lastError ? (
              <Notice className="mt-2 px-2 py-1 text-xs" tone="error">
                {server.lastError}
              </Notice>
            ) : null}

            {server.authStatus === "authorization_required" &&
            server.loginUrl ? (
              <a
                href={server.loginUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs font-medium text-accent-11 hover:text-accent-12"
              >
                Open OAuth login
              </a>
            ) : null}

            {server.authType === "bearer_token" ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={rotationTokens[server.id] ?? ""}
                  onChange={(event) =>
                    onSetRotationToken(server.id, event.target.value)
                  }
                  className="h-9 min-w-0 flex-1"
                  placeholder="New bearer token"
                  type="password"
                  autoComplete="off"
                  disabled={isBusy}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isBusy || !(rotationTokens[server.id] ?? "").trim()}
                  onClick={() =>
                    void onSync(
                      server.id,
                      (rotationTokens[server.id] ?? "").trim(),
                    )
                  }
                >
                  Update token
                </Button>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                onClick={() => void onToggleConnection(server)}
              >
                {server.enabled === false ? "Enable" : "Disable"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                className="gap-1"
                onClick={() => void onSync(server.id)}
              >
                <ArrowsClockwise size={14} weight="bold" aria-hidden="true" />
                Sync
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                className="gap-1"
                onClick={() => void onDelete(server.id)}
              >
                <Trash size={14} weight="bold" aria-hidden="true" />
                Disconnect
              </Button>
            </div>

            {tools.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-grayscale-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-grayscale-12">
                        {tool.upstreamName}
                      </p>
                      <p className="mt-1 truncate text-xs text-grayscale-10">
                        {tool.namespacedName}
                      </p>
                      {tool.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-grayscale-11">
                          {tool.description}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={actionId === tool.id}
                      onClick={() => void onToggleCapability(tool)}
                    >
                      {tool.enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function getMcpStatus(server: McpServer) {
  if (server.status === "failed" || server.syncStatus === "failed") {
    return "failed";
  }

  if (server.authStatus === "authorization_required") {
    return "authorization required";
  }

  if (server.status === "authenticated" || server.syncStatus === "ready") {
    return server.enabled === false ? "disabled" : "connected";
  }

  return "syncing";
}
