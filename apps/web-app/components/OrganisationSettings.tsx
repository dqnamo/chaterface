"use client";

import { BuildingsIcon } from "@phosphor-icons/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import { Input } from "@/components/Input";
import db from "@/instant.client";

const organisationTx = (organisationId: string) => {
	const tx = db.tx.organisations[organisationId];

	if (!tx) {
		throw new Error(
			`Organisation transaction builder ${organisationId} not found`,
		);
	}

	return tx;
};

const getFormString = (formData: FormData, key: string) => {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
};

export function OrganisationSettingsContent() {
	const router = useRouter();
	const pathname = usePathname();
	const { orgHandle, factoryId } = useParams();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;

	const { data, error } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
		},
	});

	const organisation = data?.organisations?.[0];

	const updateOrganisation = async (form: HTMLFormElement) => {
		if (!organisation) {
			return;
		}

		const formData = new FormData(form);
		const name = getFormString(formData, "name");
		const handle = getFormString(formData, "handle");

		if (!name || !handle) {
			return;
		}

		await db.transact(
			organisationTx(organisation.id).update({
				name,
				handle,
			}),
		);

		if (handle !== currentOrgHandle) {
			router.replace(
				pathname.replace(
					`/${currentOrgHandle}/factories/${currentFactoryId}`,
					`/${handle}/factories/${currentFactoryId}`,
				),
			);
		}
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-1">
				<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
					Organisation Settings
				</p>
				<h1 className="text-lg font-medium text-grayscale-12">
					{organisation?.name ?? currentOrgHandle}
				</h1>
				<p className="text-sm text-grayscale-10">
					Organisation name, handle, and identity settings.
				</p>
			</div>

			{error ? <p className="text-sm text-red-11">{error.message}</p> : null}

			<section className="relative border border-grayscale-4 bg-grayscale-1">
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
						<BuildingsIcon weight="bold" className="size-4" />
						Organisation
					</div>
				</div>
				<form
					className="flex flex-col gap-3 p-3"
					onSubmit={(event) => {
						event.preventDefault();
						void updateOrganisation(event.currentTarget);
					}}
				>
					<div className="grid gap-3 md:grid-cols-2">
						<Field label="Name">
							<Input
								name="name"
								type="text"
								placeholder="Organisation name"
								defaultValue={organisation?.name ?? ""}
							/>
						</Field>
						<Field label="Handle">
							<Input
								name="handle"
								type="text"
								placeholder="organisation-handle"
								defaultValue={organisation?.handle ?? currentOrgHandle}
							/>
						</Field>
					</div>
					<div className="flex justify-end">
						<Button type="submit">Save Organisation</Button>
					</div>
				</form>
			</section>
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<p className="text-xs text-grayscale-11">{label}</p>
			{children}
		</div>
	);
}
