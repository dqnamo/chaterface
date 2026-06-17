"use client";

const LAST_WORKSPACE_COOKIE = "factoryplane_last_workspace";
const LAST_WORKSPACE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type LastWorkspace = {
	workspaceId: string;
	workspaceHandle: string;
	userId: string;
};

export const rememberLastWorkspace = (lastWorkspace: LastWorkspace) => {
	if (typeof document === "undefined") {
		return;
	}

	// biome-ignore lint/suspicious/noDocumentCookie: This preference needs a traditional cookie so it is available across all app routes.
	document.cookie = `${LAST_WORKSPACE_COOKIE}=${encodeURIComponent(
		JSON.stringify(lastWorkspace),
	)}; path=/; max-age=${LAST_WORKSPACE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
};

export const getRememberedWorkspace = (userId: string) => {
	if (typeof document === "undefined") {
		return;
	}

	const cookie = document.cookie
		.split("; ")
		.find((part) => part.startsWith(`${LAST_WORKSPACE_COOKIE}=`));

	if (!cookie) {
		return;
	}

	try {
		const parsed = JSON.parse(decodeURIComponent(cookie.split("=")[1] ?? ""));

		if (
			isLastWorkspace(parsed) &&
			parsed.userId === userId &&
			parsed.workspaceHandle.length > 0 &&
			parsed.workspaceId.length > 0
		) {
			return parsed;
		}
	} catch {
		return;
	}
};

const isLastWorkspace = (value: unknown): value is LastWorkspace => {
	return (
		typeof value === "object" &&
		value !== null &&
		"workspaceId" in value &&
		"workspaceHandle" in value &&
		"userId" in value &&
		typeof value.workspaceId === "string" &&
		typeof value.workspaceHandle === "string" &&
		typeof value.userId === "string"
	);
};
