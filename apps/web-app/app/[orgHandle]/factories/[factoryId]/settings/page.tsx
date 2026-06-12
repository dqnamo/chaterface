"use client";

import { KeyIcon } from "@phosphor-icons/react";
import db from "@repo/db/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
	SettingsPageShell,
	SettingsSection,
} from "./_components/SettingsPageShell";

export default function FactoryGithubSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const [githubAccessToken, setGithubAccessToken] = useState("");
	const [gitAuthorName, setGitAuthorName] = useState("");
	const [gitAuthorEmail, setGitAuthorEmail] = useState("");
	const [githubTokenStatus, setGithubTokenStatus] = useState<string>();
	const [isSavingGithubToken, setIsSavingGithubToken] = useState(false);

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

	const saveGithubSettings = async () => {
		setGithubTokenStatus(undefined);

		if (!user?.refresh_token) {
			setGithubTokenStatus("You must be signed in to save GitHub settings.");
			return;
		}

		setIsSavingGithubToken(true);

		try {
			const response = await fetch("/api/factories/saveGithub", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId: currentFactoryId,
					githubAccessToken: githubAccessToken.trim(),
					gitAuthorName: gitAuthorName.trim(),
					gitAuthorEmail: gitAuthorEmail.trim(),
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save GitHub settings.");
			}

			setGithubAccessToken("");
			setGithubTokenStatus("GitHub settings saved.");
		} catch (error) {
			setGithubTokenStatus(
				error instanceof Error
					? error.message
					: "Failed to save GitHub settings.",
			);
		} finally {
			setIsSavingGithubToken(false);
		}
	};

	return (
		<SettingsPageShell
			eyebrow="Factory Settings"
			title={factory?.name ?? "Factory"}
			description="Private repository access and git commit identity for new sandboxes."
		>
			<SettingsSection title="GitHub Access" Icon={KeyIcon}>
				<div className="flex flex-col gap-3 p-3">
					<div className="flex flex-col gap-1">
						<p className="text-xs text-grayscale-11">
							{factory?.githubAccessTokenEncrypted
								? "A GitHub token is saved for this factory."
								: "No GitHub token is saved for this factory."}
						</p>
						<p className="text-xs text-grayscale-10">
							Private repositories need a token with access to the repo. Commit
							identity is written to each new sandbox.
						</p>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<Input
							type="password"
							placeholder="GitHub access token"
							value={githubAccessToken}
							onChange={(event) => setGithubAccessToken(event.target.value)}
						/>
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
							disabled={isSavingGithubToken}
							onClick={() => {
								void saveGithubSettings();
							}}
						>
							{isSavingGithubToken ? "Saving..." : "Save Settings"}
						</Button>
					</div>
					{githubTokenStatus ? (
						<p className="text-xs text-grayscale-10">{githubTokenStatus}</p>
					) : null}
				</div>
			</SettingsSection>
		</SettingsPageShell>
	);
}
