import { createHmac } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";

type PreviewSession = {
	serviceId: string;
	userId: string;
	exp: number;
};

const ticketTtlMs = 60 * 1000;

export async function POST(req: NextRequest) {
	const authorizationHeader = req.headers.get("Authorization");
	const refreshToken = authorizationHeader?.startsWith("Bearer ")
		? authorizationHeader.slice("Bearer ".length)
		: undefined;

	if (!refreshToken) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const user = await db.auth.verifyToken(refreshToken);

	if (!user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json();
	const serviceId = getNonEmptyString(body?.serviceId);

	if (!serviceId) {
		return NextResponse.json(
			{ message: "Expected serviceId" },
			{ status: 400 },
		);
	}

	const service = await db
		.query({
			services: {
				$: {
					where: {
						id: serviceId,
					},
				},
				task: {},
			},
		})
		.then((result) => result.services[0]);

	if (!service) {
		return NextResponse.json(
			{ message: "Preview service not found" },
			{ status: 404 },
		);
	}

	if (!service.e2bHost) {
		return NextResponse.json(
			{
				message:
					"Preview service is missing its E2B upstream. Stop it and start it again after deploying the latest API.",
			},
			{ status: 409 },
		);
	}

	if (!service.task?.sandboxTrafficAccessToken) {
		return NextResponse.json(
			{
				message:
					"Preview sandbox is missing a private access token. Recreate the task sandbox and start the service again.",
			},
			{ status: 409 },
		);
	}

	const ticket = signValue({
		serviceId,
		userId: user.id,
		exp: Date.now() + ticketTtlMs,
	});
	const domain =
		process.env.NEXT_PUBLIC_FACTORYPLANE_PREVIEWS_DOMAIN ??
		process.env.FACTORYPLANE_PREVIEWS_DOMAIN ??
		"previews.factoryplane.com";

	return NextResponse.json({
		url: `https://${serviceId}.${domain}/__factoryplane/preview-session?ticket=${ticket}`,
	});
}

const signValue = (value: PreviewSession) => {
	const secret = process.env.FACTORYPLANE_PREVIEW_SESSION_SECRET;

	if (!secret) {
		throw new Error("FACTORYPLANE_PREVIEW_SESSION_SECRET is not configured");
	}

	const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
	const signature = createHmac("sha256", secret)
		.update(payload)
		.digest("base64url");

	return `${payload}.${signature}`;
};

const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};
