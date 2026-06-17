"use client";

import { id } from "@instantdb/react";
import {
	FloppyDiskIcon,
	PlusIcon,
	TerminalWindowIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Input";
import db from "@/instant.client";
import {
	SettingsPageShell,
	SettingsSection,
} from "../_components/SettingsPageShell";
import {
	type Command,
	commandTx,
	workspaceTx,
} from "../_lib/workspace-settings";

export default function WorkspaceCommandsSettingsPage() {
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;

	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			commands: {},
		},
	});

	const workspace = data?.workspaces?.[0];
	const commands = [...(workspace?.commands ?? [])].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	);

	const createCommand = async (form: HTMLFormElement) => {
		if (!workspace?.id) {
			return;
		}

		const formData = new FormData(form);
		const command = getFormCommand(formData);
		const runOnNewTask = formData.get("runOnNewTask") === "on";
		const runOnNewTurn = formData.get("runOnNewTurn") === "on";

		if (!command || (!runOnNewTask && !runOnNewTurn)) {
			return;
		}

		const commandId = id();
		const now = DateTime.now().toISO();
		await db.transact([
			workspaceTx(workspace.id).update({
				newTaskSetupScript: undefined,
				newTurnSetupScript: undefined,
			}),
			commandTx(commandId)
				.create({
					command,
					runOnNewTask,
					runOnNewTurn,
					createdAt: now,
					updatedAt: now,
				})
				.link({ workspace: workspace.id }),
		]);

		form.reset();
	};

	const updateCommand = async (commandRow: Command, form: HTMLFormElement) => {
		const formData = new FormData(form);
		const command = getFormCommand(formData);
		const runOnNewTask = formData.get("runOnNewTask") === "on";
		const runOnNewTurn = formData.get("runOnNewTurn") === "on";

		if (!command || (!runOnNewTask && !runOnNewTurn)) {
			return;
		}

		if (!workspace?.id) {
			return;
		}

		await db.transact([
			workspaceTx(workspace.id).update({
				newTaskSetupScript: undefined,
				newTurnSetupScript: undefined,
			}),
			commandTx(commandRow.id).update({
				command,
				runOnNewTask,
				runOnNewTurn,
				updatedAt: DateTime.now().toISO(),
			}),
		]);
	};

	const deleteCommand = async (command: Command) => {
		if (!workspace?.id) {
			return;
		}

		await db.transact([
			workspaceTx(workspace.id).update({
				newTaskSetupScript: undefined,
				newTurnSetupScript: undefined,
			}),
			commandTx(command.id).delete(),
		]);
	};

	return (
		<SettingsPageShell
			eyebrow="Agent Environment"
			title="Commands"
			description="Shell commands run automatically before a new task starts or before each new turn."
		>
			<SettingsSection title="Commands" Icon={TerminalWindowIcon}>
				<div className="flex flex-col divide-y divide-grayscale-4">
					{commands.length > 0 ? (
						commands.map((command) => (
							<CommandForm
								key={command.id}
								command={command}
								onSave={updateCommand}
								onDelete={deleteCommand}
							/>
						))
					) : (
						<p className="p-3 text-sm text-grayscale-10">
							No commands configured.
						</p>
					)}
				</div>

				<form
					className="flex flex-col gap-3 border-t border-grayscale-4 p-3"
					onSubmit={(event) => {
						event.preventDefault();
						void createCommand(event.currentTarget);
					}}
				>
					<Textarea
						name="command"
						className="min-h-20 font-mono"
						placeholder="pnpm install"
					/>
					<CommandRunOptions
						defaultRunOnNewTask={true}
						defaultRunOnNewTurn={false}
					/>
					<div className="flex justify-end">
						<Button type="submit">
							<PlusIcon weight="bold" className="size-3.5" />
							Add Command
						</Button>
					</div>
				</form>
			</SettingsSection>
		</SettingsPageShell>
	);
}

function CommandForm({
	command,
	onSave,
	onDelete,
}: {
	command: Command;
	onSave: (command: Command, form: HTMLFormElement) => void | Promise<void>;
	onDelete: (command: Command) => void | Promise<void>;
}) {
	return (
		<form
			className="flex flex-col gap-3 p-3"
			onSubmit={(event) => {
				event.preventDefault();
				void onSave(command, event.currentTarget);
			}}
		>
			<Textarea
				name="command"
				defaultValue={command.command}
				className="min-h-20 font-mono"
			/>
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<CommandRunOptions
					defaultRunOnNewTask={command.runOnNewTask ?? false}
					defaultRunOnNewTurn={command.runOnNewTurn ?? false}
				/>
				<div className="flex shrink-0 justify-end gap-2">
					<Button type="submit" variant="secondary">
						<FloppyDiskIcon weight="bold" className="size-3.5" />
						Save
					</Button>
					<button
						type="button"
						onClick={() => {
							void onDelete(command);
						}}
						className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-5 px-2 text-xs font-medium text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
					>
						<TrashIcon weight="bold" className="size-3.5" />
						Delete
					</button>
				</div>
			</div>
		</form>
	);
}

function CommandRunOptions({
	defaultRunOnNewTask,
	defaultRunOnNewTurn,
}: {
	defaultRunOnNewTask: boolean;
	defaultRunOnNewTurn: boolean;
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<label className="flex items-center gap-2 text-xs text-grayscale-11">
				<input
					type="checkbox"
					name="runOnNewTask"
					defaultChecked={defaultRunOnNewTask}
					className="size-3.5"
				/>
				Before each agent session start
			</label>
			<label className="flex items-center gap-2 text-xs text-grayscale-11">
				<input
					type="checkbox"
					name="runOnNewTurn"
					defaultChecked={defaultRunOnNewTurn}
					className="size-3.5"
				/>
				Before each turn
			</label>
		</div>
	);
}

const getFormCommand = (formData: FormData) => {
	const value = formData.get("command");

	if (typeof value !== "string") {
		return undefined;
	}

	const command = value.trim();
	return command.length > 0 ? command : undefined;
};
