"use client";

import { CopyIcon, KeyIcon, TrashIcon } from "@phosphor-icons/react";
import db from "@repo/db/client";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
	SettingsPageShell,
	SettingsSection,
} from "../_components/SettingsPageShell";

type ApiKey = {
	id: string;
	name: string;
	tokenPrefix: string;
	createdAt?: string;
	lastUsedAt?: string;
};

const formatDate = (value: string | undefined) => {
	if (!value) {
		return "unknown";
	}

	const date = DateTime.fromISO(value);

	return date.isValid ? date.toLocaleString(DateTime.DATETIME_MED) : "unknown";
};

export default function FactoryDeveloperAccessSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
	const [apiKeyName, setApiKeyName] = useState("");
	const [generatedApiKey, setGeneratedApiKey] = useState("");
	const [apiKeyStatus, setApiKeyStatus] = useState<string>();
	const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
	const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);

	const { data } = db.useQuery({
		factories: {
			$: {
				where: {
					id: currentFactoryId,
				},
			},
		},
	});

	const factory = data?.factories?.[0];

	useEffect(() => {
		if (!user?.refresh_token) {
			return;
		}

		let isActive = true;
		setIsLoadingApiKeys(true);

		fetch(`/api/factories/api-keys?factoryId=${currentFactoryId}`, {
			headers: {
				Authorization: `Bearer ${user.refresh_token}`,
			},
		})
			.then(async (response) => {
				if (!response.ok) {
					throw new Error("Failed to load API keys.");
				}

				return (await response.json()) as { apiKeys: ApiKey[] };
			})
			.then((result) => {
				if (isActive) {
					setApiKeys(result.apiKeys);
				}
			})
			.catch((error) => {
				if (isActive) {
					setApiKeyStatus(
						error instanceof Error ? error.message : "Failed to load API keys.",
					);
				}
			})
			.finally(() => {
				if (isActive) {
					setIsLoadingApiKeys(false);
				}
			});

		return () => {
			isActive = false;
		};
	}, [currentFactoryId, user?.refresh_token]);

	const createApiKey = async () => {
		setApiKeyStatus(undefined);
		setGeneratedApiKey("");

		if (!user?.refresh_token) {
			setApiKeyStatus("You must be signed in to create an API key.");
			return;
		}

		setIsCreatingApiKey(true);

		try {
			const response = await fetch("/api/factories/api-keys", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId: currentFactoryId,
					name: apiKeyName.trim() || undefined,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create API key.");
			}

			const result = (await response.json()) as {
				apiKey: ApiKey;
				token: string;
			};

			setApiKeys((currentApiKeys) => [result.apiKey, ...currentApiKeys]);
			setGeneratedApiKey(result.token);
			setApiKeyName("");
			setApiKeyStatus("API key created.");
		} catch (error) {
			setApiKeyStatus(
				error instanceof Error ? error.message : "Failed to create API key.",
			);
		} finally {
			setIsCreatingApiKey(false);
		}
	};

	const revokeApiKey = async (apiKeyId: string) => {
		setApiKeyStatus(undefined);

		if (!user?.refresh_token) {
			setApiKeyStatus("You must be signed in to revoke an API key.");
			return;
		}

		try {
			const response = await fetch("/api/factories/api-keys", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId: currentFactoryId,
					apiKeyId,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to revoke API key.");
			}

			setApiKeys((currentApiKeys) =>
				currentApiKeys.filter((apiKey) => apiKey.id !== apiKeyId),
			);
			setApiKeyStatus("API key revoked.");
		} catch (error) {
			setApiKeyStatus(
				error instanceof Error ? error.message : "Failed to revoke API key.",
			);
		}
	};

	return (
		<SettingsPageShell
			eyebrow="Factory Settings"
			title={factory?.name ?? "Factory"}
			description="Factory-scoped API keys for programmatic task creation."
		>
			<SettingsSection title="Developer Access" Icon={KeyIcon}>
				<div className="flex flex-col gap-3 p-3">
					<div className="flex flex-col gap-1">
						<p className="text-xs text-grayscale-11">
							Create factory-scoped API keys for programmatic task creation.
						</p>
						<p className="text-xs text-grayscale-10">
							The full key is only shown once when it is created.
						</p>
					</div>

					<div className="grid gap-3 md:grid-cols-[1fr_auto]">
						<Input
							type="text"
							placeholder="API key name"
							value={apiKeyName}
							onChange={(event) => setApiKeyName(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									void createApiKey();
								}
							}}
						/>
						<Button
							type="button"
							disabled={isCreatingApiKey}
							onClick={() => {
								void createApiKey();
							}}
						>
							{isCreatingApiKey ? "Creating..." : "Create API Key"}
						</Button>
					</div>

					{generatedApiKey ? (
						<div className="flex flex-col gap-2 border border-grayscale-4 bg-white p-2">
							<p className="text-xs text-grayscale-11">
								Copy this key now. It will not be shown again.
							</p>
							<div className="grid gap-2 md:grid-cols-[1fr_auto]">
								<Input readOnly value={generatedApiKey} />
								<button
									type="button"
									onClick={() => {
										void navigator.clipboard.writeText(generatedApiKey);
										setApiKeyStatus("API key copied.");
									}}
									className="flex items-center justify-center gap-1.5 bg-grayscale-12 px-2 py-1.5 text-xs text-grayscale-2 transition-colors hover:bg-black"
								>
									<CopyIcon weight="bold" className="size-3.5" />
									Copy
								</button>
							</div>
						</div>
					) : null}

					<div className="flex flex-col divide-y divide-grayscale-4 border border-grayscale-4">
						{isLoadingApiKeys ? (
							<p className="p-3 text-sm text-grayscale-10">
								Loading API keys...
							</p>
						) : apiKeys.length > 0 ? (
							apiKeys.map((apiKey) => (
								<div
									key={apiKey.id}
									className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto]"
								>
									<div className="min-w-0">
										<p className="truncate text-sm text-grayscale-12">
											{apiKey.name}
										</p>
										<p className="font-mono text-xs text-grayscale-10">
											{apiKey.tokenPrefix}...
										</p>
										<p className="text-xs text-grayscale-10">
											Created {formatDate(apiKey.createdAt)}
											{apiKey.lastUsedAt
												? ` - Last used ${formatDate(apiKey.lastUsedAt)}`
												: ""}
										</p>
									</div>
									<div className="flex items-center justify-end">
										<button
											type="button"
											onClick={() => {
												void revokeApiKey(apiKey.id);
											}}
											className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
										>
											<TrashIcon weight="bold" className="size-3.5" />
											Revoke
										</button>
									</div>
								</div>
							))
						) : (
							<p className="p-3 text-sm text-grayscale-10">
								No API keys created.
							</p>
						)}
					</div>

					<div className="border border-grayscale-4 bg-white p-2">
						<pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-grayscale-11">
							{`curl -X POST https://api.factoryplane.com/tasks \\
  -H "Authorization: Bearer $FACTORYPLANE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Fix checkout bug","instructions":"Reproduce and fix the checkout failure."}'`}
						</pre>
					</div>

					{apiKeyStatus ? (
						<p className="text-xs text-grayscale-10">{apiKeyStatus}</p>
					) : null}
				</div>
			</SettingsSection>
		</SettingsPageShell>
	);
}
