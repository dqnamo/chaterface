"use client";

import { id } from "@instantdb/react";
import {
	GitBranchIcon,
	GithubLogoIcon,
	PlusIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
	getRepositorySecrets,
	optionalRepositoryPath,
	optionalString,
	type Repository,
	repositoryTx,
	SECRET_NAME_PATTERN,
} from "../_lib/workspace-settings";

type GithubRepository = {
	fullName: string;
	cloneUrl: string;
	defaultBranch: string;
	private: boolean;
	htmlUrl: string;
};

export default function WorkspaceRepositoriesSettingsPage() {
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;
	const { user } = db.useAuth();
	const [githubRepositories, setGithubRepositories] = useState<
		GithubRepository[]
	>([]);
	const [selectedGithubRepository, setSelectedGithubRepository] = useState("");
	const [githubRepositoryStatus, setGithubRepositoryStatus] =
		useState<string>();
	const [isLoadingGithubRepositories, setIsLoadingGithubRepositories] =
		useState(false);
	const [isConnectingGithub, setIsConnectingGithub] = useState(false);
	const [shouldLoadGithubRepositories, setShouldLoadGithubRepositories] =
		useState(false);

	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			repositories: {},
		},
	});

	const workspace = data?.workspaces?.[0];
	const currentWorkspaceId = workspace?.id;
	const hasGithubConnection = Boolean(workspace?.githubAppInstallationId);
	const repositories = [...(workspace?.repositories ?? [])].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

	const createRepository = async (form: HTMLFormElement) => {
		if (!currentWorkspaceId) {
			return;
		}

		const formData = new FormData(form);
		const url = getFormString(formData, "url");
		const path = getFormString(formData, "path");
		const branch = getFormString(formData, "branch");

		if (!url) {
			return;
		}

		const repositoryId = id();
		await db.transact(
			repositoryTx(repositoryId)
				.create({
					url,
					path: optionalRepositoryPath(path),
					branch: optionalString(branch),
					createdAt: DateTime.now().toISO(),
				})
				.link({ workspace: currentWorkspaceId }),
		);

		form.reset();
	};

	const connectGithub = async () => {
		setGithubRepositoryStatus(undefined);

		if (!user?.refresh_token || !currentWorkspaceId) {
			setGithubRepositoryStatus("You must be signed in to connect GitHub.");
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
					workspaceId: currentWorkspaceId,
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
			setGithubRepositoryStatus(
				error instanceof Error ? error.message : "Failed to connect GitHub.",
			);
			setIsConnectingGithub(false);
		}
	};

	const loadGithubRepositories = useCallback(async () => {
		setGithubRepositoryStatus(undefined);

		if (!user?.refresh_token || !currentWorkspaceId) {
			setGithubRepositoryStatus("You must be signed in to load repositories.");
			return;
		}

		setIsLoadingGithubRepositories(true);

		try {
			const response = await fetch(
				`/api/github/repositories?workspaceId=${encodeURIComponent(currentWorkspaceId)}`,
				{
					headers: {
						Authorization: `Bearer ${user.refresh_token}`,
					},
				},
			);
			const result = (await response.json().catch(() => null)) as {
				repositories?: GithubRepository[];
				message?: string;
			} | null;

			if (!response.ok || !result?.repositories) {
				throw new Error(
					result?.message ?? "Failed to load GitHub repositories.",
				);
			}

			setGithubRepositories(result.repositories);
			setSelectedGithubRepository(result.repositories[0]?.fullName ?? "");
			setGithubRepositoryStatus(
				result.repositories.length > 0
					? undefined
					: "No GitHub repositories were returned.",
			);
		} catch (error) {
			setGithubRepositoryStatus(
				error instanceof Error
					? error.message
					: "Failed to load GitHub repositories.",
			);
		} finally {
			setIsLoadingGithubRepositories(false);
		}
	}, [currentWorkspaceId, user?.refresh_token]);

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const githubResult = searchParams.get("github");
		const githubError = searchParams.get("github_error");

		if (githubResult === "connected") {
			setGithubRepositoryStatus("GitHub connected.");
			setShouldLoadGithubRepositories(true);
		} else if (githubError) {
			setGithubRepositoryStatus(`GitHub connection failed: ${githubError}`);
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

	useEffect(() => {
		if (
			!shouldLoadGithubRepositories ||
			!hasGithubConnection ||
			!user?.refresh_token
		) {
			return;
		}

		setShouldLoadGithubRepositories(false);
		void loadGithubRepositories();
	}, [
		hasGithubConnection,
		loadGithubRepositories,
		shouldLoadGithubRepositories,
		user?.refresh_token,
	]);

	const addSelectedGithubRepository = async () => {
		if (!currentWorkspaceId) {
			return;
		}

		const repository = githubRepositories.find(
			(candidate) => candidate.fullName === selectedGithubRepository,
		);

		if (!repository) {
			setGithubRepositoryStatus("Choose a GitHub repository first.");
			return;
		}

		const repositoryId = id();
		await db.transact(
			repositoryTx(repositoryId)
				.create({
					url: repository.cloneUrl,
					path: optionalRepositoryPath(
						repository.fullName.split("/").at(-1) ?? "",
					),
					branch: optionalString(repository.defaultBranch),
					createdAt: DateTime.now().toISO(),
				})
				.link({ workspace: currentWorkspaceId }),
		);
		setGithubRepositoryStatus(`${repository.fullName} added.`);
	};

	const updateRepository = async (
		repository: Repository,
		form: HTMLFormElement,
	) => {
		const formData = new FormData(form);
		const url = getFormString(formData, "url");
		const path = getFormString(formData, "path");
		const branch = getFormString(formData, "branch");

		if (!url) {
			return;
		}

		await db.transact(
			repositoryTx(repository.id).update({
				url,
				path: optionalRepositoryPath(path),
				branch: optionalString(branch),
			}),
		);
	};

	const deleteRepository = async (repository: Repository) => {
		await db.transact(repositoryTx(repository.id).delete());
	};

	const addRepositorySecret = async (
		repository: Repository,
		name: string,
		value: string,
	) => {
		if (!user?.refresh_token) {
			throw new Error("You must be signed in to save repository secrets.");
		}

		const response = await fetch(`/api/repositories/${repository.id}/secrets`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${user.refresh_token}`,
			},
			body: JSON.stringify({
				name,
				value,
			}),
		});

		if (!response.ok) {
			throw new Error(await getApiErrorMessage(response));
		}
	};

	const deleteRepositorySecret = async (
		repository: Repository,
		secretId: string,
	) => {
		if (!user?.refresh_token) {
			throw new Error("You must be signed in to delete repository secrets.");
		}

		const response = await fetch(`/api/repositories/${repository.id}/secrets`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${user.refresh_token}`,
			},
			body: JSON.stringify({
				secretId,
			}),
		});

		if (!response.ok) {
			throw new Error(await getApiErrorMessage(response));
		}
	};

	return (
		<SettingsPageShell
			eyebrow="Agent Environment"
			title="Repositories"
			description="Repositories cloned into the sandbox before each new task starts."
		>
			<SettingsSection title="Repositories" Icon={GitBranchIcon}>
				<div className="flex flex-col gap-3 border-b border-grayscale-4 p-3">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="flex min-w-0 items-center gap-2">
							<GithubLogoIcon
								weight="bold"
								className="size-4 shrink-0 text-grayscale-10"
							/>
							<div className="flex min-w-0 flex-col gap-1">
								<p className="text-xs text-grayscale-11">
									{hasGithubConnection
										? "Add from connected GitHub account."
										: "GitHub is not connected."}
								</p>
								<p className="text-xs text-grayscale-10">
									Manual clone URLs are still supported below.
								</p>
							</div>
						</div>
						{hasGithubConnection ? (
							<div className="flex shrink-0 items-center gap-2">
								<button
									type="button"
									disabled={isConnectingGithub}
									onClick={() => {
										void connectGithub();
									}}
									className="px-2 py-1.5 text-xs text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 disabled:opacity-60"
								>
									{isConnectingGithub ? "Opening..." : "Manage GitHub Access"}
								</button>
								<Button
									type="button"
									disabled={isLoadingGithubRepositories}
									onClick={() => {
										void loadGithubRepositories();
									}}
								>
									{isLoadingGithubRepositories
										? "Loading..."
										: "Load GitHub Repos"}
								</Button>
							</div>
						) : (
							<Button
								type="button"
								disabled={isConnectingGithub}
								onClick={() => {
									void connectGithub();
								}}
							>
								{isConnectingGithub ? "Connecting..." : "Connect GitHub"}
							</Button>
						)}
					</div>
					{githubRepositories.length > 0 ? (
						<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
							<select
								value={selectedGithubRepository}
								onChange={(event) =>
									setSelectedGithubRepository(event.target.value)
								}
								className="w-full border border-grayscale-4 bg-grayscale-2 px-2 py-1.5 text-xs text-grayscale-12 outline-none transition-colors duration-150 focus:bg-grayscale-3"
							>
								{githubRepositories.map((repository) => (
									<option key={repository.fullName} value={repository.fullName}>
										{repository.fullName}
										{repository.private ? " (private)" : ""}
									</option>
								))}
							</select>
							<Button
								type="button"
								onClick={() => {
									void addSelectedGithubRepository();
								}}
							>
								Add Selected
							</Button>
						</div>
					) : null}
					{githubRepositoryStatus ? (
						<p className="text-xs text-grayscale-10">
							{githubRepositoryStatus}
						</p>
					) : null}
				</div>
				<div className="flex flex-col divide-y divide-grayscale-4">
					{repositories.length > 0 ? (
						repositories.map((repository) => (
							<RepositoryForm
								key={repository.id}
								repository={repository}
								onSave={updateRepository}
								onDelete={deleteRepository}
								onAddSecret={addRepositorySecret}
								onDeleteSecret={deleteRepositorySecret}
							/>
						))
					) : (
						<p className="p-3 text-sm text-grayscale-10">
							No repositories configured.
						</p>
					)}
				</div>

				<form
					className="flex flex-col gap-3 border-t border-grayscale-4 p-3"
					onSubmit={(event) => {
						event.preventDefault();
						void createRepository(event.currentTarget);
					}}
				>
					<div className="flex items-center gap-2 text-xs font-medium text-grayscale-11">
						<PlusIcon weight="bold" className="size-3.5" />
						Add Repository
					</div>
					<div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
						<Field
							label="URL"
							name="url"
							placeholder="git@github.com:org/repo.git"
						/>
						<Field label="Path" name="path" placeholder="repo" />
						<Field label="Branch" name="branch" placeholder="main" />
					</div>
					<div className="flex justify-end">
						<Button type="submit">Add Repository</Button>
					</div>
				</form>
			</SettingsSection>
		</SettingsPageShell>
	);
}

