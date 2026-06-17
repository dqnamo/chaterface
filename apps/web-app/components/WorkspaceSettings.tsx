"use client";

import { BuildingsIcon } from "@phosphor-icons/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import { Input } from "@/components/Input";
import { formatWorkspaceHandle } from "@/helpers/workspace-handle-helper";
import db from "@/instant.client";

const workspaceTx = (workspaceId: string) => {
	const tx = db.tx.workspaces[workspaceId];

	if (!tx) {
		throw new Error(`Workspace transaction builder ${workspaceId} not found`);
	}

	return tx;
};

const getFormString = (formData: FormData, key: string) => {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
};

export function WorkspaceSettingsContent() {
	const router = useRouter();
	const pathname = usePathname();
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;
	const [workspaceName, setWorkspaceName] = useState("");
	const [workspaceHandleValue, setWorkspaceHandleValue] = useState("");

	const { data, error } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
		},
	});

	const workspace = data?.workspaces?.[0];

	useEffect(() => {
		setWorkspaceName(workspace?.name ?? "");
		setWorkspaceHandleValue(workspace?.handle ?? currentWorkspaceHandle);
	}, [workspace?.handle, workspace?.name, currentWorkspaceHandle]);

	const updateWorkspaceNameValue = (nextName: string) => {
		const previousGeneratedHandle = formatWorkspaceHandle(workspaceName);

		setWorkspaceName(nextName);
		setWorkspaceHandleValue((currentHandle) =>
			currentHandle === previousGeneratedHandle
				? formatWorkspaceHandle(nextName)
				: currentHandle,
		);
	};

	const updateWorkspaceHandleValue = (nextHandle: string) => {
		setWorkspaceHandleValue(formatWorkspaceHandle(nextHandle));
	};

	const updateWorkspace = async (form: HTMLFormElement) => {
		if (!workspace) {
			return;
		}

		const formData = new FormData(form);
		const name = getFormString(formData, "name");
		const handle = formatWorkspaceHandle(getFormString(formData, "handle"));

		if (!name || !handle) {
			return;
		}

		await db.transact(
			workspaceTx(workspace.id).update({
				name,
				handle,
			}),
		);

		if (handle !== currentWorkspaceHandle) {
			router.replace(
				pathname.replace(`/${currentWorkspaceHandle}`, `/${handle}`),
			);
		}
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-1">
				<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
					Workspace Settings
				</p>
				<h1 className="text-lg font-medium text-grayscale-12">
					{workspace?.name ?? currentWorkspaceHandle}
				</h1>
				<p className="text-sm text-grayscale-10">
					Workspace name, handle, and identity settings.
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
						Workspace
					</div>
				</div>
				<form
					className="flex flex-col gap-3 p-3"
					onSubmit={(event) => {
						event.preventDefault();
						void updateWorkspace(event.currentTarget);
					}}
				>
					<div className="grid gap-3 md:grid-cols-2">
						<Field label="Name">
							<Input
								name="name"
								type="text"
								placeholder="Workspace name"
								value={workspaceName}
								onChange={(event) =>
									updateWorkspaceNameValue(event.target.value)
								}
							/>
						</Field>
						<Field label="Handle">
							<Input
								name="handle"
								type="text"
								placeholder="workspace-handle"
								value={workspaceHandleValue}
								onChange={(event) =>
									updateWorkspaceHandleValue(event.target.value)
								}
							/>
						</Field>
					</div>
					<div className="flex justify-end">
						<Button type="submit">Save Workspace</Button>
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
