"use client";

import { PackageIcon } from "@phosphor-icons/react";
import db from "@/instant.client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Input";
import {
	SettingsPageShell,
	SettingsSection,
} from "../_components/SettingsPageShell";
import {
	factoryTx,
	parseEnvironmentPackages,
	parsePackageText,
} from "../_lib/factory-settings";

export default function FactoryPackagesSettingsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
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
		},
	});

	const factory = data?.factories?.[0];

	useEffect(() => {
		setEnvironmentPackages(
			parseEnvironmentPackages(factory?.environmentPackages).join("\n"),
		);
	}, [factory?.environmentPackages]);

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
		<SettingsPageShell
			eyebrow="Agent Environment"
			title="Sandbox packages"
			description="Apt packages installed before each new task starts."
		>
			<SettingsSection title="Sandbox Packages" Icon={PackageIcon}>
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
			</SettingsSection>
		</SettingsPageShell>
	);
}
