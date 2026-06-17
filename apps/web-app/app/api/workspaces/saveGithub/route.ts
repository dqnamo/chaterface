import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";
import {
	authenticateWorkspaceRequest,
	getNonEmptyString,
	readJson,
} from "../../github/_lib/github-app";

export async function POST(req: NextRequest) {
	const requestId = randomUUID();

	try {
		const body = (await readJson(req)) as {
			workspaceId?: string;
			gitAuthorName?: string;
			gitAuthorEmail?: string;
		};
		const workspaceId = getNonEmptyString(body.workspaceId);
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
			workspaceId,
			hasGitAuthorName,
			hasGitAuthorEmail,
		});

		if (!workspaceId || (!hasGitAuthorName && !hasGitAuthorEmail)) {
			console.warn("saveGithub request missing required fields", {
				requestId,
				hasWorkspaceId: Boolean(workspaceId),
				hasGitAuthorName,
				hasGitAuthorEmail,
			});

			return NextResponse.json(
				{
					message: "workspaceId and at least one Git setting are required",
					requestId,
				},
				{ status: 400 },
			);
		}

		const authResult = await authenticateWorkspaceRequest(req, workspaceId);

		if (!authResult.ok) {
			console.warn("saveGithub request failed authentication", {
				requestId,
				workspaceId,
				status: authResult.status,
				message: authResult.message,
			});
			return NextResponse.json(
				{ message: authResult.message, requestId },
				{ status: authResult.status },
			);
		}

		const workspaceTx = db.tx.workspaces[workspaceId];

		if (!workspaceTx) {
			console.error("saveGithub workspace transaction builder not found", {
				requestId,
				workspaceId,
			});
			return NextResponse.json(
				{ message: "Workspace not found", requestId },
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

		await db.transact(workspaceTx.update(update));

		console.info("saveGithub credentials saved", {
			requestId,
			workspaceId,
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
