"use client";

import { id } from "@instantdb/react";
import { ShapesIcon } from "@phosphor-icons/react";
import db from "@repo/db/client";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import CornerBrackets from "@/components/CornerBrackets";
import { Dialog } from "@/components/Dialog";
import { Input } from "@/components/Input";
import Logo from "@/components/Logo";
import Monogram from "@/components/Monogram";

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
	const [createOpen, setCreateOpen] = useState(false);
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

		setFactoryName("");
		setGithubAccessToken("");
		setGitAuthorName("");
		setCreateOpen(false);
	};

	return (
		<div className="h-full w-full flex flex-col items-center justify-center">
			<Logo size={8} />
			<div className="flex flex-col gap-px items-center justify-center mt-8">
				<h1 className="text-md font-medium text-grayscale-12">
					{organisation?.name ?? currentOrgHandle}
				</h1>
				<p className="text-sm text-grayscale-11">
					Select a factory to manage your tasks
				</p>
			</div>
			<div className="grid grid-cols-3 max-w-xl w-full mt-8 gap-2">
				{factories?.map((factory) => (
					<Link
						key={factory.id}
						href={`/${currentOrgHandle}/factories/${factory.id}`}
						className="relative bg-white flex flex-row items-center gap-3 group border border-grayscale-4 p-3 transition-colors duration-150 hover:border-grayscale-6"
					>
						<CornerBrackets placement="inside" color="accent-9" />

						<Monogram seed={factory.name} letters={2} />
						<div className="flex flex-col gap-1">
							<h2 className="text-sm font-medium leading-none text-grayscale-11 group-hover:text-grayscale-12 transition-colors">
								{factory.name}
							</h2>
							{factory.gitAuthorName ? (
								<p className="text-xs leading-none text-grayscale-10 group-hover:text-grayscale-11 transition-colors">
									{factory.gitAuthorName}
								</p>
							) : null}
						</div>
					</Link>
				))}
			</div>

			<Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
				<Dialog.Trigger
					render={
						<button
							type="button"
							className="flex flex-row items-center gap-2 relative group bg-black p-2 px-3 mt-8 overflow-visible"
						/>
					}
				>
					<CornerBrackets
						placement="outside"
						spacing={1}
						translate={1.5}
						color="black"
					/>
					<ShapesIcon weight="bold" className="size-4 text-grayscale-2 group-hover:text-grayscale-1 transition-colors" />
					<p className="text-sm text-grayscale-2 group-hover:text-grayscale-1 transition-colors">
						New Factory
					</p>
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup>
						<div className="flex flex-col p-3 gap-3">
							<div className="flex flex-col">
								<Dialog.Title>Create Factory</Dialog.Title>
								<Dialog.Description>
									Set up a new factory for {organisation?.name ?? currentOrgHandle}.
								</Dialog.Description>
							</div>
						</div>
						<div className="flex flex-col p-3 gap-3">
							<div className="flex flex-col">
								<p className="text-xs text-grayscale-11">Name</p>
								<p className="text-xs text-grayscale-10">
									The name of the factory.
								</p>
							</div>
							<Input
								type="text"
								placeholder="Factory Name"
								value={factoryName}
								onChange={(e) => setFactoryName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col p-3 gap-3">
							<div className="flex flex-col">
								<p className="text-xs text-grayscale-11">GitHub Access Token</p>
								<p className="text-xs text-grayscale-10">
									Used to authenticate with your repositories.
								</p>
							</div>
							<Input
								type="text"
								placeholder="GitHub Access Token"
								value={githubAccessToken}
								onChange={(e) => setGithubAccessToken(e.target.value)}
							/>
						</div>
						<div className="flex flex-col p-3 gap-3">
							<div className="flex flex-col">
								<p className="text-xs text-grayscale-11">Git Author Name</p>
								<p className="text-xs text-grayscale-10">
									The name used for commits made by this factory.
								</p>
							</div>
							<Input
								type="text"
								placeholder="Git Author Name"
								value={gitAuthorName}
								onChange={(e) => setGitAuthorName(e.target.value)}
							/>
						</div>
						<div className="flex flex-row items-center justify-end gap-2 p-3">
							<Dialog.Close>Cancel</Dialog.Close>
							<button
								type="button"
								onClick={() => {
									void createFactory().catch((error) => {
										console.error("Failed to create factory", {
											error:
												error instanceof Error
													? error.message
													: String(error),
										});
									});
								}}
								className="relative group hover:scale-96 transition-transform duration-150 flex flex-row items-center justify-center gap-2 bg-grayscale-12 text-grayscale-1 text-xs font-medium px-3 py-1.5 overflow-visible"
							>
								<CornerBrackets
									placement="outside"
									spacing={1}
									translate={1.5}
									size={1.5}
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
