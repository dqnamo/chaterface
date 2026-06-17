"use client";

import { id } from "@instantdb/react";
import {
	ArrowClockwiseIcon,
	CheckCircleIcon,
	DownloadSimpleIcon,
	PlusIcon,
	PuzzlePieceIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
	normalizeGitRepositoryUrl,
	optionalRepositoryPath,
	optionalString,
	type Skill,
	type SkillRepository,
	skillRepositoryTx,
	skillTx,
} from "../_lib/workspace-settings";

type SkillRepositoryWithSkills = SkillRepository & {
	skills?: Skill[];
};

type WorkspaceSkill = Skill & {
	skillRepository?: SkillRepository;
};

type SkillsShSkill = {
	id: string;
	slug: string;
	name: string;
	source: string;
	installs: number;
	sourceType?: string;
	installUrl?: string | null;
	url?: string;
};

export default function WorkspaceSkillsSettingsPage() {
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;
	const { user } = db.useAuth();
	const [syncingRepositoryIds, setSyncingRepositoryIds] = useState(
		() => new Set<string>(),
	);
	const [skillsShQuery, setSkillsShQuery] = useState("");
	const [skillsShResults, setSkillsShResults] = useState<SkillsShSkill[]>([]);
	const [skillsShLoading, setSkillsShLoading] = useState(false);
	const [installingSkillIds, setInstallingSkillIds] = useState(
		() => new Set<string>(),
	);
	const [selectedSkillsShIds, setSelectedSkillsShIds] = useState(
		() => new Set<string>(),
	);
	const [skillsShStatus, setSkillsShStatus] = useState<string>();

	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			skillRepositories: {
				skills: {},
			},
			skills: {
				skillRepository: {},
			},
		},
	});

	const workspace = data?.workspaces?.[0];
	const currentWorkspaceId = workspace?.id;
	const workspaceSkills = [
		...((workspace?.skills ?? []) as WorkspaceSkill[]),
	].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);
	const publicSkills = workspaceSkills.filter(
		(skill) => skill.sourceType === "skills.sh" && !skill.removedAt,
	);
	const installedSkillsByExternalId = useMemo(() => {
		const installedSkills = new Set<string>();

		for (const skill of publicSkills) {
			if (skill.externalId) {
				installedSkills.add(skill.externalId);
			}
		}

		return installedSkills;
	}, [publicSkills]);
	const selectedInstallableSkills = skillsShResults.filter(
		(skill) =>
			selectedSkillsShIds.has(skill.id) &&
			!installedSkillsByExternalId.has(skill.id),
	);
	const skillRepositories = [
		...((workspace?.skillRepositories ?? []) as SkillRepositoryWithSkills[]),
	].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

	const loadSkillsShSkills = useCallback(
		async (query: string) => {
			if (!currentWorkspaceId || !user?.refresh_token) {
				return;
			}

			setSkillsShLoading(true);
			setSkillsShStatus(undefined);

			try {
				const url = new URL("/api/skills-sh", window.location.origin);
				url.searchParams.set("workspaceId", currentWorkspaceId);
				url.searchParams.set("limit", "24");

				if (query.trim()) {
					url.searchParams.set("q", query.trim());
				}

				const response = await fetch(url, {
					headers: {
						Authorization: `Bearer ${user.refresh_token}`,
					},
				});

				if (!response.ok) {
					throw new Error(await getApiErrorMessage(response));
				}

				const result = (await response.json()) as { skills?: SkillsShSkill[] };
				setSkillsShResults(result.skills ?? []);
			} catch (error) {
				setSkillsShStatus(
					error instanceof Error ? error.message : "Failed to load skills.",
				);
			} finally {
				setSkillsShLoading(false);
			}
		},
		[currentWorkspaceId, user?.refresh_token],
	);

	useEffect(() => {
		if (!currentWorkspaceId || !user?.refresh_token) {
			return;
		}

		void loadSkillsShSkills("");
	}, [currentWorkspaceId, user?.refresh_token, loadSkillsShSkills]);

	const toggleSkillsShSelection = (skillId: string, selected: boolean) => {
		setSelectedSkillsShIds((current) => {
			const next = new Set(current);

			if (selected) {
				next.add(skillId);
			} else {
				next.delete(skillId);
			}

			return next;
		});
	};

	const installSkillsShSkill = async (
		skill: SkillsShSkill,
		options: { showStatus?: boolean } = {},
	) => {
		if (!currentWorkspaceId || !user?.refresh_token) {
			return false;
		}

		const showStatus = options.showStatus ?? true;
		setInstallingSkillIds((current) => new Set(current).add(skill.id));

		if (showStatus) {
			setSkillsShStatus(undefined);
		}

		try {
			const response = await fetch("/api/skills-sh/install", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${user.refresh_token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					workspaceId: currentWorkspaceId,
					skillId: skill.id,
					name: skill.name,
					url: skill.url,
					installUrl: skill.installUrl,
				}),
			});

			if (!response.ok) {
				throw new Error(await getApiErrorMessage(response));
			}

			setSelectedSkillsShIds((current) => {
				const next = new Set(current);
				next.delete(skill.id);
				return next;
			});

			if (showStatus) {
				setSkillsShStatus("Skill installed.");
			}

			return true;
		} catch (error) {
			if (showStatus) {
				setSkillsShStatus(
					error instanceof Error ? error.message : "Failed to install skill.",
				);
			}

			return false;
		} finally {
			setInstallingSkillIds((current) => {
				const next = new Set(current);
				next.delete(skill.id);
				return next;
			});
		}
	};

	const installSelectedSkillsShSkills = async () => {
		if (selectedInstallableSkills.length === 0) {
			return;
		}

		setSkillsShStatus(undefined);

		let installedCount = 0;

		for (const skill of selectedInstallableSkills) {
			const installed = await installSkillsShSkill(skill, {
				showStatus: false,
			});

			if (installed) {
				installedCount += 1;
			}
		}

		setSkillsShStatus(
			installedCount === selectedInstallableSkills.length
				? `${installedCount} skills installed.`
				: `${installedCount} of ${selectedInstallableSkills.length} skills installed.`,
		);
	};

	const syncSkillRepository = async (skillRepository: SkillRepository) => {
		if (!user?.refresh_token) {
			throw new Error("You must be signed in to sync skill repositories.");
		}

		setSyncingRepositoryIds((current) =>
			new Set(current).add(skillRepository.id),
		);

		try {
			const response = await fetch(
				`/api/skill-repositories/${skillRepository.id}/sync`,
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
		} finally {
			setSyncingRepositoryIds((current) => {
				const next = new Set(current);
				next.delete(skillRepository.id);
				return next;
			});
		}
	};

	const createSkillRepository = async (form: HTMLFormElement) => {
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

		const skillRepositoryId = id();
		const skillRepository = {
			id: skillRepositoryId,
			url: normalizeGitRepositoryUrl(url),
			path: optionalRepositoryPath(path),
			branch: optionalString(branch),
			status: "idle",
			createdAt: DateTime.now().toISO(),
		};

		await db.transact(
			skillRepositoryTx(skillRepositoryId)
				.create(skillRepository)
				.link({ workspace: currentWorkspaceId }),
		);

		form.reset();
		await syncSkillRepository(skillRepository);
	};

	const updateSkillRepository = async (
		skillRepository: SkillRepository,
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
			skillRepositoryTx(skillRepository.id).update({
				url: normalizeGitRepositoryUrl(url),
				path: optionalRepositoryPath(path),
				branch: optionalString(branch),
			}),
		);
	};

	const deleteSkillRepository = async (skillRepository: SkillRepository) => {
		await db.transact(skillRepositoryTx(skillRepository.id).delete());
	};

	const toggleSkill = async (skill: Skill, enabled: boolean) => {
		await db.transact(
			skillTx(skill.id).update({
				enabled,
				updatedAt: DateTime.now().toISO(),
			}),
		);
	};

	const removeSkill = async (skill: Skill) => {
		await db.transact(
			skillTx(skill.id).update({
				enabled: false,
				removedAt: DateTime.now().toISO(),
				updatedAt: DateTime.now().toISO(),
			}),
		);
	};

	return (
		<SettingsPageShell
			eyebrow="Agent Environment"
			title="Skills"
			description="Public skills from skills.sh and private SKILL.md packages installed into new task sandboxes."
		>
			<SettingsSection title="Public Skills" Icon={PuzzlePieceIcon}>
				<div className="flex flex-col gap-3 p-3">
					<form
						className="flex flex-col gap-2 md:flex-row"
						onSubmit={(event) => {
							event.preventDefault();
							void loadSkillsShSkills(skillsShQuery);
						}}
					>
						<input
							type="search"
							value={skillsShQuery}
							onChange={(event) => setSkillsShQuery(event.target.value)}
							placeholder="Search skills.sh"
							className="min-h-9 flex-1 border border-grayscale-5 bg-transparent px-2.5 text-sm text-grayscale-12 outline-none transition-colors placeholder:text-grayscale-9 focus:border-grayscale-8"
						/>
						<div className="flex gap-2">
							<Button type="submit" disabled={skillsShLoading}>
								{skillsShLoading ? "Loading..." : "Search"}
							</Button>
							<Button
								type="button"
								disabled={skillsShLoading}
								onClick={() => {
									setSkillsShQuery("");
									void loadSkillsShSkills("");
								}}
							>
								Curated
							</Button>
						</div>
					</form>

					{skillsShStatus ? (
						<p className="text-xs text-grayscale-10">{skillsShStatus}</p>
					) : null}

					{publicSkills.length > 0 ? (
						<div className="flex flex-col divide-y divide-grayscale-4 border border-grayscale-4">
							{publicSkills.map((skill) => (
								<InstalledSkillRow
									key={skill.id}
									skill={skill}
									onToggleSkill={toggleSkill}
									onRemoveSkill={removeSkill}
								/>
							))}
						</div>
					) : null}

					<div className="grid gap-2 md:grid-cols-2">
						{skillsShResults.map((skill) => {
							const isInstalled = installedSkillsByExternalId.has(skill.id);
							const isInstalling = installingSkillIds.has(skill.id);
							const isSelected = selectedSkillsShIds.has(skill.id);

							return (
								<label
									key={skill.id}
									className="flex min-w-0 cursor-pointer items-start gap-3 border border-grayscale-4 p-2.5 transition-colors hover:bg-grayscale-2"
								>
									<input
										type="checkbox"
										className="mt-0.5"
										checked={isInstalled || isSelected}
										disabled={isInstalled || isInstalling}
										onChange={(event) => {
											toggleSkillsShSelection(skill.id, event.target.checked);
										}}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex min-w-0 items-center gap-2">
											<p className="truncate text-sm font-medium text-grayscale-12">
												{skill.name}
											</p>
											<span className="shrink-0 font-mono text-[11px] text-grayscale-9">
												{formatInstalls(skill.installs)}
											</span>
										</div>
										<p className="mt-1 truncate font-mono text-[11px] text-grayscale-9">
											{skill.source}/{skill.slug}
										</p>
									</div>
									<span className="shrink-0 text-xs text-grayscale-10">
										{isInstalled
											? "Installed"
											: isInstalling
												? "Installing..."
												: null}
									</span>
								</label>
							);
						})}
					</div>

					<div className="flex justify-end">
						<Button
							type="button"
							disabled={
								selectedInstallableSkills.length === 0 ||
								installingSkillIds.size > 0
							}
							onClick={() => {
								void installSelectedSkillsShSkills();
							}}
						>
							<DownloadSimpleIcon weight="bold" className="size-3.5" />
							{selectedInstallableSkills.length > 0
								? `Install selected (${selectedInstallableSkills.length})`
								: "Install selected"}
						</Button>
					</div>
				</div>
			</SettingsSection>

			<SettingsSection title="Private Repositories" Icon={PuzzlePieceIcon}>
				<div className="flex flex-col divide-y divide-grayscale-4">
					{skillRepositories.length > 0 ? (
						skillRepositories.map((skillRepository) => (
							<SkillRepositoryForm
								key={skillRepository.id}
								skillRepository={skillRepository}
								isSyncing={syncingRepositoryIds.has(skillRepository.id)}
								onSave={updateSkillRepository}
								onDelete={deleteSkillRepository}
								onSync={syncSkillRepository}
								onToggleSkill={toggleSkill}
							/>
						))
					) : (
						<p className="p-3 text-sm text-grayscale-10">
							No skill repositories configured.
						</p>
					)}
				</div>

				<form
					className="flex flex-col gap-3 border-t border-grayscale-4 p-3"
					onSubmit={(event) => {
						event.preventDefault();
						void createSkillRepository(event.currentTarget);
					}}
				>
					<div className="flex items-center gap-2 text-xs font-medium text-grayscale-11">
						<PlusIcon weight="bold" className="size-3.5" />
						Add Skill Repository
					</div>
					<div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
						<Field label="URL" name="url" placeholder="mattpocock/skills" />
						<Field label="Path" name="path" placeholder="skills" />
						<Field label="Branch" name="branch" placeholder="main" />
					</div>
					<div className="flex justify-end">
						<Button type="submit">Add and Sync</Button>
					</div>
				</form>
			</SettingsSection>
		</SettingsPageShell>
	);
}

