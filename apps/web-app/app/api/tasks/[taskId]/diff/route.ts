import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";
import { authErrorResponse, authenticateTaskRequest } from "../../../_lib/auth";

export async function GET(
	req: NextRequest,
	context: { params: Promise<{ taskId: string }> },
) {
	const { taskId } = await context.params;
	const authResult = await authenticateTaskRequest(req, taskId);

	if (!authResult.ok) {
		return authErrorResponse(authResult);
	}

	const task = authResult.entity;

	if (!task?.latestDiffPath) {
		return new NextResponse("", {
			headers: {
				"Cache-Control": "no-store",
				"Content-Type": "text/x-patch; charset=utf-8",
			},
		});
	}

	const downloadUrl = await db.storage.getDownloadUrl(task.latestDiffPath);
	const response = await fetch(downloadUrl, { cache: "no-store" });

	if (!response.ok) {
		return NextResponse.json(
			{ message: "Failed to load task diff" },
			{ status: 502 },
		);
	}

	return new NextResponse(await response.text(), {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "text/x-patch; charset=utf-8",
		},
	});
}
