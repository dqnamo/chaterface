import db from "@repo/db/admin";
import type { RouteHandler } from "../../lib/file-router.js";

export const GET: RouteHandler = async (c) => {
	const token = c.req.header("Authorization")?.split(" ")[1];

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await db
		.query({
			tasks: {
				$: {
					where: {
						agentToken: token,
					},
				},
				services: {},
				factory: {
					secrets: {},
				},
			},
		})
		.then((data) => data.tasks[0]);

	if (!task) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return c.json({
		secrets: task.factory?.secrets ?? [],
	});
};
