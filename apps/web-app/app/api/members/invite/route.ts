import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { getDevelopmentEmailOutboxDirectory } from "@/helpers/dev-email-outbox";
import db, { id } from "@/instant.admin";

type InviteMemberBody = {
	organisationId?: unknown;
	memberId?: unknown;
	email?: unknown;
	role?: unknown;
};

type InviteUser = {
	id: string;
	email?: string;
};

type InviteMember = {
	id: string;
	role?: string;
	user?: InviteUser;
};

type InviteOrganisation = {
	id: string;
	name: string;
	handle: string;
	members?: InviteMember[];
};

type InviteEmailDelivery = Awaited<ReturnType<typeof deliverInviteEmail>>;

const VALID_ROLES = new Set(["member", "admin", "owner"]);

const memberTx = (memberId: string) => {
	const tx = db.tx.members[memberId];

	if (!tx) {
		throw new Error(`Member transaction builder ${memberId} not found`);
	}

	return tx;
};

const userTx = (userId: string) => {
	const tx = db.tx.$users[userId];

	if (!tx) {
		throw new Error(`User transaction builder ${userId} not found`);
	}

	return tx;
};

export async function POST(req: NextRequest) {
	const body = parseInviteMemberBody(await readJson(req));

	if (!body) {
		return NextResponse.json(
			{ message: "organisationId, memberId, email, and role are required" },
			{ status: 400 },
		);
	}

	const authResult = await authenticateOrganisationRequest(
		req,
		body.organisationId,
	);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const existingMember = authResult.organisation.members?.find(
		(member) => normalizeEmail(member.user?.email) === body.email,
	);

	if (existingMember?.user?.email) {
		return NextResponse.json(
			{ message: "That email is already a member of this organisation" },
			{ status: 409 },
		);
	}

	const invitedUser = await getOrCreateUserForEmail(body.email);
	const inviteToken = randomBytes(32).toString("hex");
	const now = new Date().toISOString();

	await db.transact(
		memberTx(body.memberId)
			.create({
				createdAt: now,
				inviteToken,
				role: body.role,
			})
			.link({
				organisation: body.organisationId,
				user: invitedUser.id,
			}),
	);

	const inviteUrl = new URL(`/invites/${inviteToken}`, getAppOrigin(req));
	let delivery: InviteEmailDelivery | undefined;

	try {
		delivery = await deliverInviteEmail({
			email: body.email,
			inviteUrl: inviteUrl.toString(),
			organisationName: authResult.organisation.name,
			origin: req.nextUrl.origin,
		});

		await db.transact(
			memberTx(body.memberId).update({
				inviteSentAt: new Date().toISOString(),
			}),
		);
	} catch (error) {
		return NextResponse.json(
			{
				message: getErrorMessage(error, "Invite created, but email failed"),
			},
			{ status: 502 },
		);
	}

	return NextResponse.json(
		{
			message: "Invite sent",
			inviteUrl: inviteUrl.toString(),
			delivery,
		},
		{ status: 200 },
	);
}

const authenticateOrganisationRequest = async (
	req: NextRequest,
	organisationId: string,
) => {
	const refreshToken = req.headers.get("Authorization")?.split(" ")[1];
	const user = refreshToken ? await db.auth.verifyToken(refreshToken) : null;

	if (!user) {
		return {
			ok: false as const,
			status: 401,
			message: "Unauthorized",
		};
	}

	const organisation = await db
		.query({
			organisations: {
				$: {
					where: {
						id: organisationId,
					},
				},
				members: {
					user: {},
				},
			},
		})
		.then(
			(result) => result.organisations[0] as InviteOrganisation | undefined,
		);

	if (!organisation) {
		return {
			ok: false as const,
			status: 404,
			message: "Organisation not found",
		};
	}

	const isMember =
		organisation.members?.some((member) => member.user?.id === user.id) ??
		false;

	if (!isMember) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true as const, organisation, user };
};

const getOrCreateUserForEmail = async (email: string) => {
	const existingUser = await db
		.query({
			$users: {
				$: {
					where: {
						email,
					},
				},
			},
		})
		.then((result) => result.$users[0] as InviteUser | undefined);

	if (existingUser) {
		return existingUser;
	}

	const userId = id();

	await db.transact(
		userTx(userId).update({
			email,
		}),
	);

	return { id: userId, email };
};

