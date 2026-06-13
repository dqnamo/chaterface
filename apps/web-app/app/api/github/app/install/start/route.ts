import { type NextRequest, NextResponse } from "next/server";
import {
	authenticateFactoryRequest,
	createGithubAppState,
	getGithubAppConfig,
	getNonEmptyString,
	readJson,
	setGithubAppStateCookie,
} from "../../../_lib/github-app";

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const factoryId = getNonEmptyString(body.factoryId);
	const redirectPath = getNonEmptyString(body.redirectPath) ?? "/";
	const authResult = await authenticateFactoryRequest(req, factoryId);

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
		factoryId: authResult.factory.id,
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
