import { NextResponse } from "next/server";
import { runProcessEventWorkflow } from "@/workflow-workers/process-event";
import {
	authenticateInternalWorkflowRequest,
	getNonEmptyString,
	readJson,
} from "../_lib";

export async function POST(req: Request) {
	const authError = authenticateInternalWorkflowRequest(req);

	if (authError) {
		return authError;
	}

	const body = await readJson(req);
	const eventId = getNonEmptyString(body.eventId);

	if (!eventId) {
		return NextResponse.json(
			{ message: "eventId is required" },
			{ status: 400 },
		);
	}

	await runProcessEventWorkflow({ eventId });

	return NextResponse.json({ ok: true });
}
