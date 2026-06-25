import { NextResponse } from "next/server";

export const authenticateInternalWorkflowRequest = (req: Request) => {
	const expected =
		process.env.WORKFLOW_INTERNAL_SECRET?.trim() ??
		process.env.SECRET_ENCRYPTION_KEY?.trim();

	if (!expected) {
		return NextResponse.json(
			{
				message:
					"WORKFLOW_INTERNAL_SECRET or SECRET_ENCRYPTION_KEY is required.",
			},
			{ status: 500 },
		);
	}

	const actual = req.headers.get("x-chaterface-internal-workflow-secret");

	if (actual !== expected) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	return undefined;
};

export const readJson = async (req: Request) => {
	try {
		const value = (await req.json()) as unknown;
		return isRecord(value) ? value : {};
	} catch {
		return {};
	}
};

export const getNonEmptyString = (value: unknown) =>
	typeof value === "string" && value.trim() ? value.trim() : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
