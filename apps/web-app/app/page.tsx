"use client";

import { id } from "@instantdb/react";
import { BuildingsIcon } from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/Input";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import { getRememberedWorkspace } from "@/helpers/last-workspace-helper";
import { captureProductEvent } from "@/helpers/posthog-helper";
import db from "@/instant.client";
import CornerBrackets from "../components/CornerBrackets";

const workspaceTx = (workspaceId: string) => {
	const tx = db.tx.workspaces[workspaceId];

	if (!tx) {
		throw new Error(`Workspace transaction builder ${workspaceId} not found`);
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
		workspaces: {
			$: {
				where: {
					"members.user.id": currentUserId,
				},
			},
		},
	});
	const [workspaceName, setWorkspaceName] = useState("");
	const [workspaceHandle, setWorkspaceHandle] = useState("");

	const createWorkspace = async () => {
		if (!user?.id) {
			return;
		}

		const workspaceId = id();
		await db.transact([
			workspaceTx(workspaceId).create({
				name: workspaceName,
				handle: workspaceHandle,
				createdAt: DateTime.now().toISO(),
			}),
			memberTx(id())
				.update({
					createdAt: DateTime.now().toISO(),
					joinedAt: DateTime.now().toISO(),
					role: "owner",
				})
				.link({ workspace: workspaceId, user: user.id }),
		]);

		const nextHandle = workspaceHandle;
		captureProductEvent("workspace_created", {
			workspace_id: workspaceId,
			workspace_handle: nextHandle,
		});
		setWorkspaceName("");
		setWorkspaceHandle("");
		router.push(`/${nextHandle}`);
	};

	const workspaces = data?.workspaces;
	const redirectHref = useMemo(() => {
		if (!user?.id || !workspaces) {
			return;
		}

		const rememberedWorkspace = getRememberedWorkspace(user.id);
		const accessibleWorkspaces = workspaces.map((workspace) => ({
			workspaceId: workspace.id,
			workspaceHandle: workspace.handle,
		}));
		const targetWorkspace =
			accessibleWorkspaces.find(
				(workspace) =>
					rememberedWorkspace &&
					workspace.workspaceId === rememberedWorkspace.workspaceId &&
					workspace.workspaceHandle === rememberedWorkspace.workspaceHandle,
			) ?? accessibleWorkspaces.at(0);

		if (!targetWorkspace) {
			return;
		}

		return `/${targetWorkspace.workspaceHandle}`;
	}, [workspaces, user?.id]);

	useEffect(() => {
		if (redirectHref) {
			router.replace(redirectHref);
		}
	}, [redirectHref, router]);

	if (!workspaces || workspaces.length > 0) {
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
					Create Workspace
				</h1>
				<p className="text-sm text-grayscale-11">
					Create a workspace to manage your tasks
				</p>
				<SignOutButton className="mt-3" />
			</div>
			<form
				className="mt-8 flex w-full max-w-md flex-col gap-3 px-4"
				onSubmit={(event) => {
					event.preventDefault();
					void createWorkspace().catch((error) => {
						console.error("Failed to create workspace", {
							error: error instanceof Error ? error.message : String(error),
						});
					});
				}}
			>
				<div className="flex flex-col gap-1">
					<p className="text-xs text-grayscale-11">Name</p>
					<Input
						type="text"
						placeholder="Workspace Name"
						value={workspaceName}
						onChange={(e) => setWorkspaceName(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-xs text-grayscale-11">Handle</p>
					<Input
						type="text"
						placeholder="Workspace Handle"
						value={workspaceHandle}
						onChange={(e) => setWorkspaceHandle(e.target.value)}
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
					Create Workspace
				</button>
			</form>
		</div>
	);
}
