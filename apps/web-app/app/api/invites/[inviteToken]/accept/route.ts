import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";

type RouteContext = {
	params: Promise<{
		inviteToken: string;
	}>;
};

type InviteMember = {
	id: string;
	joinedAt?: string;
	user?: {
		id: string;
		email?: string;
	};
	organisation?: {
		handle?: string;
		factories?: Array<{
			id: string;
		}>;
	};
};

const memberTx = (memberId: string) => {
	const tx = db.tx.members[memberId];

	if (!tx) {
		throw new Error(`Member transaction builder ${memberId} not found`);
	}

	return tx;
};

export async function POST(req: NextRequest, context: RouteContext) {
	const { inviteToken } = await context.params;
	const refreshToken = req.headers.get("Authorization")?.split(" ")[1];
	const authUser = refreshToken
		? await db.auth.verifyToken(refreshToken)
		: null;

	if (!authUser) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const member = await db
		.query({
			members: {
				$: {
					where: {
						inviteToken,
					},
				},
				user: {},
				organisation: {
					factories: {},
				},
			},
		})
		.then((result) => result.members[0] as InviteMember | undefined);

	if (!member) {
		return NextResponse.json({ message: "Invite not found" }, { status: 404 });
	}

	if (member.joinedAt) {
		return NextResponse.json({
			message: "Invite already accepted",
			redirectTo: getOrganisationRedirectPath(member),
		});
	}

	if (!doesAuthUserMatchInvite(authUser, member)) {
		return NextResponse.json(
			{ message: "Sign in with the email address this invite was sent to" },
			{ status: 403 },
		);
	}

	const transaction = memberTx(member.id).update({
		inviteToken: undefined,
		joinedAt: new Date().toISOString(),
	});

	await db.transact(
		member.user?.id === authUser.id
			? transaction
			: transaction.link({
					user: authUser.id,
				}),
	);

	return NextResponse.json({
		message: "Invite accepted",
		redirectTo: getOrganisationRedirectPath(member),
	});
}

const doesAuthUserMatchInvite = (
	authUser: { id: string; email?: string | null },
	member: InviteMember,
) => {
	if (member.user?.id === authUser.id) {
		return true;
	}

	const authEmail = normalizeEmail(authUser.email);
	const inviteEmail = normalizeEmail(member.user?.email);

	return Boolean(authEmail && inviteEmail && authEmail === inviteEmail);
};

const getOrganisationRedirectPath = (member: InviteMember) => {
	const orgHandle = member.organisation?.handle;

	if (!orgHandle) {
		return "/";
	}

	const factoryId = member.organisation?.factories?.[0]?.id;

	if (factoryId) {
		return `/${orgHandle}/factories/${factoryId}`;
	}

	return `/${orgHandle}/factories`;
};

const normalizeEmail = (value: unknown) =>
	typeof value === "string" && value.trim().includes("@")
		? value.trim().toLowerCase()
		: undefined;
