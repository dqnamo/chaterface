import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";
import {
	clearGithubAppStateCookie,
	GITHUB_APP_STATE_COOKIE,
	getAuthenticatedWorkspace,
	getGithubAppConfig,
	getGithubAppInstallation,
	hasWorkspaceAccess,
	verifyGithubAppState,
	workspaceTx,
} from "../../../_lib/github-app";

export async function GET(req: NextRequest) {
	const requestState = req.nextUrl.searchParams.get("state") ?? "";
	const cookieState = req.cookies.get(GITHUB_APP_STATE_COOKIE)?.value ?? "";
	const verifiedState =
		requestState && cookieState && requestState === cookieState
			? verifyGithubAppState(requestState)
			: undefined;
	const redirectPath = verifiedState?.redirectPath ?? "/";

	if (!verifiedState) {
		return redirectWithStatus(
			req,
			redirectPath,
			"github_error",
			"invalid_state",
		);
	}

	const setupAction = req.nextUrl.searchParams.get("setup_action");
	const installationId = req.nextUrl.searchParams.get("installation_id");

	if (setupAction === "request") {
		return redirectWithStatus(req, redirectPath, "github_error", "requested");
	}

	if (!installationId) {
		return redirectWithStatus(
			req,
			redirectPath,
			"github_error",
			"missing_installation",
		);
	}

	const workspace = await getAuthenticatedWorkspace(verifiedState.workspaceId);

	if (!workspace || !hasWorkspaceAccess(workspace, verifiedState.userId)) {
		return redirectWithStatus(req, redirectPath, "github_error", "forbidden");
	}

	const config = getGithubAppConfig();

	if (!config.ok) {
		return redirectWithStatus(
			req,
			redirectPath,
			"github_error",
			"not_configured",
		);
	}

	let installation: Awaited<ReturnType<typeof getGithubAppInstallation>>;

	try {
		installation = await getGithubAppInstallation(installationId, config);
	} catch (error) {
		console.error("Failed to load GitHub App installation", {
			workspaceId: workspace.id,
			installationId,
			error: error instanceof Error ? error.message : String(error),
		});

		return redirectWithStatus(
			req,
			redirectPath,
			"github_error",
			"installation_lookup_failed",
		);
	}

	try {
		await db.transact(
			workspaceTx(workspace.id).update({
				githubAppInstallationAccountLogin: installation.account?.login,
				githubAppInstallationAccountType: installation.account?.type,
				githubAppInstallationId: installationId,
				githubAppInstalledAt: new Date(),
			}),
		);

		const updatedWorkspace = await getAuthenticatedWorkspace(workspace.id);

		if (updatedWorkspace?.githubAppInstallationId !== installationId) {
			console.error("GitHub App installation did not persist", {
				workspaceId: workspace.id,
				installationId,
				persistedInstallationId: updatedWorkspace?.githubAppInstallationId,
			});

			return redirectWithStatus(
				req,
				redirectPath,
				"github_error",
				"save_failed",
			);
		}
	} catch (error) {
		console.error("Failed to save GitHub App installation", {
			workspaceId: workspace.id,
			installationId,
			error: error instanceof Error ? error.message : String(error),
		});

		return redirectWithStatus(req, redirectPath, "github_error", "save_failed");
	}

	return redirectWithStatus(req, redirectPath, "github", "connected");
}

const redirectWithStatus = (
	req: NextRequest,
	redirectPath: string,
	key: "github" | "github_error",
	value: string,
) => {
	const url = new URL(redirectPath, req.nextUrl.origin);
	url.searchParams.set(key, value);

	const response = NextResponse.redirect(url);
	clearGithubAppStateCookie(response);

	return response;
};
