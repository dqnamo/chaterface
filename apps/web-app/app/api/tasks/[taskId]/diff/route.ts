import db from "@repo/db/admin";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	req: NextRequest,
	context: { params: Promise<{ taskId: string }> },
) {
	const authorizationHeader = req.headers.get("Authorization");
	const refreshToken = authorizationHeader?.startsWith("Bearer ")
		? authorizationHeader.slice("Bearer ".length)
		: undefined;

	if (!refreshToken) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const user = await db.auth.verifyToken(refreshToken);

	if (!user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const { taskId } = await context.params;
	const task = await db
		.query({
			tasks: {
				$: {
					where: {
						id: taskId,
					},
				},
			},
		})
		.then((result) => result.tasks[0]);

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
