"use client";

import { id } from "@instantdb/react";
import { BuildingsIcon } from "@phosphor-icons/react";
import db from "@repo/db/client";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/Input";
import Logo from "@/components/Logo";
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

		const nextHandle = organisationHandle;
		setOrganisationName("");
		setOrganisationHandle("");
		router.push(`/${nextHandle}/factories`);
	};

	const organisations = data?.organisations;
	const redirectHref = useMemo(() => {
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
			const targetOrganisation = organisations.at(0);

			if (!targetOrganisation) {
				return;
			}

			return `/${targetOrganisation.handle}/factories`;
		}

		return `/${targetFactory.orgHandle}/factories/${targetFactory.factoryId}`;
	}, [organisations, user?.id]);

	useEffect(() => {
		if (redirectHref) {
			router.replace(redirectHref);
		}
	}, [redirectHref, router]);

	if (!organisations || organisations.length > 0) {
		return (
			<div className="h-full w-full flex flex-col items-center justify-center">
				<Logo size={8} />
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col items-center justify-center">
			<Logo size={8} />
			<div className="flex flex-col gap-px items-center justify-center mt-8">
				<h1 className="text-md font-medium text-grayscale-12">
					Create Organisation
				</h1>
				<p className="text-sm text-grayscale-11">
					Create an organisation to manage your factories
				</p>
				<SignOutButton className="mt-3" />
			</div>
			<form
				className="mt-8 flex w-full max-w-md flex-col gap-3 px-4"
				onSubmit={(event) => {
					event.preventDefault();
					void createOrganisation().catch((error) => {
						console.error("Failed to create organisation", {
							error: error instanceof Error ? error.message : String(error),
						});
					});
				}}
			>
				<div className="flex flex-col gap-1">
					<p className="text-xs text-grayscale-11">Name</p>
					<Input
						type="text"
						placeholder="Organisation Name"
						value={organisationName}
						onChange={(e) => setOrganisationName(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-xs text-grayscale-11">Handle</p>
					<Input
						type="text"
						placeholder="Organisation Handle"
						value={organisationHandle}
						onChange={(e) => setOrganisationHandle(e.target.value)}
					/>
				</div>
				<button
					type="submit"
					className="relative group hover:scale-96 transition-transform duration-150 flex flex-row items-center justify-center gap-2 bg-grayscale-12 text-grayscale-1 text-xs font-medium px-3 py-2 mt-2 overflow-visible"
				>
					<CornerBrackets
						placement="outside"
						spacing={4}
						translate={6}
						size={6}
						color="grayscale-12"
					/>
					<BuildingsIcon weight="bold" className="size-4" />
					Create Organisation
				</button>
			</form>
		</div>
	);
}
