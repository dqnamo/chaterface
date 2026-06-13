"use client";

import { id } from "@instantdb/react";
import {
	FloppyDiskIcon,
	PlugsConnectedIcon,
	PlusIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import db from "@/instant.client";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Input, Textarea } from "@/components/Input";
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
} from "../_lib/factory-settings";

type AuthMode = "none" | "bearer" | "headers" | "oauth" | "client_credentials";
type AuthFieldValues = {
	oauthIssuer: string;
	oauthAuthorizationUrl: string;
	oauthTokenUrl: string;
	oauthClientId: string;
	oauthClientSecret: string;
	oauthScope: string;
	oauthResource: string;
	clientCredentialsTokenUrl: string;
	clientCredentialsClientId: string;
	clientCredentialsClientSecret: string;
	clientCredentialsScope: string;
	clientCredentialsResource: string;
};

const MCP_SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const HTTP_HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export default function FactoryMcpServersSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();

	const { data } = db.useQuery({
		factories: {
			$: {
				where: {
					id: currentFactoryId,
				},
			},
			mcpServers: {},
		},
	});

	const factory = data?.factories?.[0];
	const mcpServers = [...(factory?.mcpServers ?? [])].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

	const createMcpServer = async (form: HTMLFormElement) => {
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
					auth: { type: "none" },
					enabled: true,
					createdAt: now,
					updatedAt: now,
				})
				.link({ factory: currentFactoryId }),
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

	const saveMcpAuth = async (mcpServer: McpServer, body: unknown) => {
		if (!user?.refresh_token) {
			throw new Error("You must be signed in to save MCP auth.");
		}

		const response = await fetch(`/api/mcp-servers/${mcpServer.id}/auth`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${user.refresh_token}`,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(await getApiErrorMessage(response));
		}
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
			eyebrow="Factory Settings"
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
								onSaveAuth={saveMcpAuth}
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
	onSaveAuth,
	onStartOAuth,
}: {
	mcpServer: McpServer;
	onSave: (mcpServer: McpServer, form: HTMLFormElement) => Promise<void>;
	onDelete: (mcpServer: McpServer) => Promise<void>;
	onSaveAuth: (mcpServer: McpServer, body: unknown) => Promise<void>;
	onStartOAuth: (mcpServer: McpServer) => Promise<void>;
}) {
	const [status, setStatus] = useState<string>();
	const [authStatus, setAuthStatus] = useState<string>();
	const [isSaving, setIsSaving] = useState(false);
	const [isSavingAuth, setIsSavingAuth] = useState(false);
	const [isStartingOAuth, setIsStartingOAuth] = useState(false);
	const [authMode, setAuthMode] = useState<AuthMode>(
		getMcpAuthMode(mcpServer.auth),
	);
	const [bearerToken, setBearerToken] = useState("");
	const [headersText, setHeadersText] = useState("");
	const [authFields, setAuthFields] = useState<AuthFieldValues>(
		getInitialAuthFieldValues(mcpServer.auth),
	);

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

	const saveAuth = async () => {
		const body = getAuthBody(authMode, bearerToken, headersText, authFields);
		setAuthStatus(undefined);

		if (!body) {
			setAuthStatus("Use a valid bearer token or header list.");
			return;
		}

		setIsSavingAuth(true);

		try {
			await onSaveAuth(mcpServer, body);
			setBearerToken("");
			setHeadersText("");
			setAuthStatus("Auth saved.");
		} catch (error) {
			setAuthStatus(
				error instanceof Error ? error.message : "Failed to save auth.",
			);
		} finally {
			setIsSavingAuth(false);
		}
	};

	const startOAuth = async () => {
		setAuthStatus(undefined);
		setIsStartingOAuth(true);

		try {
			await onSaveAuth(
				mcpServer,
				getAuthBody("oauth", bearerToken, headersText, authFields),
			);
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
			<div className="grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_auto]">
				<div className="flex min-w-0 flex-col gap-1.5">
					<label
						htmlFor={`auth-mode-${mcpServer.id}`}
						className="text-xs text-grayscale-11"
					>
						Auth
					</label>
					<select
						id={`auth-mode-${mcpServer.id}`}
						className="h-7 bg-grayscale-2 px-2 text-xs text-grayscale-12 outline-none"
						value={authMode}
						onChange={(event) => setAuthMode(event.target.value as AuthMode)}
					>
						<option value="none">None</option>
						<option value="bearer">Bearer token</option>
						<option value="headers">HTTP headers</option>
						<option value="oauth">OAuth</option>
						<option value="client_credentials">Client credentials</option>
					</select>
				</div>
				<AuthFields
					authMode={authMode}
					bearerToken={bearerToken}
					headersText={headersText}
					authFields={authFields}
					onBearerTokenChange={setBearerToken}
					onHeadersTextChange={setHeadersText}
					onAuthFieldsChange={setAuthFields}
				/>
				<div className="flex items-end justify-end gap-2">
					{authMode === "oauth" ? (
						<Button
							type="button"
							disabled={isStartingOAuth}
							onClick={() => {
								void startOAuth();
							}}
						>
							{isStartingOAuth ? "Connecting..." : "Connect OAuth"}
						</Button>
					) : null}
					<Button
						type="button"
						disabled={isSavingAuth}
						onClick={() => {
							void saveAuth();
						}}
					>
						{isSavingAuth ? "Saving..." : "Save Auth"}
					</Button>
				</div>
			</div>
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-grayscale-10">
					{authStatus ?? status ?? getAuthLabel(mcpServer.auth)}
				</p>
				<div className="flex items-center gap-2">
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

function AuthFields({
	authMode,
	bearerToken,
	headersText,
	authFields,
	onBearerTokenChange,
	onHeadersTextChange,
	onAuthFieldsChange,
}: {
	authMode: AuthMode;
	bearerToken: string;
	headersText: string;
	authFields: AuthFieldValues;
	onBearerTokenChange: (value: string) => void;
	onHeadersTextChange: (value: string) => void;
	onAuthFieldsChange: (value: AuthFieldValues) => void;
}) {
	const updateAuthField = (key: keyof AuthFieldValues, value: string) => {
		onAuthFieldsChange({
			...authFields,
			[key]: value,
		});
	};

	if (authMode === "bearer") {
		return (
			<div className="flex min-w-0 flex-col gap-1.5">
				<label htmlFor="mcp-bearer-token" className="text-xs text-grayscale-11">
					Bearer token
				</label>
				<Input
					id="mcp-bearer-token"
					type="password"
					placeholder="Token"
					value={bearerToken}
					onChange={(event) => onBearerTokenChange(event.target.value)}
				/>
			</div>
		);
	}

	if (authMode === "headers") {
		return (
			<div className="flex min-w-0 flex-col gap-1.5">
				<label htmlFor="mcp-auth-headers" className="text-xs text-grayscale-11">
					Headers
				</label>
				<Textarea
					id="mcp-auth-headers"
					className="min-h-16 font-mono"
					placeholder={"X-API-Key=...\nAuthorization=Bearer ..."}
					value={headersText}
					onChange={(event) => onHeadersTextChange(event.target.value)}
				/>
			</div>
		);
	}

	if (authMode === "oauth") {
		return (
			<div className="grid min-w-0 gap-2 md:grid-cols-2">
				<Input
					placeholder="Issuer URL"
					value={authFields.oauthIssuer}
					onChange={(event) =>
						updateAuthField("oauthIssuer", event.target.value)
					}
				/>
				<Input
					placeholder="Client ID"
					value={authFields.oauthClientId}
					onChange={(event) =>
						updateAuthField("oauthClientId", event.target.value)
					}
				/>
				<Input
					placeholder="Authorization URL"
					value={authFields.oauthAuthorizationUrl}
					onChange={(event) =>
						updateAuthField("oauthAuthorizationUrl", event.target.value)
					}
				/>
				<Input
					placeholder="Token URL"
					value={authFields.oauthTokenUrl}
					onChange={(event) =>
						updateAuthField("oauthTokenUrl", event.target.value)
					}
				/>
				<Input
					type="password"
					placeholder="Client secret"
					value={authFields.oauthClientSecret}
					onChange={(event) =>
						updateAuthField("oauthClientSecret", event.target.value)
					}
				/>
				<Input
					placeholder="Scope"
					value={authFields.oauthScope}
					onChange={(event) =>
						updateAuthField("oauthScope", event.target.value)
					}
				/>
				<Input
					containerClassName="md:col-span-2"
					placeholder="Resource"
					value={authFields.oauthResource}
					onChange={(event) =>
						updateAuthField("oauthResource", event.target.value)
					}
				/>
			</div>
		);
	}

	if (authMode === "client_credentials") {
		return (
			<div className="grid min-w-0 gap-2 md:grid-cols-2">
				<Input
					placeholder="Token URL"
					value={authFields.clientCredentialsTokenUrl}
					onChange={(event) =>
						updateAuthField("clientCredentialsTokenUrl", event.target.value)
					}
				/>
				<Input
					placeholder="Client ID"
					value={authFields.clientCredentialsClientId}
					onChange={(event) =>
						updateAuthField("clientCredentialsClientId", event.target.value)
					}
				/>
				<Input
					type="password"
					placeholder="Client secret"
					value={authFields.clientCredentialsClientSecret}
					onChange={(event) =>
						updateAuthField("clientCredentialsClientSecret", event.target.value)
					}
				/>
				<Input
					placeholder="Scope"
					value={authFields.clientCredentialsScope}
					onChange={(event) =>
						updateAuthField("clientCredentialsScope", event.target.value)
					}
				/>
				<Input
					containerClassName="md:col-span-2"
					placeholder="Resource"
					value={authFields.clientCredentialsResource}
					onChange={(event) =>
						updateAuthField("clientCredentialsResource", event.target.value)
					}
				/>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 items-end pb-1.5 text-xs text-grayscale-10">
			No auth headers will be attached.
		</div>
	);
}

const getAuthBody = (
	authMode: AuthMode,
	bearerToken: string,
	headersText: string,
	authFields: AuthFieldValues,
) => {
	if (authMode === "none") {
		return { type: "none" };
	}

	if (authMode === "oauth") {
		return {
			type: "oauth",
			issuer: optionalString(authFields.oauthIssuer),
			authorizationUrl: optionalString(authFields.oauthAuthorizationUrl),
			tokenUrl: optionalString(authFields.oauthTokenUrl),
			clientId: optionalString(authFields.oauthClientId),
			clientSecret: optionalString(authFields.oauthClientSecret),
			scope: optionalString(authFields.oauthScope),
			resource: optionalString(authFields.oauthResource),
		};
	}

	if (authMode === "client_credentials") {
		const tokenUrl = optionalString(authFields.clientCredentialsTokenUrl);
		const clientId = optionalString(authFields.clientCredentialsClientId);
		const clientSecret = optionalString(
			authFields.clientCredentialsClientSecret,
		);

		if (!tokenUrl || !clientId || !clientSecret) {
			return undefined;
		}

		return {
			type: "client_credentials",
			tokenUrl,
			clientId,
			clientSecret,
			scope: optionalString(authFields.clientCredentialsScope),
			resource: optionalString(authFields.clientCredentialsResource),
		};
	}

	if (authMode === "bearer") {
		const token = bearerToken.trim();
		return token.length > 0 ? { type: "bearer", token } : undefined;
	}

	const headers = headersText.split(/\r?\n/).flatMap((line) => {
		const separatorIndex = line.indexOf("=");

		if (separatorIndex <= 0) {
			return [];
		}

		const name = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1);

		if (!HTTP_HEADER_NAME_PATTERN.test(name) || value.length === 0) {
			return [];
		}

		return [{ name, value }];
	});

	return headers.length > 0 ? { type: "headers", headers } : undefined;
};

const getMcpAuthMode = (value: unknown): AuthMode => {
	if (!isRecord(value) || typeof value.type !== "string") {
		return "none";
	}

	if (
		value.type === "bearer" ||
		value.type === "headers" ||
		value.type === "oauth" ||
		value.type === "client_credentials"
	) {
		return value.type;
	}

	return "none";
};

const getInitialAuthFieldValues = (value: unknown): AuthFieldValues => {
	const auth = isRecord(value) ? value : {};

	return {
		oauthIssuer: getStringField(auth.issuer),
		oauthAuthorizationUrl: getStringField(auth.authorizationUrl),
		oauthTokenUrl: getStringField(auth.tokenUrl),
		oauthClientId: getStringField(auth.clientId),
		oauthClientSecret: "",
		oauthScope: getStringField(auth.scope),
		oauthResource: getStringField(auth.resource),
		clientCredentialsTokenUrl: getStringField(auth.tokenUrl),
		clientCredentialsClientId: getStringField(auth.clientId),
		clientCredentialsClientSecret: "",
		clientCredentialsScope: getStringField(auth.scope),
		clientCredentialsResource: getStringField(auth.resource),
	};
};

const getAuthLabel = (value: unknown) => {
	const mode = getMcpAuthMode(value);

	if (mode === "bearer") {
		return "Bearer token configured.";
	}

	if (mode === "headers") {
		return "HTTP headers configured.";
	}

	if (mode === "oauth") {
		return isRecord(value) && value.status === "connected"
			? "OAuth connected."
			: "OAuth not connected.";
	}

	if (mode === "client_credentials") {
		return isRecord(value) && value.status === "configured"
			? "Client credentials configured."
			: "Client credentials not configured.";
	}

	return "No auth configured.";
};

const optionalString = (value: string) => {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const getStringField = (value: unknown) =>
	typeof value === "string" ? value : "";

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
