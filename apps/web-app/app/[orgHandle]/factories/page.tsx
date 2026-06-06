"use client";

import { id } from "@instantdb/react";
import db from "@repo/db/client";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
	}

	return tx;
};

export default function FactoriesPage() {
	const { orgHandle } = useParams();
	const currentOrgHandle = orgHandle as string;
	const [factoryName, setFactoryName] = useState("");
	const [githubAccessToken, setGithubAccessToken] = useState("");
	const [gitAuthorName, setGitAuthorName] = useState("");
	const { user } = db.useAuth();

	const { data } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
			factories: {},
		},
	});

	const organisation = data?.organisations?.[0];
	const factories = organisation?.factories;

	const createFactory = async () => {
		if (!organisation) {
			return;
		}

		const factoryId = id();
		console.info("Creating factory", {
			factoryId,
			organisationId: organisation.id,
			hasGithubAccessToken: Boolean(githubAccessToken),
		});

		await db.transact(
			factoryTx(factoryId)
				.create({
					name: factoryName,
					createdAt: DateTime.now().toISO(),
					gitAuthorName,
				})
				.link({ organisation: organisation.id }),
		);

		// if changes to github access token or git author name, save the repository
		if (githubAccessToken) {
			const response = await fetch("/api/factories/saveGithub", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user?.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId,
					githubAccessToken,
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
	};

	const deleteFactory = async (factoryId: string) => {
		await db.transact(factoryTx(factoryId).delete());
	};

	return (
		<div>
			<h1>Factories {organisation?.name ?? currentOrgHandle}</h1>
			<ul>
				{factories?.map((factory) => (
					<li key={factory.id}>
						<Link href={`/${currentOrgHandle}/factories/${factory.id}`}>
							{factory.name}
						</Link>
						<button
							type="button"
							onClick={() => {
								void deleteFactory(factory.id);
							}}
						>
							Delete
						</button>
					</li>
				))}
			</ul>

			<div className="flex flex-col gap-4">
				<h2>Create Factory</h2>
				<input
					type="text"
					placeholder="Factory Name"
					value={factoryName}
					onChange={(e) => setFactoryName(e.target.value)}
				/>
				<input
					type="text"
					placeholder="Github Access Token"
					value={githubAccessToken}
					onChange={(e) => setGithubAccessToken(e.target.value)}
				/>
				<input
					type="text"
					placeholder="Git Author Name"
					value={gitAuthorName}
					onChange={(e) => setGitAuthorName(e.target.value)}
				/>
				<button
					type="button"
					onClick={() => {
						void createFactory().catch((error) => {
							console.error("Failed to create factory", {
								error: error instanceof Error ? error.message : String(error),
							});
						});
					}}
				>
					Create
				</button>
			</div>
		</div>
	);
}
