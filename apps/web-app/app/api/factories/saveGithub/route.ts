import { randomUUID } from "node:crypto";
import db from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const requestId = randomUUID();

	try {
		const body = (await req.json()) as {
			factoryId?: string;
			githubAccessToken?: string;
		};
		const { factoryId, githubAccessToken } = body;
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
			hasGithubAccessToken: Boolean(githubAccessToken),
		});

		if (!factoryId || !githubAccessToken) {
			console.warn("saveGithub request missing required fields", {
				requestId,
				hasFactoryId: Boolean(factoryId),
				hasGithubAccessToken: Boolean(githubAccessToken),
			});

			return NextResponse.json(
				{ message: "factoryId and githubAccessToken are required", requestId },
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
		const githubAccessTokenEncrypted =
			await encryptionService.encrypt(githubAccessToken);
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

		await db.transact(
			factoryTx.update({
				githubAccessTokenEncrypted,
			}),
		);

		console.info("saveGithub credentials saved", {
			requestId,
			factoryId,
			userId: user.id,
		});

		// TODO save the repository
		return NextResponse.json(
			{ message: "GitHub access token saved", requestId },
			{ status: 200 },
		);
	} catch (error) {
		console.error("saveGithub request failed", {
			requestId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return NextResponse.json(
			{ message: "Failed to save GitHub access token", requestId },
			{ status: 500 },
		);
	}
}
