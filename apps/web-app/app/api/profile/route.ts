import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";

type MemberRecord = {
	id: string;
	user?: {
		id: string;
	};
};

const userTx = (userId: string) => {
	const tx = db.tx.$users[userId];

	if (!tx) {
		throw new Error(`User transaction builder ${userId} not found`);
	}

	return tx;
};

const memberTx = (memberId: string) => {
	const tx = db.tx.members[memberId];

	if (!tx) {
		throw new Error(`Member transaction builder ${memberId} not found`);
	}

	return tx;
};

export async function POST(req: NextRequest) {
	const refreshToken = getBearerToken(req.headers.get("Authorization"));

	if (!refreshToken) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const user = await db.auth.verifyToken(refreshToken).catch(() => undefined);

	if (!user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = await readJson(req);
	const hasUserName = Object.hasOwn(body, "userName");
	const hasMemberName = Object.hasOwn(body, "memberName");
	const memberId = getOptionalString(body.memberId);

	if (!hasUserName && !hasMemberName) {
		return NextResponse.json(
			{ message: "At least one name is required" },
			{ status: 400 },
		);
	}

	if (hasUserName) {
		await db.transact(
			userTx(user.id).update({
				name: normalizeName(body.userName),
			}),
		);
	}

	if (hasMemberName) {
		if (!memberId) {
			return NextResponse.json(
				{ message: "memberId is required to update member name" },
				{ status: 400 },
			);
		}

		const member = await db
			.query({
				members: {
					$: {
						where: {
							id: memberId,
						},
					},
					user: {},
				},
			})
			.then((result) => result.members[0] as MemberRecord | undefined);

		if (!member || member.user?.id !== user.id) {
			return NextResponse.json(
				{ message: "Member not found" },
				{ status: 404 },
			);
		}

		await db.transact(
			memberTx(memberId).update({
				name: normalizeName(body.memberName),
			}),
		);
	}

	return NextResponse.json({ message: "Profile saved" });
}

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

const readJson = async (req: NextRequest) => {
	try {
		const value = (await req.json()) as unknown;
		return isRecord(value) ? value : {};
	} catch {
		return {};
	}
};

const getOptionalString = (value: unknown) =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const normalizeName = (value: unknown) =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