const deliverInviteEmail = async ({
	email,
	inviteUrl,
	organisationName,
	origin,
}: {
	email: string;
	inviteUrl: string;
	organisationName: string;
	origin: string;
}) => {
	if (shouldUseDevelopmentEmailDelivery()) {
		return writeDevelopmentInviteEmail({
			email,
			inviteUrl,
			organisationName,
			origin,
		});
	}

	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken =
		process.env.CLOUDFLARE_EMAIL_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
	const from = process.env.INVITE_EMAIL_FROM;

	if (!accountId || !apiToken || !from) {
		throw new Error(
			"Cloudflare email is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_EMAIL_API_TOKEN, and INVITE_EMAIL_FROM.",
		);
	}

	const message = buildInviteEmailMessage({
		email,
		from,
		inviteUrl,
		organisationName,
	});
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(message),
		},
	);
	const result = (await response.json().catch(() => null)) as {
		success?: boolean;
		errors?: Array<{ message?: string }>;
	} | null;

	if (!response.ok || result?.success === false) {
		const message =
			result?.errors
				?.map((error) => error.message)
				.filter(Boolean)
				.join(", ") ||
			`Cloudflare email request failed with ${response.status}`;
		throw new Error(message);
	}

	return { type: "cloudflare" as const };
};

const writeDevelopmentInviteEmail = async ({
	email,
	inviteUrl,
	organisationName,
	origin,
}: {
	email: string;
	inviteUrl: string;
	organisationName: string;
	origin: string;
}) => {
	const emailId = randomBytes(12).toString("hex");
	const message = buildInviteEmailMessage({
		email,
		inviteUrl,
		organisationName,
		from: "dev@factoryplane.local",
	});
	const outboxDirectory = getDevelopmentEmailOutboxDirectory();

	await mkdir(outboxDirectory, { recursive: true });
	await writeFile(
		path.join(outboxDirectory, `${emailId}.html`),
		[
			"<!doctype html>",
			'<meta charset="utf-8" />',
			`<title>${escapeHtml(message.subject)}</title>`,
			'<body style="font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; line-height: 1.5;">',
			'<div style="border: 1px solid #ddd; padding: 16px; margin-bottom: 24px;">',
			`<p><strong>To:</strong> ${escapeHtml(email)}</p>`,
			`<p><strong>From:</strong> ${escapeHtml(message.from)}</p>`,
			`<p><strong>Subject:</strong> ${escapeHtml(message.subject)}</p>`,
			"</div>",
			message.html,
			"</body>",
		].join("\n"),
		"utf8",
	);

	return {
		type: "development" as const,
		previewUrl: new URL(`/api/dev/emails/${emailId}`, origin).toString(),
	};
};

const buildInviteEmailMessage = ({
	email,
	from,
	inviteUrl,
	organisationName,
}: {
	email: string;
	from: string;
	inviteUrl: string;
	organisationName: string;
}) => {
	const safeOrganisationName = escapeHtml(organisationName);
	const safeInviteUrl = escapeHtml(inviteUrl);

	return {
		to: email,
		from,
		subject: `Join ${organisationName} on Factoryplane`,
		html: [
			`<p>You have been invited to join <strong>${safeOrganisationName}</strong> on Factoryplane.</p>`,
			`<p><a href="${safeInviteUrl}">Accept your invite</a></p>`,
			`<p>If the button does not work, copy and paste this URL into your browser:</p>`,
			`<p>${safeInviteUrl}</p>`,
		].join(""),
		text: [
			`You have been invited to join ${organisationName} on Factoryplane.`,
			"",
			`Accept your invite: ${inviteUrl}`,
		].join("\n"),
	};
};

const shouldUseDevelopmentEmailDelivery = () =>
	process.env.NODE_ENV !== "production" &&
	process.env.EMAIL_DELIVERY !== "cloudflare";

const getAppOrigin = (req: NextRequest) => {
	const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

	if (configuredOrigin) {
		return configuredOrigin;
	}

	return req.nextUrl.origin;
};

const parseInviteMemberBody = (body: unknown) => {
	const record = isRecord(body) ? (body as InviteMemberBody) : {};
	const organisationId = getNonEmptyString(record.organisationId);
	const memberId = getNonEmptyString(record.memberId);
	const email = normalizeEmail(record.email);
	const role = getNonEmptyString(record.role) ?? "member";

	if (!organisationId || !memberId || !email || !VALID_ROLES.has(role)) {
		return null;
	}

	return {
		organisationId,
		memberId,
		email,
		role,
	};
};

const readJson = async (req: NextRequest) => {
	try {
		return await req.json();
	} catch {
		return null;
	}
};

const normalizeEmail = (value: unknown) =>
	typeof value === "string" && value.trim().includes("@")
		? value.trim().toLowerCase()
		: undefined;

const getNonEmptyString = (value: unknown) =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const isRecord = (value: unknown) =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const escapeHtml = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

const getErrorMessage = (error: unknown, fallback: string) =>
	error instanceof Error ? error.message : fallback;
