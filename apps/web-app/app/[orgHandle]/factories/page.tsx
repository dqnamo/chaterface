"use client";

import { id } from "@instantdb/react";
import { ShapesIcon } from "@phosphor-icons/react";
import db from "@repo/db/client";
import { DateTime } from "luxon";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CornerBrackets from "@/components/CornerBrackets";
import { Input } from "@/components/Input";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import {
	getRememberedFactory,
	rememberLastFactory,
} from "@/helpers/last-factory-helper";

const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
	}

	return tx;
};

export default function FactoriesPage() {
	const router = useRouter();
	const { orgHandle } = useParams();
	const currentOrgHandle = orgHandle as string;
	const [factoryName, setFactoryName] = useState("");
	const [githubAccessToken, setGithubAccessToken] = useState("");
	const [gitAuthorName, setGitAuthorName] = useState("");
	const [gitAuthorEmail, setGitAuthorEmail] = useState("");
	const { user } = db.useAuth();
	const currentUserId = user?.id ?? "__unauthenticated__";

	const { data } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
					"members.user.id": currentUserId,
				},
			},
			factories: {},
		},
	});

	const organisation = data?.organisations?.[0];
	const factories = organisation?.factories;
	const rememberedFactoryHref = useMemo(() => {
		if (!user?.id || !factories) {
			return;
		}

		const rememberedFactory = getRememberedFactory(user.id);
		const targetFactory =
			factories.find(
				(factory) =>
					rememberedFactory &&
					factory.id === rememberedFactory.factoryId &&
					rememberedFactory.orgHandle === currentOrgHandle,
			) ?? factories.at(0);

		if (!targetFactory) {
			return;
		}

		return `/${currentOrgHandle}/factories/${targetFactory.id}`;
	}, [currentOrgHandle, factories, user?.id]);

	useEffect(() => {
		if (rememberedFactoryHref) {
			router.replace(rememberedFactoryHref);
		}
	}, [rememberedFactoryHref, router]);

	const createFactory = async () => {
		if (!organisation || !user?.id) {
			return;
		}

		const factoryId = id();
		console.info("Creating factory", {
			factoryId,
			organisationId: organisation.id,
			hasGithubAccessToken: Boolean(githubAccessToken),
		});
		const trimmedGithubAccessToken = githubAccessToken.trim();

		await db.transact(
			factoryTx(factoryId)
				.create({
					name: factoryName,
					createdAt: DateTime.now().toISO(),
					gitAuthorName: gitAuthorName.trim() || undefined,
					gitAuthorEmail: gitAuthorEmail.trim() || undefined,
				})
				.link({ organisation: organisation.id }),
		);

		if (trimmedGithubAccessToken) {
			const response = await fetch("/api/factories/saveGithub", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user?.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId,
					githubAccessToken: trimmedGithubAccessToken,
					gitAuthorName: gitAuthorName.trim(),
					gitAuthorEmail: gitAuthorEmail.trim(),
				}),
			});

			const responseBody = await response.json().catch(() => null);

			if (!response.ok) {
				console.error("Failed to save GitHub credentials", {
					factoryId,
					status: response.status,
					responseBody,
				});
				throw new Error(
					`Failed to save GitHub credentials: ${response.status}`,
				);
			}

			console.info("Saved GitHub credentials", {
				factoryId,
				status: response.status,
				responseBody,
			});
		}

		setFactoryName("");
		setGithubAccessToken("");
		setGitAuthorName("");
		setGitAuthorEmail("");
		rememberLastFactory({
			factoryId,
			orgHandle: currentOrgHandle,
			userId: user.id,
		});
		router.push(`/${currentOrgHandle}/factories/${factoryId}`);
	};

	if (!organisation || !factories || factories.length > 0) {
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
					Create Factory
				</h1>
				<p className="text-sm text-grayscale-11">
					Set up a new factory for {organisation.name}
				</p>
				<SignOutButton className="mt-3" />
			</div>
			<form
				className="mt-8 flex w-full max-w-md flex-col gap-3 px-4"
				onSubmit={(event) => {
					event.preventDefault();
					void createFactory().catch((error) => {
						console.error("Failed to create factory", {
							error: error instanceof Error ? error.message : String(error),
						});
					});
				}}
			>
				<div className="flex flex-col gap-1">
					<p className="text-xs text-grayscale-11">Name</p>
					<Input
						type="text"
						placeholder="Factory Name"
						value={factoryName}
						onChange={(e) => setFactoryName(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-xs text-grayscale-11">GitHub Access Token</p>
					<Input
						type="text"
						placeholder="GitHub Access Token"
						value={githubAccessToken}
						onChange={(e) => setGithubAccessToken(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-xs text-grayscale-11">Git Author Name</p>
					<Input
						type="text"
						placeholder="Git Author Name"
						value={gitAuthorName}
						onChange={(e) => setGitAuthorName(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-xs text-grayscale-11">Git Author Email</p>
					<Input
						type="email"
						placeholder="Git Author Email"
						value={gitAuthorEmail}
						onChange={(e) => setGitAuthorEmail(e.target.value)}
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
					<ShapesIcon weight="bold" className="size-4" />
					Create Factory
				</button>
			</form>
		</div>
	);
}
