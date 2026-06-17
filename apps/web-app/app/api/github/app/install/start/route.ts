import { type NextRequest, NextResponse } from "next/server";
import {
	authenticateWorkspaceRequest,
	createGithubAppState,
	getGithubAppConfig,
	getNonEmptyString,
	readJson,
	setGithubAppStateCookie,
} from "../../../_lib/github-app";

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const workspaceId = getNonEmptyString(body.workspaceId);
	const redirectPath = getNonEmptyString(body.redirectPath) ?? "/";
	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const config = getGithubAppConfig();

	if (!config.ok) {
		return NextResponse.json({ message: config.message }, { status: 500 });
	}

	const state = createGithubAppState({
		workspaceId: authResult.workspace.id,
		userId: authResult.user.id,
		redirectPath,
	});
	const installationUrl = new URL(
		`https://github.com/apps/${config.appSlug}/installations/new`,
	);
	installationUrl.searchParams.set("state", state);

	const response = NextResponse.json({
		installationUrl: installationUrl.toString(),
	});
	setGithubAppStateCookie(response, state);

	return response;
}
