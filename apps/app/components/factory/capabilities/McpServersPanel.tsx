"use client";

import {
  ArrowSquareOut,
  ArrowsClockwise,
  CheckCircle,
  Key,
  Plug,
  ShieldCheck,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { type FormEvent, useId, useState } from "react";
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
import { FactorySectionCard } from "@/components/factory/FactorySectionLayout";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import Input from "@/components/public/Input";
import { cn } from "@/helpers/classname-helper";
import type { AppDb } from "@/lib/db.client";

const AUTH_OPTIONS = [
  {
    detail: "Browser login",
    icon: ShieldCheck,
    label: "OAuth",
    value: "oauth",
  },
  {
    detail: "PAT or API key",
    icon: Key,
    label: "Bearer token",
    value: "bearer_token",
  },
] as const;

export function McpServersPanel({
  factoryId,
  instantDb,
  servers,
  variant = "default",
}: {
  factoryId: string;
  instantDb: AppDb;
  servers: (McpServer & { capabilities: McpCapability[] })[];
  variant?: "computer" | "default";
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
  const [notice, setNotice] = useState<string | null>(null);
  const [rotationTokens, setRotationTokens] = useState<Record<string, string>>(
    {},
  );
  const [isStarting, setIsStarting] = useState(false);
  const formId = useId();

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
    setNotice(null);
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
          scopes: authType === "oauth" ? scopes.trim() || undefined : undefined,
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

      const nextAuthUrl =
        body && "authUrl" in body ? (body.authUrl ?? null) : null;
      setAuthUrl(nextAuthUrl);
      setNotice(nextAuthUrl ? null : "MCP setup started.");
      setAuthType("oauth");
      setBearerToken("");
      setName("");
      setScopes("");
      setUrl("");
    } catch (startError) {
      console.error(startError);
      setNotice(null);
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
    setAuthUrl(null);
    setNotice(null);

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

      const nextAuthUrl =
        body && "authUrl" in body ? (body.authUrl ?? null) : null;
      setAuthUrl(nextAuthUrl);
      setNotice(
        nextAuthUrl
          ? null
          : nextBearerToken
            ? "Bearer token updated."
            : "MCP sync started.",
      );
      if (nextBearerToken) {
        setRotationTokens((current) => ({ ...current, [mcpServerId]: "" }));
      }
    } catch (syncError) {
      console.error(syncError);
      setNotice(null);
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
    setAuthUrl(null);
    setNotice(null);

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

      setNotice(
        server.enabled === false
          ? "MCP server enabled."
          : "MCP server disabled.",
      );
    } catch (toggleError) {
      console.error(toggleError);
      setNotice(null);
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
    setAuthUrl(null);
    setNotice(null);

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

      setNotice("MCP server disconnected.");
    } catch (deleteError) {
      console.error(deleteError);
      setNotice(null);
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
    setAuthUrl(null);
    setNotice(null);

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

      setNotice(
        capability.enabled ? "MCP tool disabled." : "MCP tool enabled.",
      );
    } catch (capabilityError) {
      console.error(capabilityError);
      setNotice(null);
      setError(
        capabilityError instanceof Error
          ? capabilityError.message
          : "MCP tool update failed.",
      );
    } finally {
      setActionId(null);
    }
  }

  const content = (
    <>
      {variant === "default" ? (
        <div className="mb-4 flex items-center gap-2">
          <Plug size={16} weight="bold" aria-hidden="true" />
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-wide text-grayscale-10">
            MCP Servers
          </h3>
        </div>
      ) : null}
      <form
        className="rounded-lg border border-grayscale-3 bg-grayscale-1 p-3"
        onSubmit={handleStart}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-grayscale-12">
              Add MCP server
            </h3>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Field htmlFor={`${formId}-name`} label="Name">
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="linear"
                disabled={isStarting}
              />
            </Field>
            <Field htmlFor={`${formId}-url`} label="MCP endpoint">
              <Input
                id={`${formId}-url`}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/mcp"
                disabled={isStarting}
              />
            </Field>
          </div>

          <fieldset className="grid gap-2">
            <legend className="font-medium text-grayscale-11 text-xs">
              Auth method
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {AUTH_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = authType === option.value;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      "flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      "focus-visible:border-accent-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6",
                      isSelected
                        ? "border-accent-7 bg-accent-2 text-accent-12"
                        : "border-grayscale-3 bg-grayscale-1 text-grayscale-11 hover:border-grayscale-5 hover:bg-grayscale-2",
                      isStarting && "cursor-not-allowed opacity-70",
                    )}
                    disabled={isStarting}
                    key={option.value}
                    onClick={() => setAuthType(option.value)}
                    type="button"
                  >
                    <Icon
                      aria-hidden="true"
                      className="mt-0.5 shrink-0"
                      size={16}
                      weight="bold"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-grayscale-10 text-xs">
                        {option.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {authType === "oauth" ? (
            <Field htmlFor={`${formId}-scopes`} label="OAuth scopes">
              <Input
                id={`${formId}-scopes`}
                value={scopes}
                onChange={(event) => setScopes(event.target.value)}
                placeholder="Optional"
                disabled={isStarting}
              />
            </Field>
          ) : null}

          {authType === "bearer_token" ? (
            <Field
              htmlFor={`${formId}-bearer-token`}
              label="Bearer token"
              hint="Stored encrypted for this factory."
            >
              <Input
                id={`${formId}-bearer-token`}
                value={bearerToken}
                onChange={(event) => setBearerToken(event.target.value)}
                placeholder="GitHub PAT or upstream bearer token"
                type="password"
                autoComplete="off"
                disabled={isStarting}
              />
            </Field>
          ) : null}

          <div className="flex justify-end pt-1">
            <Button
              className="min-h-9 px-3"
              type="submit"
              disabled={isStarting}
            >
              <Plug size={14} weight="bold" aria-hidden="true" />
              {isStarting ? "Starting..." : "Add MCP"}
            </Button>
          </div>
        </div>
      </form>

      {authUrl ? (
        <Notice className="mt-3" tone="accent">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex min-w-0 items-center gap-2">
              <CheckCircle
                aria-hidden="true"
                className="shrink-0"
                size={15}
                weight="fill"
              />
              <span>OAuth login is ready.</span>
            </span>
            <Button
              className="w-fit"
              href={authUrl}
              rel="noreferrer"
              target="_blank"
              variant="secondary"
            >
              Open login
              <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
            </Button>
          </div>
        </Notice>
      ) : null}

      {notice ? (
        <Notice className="mt-3" tone="accent">
          <span className="flex items-center gap-2">
            <CheckCircle aria-hidden="true" size={15} weight="fill" />
            {notice}
          </span>
        </Notice>
      ) : null}

      {error ? (
        <Notice className="mt-3" tone="error">
          <span className="flex items-center gap-2">
            <WarningCircle aria-hidden="true" size={15} weight="fill" />
            {error}
          </span>
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
    </>
  );

  if (variant === "computer") {
    return <FactorySectionCard>{content}</FactorySectionCard>;
  }

  return <Card className="p-4">{content}</Card>;
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
      <EmptyState className="mt-4 px-3 py-5">
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="flex size-9 items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-2 text-grayscale-11">
            <Plug size={17} weight="bold" aria-hidden="true" />
          </div>
          <p className="mt-2 font-medium text-grayscale-12 text-sm">
            No MCP servers connected yet.
          </p>
          <p className="mt-1 text-grayscale-10 text-xs">
            Workers currently run without external MCP tools.
          </p>
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="font-mono font-semibold text-grayscale-10 text-xs uppercase">
          Connected servers
        </h4>
        <span className="rounded-full bg-grayscale-3 px-2 py-0.5 text-grayscale-10 text-xs">
          {connections.length}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-grayscale-3">
        {connections.map((server) => {
          const tools = server.capabilities.filter(
            (capability) => capability.capabilityType === "tool",
          );
          const enabledToolCount = tools.filter((tool) => tool.enabled).length;
          const status = getMcpStatus(server);
          const statusTone = getMcpStatusTone(status);
          const isBusy = actionId === server.id;

          return (
            <div
              key={server.id}
              className="border-b border-grayscale-3 bg-grayscale-1 p-3 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={status} />
                    <span className="truncate text-sm font-medium">
                      {server.name}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-grayscale-10">
                    {server.url}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-grayscale-3 px-2 py-0.5 text-grayscale-10">
                      {server.authType === "bearer_token"
                        ? "Bearer token"
                        : "OAuth"}
                    </span>
                    {tools.length > 0 ? (
                      <span className="rounded-full bg-grayscale-3 px-2 py-0.5 text-grayscale-10">
                        {enabledToolCount}/{tools.length} tools
                      </span>
                    ) : null}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-xs",
                    statusTone,
                  )}
                >
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
                    disabled={
                      isBusy || !(rotationTokens[server.id] ?? "").trim()
                    }
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
                  className="gap-1 text-red-11 hover:text-red-12"
                  onClick={() => void onDelete(server.id)}
                >
                  <Trash size={14} weight="bold" aria-hidden="true" />
                  Disconnect
                </Button>
              </div>

              {tools.length > 0 ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-grayscale-3">
                  <div className="flex items-center justify-between gap-3 border-b border-grayscale-3 bg-grayscale-2 px-3 py-2">
                    <p className="font-medium text-grayscale-11 text-xs">
                      Tools
                    </p>
                    <span className="text-grayscale-10 text-xs">
                      {enabledToolCount} enabled
                    </span>
                  </div>
                  <div className="divide-y divide-grayscale-3">
                    {tools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-start justify-between gap-3 px-3 py-2"
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
                          aria-pressed={tool.enabled}
                          className="shrink-0"
                          type="button"
                          variant={tool.enabled ? "primary" : "secondary"}
                          disabled={actionId === tool.id}
                          onClick={() => void onToggleCapability(tool)}
                        >
                          {tool.enabled ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : server.syncStatus === "ready" ? (
                <p className="mt-3 rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-2 text-grayscale-10 text-xs">
                  No tools were discovered on this server.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
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

function StatusIcon({ status }: { status: ReturnType<typeof getMcpStatus> }) {
  if (status === "connected") {
    return (
      <CheckCircle
        size={14}
        weight="fill"
        className="text-accent-10"
        aria-hidden="true"
      />
    );
  }

  if (status === "failed") {
    return (
      <WarningCircle
        size={14}
        weight="fill"
        className="text-red-10"
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 rounded-full",
        status === "disabled" ? "bg-grayscale-8" : "bg-accent-9",
      )}
    />
  );
}

function getMcpStatusTone(status: ReturnType<typeof getMcpStatus>) {
  if (status === "connected") {
    return "border-accent-5 bg-accent-2 text-accent-11";
  }

  if (status === "failed") {
    return "border-red-5 bg-red-2 text-red-11";
  }

  if (status === "authorization required") {
    return "border-gold-5 bg-gold-2 text-gold-11";
  }

  return "border-grayscale-4 bg-grayscale-2 text-grayscale-11";
}
