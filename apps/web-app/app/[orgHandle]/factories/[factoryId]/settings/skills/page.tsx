"use client";

import { id } from "@instantdb/react";
import {
	ArrowClockwiseIcon,
	CheckCircleIcon,
	PlusIcon,
	PuzzlePieceIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import db from "@/instant.client";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
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
} from "../_lib/factory-settings";

type SkillRepositoryWithSkills = SkillRepository & {
	skills?: Skill[];
};

export default function FactorySkillsSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const [syncingRepositoryIds, setSyncingRepositoryIds] = useState(
		() => new Set<string>(),
	);

	const { data } = db.useQuery({
		factories: {
			$: {
				where: {
					id: currentFactoryId,
				},
			},
			skillRepositories: {
				skills: {},
			},
		},
	});

	const factory = data?.factories?.[0];
	const skillRepositories = [
		...((factory?.skillRepositories ?? []) as SkillRepositoryWithSkills[]),
	].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

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
				.link({ factory: currentFactoryId }),
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

	return (
		<SettingsPageShell
			eyebrow="Factory Settings"
			title="Skills"
			description="Git-backed agent skills discovered from SKILL.md packages and installed into new task sandboxes."
		>
			<SettingsSection title="Skill Repositories" Icon={PuzzlePieceIcon}>
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
