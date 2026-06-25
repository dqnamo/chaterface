import { NextResponse } from "next/server";
import { runStartCodexDeviceAuthWorkflow } from "@/workflow-workers/start-codex-device-auth";
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
	const agentId = getNonEmptyString(body.agentId);

	if (!agentId) {
		return NextResponse.json(
			{ message: "agentId is required" },
			{ status: 400 },
		);
	}

	const result = await runStartCodexDeviceAuthWorkflow({ agentId });

	return NextResponse.json(result);
}