function RepositoryForm({
	repository,
	onSave,
	onDelete,
	onAddSecret,
	onDeleteSecret,
}: {
	repository: Repository;
	onSave: (repository: Repository, form: HTMLFormElement) => Promise<void>;
	onDelete: (repository: Repository) => Promise<void>;
	onAddSecret: (
		repository: Repository,
		name: string,
		value: string,
	) => Promise<void>;
	onDeleteSecret: (repository: Repository, secretId: string) => Promise<void>;
}) {
	const [secretName, setSecretName] = useState("");
	const [secretValue, setSecretValue] = useState("");
	const [secretStatus, setSecretStatus] = useState<string>();
	const [isSavingSecret, setIsSavingSecret] = useState(false);
	const secrets = getRepositorySecrets(repository.secrets);

	const addSecret = async () => {
		const name = secretName.trim();

		setSecretStatus(undefined);

		if (!SECRET_NAME_PATTERN.test(name)) {
			setSecretStatus("Use an environment variable name like API_KEY.");
			return;
		}

		setIsSavingSecret(true);

		try {
			await onAddSecret(repository, name, secretValue);
			setSecretName("");
			setSecretValue("");
			setSecretStatus("Secret saved.");
		} catch (error) {
			setSecretStatus(
				error instanceof Error ? error.message : "Failed to save secret.",
			);
		} finally {
			setIsSavingSecret(false);
		}
	};

	const deleteSecret = async (secretId: string) => {
		setSecretStatus(undefined);

		try {
			await onDeleteSecret(repository, secretId);
			setSecretStatus("Secret deleted.");
		} catch (error) {
			setSecretStatus(
				error instanceof Error ? error.message : "Failed to delete secret.",
			);
		}
	};

	return (
		<form
			className="flex flex-col gap-3 p-3"
			onSubmit={(event) => {
				event.preventDefault();
				void onSave(repository, event.currentTarget);
			}}
		>
			<div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
				<Field
					label="URL"
					name="url"
					placeholder="git@github.com:org/repo.git"
					defaultValue={repository.url}
				/>
				<Field
					label="Path"
					name="path"
					placeholder="repo"
					defaultValue={optionalRepositoryPath(repository.path ?? "") ?? ""}
				/>
				<Field
					label="Branch"
					name="branch"
					placeholder="main"
					defaultValue={repository.branch ?? ""}
				/>
			</div>
			<div className="flex flex-col gap-2 border-t border-grayscale-4 pt-3">
				<div className="flex items-center justify-between gap-3">
					<p className="text-xs font-medium text-grayscale-11">
						Repository Secrets
					</p>
					<p className="text-xs text-grayscale-10">
						Written to .env when a task starts.
					</p>
				</div>
				{secrets.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{secrets.map((secret) => (
							<div
								key={secret.id}
								className="flex items-center gap-1.5 border border-grayscale-4 bg-grayscale-2 px-2 py-1 text-xs text-grayscale-11"
							>
								<span className="font-mono">{secret.name}</span>
								<button
									type="button"
									onClick={() => {
										void deleteSecret(secret.id);
									}}
									className="text-grayscale-10 transition-colors hover:text-red-11"
									aria-label={`Delete ${secret.name}`}
								>
									<TrashIcon weight="bold" className="size-3" />
								</button>
							</div>
						))}
					</div>
				) : (
					<p className="text-xs text-grayscale-10">
						No repository secrets configured.
					</p>
				)}
				<div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
					<Field
						label="Name"
						name="secretName"
						placeholder="API_KEY"
						value={secretName}
						onChange={(event) => setSecretName(event.target.value)}
					/>
					<Field
						label="Value"
						name="secretValue"
						placeholder="Secret value"
						type="password"
						value={secretValue}
						onChange={(event) => setSecretValue(event.target.value)}
					/>
					<div className="flex items-end">
						<Button
							type="button"
							disabled={isSavingSecret}
							onClick={() => {
								void addSecret();
							}}
							className="w-full"
						>
							{isSavingSecret ? "Saving..." : "Add Secret"}
						</Button>
					</div>
				</div>
				{secretStatus ? (
					<p className="text-xs text-grayscale-10">{secretStatus}</p>
				) : null}
			</div>
			<div className="flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={() => {
						void onDelete(repository);
					}}
					className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
				>
					<TrashIcon weight="bold" className="size-3.5" />
					Delete
				</button>
				<Button type="submit">Save</Button>
			</div>
		</form>
	);
}
