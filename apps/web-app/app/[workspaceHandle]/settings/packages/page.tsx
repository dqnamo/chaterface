"use client";

import { id } from "@instantdb/react";
import { PackageIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import db from "@/instant.client";
import {
	SettingsPageShell,
	SettingsSection,
} from "../_components/SettingsPageShell";
import {
	parseEnvironmentPackages,
	parsePackageText,
	type SandboxPackage,
	sandboxPackageTx,
	workspaceTx,
} from "../_lib/workspace-settings";

export default function WorkspacePackagesSettingsPage() {
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;
	const [packageStatus, setPackageStatus] = useState<string>();

	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			sandboxPackages: {},
		},
	});

	const workspace = data?.workspaces?.[0];
	const sandboxPackages = [...(workspace?.sandboxPackages ?? [])].sort((a, b) =>
		a.name.localeCompare(b.name),
	);
	const legacyPackages = parseEnvironmentPackages(
		workspace?.environmentPackages,
	);

	const createPackage = async (form: HTMLFormElement) => {
		setPackageStatus(undefined);

		if (!workspace?.id) {
			return;
		}

		const formData = new FormData(form);
		const name = getPackageName(formData);

		if (!name) {
			setPackageStatus("Use a single apt package name.");
			return;
		}

		if (sandboxPackages.some((pkg) => pkg.name === name)) {
			setPackageStatus(`${name} is already configured.`);
			return;
		}

		const now = DateTime.now().toISO();
		await db.transact([
			workspaceTx(workspace.id).update({
				environmentPackages: undefined,
			}),
			sandboxPackageTx(id())
				.create({
					name,
					createdAt: now,
					updatedAt: now,
				})
				.link({ workspace: workspace.id }),
		]);

		form.reset();
		setPackageStatus("Package added.");
	};

	const deletePackage = async (sandboxPackage: SandboxPackage) => {
		setPackageStatus(undefined);
		if (!workspace?.id) {
			return;
		}

		await db.transact([
			workspaceTx(workspace.id).update({
				environmentPackages: undefined,
			}),
			sandboxPackageTx(sandboxPackage.id).delete(),
		]);
		setPackageStatus("Package removed.");
	};

	return (
		<SettingsPageShell
			eyebrow="Agent Environment"
			title="Sandbox packages"
			description="Named apt packages installed before each new task starts."
		>
			<SettingsSection title="Sandbox Packages" Icon={PackageIcon}>
				<div className="flex flex-col divide-y divide-grayscale-4">
					{sandboxPackages.length > 0 ? (
						sandboxPackages.map((sandboxPackage) => (
							<div
								key={sandboxPackage.id}
								className="flex items-center justify-between gap-3 p-3"
							>
								<p className="min-w-0 truncate font-mono text-sm text-grayscale-12">
									{sandboxPackage.name}
								</p>
								<button
									type="button"
									onClick={() => {
										void deletePackage(sandboxPackage);
									}}
									className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-red-5 px-2 text-xs font-medium text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
								>
									<TrashIcon weight="bold" className="size-3.5" />
									Delete
								</button>
							</div>
						))
					) : (
						<p className="p-3 text-sm text-grayscale-10">
							No sandbox packages configured.
						</p>
					)}
				</div>

				<form
					className="flex flex-col gap-3 border-t border-grayscale-4 p-3 md:grid md:grid-cols-[1fr_auto]"
					onSubmit={(event) => {
						event.preventDefault();
						void createPackage(event.currentTarget);
					}}
				>
					<Input name="name" placeholder="jq" />
					<Button type="submit">
						<PlusIcon weight="bold" className="size-3.5" />
						Add Package
					</Button>
				</form>

				{legacyPackages.length > 0 && sandboxPackages.length === 0 ? (
					<p className="border-t border-grayscale-4 p-3 text-xs text-grayscale-10">
						Legacy packages still configured: {legacyPackages.join(", ")}
					</p>
				) : null}

				{packageStatus ? (
					<p className="border-t border-grayscale-4 p-3 text-xs text-grayscale-10">
						{packageStatus}
					</p>
				) : null}
			</SettingsSection>
		</SettingsPageShell>
	);
}

const getPackageName = (formData: FormData) => {
	const value = formData.get("name");

	if (typeof value !== "string") {
		return undefined;
	}

	const packages = parsePackageText(value);
	return packages?.length === 1 ? packages[0] : undefined;
};
