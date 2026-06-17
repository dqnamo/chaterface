import { readFile } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { getDevelopmentEmailOutboxDirectory } from "@/helpers/dev-email-outbox";

type RouteContext = {
	params: Promise<{
		emailId: string;
	}>;
};

const EMAIL_ID_PATTERN = /^[a-f0-9]{24}$/;

export async function GET(_req: NextRequest, context: RouteContext) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ message: "Not found" }, { status: 404 });
	}

	const { emailId } = await context.params;

	if (!EMAIL_ID_PATTERN.test(emailId)) {
		return NextResponse.json({ message: "Not found" }, { status: 404 });
	}

	try {
		const html = await readFile(
			path.join(getDevelopmentEmailOutboxDirectory(), `${emailId}.html`),
			"utf8",
		);

		return new NextResponse(html, {
			headers: {
				"Content-Type": "text/html; charset=utf-8",
			},
		});
	} catch {
		return NextResponse.json({ message: "Not found" }, { status: 404 });
	}
}
