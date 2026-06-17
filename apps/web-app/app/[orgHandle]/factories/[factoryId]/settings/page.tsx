"use client";

import { GithubLogoIcon, KeyIcon } from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import db from "@/instant.client";
import {
	SettingsPageShell,
	SettingsSection,
} from "./_components/SettingsPageShell";

export default function FactoryGithubSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const [gitAuthorName, setGitAuthorName] = useState("");
	const [gitAuthorEmail, setGitAuthorEmail] = useState("");
	const [githubStatus, setGithubStatus] = useState<string>();
	const [isSavingGitSettings, setIsSavingGitSettings] = useState(false);
	const [isConnectingGithub, setIsConnectingGithub] = useState(false);
	const [isDisconnectingGithub, setIsDisconnectingGithub] = useState(false);

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
		setGitAuthorName(factory?.gitAuthorName ?? "");
		setGitAuthorEmail(factory?.gitAuthorEmail ?? "");
	}, [factory?.gitAuthorName, factory?.gitAuthorEmail]);

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const githubResult = searchParams.get("github");
		const githubError = searchParams.get("github_error");

		if (githubResult === "connected") {
			setGithubStatus("GitHub connected.");
		} else if (githubError) {
			setGithubStatus(`GitHub connection failed: ${githubError}`);
		}

		if (githubResult || githubError) {
			searchParams.delete("github");
			searchParams.delete("github_error");
			const nextSearch = searchParams.toString();
			window.history.replaceState(
				null,
				"",
				`${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
			);
		}
	}, []);

	const connectGithub = async () => {
		setGithubStatus(undefined);

		if (!user?.refresh_token) {
			setGithubStatus("You must be signed in to connect GitHub.");
			return;
		}

		setIsConnectingGithub(true);

		try {
			const response = await fetch("/api/github/app/install/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId: currentFactoryId,
					redirectPath: window.location.pathname,
				}),
			});

			const result = (await response.json().catch(() => null)) as {
				installationUrl?: string;
				message?: string;
			} | null;

			if (!response.ok || !result?.installationUrl) {
				throw new Error(result?.message ?? "Failed to start GitHub install.");
			}

			window.location.assign(result.installationUrl);
		} catch (error) {
			setGithubStatus(
				error instanceof Error ? error.message : "Failed to connect GitHub.",
			);
			setIsConnectingGithub(false);
		}
	};

	const disconnectGithub = async () => {
		setGithubStatus(undefined);

		if (!user?.refresh_token) {
			setGithubStatus("You must be signed in to disconnect GitHub.");
			return;
		}

		setIsDisconnectingGithub(true);

		try {
			const response = await fetch("/api/github/app/install/disconnect", {
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
				throw new Error("Failed to disconnect GitHub.");
			}

			setGithubStatus("GitHub disconnected.");
		} catch (error) {
			setGithubStatus(
				error instanceof Error ? error.message : "Failed to disconnect GitHub.",
			);
		} finally {
			setIsDisconnectingGithub(false);
		}
	};

	const saveGitSettings = async () => {
		setGithubStatus(undefined);

		if (!user?.refresh_token) {
			setGithubStatus("You must be signed in to save Git settings.");
			return;
		}

		setIsSavingGitSettings(true);

		try {
			const response = await fetch("/api/factories/saveGithub", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId: currentFactoryId,
					gitAuthorName: gitAuthorName.trim(),
					gitAuthorEmail: gitAuthorEmail.trim(),
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save Git settings.");
			}

			setGithubStatus("Git settings saved.");
		} catch (error) {
			setGithubStatus(
				error instanceof Error ? error.message : "Failed to save Git settings.",
			);
		} finally {
			setIsSavingGitSettings(false);
		}
	};

	return (
		<SettingsPageShell
			eyebrow="Agent Environment"
			title={factory?.name ?? "Factory"}
			description="Private repository access and git commit identity for new sandboxes."
		>
			<SettingsSection title="GitHub Access" Icon={KeyIcon}>
				<div className="flex flex-col gap-3 p-3">
					<div className="flex flex-col gap-3 border-b border-grayscale-4 pb-3 md:flex-row md:items-center md:justify-between">
						<div className="flex min-w-0 items-center gap-2">
							<GithubLogoIcon
								weight="bold"
								className="size-4 shrink-0 text-grayscale-10"
							/>
							<div className="flex min-w-0 flex-col gap-1">
								<p className="text-xs text-grayscale-11">
									{factory?.githubAppInstallationId
										? `Connected${factory.githubAppInstallationAccountLogin ? ` to ${factory.githubAppInstallationAccountLogin}` : ""}.`
										: "GitHub is not connected."}
								</p>
								<p className="text-xs text-grayscale-10">
									Private repository clones use the connected GitHub App.
								</p>
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							{factory?.githubAppInstallationId ? (
								<button
									type="button"
									disabled={isDisconnectingGithub}
									onClick={() => {
										void disconnectGithub();
									}}
									className="px-2 py-1.5 text-xs text-red-11 transition-colors hover:bg-red-3 hover:text-red-12 disabled:opacity-60"
								>
									{isDisconnectingGithub ? "Disconnecting..." : "Disconnect"}
								</button>
							) : null}
							<Button
								type="button"
								disabled={isConnectingGithub}
								onClick={() => {
									void connectGithub();
								}}
							>
								{factory?.githubAppInstallationId
									? isConnectingGithub
										? "Reconnecting..."
										: "Reconnect GitHub"
									: isConnectingGithub
										? "Connecting..."
										: "Connect GitHub"}
							</Button>
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<Input
							type="text"
							placeholder="Git author name"
							value={gitAuthorName}
							onChange={(event) => setGitAuthorName(event.target.value)}
						/>
						<Input
							type="email"
							placeholder="Git author email"
							value={gitAuthorEmail}
							onChange={(event) => setGitAuthorEmail(event.target.value)}
						/>
						<Button
							type="button"
							disabled={isSavingGitSettings}
							onClick={() => {
								void saveGitSettings();
							}}
						>
							{isSavingGitSettings ? "Saving..." : "Save Git Settings"}
						</Button>
					</div>
					{githubStatus ? (
						<p className="text-xs text-grayscale-10">{githubStatus}</p>
					) : null}
				</div>
			</SettingsSection>
		</SettingsPageShell>
	);
}
