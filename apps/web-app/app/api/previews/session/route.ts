import { createHmac } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { authErrorResponse, authenticateServiceRequest } from "../../_lib/auth";

type PreviewSession = {
	serviceId: string;
	userId: string;
	exp: number;
};

const ticketTtlMs = 60 * 1000;

export async function POST(req: NextRequest) {
	const body = await req.json();
	const serviceId = getNonEmptyString(body?.serviceId);

	if (!serviceId) {
		return NextResponse.json(
			{ message: "Expected serviceId" },
			{ status: 400 },
		);
	}

	const authResult = await authenticateServiceRequest(req, serviceId);

	if (!authResult.ok) {
		return authErrorResponse(authResult);
	}

	const { entity: service, user } = authResult;

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
		process.env.NEXT_PUBLIC_PREVIEWS_DOMAIN ??
		process.env.PREVIEWS_DOMAIN ??
		"previews.chaterface.com";

	return NextResponse.json({
		url: `https://${serviceId}.${domain}/__chaterface/preview-session?ticket=${ticket}`,
	});
}

const signValue = (value: PreviewSession) => {
	const secret = process.env.PREVIEW_SESSION_SECRET;

	if (!secret) {
		throw new Error("PREVIEW_SESSION_SECRET is not configured");
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
