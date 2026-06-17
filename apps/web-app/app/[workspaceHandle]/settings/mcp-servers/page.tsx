"use client";

import { id } from "@instantdb/react";
import {
	FloppyDiskIcon,
	PlugsConnectedIcon,
	PlusIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import db from "@/instant.client";
import { Field } from "../_components/Field";
import {
	SettingsPageShell,
	SettingsSection,
} from "../_components/SettingsPageShell";
import {
	getApiErrorMessage,
	getFormString,
	type McpServer,
	mcpServerTx,
} from "../_lib/workspace-settings";

const MCP_SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export default function WorkspaceMcpServersSettingsPage() {
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;
	const { user } = db.useAuth();

	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			mcpServers: {},
		},
	});

	const workspace = data?.workspaces?.[0];
	const currentWorkspaceId = workspace?.id;
	const mcpServers = [...(workspace?.mcpServers ?? [])].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

	const createMcpServer = async (form: HTMLFormElement) => {
		if (!currentWorkspaceId) {
			return;
		}

		const formData = new FormData(form);
		const name = getMcpServerName(getFormString(formData, "name"));
		const url = getMcpServerUrl(getFormString(formData, "url"));

		if (!name || !url) {
			return;
		}

		const mcpServerId = id();
		const now = DateTime.now().toISO();

		await db.transact(
			mcpServerTx(mcpServerId)
				.create({
					name,
					url,
					transport: "streamable_http",
					enabled: true,
					createdAt: now,
					updatedAt: now,
				})
				.link({ workspace: currentWorkspaceId }),
		);

		form.reset();
	};

	const updateMcpServer = async (
		mcpServer: McpServer,
		form: HTMLFormElement,
	) => {
		const formData = new FormData(form);
		const name = getMcpServerName(getFormString(formData, "name"));
		const url = getMcpServerUrl(getFormString(formData, "url"));

		if (!name || !url) {
			throw new Error("Use a valid MCP server name and HTTP URL.");
		}

		await db.transact(
			mcpServerTx(mcpServer.id).update({
				name,
				url,
				enabled: formData.get("enabled") === "on",
				updatedAt: DateTime.now().toISO(),
			}),
		);
	};

	const deleteMcpServer = async (mcpServer: McpServer) => {
		await db.transact(mcpServerTx(mcpServer.id).delete());
	};

	const startMcpOAuth = async (mcpServer: McpServer) => {
		if (!user?.refresh_token) {
			throw new Error("You must be signed in to connect MCP OAuth.");
		}

		const response = await fetch(
			`/api/mcp-servers/${mcpServer.id}/oauth/start`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${user.refresh_token}`,
				},
			},
		);

		if (!response.ok) {
			throw new Error(await getApiErrorMessage(response));
		}

		const body = (await response.json()) as { authorizationUrl?: unknown };

		if (typeof body.authorizationUrl !== "string") {
			throw new Error("OAuth start response did not include authorizationUrl.");
		}

		window.location.href = body.authorizationUrl;
	};

	return (
		<SettingsPageShell
			eyebrow="Agent Environment"
			title="MCP servers"
			description="Streamable HTTP MCP servers available to Codex task sandboxes."
		>
			<SettingsSection title="MCP Servers" Icon={PlugsConnectedIcon}>
				<div className="flex flex-col divide-y divide-grayscale-4">
					{mcpServers.length > 0 ? (
						mcpServers.map((mcpServer) => (
							<McpServerForm
								key={mcpServer.id}
								mcpServer={mcpServer}
								onSave={updateMcpServer}
								onDelete={deleteMcpServer}
								onStartOAuth={startMcpOAuth}
							/>
						))
					) : (
						<p className="p-3 text-sm text-grayscale-10">
							No MCP servers configured.
						</p>
					)}
				</div>

				<form
					className="flex flex-col gap-3 border-t border-grayscale-4 p-3"
					onSubmit={(event) => {
						event.preventDefault();
						void createMcpServer(event.currentTarget);
					}}
				>
					<div className="flex items-center gap-2 text-xs font-medium text-grayscale-11">
						<PlusIcon weight="bold" className="size-3.5" />
						Add MCP Server
					</div>
					<div className="grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.5fr)]">
						<Field label="Name" name="name" placeholder="linear" />
						<Field
							label="HTTP URL"
							name="url"
							placeholder="https://mcp.example.com/mcp"
						/>
					</div>
					<div className="flex justify-end">
						<Button type="submit">Add MCP Server</Button>
					</div>
				</form>
			</SettingsSection>
		</SettingsPageShell>
	);
}

function McpServerForm({
	mcpServer,
	onSave,
	onDelete,
	onStartOAuth,
}: {
	mcpServer: McpServer;
	onSave: (mcpServer: McpServer, form: HTMLFormElement) => Promise<void>;
	onDelete: (mcpServer: McpServer) => Promise<void>;
	onStartOAuth: (mcpServer: McpServer) => Promise<void>;
}) {
	const [status, setStatus] = useState<string>();
	const [authStatus, setAuthStatus] = useState<string>();
	const [isSaving, setIsSaving] = useState(false);
	const [isStartingOAuth, setIsStartingOAuth] = useState(false);

	const saveSettings = async (form: HTMLFormElement) => {
		setStatus(undefined);
		setIsSaving(true);

		try {
			await onSave(mcpServer, form);
			setStatus("Settings saved.");
		} catch (error) {
			setStatus(
				error instanceof Error ? error.message : "Failed to save settings.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const startOAuth = async () => {
		setAuthStatus(undefined);
		setIsStartingOAuth(true);

		try {
			await onStartOAuth(mcpServer);
		} catch (error) {
			setAuthStatus(
				error instanceof Error ? error.message : "Failed to start OAuth.",
			);
			setIsStartingOAuth(false);
		}
	};

	return (
		<form
			className="flex flex-col gap-3 p-3"
			onSubmit={(event) => {
				event.preventDefault();
				void saveSettings(event.currentTarget);
			}}
		>
			<div className="grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_auto]">
				<Field
					label="Name"
					name="name"
					placeholder="linear"
					defaultValue={mcpServer.name}
				/>
				<Field
					label="HTTP URL"
					name="url"
					placeholder="https://mcp.example.com/mcp"
					defaultValue={mcpServer.url}
				/>
				<label className="flex min-w-28 items-end gap-2 pb-1.5 text-xs text-grayscale-11">
					<input
						type="checkbox"
						name="enabled"
						defaultChecked={mcpServer.enabled !== false}
					/>
					Enabled
				</label>
			</div>
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-grayscale-10">
					{authStatus ?? status ?? getAuthLabel(mcpServer.auth)}
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						disabled={isStartingOAuth}
						onClick={() => {
							void startOAuth();
						}}
					>
						<PlugsConnectedIcon weight="bold" className="size-3.5" />
						{isStartingOAuth ? "Connecting..." : "Connect"}
					</Button>
					<Button
						type="button"
						className="bg-red-9 dark:bg-red-8"
						onClick={() => {
							void onDelete(mcpServer);
						}}
					>
						<TrashIcon weight="bold" className="size-3.5" />
						Delete
					</Button>
					<Button type="submit" disabled={isSaving}>
						<FloppyDiskIcon weight="bold" className="size-3.5" />
						{isSaving ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>
		</form>
	);
}

const getAuthLabel = (value: unknown) => {
	if (isOAuthAuth(value)) {
		if (value.status === "connected") {
			return "OAuth connected.";
		}

		if (value.status === "pending") {
			return "OAuth connection pending.";
		}

		return "OAuth not connected.";
	}

	return "OAuth not connected.";
};

const getMcpServerName = (value: string) => {
	const trimmed = value.trim();
	return MCP_SERVER_NAME_PATTERN.test(trimmed) ? trimmed : undefined;
};

const getMcpServerUrl = (value: string) => {
	try {
		const url = new URL(value.trim());

		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return undefined;
		}

		return url.toString();
	} catch {
		return undefined;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isOAuthAuth = (
	value: unknown,
): value is {
	type: "oauth";
	status?: string;
} => isRecord(value) && value.type === "oauth";
