"use client";

import { type InstaQLEntity, id } from "@instantdb/react";
import {
	FileTextIcon,
	GitBranchIcon,
	KeyIcon,
	PackageIcon,
	PlusIcon,
	TerminalWindowIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { type ChangeEventHandler, useEffect, useId, useState } from "react";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import { Input, Textarea } from "@/components/Input";
import { ExpandSidebarButton } from "@/components/SidebarContext";

type Repository = InstaQLEntity<AppSchema, "repositories">;
type EnvironmentFile = InstaQLEntity<AppSchema, "environmentFiles">;
type RepositorySecret = {
	id: string;
	name: string;
	valueEncrypted: string;
	createdAt?: string;
};

const SECRET_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const repositoryTx = (repositoryId: string) => {
	const tx = db.tx.repositories[repositoryId];

	if (!tx) {
		throw new Error(`Repository transaction builder ${repositoryId} not found`);
	}

	return tx;
};

const environmentFileTx = (fileId: string) => {
	const tx = db.tx.environmentFiles[fileId];

	if (!tx) {
		throw new Error(`Environment file transaction builder ${fileId} not found`);
	}

	return tx;
};

const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
	}

	return tx;
};

const getFormString = (formData: FormData, key: string) => {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
};

const optionalString = (value: string) =>
	value.length > 0 ? value : undefined;

const APT_PACKAGE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9+._:-]*$/;

const parsePackageText = (value: string) => {
	const seen = new Set<string>();
	const packages: string[] = [];

	for (const line of value.split(/\r?\n|,/)) {
		const packageName = line.trim();

		if (!packageName) {
			continue;
		}

		if (!APT_PACKAGE_NAME_PATTERN.test(packageName)) {
			return undefined;
		}

		if (seen.has(packageName)) {
			continue;
		}

		seen.add(packageName);
		packages.push(packageName);
	}

	return packages;
};

const parseEnvironmentPackages = (value: unknown) => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter(
			(packageName): packageName is string => typeof packageName === "string",
		)
		.filter((packageName) => APT_PACKAGE_NAME_PATTERN.test(packageName));
};

const optionalRepositoryPath = (value: string) => {
	const segments = value
		.trim()
		.replaceAll("\\", "/")
		.split("/")
		.filter(
			(segment) => segment.length > 0 && segment !== "." && segment !== "..",
		);

	return segments.length > 0 ? segments.join("/") : undefined;
};

const getEnvironmentFilePath = (value: string) => {
	const normalized = value.trim().replaceAll("\\", "/");

	if (!normalized || normalized.startsWith("/")) {
		return undefined;
	}

	const segments = normalized.split("/");

	if (
		segments.some(
			(segment) => segment.length === 0 || segment === "." || segment === "..",
		)
	) {
		return undefined;
	}

	return segments.join("/");
};

const getRepositorySecrets = (value: unknown): RepositorySecret[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isRepositorySecret);
};

const isRepositorySecret = (value: unknown): value is RepositorySecret => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}

	return (
		"id" in value &&
		"name" in value &&
		"valueEncrypted" in value &&
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.valueEncrypted === "string"
	);
};

const getApiErrorMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: unknown };

		if (typeof body.message === "string") {
			return body.message;
		}
	} catch {
		return "Request failed";
	}

	return "Request failed";
};

