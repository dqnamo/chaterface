"use client";

import { id } from "@instantdb/react";
import { FileTextIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import db from "@/instant.client";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Input";
import { Field } from "../_components/Field";
import {
	SettingsPageShell,
	SettingsSection,
} from "../_components/SettingsPageShell";
import {
	type EnvironmentFile,
	environmentFileTx,
	getEnvironmentFilePath,
	getFormString,
} from "../_lib/factory-settings";

export default function FactoryEnvironmentFilesSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;

	const { data } = db.useQuery({
		factories: {
			$: {
				where: {
					id: currentFactoryId,
				},
			},
			environmentFiles: {},
		},
	});

	const factory = data?.factories?.[0];
	const environmentFiles = [...(factory?.environmentFiles ?? [])].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

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

	return (
		<SettingsPageShell
			eyebrow="Factory Settings"
			title="Environment files"
			description="Files written into the sandbox after repositories are cloned."
		>
			<SettingsSection title="Environment Files" Icon={FileTextIcon}>
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
			</SettingsSection>
		</SettingsPageShell>
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
