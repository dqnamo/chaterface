import db, { id } from "@/instant.admin";
import { randomBytes } from "crypto";
import { DateTime } from "luxon";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const { organisationId, memberId, email, role } = await req.json() as { organisationId: string, memberId: string, email: string, role: string };

  const refreshToken = req.headers.get("Authorization")?.split(" ")[1];
  const user = await db.auth.verifyToken(refreshToken as string);

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // create a new user
  const userId = id();
  const token = await db.auth.createToken({ id: userId });
  await db.transact(db.tx.$users[userId]!.update({
    email,
  }));

  const inviteToken = randomBytes(32).toString("hex");

  const member = await db.transact(db.tx.members[memberId]!.create({
    createdAt: DateTime.now().toISO(),
    inviteSentAt: DateTime.now().toISO(),
    inviteToken,
    joinedAt: null,
    role,
  }).link({ organisation: organisationId, user: userId }));


  // TODO send the email

  return NextResponse.json({ message: "Member invited" }, { status: 200 });
};