export default function FactorySettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const [githubAccessToken, setGithubAccessToken] = useState("");
	const [githubTokenStatus, setGithubTokenStatus] = useState<string>();
	const [isSavingGithubToken, setIsSavingGithubToken] = useState(false);
	const [newTaskSetupScript, setNewTaskSetupScript] = useState("");
	const [newTurnSetupScript, setNewTurnSetupScript] = useState("");
	const [setupScriptStatus, setSetupScriptStatus] = useState<string>();
	const [isSavingSetupScripts, setIsSavingSetupScripts] = useState(false);
	const [environmentPackages, setEnvironmentPackages] = useState("");
	const [packageStatus, setPackageStatus] = useState<string>();
	const [isSavingPackages, setIsSavingPackages] = useState(false);

	const { data } = db.useQuery({
		factories: {
			$: {
				where: {
					id: currentFactoryId,
				},
			},
			repositories: {},
			environmentFiles: {},
		},
	});

	const factory = data?.factories?.[0];
	const repositories = [...(factory?.repositories ?? [])].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);
	const environmentFiles = [...(factory?.environmentFiles ?? [])].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

	useEffect(() => {
		setNewTaskSetupScript(factory?.newTaskSetupScript ?? "");
		setNewTurnSetupScript(factory?.newTurnSetupScript ?? "");
	}, [factory?.newTaskSetupScript, factory?.newTurnSetupScript]);

	useEffect(() => {
		setEnvironmentPackages(
			parseEnvironmentPackages(factory?.environmentPackages).join("\n"),
		);
	}, [factory?.environmentPackages]);

	const createRepository = async (form: HTMLFormElement) => {
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
				.link({ factory: currentFactoryId }),
		);

		form.reset();
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

	const createEnvironmentFile = async (form: HTMLFormElement) => {
		const formData = new FormData(form);
		const path = getEnvironmentFilePath(getFormString(formData, "path"));
		const content = formData.get("content");

		if (!path || typeof content !== "string") {
			return;
		}

		const fileId = id();
		await db.transact(
			environmentFileTx(fileId)
				.create({
					path,
					content,
					createdAt: DateTime.now().toISO(),
				})
				.link({ factory: currentFactoryId }),
		);

		form.reset();
	};

	const updateEnvironmentFile = async (
		file: EnvironmentFile,
		form: HTMLFormElement,
	) => {
		const formData = new FormData(form);
		const path = getEnvironmentFilePath(getFormString(formData, "path"));
		const content = formData.get("content");

		if (!path || typeof content !== "string") {
			return;
		}

		await db.transact(
			environmentFileTx(file.id).update({
				path,
				content,
			}),
		);
	};

	const deleteEnvironmentFile = async (file: EnvironmentFile) => {
		await db.transact(environmentFileTx(file.id).delete());
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

	const saveGithubToken = async () => {
		setGithubTokenStatus(undefined);

		if (!githubAccessToken.trim()) {
			setGithubTokenStatus("Enter a token first.");
			return;
		}

		if (!user?.refresh_token) {
			setGithubTokenStatus("You must be signed in to save a token.");
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
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save GitHub token.");
			}

			setGithubAccessToken("");
			setGithubTokenStatus("GitHub token saved.");
		} catch (error) {
			setGithubTokenStatus(
				error instanceof Error ? error.message : "Failed to save GitHub token.",
			);
		} finally {
			setIsSavingGithubToken(false);
		}
	};

	const saveSetupScripts = async () => {
		setSetupScriptStatus(undefined);
		setIsSavingSetupScripts(true);

		try {
			await db.transact(
				factoryTx(currentFactoryId).update({
					newTaskSetupScript: optionalString(newTaskSetupScript.trim()),
					newTurnSetupScript: optionalString(newTurnSetupScript.trim()),
				}),
			);
			setSetupScriptStatus("Setup scripts saved.");
		} catch (error) {
			setSetupScriptStatus(
				error instanceof Error
					? error.message
					: "Failed to save setup scripts.",
			);
		} finally {
			setIsSavingSetupScripts(false);
		}
	};

	const savePackages = async () => {
		setPackageStatus(undefined);

		const packages = parsePackageText(environmentPackages);

		if (!packages) {
			setPackageStatus(
				"Use apt package names only. Spaces and shell syntax are not allowed.",
			);
			return;
		}

		setIsSavingPackages(true);

		try {
			await db.transact(
				factoryTx(currentFactoryId).update({
					environmentPackages: packages.length > 0 ? packages : undefined,
				}),
			);
			setPackageStatus("Packages saved.");
		} catch (error) {
			setPackageStatus(
				error instanceof Error ? error.message : "Failed to save packages.",
			);
		} finally {
			setIsSavingPackages(false);
		}
	};

	return (
		<div className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto bg-grayscale-1">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-14 md:px-8">
				<div className="flex flex-col gap-1">
					<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
						Factory Settings
					</p>
					<h1 className="text-lg font-medium text-grayscale-12">
						{factory?.name ?? "Factory"}
					</h1>
					<p className="text-sm text-grayscale-10">
						Repositories are cloned into the sandbox before each new task
						starts.
					</p>
				</div>

				<section className="relative border border-grayscale-4 bg-white">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<KeyIcon weight="bold" className="size-4" />
							GitHub Access
						</div>
					</div>
					<div className="flex flex-col gap-3 p-3">
						<div className="flex flex-col gap-1">
							<p className="text-xs text-grayscale-11">
								{factory?.githubAccessTokenEncrypted
									? "A GitHub token is saved for this factory."
									: "No GitHub token is saved for this factory."}
							</p>
							<p className="text-xs text-grayscale-10">
								Private repositories need a token with access to the repo.
							</p>
						</div>
						<div className="grid gap-3 md:grid-cols-[1fr_auto]">
							<Input
								type="password"
								placeholder="GitHub access token"
								value={githubAccessToken}
								onChange={(event) => setGithubAccessToken(event.target.value)}
							/>
							<Button
								type="button"
								disabled={isSavingGithubToken}
								onClick={() => {
									void saveGithubToken();
								}}
							>
								{isSavingGithubToken ? "Saving..." : "Save Token"}
							</Button>
						</div>
						{githubTokenStatus ? (
							<p className="text-xs text-grayscale-10">{githubTokenStatus}</p>
						) : null}
					</div>
				</section>

				<section className="relative border border-grayscale-4 bg-white">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<PackageIcon weight="bold" className="size-4" />
							Sandbox Packages
						</div>
					</div>
					<div className="flex flex-col gap-3 p-3">
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="environment-packages"
								className="text-xs text-grayscale-11"
							>
								Apt packages
							</label>
							<Textarea
								id="environment-packages"
								className="min-h-28 font-mono"
								placeholder={"jq\nffmpeg"}
								value={environmentPackages}
								onChange={(event) => setEnvironmentPackages(event.target.value)}
							/>
						</div>
						<div className="flex items-center justify-between gap-3">
							{packageStatus ? (
								<p className="text-xs text-grayscale-10">{packageStatus}</p>
							) : (
								<span />
							)}
							<Button
								type="button"
								disabled={isSavingPackages}
								onClick={() => {
									void savePackages();
								}}
							>
								{isSavingPackages ? "Saving..." : "Save Packages"}
							</Button>
						</div>
					</div>
				</section>

				<section className="relative border border-grayscale-4 bg-white">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<TerminalWindowIcon weight="bold" className="size-4" />
							Setup Scripts
						</div>
					</div>
					<div className="flex flex-col gap-4 p-3">
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="new-task-setup-script"
								className="text-xs text-grayscale-11"
							>
								New task script
							</label>
							<Textarea
								id="new-task-setup-script"
								className="min-h-40 font-mono"
								placeholder="pnpm install"
								value={newTaskSetupScript}
								onChange={(event) => setNewTaskSetupScript(event.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="new-turn-setup-script"
								className="text-xs text-grayscale-11"
							>
								New turn script
							</label>
							<Textarea
								id="new-turn-setup-script"
								className="min-h-40 font-mono"
								placeholder="git status --short"
								value={newTurnSetupScript}
								onChange={(event) => setNewTurnSetupScript(event.target.value)}
							/>
						</div>
						<div className="flex items-center justify-between gap-3">
							{setupScriptStatus ? (
								<p className="text-xs text-grayscale-10">{setupScriptStatus}</p>
							) : (
								<span />
							)}
							<Button
								type="button"
								disabled={isSavingSetupScripts}
								onClick={() => {
									void saveSetupScripts();
								}}
							>
								{isSavingSetupScripts ? "Saving..." : "Save Scripts"}
							</Button>
						</div>
					</div>
				</section>

				<section className="relative border border-grayscale-4 bg-white">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<GitBranchIcon weight="bold" className="size-4" />
							Repositories
						</div>
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
				</section>

				<section className="relative border border-grayscale-4 bg-white">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<FileTextIcon weight="bold" className="size-4" />
							Environment Files
						</div>
					</div>

					<div className="flex flex-col divide-y divide-grayscale-4">
						{environmentFiles.length > 0 ? (
							environmentFiles.map((file) => (
								<EnvironmentFileForm
									key={file.id}
									file={file}
									onSave={updateEnvironmentFile}
									onDelete={deleteEnvironmentFile}
								/>
							))
						) : (
							<p className="p-3 text-sm text-grayscale-10">
								No environment files configured.
							</p>
						)}
					</div>

					<form
						className="flex flex-col gap-3 border-t border-grayscale-4 p-3"
						onSubmit={(event) => {
							event.preventDefault();
							void createEnvironmentFile(event.currentTarget);
						}}
					>
						<div className="flex items-center gap-2 text-xs font-medium text-grayscale-11">
							<PlusIcon weight="bold" className="size-3.5" />
							Add Environment File
						</div>
						<Field label="Path" name="path" placeholder=".npmrc" />
						<div className="flex min-w-0 flex-col gap-1.5">
							<label
								htmlFor="new-environment-file-content"
								className="text-xs text-grayscale-11"
							>
								Content
							</label>
							<Textarea
								id="new-environment-file-content"
								name="content"
								className="min-h-32 font-mono"
								placeholder="//registry.npmjs.org/:_authToken=token"
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit">Add File</Button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}

function EnvironmentFileForm({
	file,
	onSave,
	onDelete,
}: {
	file: EnvironmentFile;
	onSave: (file: EnvironmentFile, form: HTMLFormElement) => Promise<void>;
	onDelete: (file: EnvironmentFile) => Promise<void>;
}) {
	return (
		<form
			className="flex flex-col gap-3 p-3"
			onSubmit={(event) => {
				event.preventDefault();
				void onSave(file, event.currentTarget);
			}}
		>
			<Field
				label="Path"
				name="path"
				placeholder=".npmrc"
				defaultValue={file.path}
			/>
			<div className="flex min-w-0 flex-col gap-1.5">
				<label
					htmlFor={`environment-file-content-${file.id}`}
					className="text-xs text-grayscale-11"
				>
					Content
				</label>
				<Textarea
					id={`environment-file-content-${file.id}`}
					name="content"
					className="min-h-40 font-mono"
					defaultValue={file.content}
				/>
			</div>
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-grayscale-10">
					Written after repositories are cloned.
				</p>
				<div className="flex items-center justify-end gap-2">
					<button
						type="button"
						onClick={() => {
							void onDelete(file);
						}}
						className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
					>
						<TrashIcon weight="bold" className="size-3.5" />
						Delete
					</button>
					<Button type="submit">Save</Button>
				</div>
			</div>
		</form>
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

function Field({
	label,
	name,
	placeholder,
	defaultValue,
	value,
	onChange,
	type = "text",
}: {
	label: string;
	name: string;
	placeholder: string;
	defaultValue?: string;
	value?: string;
	onChange?: ChangeEventHandler<HTMLInputElement>;
	type?: string;
}) {
	const inputId = useId();

	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<label htmlFor={inputId} className="text-xs text-grayscale-11">
				{label}
			</label>
			<Input
				id={inputId}
				name={name}
				type={type}
				placeholder={placeholder}
				defaultValue={defaultValue}
				value={value}
				onChange={onChange}
			/>
		</div>
	);
}
