import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";
import {
	authenticateFactoryRequest,
	getNonEmptyString,
	readJson,
} from "../../github/_lib/github-app";

export async function POST(req: NextRequest) {
	const requestId = randomUUID();

	try {
		const body = (await readJson(req)) as {
			factoryId?: string;
			gitAuthorName?: string;
			gitAuthorEmail?: string;
		};
		const factoryId = getNonEmptyString(body.factoryId);
		const hasGitAuthorName = Object.hasOwn(body, "gitAuthorName");
		const hasGitAuthorEmail = Object.hasOwn(body, "gitAuthorEmail");
		const gitAuthorName =
			typeof body.gitAuthorName === "string"
				? body.gitAuthorName.trim()
				: undefined;
		const gitAuthorEmail =
			typeof body.gitAuthorEmail === "string"
				? body.gitAuthorEmail.trim()
				: undefined;

		console.info("saveGithub request received", {
			requestId,
			url: req.url,
			hasAuthorizationHeader: Boolean(req.headers.get("Authorization")),
			factoryId,
			hasGitAuthorName,
			hasGitAuthorEmail,
		});

		if (!factoryId || (!hasGitAuthorName && !hasGitAuthorEmail)) {
			console.warn("saveGithub request missing required fields", {
				requestId,
				hasFactoryId: Boolean(factoryId),
				hasGitAuthorName,
				hasGitAuthorEmail,
			});

			return NextResponse.json(
				{
					message: "factoryId and at least one Git setting are required",
					requestId,
				},
				{ status: 400 },
			);
		}

		const authResult = await authenticateFactoryRequest(req, factoryId);

		if (!authResult.ok) {
			console.warn("saveGithub request failed authentication", {
				requestId,
				factoryId,
				status: authResult.status,
				message: authResult.message,
			});
			return NextResponse.json(
				{ message: authResult.message, requestId },
				{ status: authResult.status },
			);
		}

		const factoryTx = db.tx.factories[factoryId];

		if (!factoryTx) {
			console.error("saveGithub factory transaction builder not found", {
				requestId,
				factoryId,
			});
			return NextResponse.json(
				{ message: "Factory not found", requestId },
				{ status: 404 },
			);
		}

		const update: {
			gitAuthorName?: string;
			gitAuthorEmail?: string;
		} = {};

		if (hasGitAuthorName) {
			update.gitAuthorName = gitAuthorName || undefined;
		}

		if (hasGitAuthorEmail) {
			update.gitAuthorEmail = gitAuthorEmail || undefined;
		}

		await db.transact(factoryTx.update(update));

		console.info("saveGithub credentials saved", {
			requestId,
			factoryId,
			userId: authResult.user.id,
		});

		return NextResponse.json(
			{ message: "GitHub settings saved", requestId },
			{ status: 200 },
		);
	} catch (error) {
		console.error("saveGithub request failed", {
			requestId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return NextResponse.json(
			{ message: "Failed to save GitHub settings", requestId },
			{ status: 500 },
		);
	}
}
