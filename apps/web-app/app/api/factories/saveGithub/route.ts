import { randomUUID } from "node:crypto";
import db from "@/instant.admin";
import { createEncryptionService } from "@/encryption";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const requestId = randomUUID();

	try {
		const body = (await req.json()) as {
			factoryId?: string;
			githubAccessToken?: string;
			gitAuthorName?: string;
			gitAuthorEmail?: string;
		};
		const { factoryId, githubAccessToken } = body;
		const hasGitAuthorName = Object.hasOwn(body, "gitAuthorName");
		const hasGitAuthorEmail = Object.hasOwn(body, "gitAuthorEmail");
		const trimmedGithubAccessToken = githubAccessToken?.trim();
		const gitAuthorName =
			typeof body.gitAuthorName === "string"
				? body.gitAuthorName.trim()
				: undefined;
		const gitAuthorEmail =
			typeof body.gitAuthorEmail === "string"
				? body.gitAuthorEmail.trim()
				: undefined;
		const authorizationHeader = req.headers.get("Authorization");
		const refreshToken = authorizationHeader?.startsWith("Bearer ")
			? authorizationHeader.slice("Bearer ".length)
			: undefined;

		console.info("saveGithub request received", {
			requestId,
			url: req.url,
			hasAuthorizationHeader: Boolean(authorizationHeader),
			hasRefreshToken: Boolean(refreshToken),
			factoryId,
			hasGithubAccessToken: Boolean(trimmedGithubAccessToken),
			hasGitAuthorName,
			hasGitAuthorEmail,
		});

		if (
			!factoryId ||
			(!trimmedGithubAccessToken && !hasGitAuthorName && !hasGitAuthorEmail)
		) {
			console.warn("saveGithub request missing required fields", {
				requestId,
				hasFactoryId: Boolean(factoryId),
				hasGithubAccessToken: Boolean(trimmedGithubAccessToken),
				hasGitAuthorName,
				hasGitAuthorEmail,
			});

			return NextResponse.json(
				{
					message: "factoryId and at least one GitHub setting are required",
					requestId,
				},
				{ status: 400 },
			);
		}

		if (!refreshToken) {
			console.warn("saveGithub request missing bearer token", {
				requestId,
				factoryId,
			});
			return NextResponse.json(
				{ message: "Unauthorized", requestId },
				{ status: 401 },
			);
		}

		const user = await db.auth.verifyToken(refreshToken);

		if (!user) {
			console.warn("saveGithub request had invalid token", {
				requestId,
				factoryId,
			});
			return NextResponse.json(
				{ message: "Unauthorized", requestId },
				{ status: 401 },
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
			githubAccessTokenEncrypted?: string;
			gitAuthorName?: string;
			gitAuthorEmail?: string;
		} = {};

		if (trimmedGithubAccessToken) {
			const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;
			if (!encryptionKey) {
				console.error("saveGithub secret encryption key is not configured", {
					requestId,
					factoryId,
				});
				return NextResponse.json(
					{
						message: "Secret encryption key is not configured",
						requestId,
					},
					{ status: 500 },
				);
			}

			const encryptionService = createEncryptionService(encryptionKey);
			update.githubAccessTokenEncrypted = await encryptionService.encrypt(
				trimmedGithubAccessToken,
			);
		}

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
			userId: user.id,
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
