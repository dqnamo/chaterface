import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";
import {
	authenticateWorkspaceRequest,
	getNonEmptyString,
	readJson,
	workspaceTx,
} from "../../../_lib/github-app";

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const workspaceId = getNonEmptyString(body.workspaceId);
	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	await db.transact(
		workspaceTx(authResult.workspace.id).update({
			githubAppInstallationAccountLogin: undefined,
			githubAppInstallationAccountType: undefined,
			githubAppInstallationId: undefined,
			githubAppInstalledAt: undefined,
		}),
	);

	return NextResponse.json({ message: "GitHub disconnected" });
}