function InstalledSkillRow({
	skill,
	onToggleSkill,
	onRemoveSkill,
}: {
	skill: Skill;
	onToggleSkill: (skill: Skill, enabled: boolean) => Promise<void>;
	onRemoveSkill: (skill: Skill) => Promise<void>;
}) {
	return (
		<label className="flex cursor-pointer items-start gap-3 p-2.5 transition-colors hover:bg-grayscale-2">
			<input
				type="checkbox"
				className="mt-0.5"
				checked={Boolean(skill.enabled)}
				onChange={(event) => {
					void onToggleSkill(skill, event.target.checked);
				}}
			/>
			<div className="min-w-0 flex-1">
				<div className="flex min-w-0 items-center gap-2">
					<p className="truncate text-sm font-medium text-grayscale-12">
						{skill.name}
					</p>
					{skill.installs ? (
						<span className="shrink-0 font-mono text-[11px] text-grayscale-9">
							{formatInstalls(skill.installs)}
						</span>
					) : null}
				</div>
				{skill.description ? (
					<p className="mt-1 line-clamp-2 text-xs text-grayscale-10">
						{skill.description}
					</p>
				) : null}
			</div>
			<button
				type="button"
				onClick={(event) => {
					event.preventDefault();
					void onRemoveSkill(skill);
				}}
				className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
			>
				<TrashIcon weight="bold" className="size-3.5" />
				Remove
			</button>
		</label>
	);
}

