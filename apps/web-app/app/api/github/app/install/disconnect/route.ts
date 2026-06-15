import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";
import {
	authenticateFactoryRequest,
	factoryTx,
	getNonEmptyString,
	readJson,
} from "../../../_lib/github-app";

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const factoryId = getNonEmptyString(body.factoryId);
	const authResult = await authenticateFactoryRequest(req, factoryId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	await db.transact(
		factoryTx(authResult.factory.id).update({
			githubAppInstallationAccountLogin: undefined,
			githubAppInstallationAccountType: undefined,
			githubAppInstallationId: undefined,
			githubAppInstalledAt: undefined,
		}),
	);

	return NextResponse.json({ message: "GitHub disconnected" });
}
