"use client";

import { SlackLogoIcon, TrashIcon } from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import db from "@/instant.client";
import {
	SettingsPageShell,
	SettingsSection,
} from "../_components/SettingsPageShell";
import {
	getApiErrorMessage,
	type IntegrationConnection,
	integrationConnectionTx,
} from "../_lib/factory-settings";

export default function FactoryIntegrationsSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const [status, setStatus] = useState<string>();
	const [isConnectingSlack, setIsConnectingSlack] = useState(false);

	const { data } = db.useQuery({
		factories: {
			$: {
				where: {
					id: currentFactoryId,
				},
			},
			organisation: {
				integrationConnections: {},
			},
		},
	});

	const factory = data?.factories?.[0];
	const slackConnections = (factory?.organisation?.integrationConnections ?? [])
		.filter((connection) => connection.provider === "slack")
		.sort(
			(a, b) =>
				new Date(a.createdAt ?? 0).getTime() -
				new Date(b.createdAt ?? 0).getTime(),
		) as IntegrationConnection[];

	const connectSlack = async () => {
		setStatus(undefined);

		if (!user?.refresh_token) {
			setStatus("You must be signed in to connect Slack.");
			return;
		}

		setIsConnectingSlack(true);

		try {
			const response = await fetch("/api/integrations/slack/oauth/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId: currentFactoryId,
				}),
			});

			if (!response.ok) {
				throw new Error(await getApiErrorMessage(response));
			}

			const body = (await response.json()) as { authorizationUrl?: unknown };

			if (typeof body.authorizationUrl !== "string") {
				throw new Error("Slack connect response did not include a URL.");
			}

			window.location.href = body.authorizationUrl;
		} catch (error) {
			setStatus(
				error instanceof Error ? error.message : "Failed to connect Slack.",
			);
			setIsConnectingSlack(false);
		}
	};

	const deleteConnection = async (connection: IntegrationConnection) => {
		await db.transact(integrationConnectionTx(connection.id).delete());
	};

	return (
		<SettingsPageShell
			eyebrow="Factory Settings"
			title="Integrations"
			description="Connect external tools that unlock floor trigger and action blocks."
		>
			<SettingsSection title="Slack" Icon={SlackLogoIcon}>
				<div className="flex flex-col divide-y divide-grayscale-4">
					{slackConnections.length > 0 ? (
						slackConnections.map((connection) => (
							<SlackConnectionRow
								key={connection.id}
								connection={connection}
								onDelete={deleteConnection}
							/>
						))
					) : (
						<p className="p-3 text-sm text-grayscale-10">
							No Slack workspaces connected.
						</p>
					)}
				</div>
				<div className="flex items-center justify-between gap-3 border-t border-grayscale-4 p-3">
					<div className="min-w-0">
						<p className="text-sm text-grayscale-12">
							Slack message blocks become available after connection.
						</p>
						<p className="text-xs text-grayscale-10">
							Requires Slack OAuth credentials and a configured Events API URL.
						</p>
					</div>
					<Button
						type="button"
						disabled={isConnectingSlack}
						onClick={() => void connectSlack()}
					>
						<SlackLogoIcon weight="bold" className="size-4" />
						{isConnectingSlack ? "Connecting" : "Connect Slack"}
					</Button>
				</div>
				{status ? (
					<p className="border-t border-grayscale-4 p-3 text-xs text-red-11">
						{status}
					</p>
				) : null}
			</SettingsSection>
		</SettingsPageShell>
	);
}

function SlackConnectionRow({
	connection,
	onDelete,
}: {
	connection: IntegrationConnection;
	onDelete: (connection: IntegrationConnection) => Promise<void>;
}) {
	const status = connection.status ?? "unknown";
	const connectedAt = connection.updatedAt
		? DateTime.fromISO(String(connection.updatedAt)).toLocaleString(
				DateTime.DATETIME_MED,
			)
		: undefined;

	return (
		<div className="flex items-center justify-between gap-3 p-3">
			<div className="min-w-0">
				<div className="flex items-center gap-2">
					<p className="truncate text-sm font-medium text-grayscale-12">
						{connection.externalName || connection.name || "Slack"}
					</p>
					<span className="rounded border border-grayscale-5 bg-grayscale-2 px-1.5 py-0.5 font-mono text-[10px] text-grayscale-10 uppercase">
						{status}
					</span>
				</div>
				<p className="mt-1 text-xs text-grayscale-10">
					{connectedAt ? `Updated ${connectedAt}` : "Pending connection"}
				</p>
			</div>
			<Button
				type="button"
				variant="secondary"
				onClick={() => void onDelete(connection)}
			>
				<TrashIcon weight="bold" className="size-4" />
				Remove
			</Button>
		</div>
	);
}
