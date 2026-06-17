"use client";

import { TerminalWindowIcon } from "@phosphor-icons/react";
import db from "@/instant.client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Input";
import {
	SettingsPageShell,
	SettingsSection,
} from "../_components/SettingsPageShell";
import { factoryTx, optionalString } from "../_lib/factory-settings";

export default function FactorySetupScriptsSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
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
		},
	});

	const factory = data?.factories?.[0];

	useEffect(() => {
		setNewTaskSetupScript(factory?.newTaskSetupScript ?? "");
		setNewTurnSetupScript(factory?.newTurnSetupScript ?? "");
	}, [factory?.newTaskSetupScript, factory?.newTurnSetupScript]);

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
		<SettingsPageShell
			eyebrow="Agent Environment"
			title="Setup scripts"
			description="Commands run automatically when tasks and turns start."
		>
			<SettingsSection title="Setup Scripts" Icon={TerminalWindowIcon}>
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
			</SettingsSection>
		</SettingsPageShell>
	);
}