function SkillRepositoryForm({
	skillRepository,
	isSyncing,
	onSave,
	onDelete,
	onSync,
	onToggleSkill,
}: {
	skillRepository: SkillRepositoryWithSkills;
	isSyncing: boolean;
	onSave: (
		skillRepository: SkillRepository,
		form: HTMLFormElement,
	) => Promise<void>;
	onDelete: (skillRepository: SkillRepository) => Promise<void>;
	onSync: (skillRepository: SkillRepository) => Promise<void>;
	onToggleSkill: (skill: Skill, enabled: boolean) => Promise<void>;
}) {
	const [status, setStatus] = useState<string>();
	const skills = [...(skillRepository.skills ?? [])]
		.filter((skill) => !skill.removedAt)
		.sort((first, second) => first.name.localeCompare(second.name));

	const sync = async () => {
		setStatus(undefined);

		try {
			await onSync(skillRepository);
			setStatus("Skills synced.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to sync.");
		}
	};

	return (
		<form
			className="flex flex-col gap-3 p-3"
			onSubmit={(event) => {
				event.preventDefault();
				void onSave(skillRepository, event.currentTarget);
			}}
		>
			<div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
				<Field
					label="URL"
					name="url"
					placeholder="mattpocock/skills"
					defaultValue={skillRepository.url}
				/>
				<Field
					label="Path"
					name="path"
					placeholder="skills"
					defaultValue={
						optionalRepositoryPath(skillRepository.path ?? "") ?? ""
					}
				/>
				<Field
					label="Branch"
					name="branch"
					placeholder="main"
					defaultValue={skillRepository.branch ?? ""}
				/>
			</div>

			<div className="flex flex-col gap-2 border-t border-grayscale-4 pt-3">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-2 text-xs text-grayscale-10">
						{skillRepository.lastSyncedCommit ? (
							<>
								<CheckCircleIcon weight="bold" className="size-3.5" />
								<span>
									Synced{" "}
									<span className="font-mono">
										{skillRepository.lastSyncedCommit.slice(0, 7)}
									</span>
								</span>
							</>
						) : (
							<span>Not synced yet.</span>
						)}
					</div>
					{skillRepository.syncError ? (
						<p className="text-xs text-red-10">{skillRepository.syncError}</p>
					) : status ? (
						<p className="text-xs text-grayscale-10">{status}</p>
					) : null}
				</div>

				{skills.length > 0 ? (
					<div className="flex flex-col divide-y divide-grayscale-4 border border-grayscale-4">
						{skills.map((skill) => (
							<label
								key={skill.id}
								className="flex cursor-pointer items-start gap-3 p-2.5 transition-colors hover:bg-grayscale-2"
							>
								<input
									type="checkbox"
									className="mt-0.5"
									checked={Boolean(skill.enabled)}
									onChange={(event) => {
										void onToggleSkill(skill, event.target.checked);
									}}
								/>
								<div className="min-w-0 flex-1">
									<div className="flex min-w-0 items-center gap-2">
										<p className="truncate text-sm font-medium text-grayscale-12">
											{skill.name}
										</p>
										<span className="shrink-0 font-mono text-[11px] text-grayscale-9">
											{skill.sourcePath}
										</span>
									</div>
									{skill.description ? (
										<p className="mt-1 line-clamp-2 text-xs text-grayscale-10">
											{skill.description}
										</p>
									) : null}
								</div>
							</label>
						))}
					</div>
				) : (
					<p className="text-xs text-grayscale-10">
						Sync this repository to discover SKILL.md packages.
					</p>
				)}
			</div>

			<div className="flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={() => {
						void onDelete(skillRepository);
					}}
					className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
				>
					<TrashIcon weight="bold" className="size-3.5" />
					Delete
				</button>
				<Button
					type="button"
					disabled={isSyncing}
					onClick={() => {
						void sync();
					}}
				>
					<ArrowClockwiseIcon weight="bold" className="size-3.5" />
					{isSyncing ? "Syncing..." : "Sync"}
				</Button>
				<Button type="submit">Save</Button>
			</div>
		</form>
	);
}

const formatInstalls = (value: number) => {
	if (value >= 1000) {
		return `${Math.round(value / 100) / 10}k`;
	}

	return String(value);
};
