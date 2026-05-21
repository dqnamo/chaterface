"use client";

import {
  ArrowsClockwise,
  CheckCircle,
  Plug,
  PuzzlePiece,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { type FormEvent, useMemo, useState } from "react";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import Input from "@/components/public/Input";
import { cn } from "@/helpers/classname-helper";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type SkillCandidate = {
  description: string;
  name: string;
  path: string;
};

type McpCapability = {
  capabilityType: string;
  description?: string | null;
  enabled: boolean;
  id: string;
  mcpServerId: string;
  namespacedName: string;
  upstreamName: string;
};

type McpAuthType = "bearer_token" | "oauth";

type McpServer = {
  authType?: McpAuthType | string;
  authStatus?: string;
  enabled?: boolean;
  id: string;
  lastError?: string | null;
  loginUrl?: string | null;
  name: string;
  status: string;
  syncStatus?: string;
  url: string;
};

type ApiError = {
  error?: string;
};

export default function CapabilitiesPanel({
  factoryId,
  section = "all",
}: {
  factoryId: string;
  section?: "all" | "mcp" | "skills";
}) {
  if (!db) {
    return (
      <div className="rounded-lg border border-grayscale-3 p-4 text-grayscale-11 text-sm">
        InstantDB is not configured.
      </div>
    );
  }

  return (
    <CapabilitiesPanelContent
      factoryId={factoryId}
      instantDb={db}
      section={section}
    />
  );
}

function CapabilitiesPanelContent({
  factoryId,
  instantDb,
  section,
}: {
  factoryId: string;
  instantDb: AppDb;
  section: "all" | "mcp" | "skills";
}) {
  const { user } = instantDb.useAuth();
  const [skillRepoUrl, setSkillRepoUrl] = useState("");
  const [skillCandidates, setSkillCandidates] = useState<SkillCandidate[]>([]);
  const [selectedSkillPaths, setSelectedSkillPaths] = useState<Set<string>>(
    () => new Set(),
  );
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillNotice, setSkillNotice] = useState<string | null>(null);
  const [isListingSkills, setIsListingSkills] = useState(false);
  const [isInstallingSkills, setIsInstallingSkills] = useState(false);
  const [mcpAuthType, setMcpAuthType] = useState<McpAuthType>("oauth");
  const [mcpBearerToken, setMcpBearerToken] = useState("");
  const [mcpName, setMcpName] = useState("");
  const [mcpScopes, setMcpScopes] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpActionId, setMcpActionId] = useState<string | null>(null);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [mcpAuthUrl, setMcpAuthUrl] = useState<string | null>(null);
  const [mcpRotationTokens, setMcpRotationTokens] = useState<
    Record<string, string>
  >({});
  const [isStartingMcp, setIsStartingMcp] = useState(false);

  const { data } = instantDb.useQuery(
    factoryId
      ? {
          factories: {
            $: { where: { id: factoryId } },
            skills: {},
            mcpServers: {},
          },
          factoryMcpCapabilities: {},
        }
      : null,
  );
  const factory = data?.factories[0];
  const skills = useMemo(
    () =>
      [...(factory?.skills ?? [])].sort((a, b) =>
        (a.installedAt ?? "").localeCompare(b.installedAt ?? ""),
      ),
    [factory?.skills],
  );
  const mcpServers = useMemo(() => {
    const capabilities = (data?.factoryMcpCapabilities ??
      []) as McpCapability[];

    return ([...(factory?.mcpServers ?? [])] as McpServer[])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((server) => ({
        ...server,
        capabilities: capabilities
          .filter((capability) => capability.mcpServerId === server.id)
          .sort((a, b) => a.upstreamName.localeCompare(b.upstreamName)),
      }));
  }, [data?.factoryMcpCapabilities, factory?.mcpServers]);

  async function handleListSkills(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const repoUrl = skillRepoUrl.trim();

    if (!repoUrl) {
      setSkillError("Enter a skills repo URL.");
      return;
    }

    setSkillCandidates([]);
    setSelectedSkillPaths(new Set());
    setSkillError(null);
    setSkillNotice(null);
    setIsListingSkills(true);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to list skills.");
      }

      const response = await fetch(`/api/factories/${factoryId}/skills/list`, {
        method: "POST",
        headers: getJsonAuthHeaders(user.refresh_token),
        body: JSON.stringify({ repoUrl }),
      });
      const body = (await response.json().catch(() => null)) as
        | { skills?: SkillCandidate[] }
        | ApiError
        | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "Skills could not be listed.");
      }

      const nextSkills =
        body && "skills" in body && Array.isArray(body.skills)
          ? body.skills
          : [];
      setSkillCandidates(nextSkills);
      setSelectedSkillPaths(
        new Set(nextSkills.map((skill: SkillCandidate) => skill.path)),
      );
      setSkillNotice(
        nextSkills.length === 0
          ? "No SKILL.md files were found in that repo."
          : null,
      );
    } catch (error) {
      console.error(error);
      setSkillNotice(null);
      setSkillError(
        error instanceof Error ? error.message : "Skills could not be listed.",
      );
    } finally {
      setIsListingSkills(false);
    }
  }

  async function handleInstallSkills() {
    const selectedSkills = skillCandidates.filter((skill) =>
      selectedSkillPaths.has(skill.path),
    );

    if (selectedSkills.length === 0) {
      setSkillError("Select at least one skill to install.");
      return;
    }

    setSkillError(null);
    setSkillNotice(null);
    setIsInstallingSkills(true);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to install skills.");
      }

      const response = await fetch(
        `/api/factories/${factoryId}/skills/install`,
        {
          method: "POST",
          headers: getJsonAuthHeaders(user.refresh_token),
          body: JSON.stringify({
            repoUrl: skillRepoUrl.trim(),
            skills: selectedSkills,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Skills could not be installed.");
      }

      setSkillCandidates([]);
      setSelectedSkillPaths(new Set());
      setSkillNotice("Selected skills were installed for new workers.");
    } catch (error) {
      console.error(error);
      setSkillNotice(null);
      setSkillError(
        error instanceof Error
          ? error.message
          : "Skills could not be installed.",
      );
    } finally {
      setIsInstallingSkills(false);
    }
  }

  async function handleStartMcp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = mcpName.trim();
    const url = mcpUrl.trim();

    if (!name || !url) {
      setMcpError("Enter an MCP name and URL.");
      return;
    }

    if (mcpAuthType === "bearer_token" && !mcpBearerToken.trim()) {
      setMcpError("Enter a bearer token for this MCP server.");
      return;
    }

    setMcpError(null);
    setMcpAuthUrl(null);
    setIsStartingMcp(true);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to add MCP servers.");
      }

      const response = await fetch(`/api/factories/${factoryId}/mcp/start`, {
        method: "POST",
        headers: getJsonAuthHeaders(user.refresh_token),
        body: JSON.stringify({
          authType: mcpAuthType,
          bearerToken:
            mcpAuthType === "bearer_token" ? mcpBearerToken.trim() : undefined,
          name,
          scopes: mcpScopes.trim() || undefined,
          url,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { authUrl?: null | string; status?: string }
        | ApiError
        | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "MCP setup could not be started.");
      }

      setMcpAuthUrl(body && "authUrl" in body ? (body.authUrl ?? null) : null);
      setMcpAuthType("oauth");
      setMcpBearerToken("");
      setMcpName("");
      setMcpScopes("");
      setMcpUrl("");
    } catch (error) {
      console.error(error);
      setMcpError(
        error instanceof Error
          ? error.message
          : "MCP setup could not be started.",
      );
    } finally {
      setIsStartingMcp(false);
    }
  }

  async function handleSyncMcp(mcpServerId: string, bearerToken?: string) {
    setMcpActionId(mcpServerId);
    setMcpError(null);

    try {
      if (!user?.refresh_token) {
        throw new Error("You must be signed in to sync MCP servers.");
      }

      const response = await fetch(
        `/api/factories/${factoryId}/mcp/${mcpServerId}/sync`,
        {
          method: "POST",
          headers: bearerToken
            ? getJsonAuthHeaders(user.refresh_token)
            : getAuthHeaders(user.refresh_token),
          ...(bearerToken ? { body: JSON.stringify({ bearerToken }) } : {}),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | { authUrl?: string | null }
        | ApiError
        | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "MCP sync failed.");
      }

      setMcpAuthUrl(body && "authUrl" in body ? (body.authUrl ?? null) : null);
      if (bearerToken) {
        setMcpRotationTokens((current) => ({ ...current, [mcpServerId]: "" }));
      }
    } catch (error) {
      console.error(error);
      setMcpError(error instanceof Error ? error.message : "MCP sync failed.");
    } finally {
      setMcpActionId(null);
    }
  }

  async function handleToggleMcp(server: McpServer) {
    setMcpActionId(server.id);
    setMcpError(null);

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
    } catch (error) {
      console.error(error);
      setMcpError(
        error instanceof Error ? error.message : "MCP update failed.",
      );
    } finally {
      setMcpActionId(null);
    }
  }

  async function handleDeleteMcp(mcpServerId: string) {
    setMcpActionId(mcpServerId);
    setMcpError(null);

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
    } catch (error) {
      console.error(error);
      setMcpError(
        error instanceof Error ? error.message : "MCP disconnect failed.",
      );
    } finally {
      setMcpActionId(null);
    }
  }

  async function handleToggleMcpCapability(capability: McpCapability) {
    setMcpActionId(capability.id);
    setMcpError(null);

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
    } catch (error) {
      console.error(error);
      setMcpError(
        error instanceof Error ? error.message : "MCP tool update failed.",
      );
    } finally {
      setMcpActionId(null);
    }
  }

  function toggleSkill(skillPath: string) {
    setSelectedSkillPaths((current) => {
      const next = new Set(current);

      if (next.has(skillPath)) {
        next.delete(skillPath);
      } else {
        next.add(skillPath);
      }

      return next;
    });
  }

  const showSkills = section === "all" || section === "skills";
  const showMcp = section === "all" || section === "mcp";

  return (
    <section className="flex flex-col gap-4">
      {section === "all" ? (
        <div>
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wide text-grayscale-10">
            Capabilities
          </h2>
          <p className="mt-1 text-sm text-grayscale-11">
            Skills and MCP servers are applied to new workers.
          </p>
        </div>
      ) : null}

      <div
        className={
          section === "all" ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"
        }
      >
        {showSkills ? (
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <PuzzlePiece size={16} weight="bold" aria-hidden="true" />
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-wide text-grayscale-10">
                Skills
              </h3>
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleListSkills}>
              <Field label="Skills repo URL">
                <Input
                  value={skillRepoUrl}
                  onChange={(event) => setSkillRepoUrl(event.target.value)}
                  placeholder="https://github.com/org/skills"
                  disabled={isListingSkills || isInstallingSkills}
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={isListingSkills}>
                  {isListingSkills ? "Listing..." : "List skills"}
                </Button>
              </div>
            </form>

            {skillCandidates.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="max-h-64 overflow-y-auto rounded-lg border border-grayscale-3">
                  {skillCandidates.map((skill) => (
                    <label
                      key={skill.path}
                      className="flex cursor-pointer gap-3 border-b border-grayscale-3 p-3 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkillPaths.has(skill.path)}
                        onChange={() => toggleSkill(skill.path)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {skill.name}
                        </span>
                        <span className="block truncate text-xs text-grayscale-10">
                          {skill.path}
                        </span>
                        {skill.description ? (
                          <span className="mt-1 block text-sm text-grayscale-11">
                            {skill.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={isInstallingSkills}
                    onClick={handleInstallSkills}
                  >
                    {isInstallingSkills ? "Installing..." : "Install selected"}
                  </Button>
                </div>
              </div>
            ) : null}

            {skillError ? (
              <Notice className="mt-3" tone="error">
                {skillError}
              </Notice>
            ) : null}

            {skillNotice ? (
              <Notice className="mt-3">{skillNotice}</Notice>
            ) : null}

            <CapabilityListEmpty
              emptyText="No skills installed yet."
              items={skills.map((skill) => ({
                id: skill.id,
                meta: skill.skillPath ?? skill.repoUrl,
                status: skill.status,
                title: skill.name,
                error: skill.lastError,
              }))}
            />
          </Card>
        ) : null}

        {showMcp ? (
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Plug size={16} weight="bold" aria-hidden="true" />
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-wide text-grayscale-10">
                MCP Servers
              </h3>
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleStartMcp}>
              <Field label="Name">
                <Input
                  value={mcpName}
                  onChange={(event) => setMcpName(event.target.value)}
                  placeholder="linear"
                  disabled={isStartingMcp}
                />
              </Field>
              <Field label="HTTP URL">
                <Input
                  value={mcpUrl}
                  onChange={(event) => setMcpUrl(event.target.value)}
                  placeholder="https://example.com/mcp"
                  disabled={isStartingMcp}
                />
              </Field>
              <Field label="OAuth scopes">
                <Input
                  value={mcpScopes}
                  onChange={(event) => setMcpScopes(event.target.value)}
                  placeholder="Optional"
                  disabled={isStartingMcp}
                />
              </Field>
              <fieldset className="flex flex-col gap-2 text-sm font-medium">
                <legend>Auth method</legend>
                <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-grayscale-4">
                  {(["oauth", "bearer_token"] as const).map((authType) => (
                    <button
                      key={authType}
                      type="button"
                      className={
                        mcpAuthType === authType
                          ? "bg-grayscale-12 px-3 py-2 text-sm text-grayscale-1 transition-colors"
                          : "bg-grayscale-1 px-3 py-2 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2"
                      }
                      disabled={isStartingMcp}
                      onClick={() => setMcpAuthType(authType)}
                    >
                      {authType === "oauth" ? "OAuth" : "Bearer token"}
                    </button>
                  ))}
                </div>
              </fieldset>
              {mcpAuthType === "bearer_token" ? (
                <Field
                  label="Bearer token"
                  hint="GitHub hosted MCP uses https://api.githubcopilot.com/mcp/."
                >
                  <Input
                    value={mcpBearerToken}
                    onChange={(event) => setMcpBearerToken(event.target.value)}
                    placeholder="GitHub PAT or upstream bearer token"
                    type="password"
                    autoComplete="off"
                    disabled={isStartingMcp}
                  />
                </Field>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={isStartingMcp}>
                  {isStartingMcp ? "Starting..." : "Add MCP"}
                </Button>
              </div>
            </form>

            {mcpAuthUrl ? (
              <Notice className="mt-3 p-0" tone="accent">
                <a
                  href={mcpAuthUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-3 py-2 hover:text-accent-12"
                >
                  Open MCP OAuth login
                </a>
              </Notice>
            ) : null}

            {mcpError ? (
              <Notice className="mt-3" tone="error">
                {mcpError}
              </Notice>
            ) : null}

            <McpConnectionList
              actionId={mcpActionId}
              connections={mcpServers}
              onDelete={handleDeleteMcp}
              onSync={handleSyncMcp}
              onSetRotationToken={(serverId, token) =>
                setMcpRotationTokens((current) => ({
                  ...current,
                  [serverId]: token,
                }))
              }
              onToggleCapability={handleToggleMcpCapability}
              onToggleConnection={handleToggleMcp}
              rotationTokens={mcpRotationTokens}
            />
          </Card>
        ) : null}
      </div>
    </section>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-grayscale-11 text-xs">{label}</span>
      {children}
      {hint ? <span className="text-grayscale-10 text-xs">{hint}</span> : null}
    </div>
  );
}

function Notice({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "accent" | "error" | "neutral";
}) {
  const toneClass =
    tone === "error"
      ? "border-grayscale-5 bg-grayscale-2 text-grayscale-12"
      : tone === "accent"
        ? "border-accent-5 bg-accent-2 text-accent-11"
        : "border-grayscale-4 bg-grayscale-2 text-grayscale-11";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        toneClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-grayscale-3 bg-grayscale-1 text-center text-grayscale-10 text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function getAuthHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function getJsonAuthHeaders(token: string) {
  return {
    ...getAuthHeaders(token),
    "Content-Type": "application/json",
  };
}

function getApiError(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return null;
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

function CapabilityListEmpty({
  emptyText,
  items,
}: {
  emptyText: string;
  items: {
    action?: ReactNode;
    error?: string;
    id: string;
    meta: string;
    status: string;
    title: string;
  }[];
}) {
  if (items.length === 0) {
    return <EmptyState className="mt-4 px-3 py-4">{emptyText}</EmptyState>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-grayscale-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="border-b border-grayscale-3 p-3 last:border-b-0"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {item.status === "installed" ||
                item.status === "authenticated" ? (
                  <CheckCircle
                    size={14}
                    weight="fill"
                    className="text-accent-10"
                    aria-hidden="true"
                  />
                ) : item.status === "failed" ? (
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
                  {item.title}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-grayscale-10">
                {item.meta}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.action}
              <span className="rounded-lg bg-grayscale-3 px-2 py-1 text-xs text-grayscale-11">
                {item.status}
              </span>
            </div>
          </div>
          {item.error ? (
            <Notice className="mt-2 px-2 py-1 text-xs" tone="error">
              {item.error}
            </Notice>
          ) : null}
        </div>
      ))}
    </div>
  );
}
