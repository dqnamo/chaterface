"use client";

import { useParams } from "next/navigation";
import db from "@/instant.client";

export const useCurrentWorkspace = <T extends Record<string, unknown>>(
	children?: T,
) => {
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle =
		typeof workspaceHandle === "string" ? workspaceHandle : "";
	const { data, isLoading, error } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			...(children ?? {}),
		},
	});

	return {
		workspace: data?.workspaces?.[0],
		workspaceHandle: currentWorkspaceHandle,
		workspaceId: data?.workspaces?.[0]?.id,
		isLoading,
		error,
	};
};
