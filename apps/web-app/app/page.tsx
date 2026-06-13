"use client";

import { id } from "@instantdb/react";
import { BuildingsIcon } from "@phosphor-icons/react";
import db from "@repo/db/client";
import { DateTime } from "luxon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { Input } from "@/components/Input";
import Logo from "@/components/Logo";
import Monogram from "@/components/Monogram";
import SignOutButton from "@/components/SignOutButton";
import { getRememberedFactory } from "@/helpers/last-factory-helper";
import CornerBrackets from "../components/CornerBrackets";

const organisationTx = (organisationId: string) => {
	const tx = db.tx.organisations[organisationId];

	if (!tx) {
		throw new Error(
			`Organisation transaction builder ${organisationId} not found`,
		);
	}

	return tx;
};

const memberTx = (memberId: string) => {
	const tx = db.tx.members[memberId];

	if (!tx) {
		throw new Error(`Member transaction builder ${memberId} not found`);
	}

	return tx;
};

export default function HomePage() {
	const router = useRouter();
	const { user } = db.useAuth();
	const currentUserId = user?.id ?? "__unauthenticated__";
	const { data } = db.useQuery({
		organisations: {
			$: {
				where: {
					"members.user.id": currentUserId,
				},
			},
			factories: {},
		},
	});
	const [createOpen, setCreateOpen] = useState(false);
	const [organisationName, setOrganisationName] = useState("");
	const [organisationHandle, setOrganisationHandle] = useState("");

	const createOrganisation = async () => {
		if (!user?.id) {
			return;
		}

		const organisationId = id();
		await db.transact([
			organisationTx(organisationId).create({
				name: organisationName,
				handle: organisationHandle,
				createdAt: DateTime.now().toISO(),
			}),
			memberTx(id())
				.update({
					createdAt: DateTime.now().toISO(),
					joinedAt: DateTime.now().toISO(),
					role: "owner",
				})
				.link({ organisation: organisationId, user: user.id }),
		]);

		setOrganisationName("");
		setOrganisationHandle("");
		setCreateOpen(false);
	};

	const organisations = data?.organisations;
	const rememberedFactoryHref = useMemo(() => {
		if (!user?.id || !organisations) {
			return;
		}

		const rememberedFactory = getRememberedFactory(user.id);
		const accessibleFactories = organisations.flatMap((organisation) =>
			(organisation.factories ?? []).map((factory) => ({
				factoryId: factory.id,
				orgHandle: organisation.handle,
			})),
		);
		const targetFactory =
			accessibleFactories.find(
				(factory) =>
					rememberedFactory &&
					factory.factoryId === rememberedFactory.factoryId &&
					factory.orgHandle === rememberedFactory.orgHandle,
			) ?? accessibleFactories.at(0);

		if (!targetFactory) {
			return;
		}

		return `/${targetFactory.orgHandle}/factories/${targetFactory.factoryId}`;
	}, [organisations, user?.id]);

	useEffect(() => {
		if (rememberedFactoryHref) {
			router.replace(rememberedFactoryHref);
		}
	}, [rememberedFactoryHref, router]);

	return (
		<div className="h-full w-full flex flex-col items-center justify-center">
			<Logo size={8} />
			<div className="flex flex-col gap-px items-center justify-center mt-8">
				<h1 className="text-md font-medium text-grayscale-12">
					Your Organisations
				</h1>
				<p className="text-sm text-grayscale-11">
					Select your organisation to manage your factories
				</p>
				<SignOutButton className="mt-3" />
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-xl w-full mt-8 gap-2 px-4">
				{organisations?.map((organisation) => (
					<Link
						key={organisation.id}
						href={`/${organisation.handle}/factories`}
						className="relative bg-grayscale-1 flex flex-row items-center gap-3 group border border-grayscale-4 p-3 transition-colors duration-150 hover:border-grayscale-6"
					>
						<CornerBrackets placement="inside" color="accent-9" />

						<Monogram seed={organisation.name} letters={1} />
						<div className="flex flex-col gap-1">
							<h2 className="text-sm font-medium leading-none text-grayscale-11 group-hover:text-grayscale-12 transition-colors">
								{organisation.name}
							</h2>
							<p className="text-xs leading-none text-grayscale-10 group-hover:text-grayscale-11 transition-colors">
								{organisation.handle}
							</p>
						</div>
					</Link>
				))}
			</div>

			<Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
				<Dialog.Trigger
					render={
						<button
							type="button"
							className="flex flex-row items-center gap-2 relative group bg-grayscale-12 p-2 px-3 mt-8 overflow-visible"
						/>
					}
				>
					<CornerBrackets
						placement="outside"
						spacing={4}
						translate={6}
						color="grayscale-12"
					/>
					<BuildingsIcon
						weight="bold"
						className="size-4 text-grayscale-2 group-hover:text-grayscale-1 transition-colors"
					/>
					<p className="text-sm text-grayscale-2 group-hover:text-grayscale-1 transition-colors">
						New Organisation
					</p>
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup>
						<div className="flex flex-col p-3 gap-3">
							<div className="flex flex-col">
								<Dialog.Title>Create Organisation</Dialog.Title>
								<Dialog.Description>
									Create a new organisation to manage your factories.
								</Dialog.Description>
							</div>
						</div>
						<div className="flex flex-col p-3 gap-3">
							<div className="flex flex-col">
								<p className="text-xs text-grayscale-11">Name</p>
								<p className="text-xs text-grayscale-10">
									The name of the organisation.
								</p>
							</div>
							<Input
								type="text"
								placeholder="Organisation Name"
								value={organisationName}
								onChange={(e) => setOrganisationName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col p-3 gap-3">
							<div className="flex flex-col">
								<p className="text-xs text-grayscale-11">Handle</p>
								<p className="text-xs text-grayscale-10">
									A unique handle used in the organisation's URL.
								</p>
							</div>
							<Input
								type="text"
								placeholder="Organisation Handle"
								value={organisationHandle}
								onChange={(e) => setOrganisationHandle(e.target.value)}
							/>
						</div>
						<div className="flex flex-row items-center justify-end gap-2 p-3">
							<Dialog.Close>Cancel</Dialog.Close>
							<button
								type="button"
								onClick={() => {
									void createOrganisation().catch((error) => {
										console.error("Failed to create organisation", {
											error:
												error instanceof Error ? error.message : String(error),
										});
									});
								}}
								className="relative group hover:scale-96 transition-transform duration-150 flex flex-row items-center justify-center gap-2 bg-grayscale-12 text-grayscale-1 text-xs font-medium px-3 py-1.5 overflow-visible"
							>
								<CornerBrackets
									placement="outside"
									spacing={4}
									translate={6}
									size={6}
									color="grayscale-12"
								/>
								Create
							</button>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
