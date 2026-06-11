"use client";

import { type InstaQLEntity, id } from "@instantdb/react";
import {
	GitBranchIcon,
	KeyIcon,
	PlusIcon,
	TerminalWindowIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import { Input, Textarea } from "@/components/Input";
import { ExpandSidebarButton } from "@/components/SidebarContext";

type Repository = InstaQLEntity<AppSchema, "repositories">;

const repositoryTx = (repositoryId: string) => {
	const tx = db.tx.repositories[repositoryId];

	if (!tx) {
		throw new Error(`Repository transaction builder ${repositoryId} not found`);
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

	const { data } = db.useQuery({
		factories: {
			$: {
				where: {
					id: currentFactoryId,
				},
			},
			repositories: {},
		},
	});

	const factory = data?.factories?.[0];
	const repositories = [...(factory?.repositories ?? [])].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

	useEffect(() => {
		setNewTaskSetupScript(factory?.newTaskSetupScript ?? "");
		setNewTurnSetupScript(factory?.newTurnSetupScript ?? "");
	}, [factory?.newTaskSetupScript, factory?.newTurnSetupScript]);

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
			</div>
		</div>
	);
}

function RepositoryForm({
	repository,
	onSave,
	onDelete,
}: {
	repository: Repository;
	onSave: (repository: Repository, form: HTMLFormElement) => Promise<void>;
	onDelete: (repository: Repository) => Promise<void>;
}) {
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
	type = "text",
}: {
	label: string;
	name: string;
	placeholder: string;
	defaultValue?: string;
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
			/>
		</div>
	);
}
