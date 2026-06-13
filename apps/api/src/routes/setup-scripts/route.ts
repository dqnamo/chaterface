import db, { id } from "@repo/db/admin";
import { getBearerToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

type UpdateSetupScriptsBody = {
	newTaskSetupScript?: string;
	newTurnSetupScript?: string;
};

const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
	}

	return tx;
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

const getTaskForSetupScripts = async (agentToken: string) => {
	return db
		.query({
			tasks: {
				$: {
					where: {
						agentToken,
					},
				},
				factory: {
					$: {
						fields: ["newTaskSetupScript", "newTurnSetupScript"],
					},
				},
			},
		})
		.then((data) => data.tasks[0]);
};

export const GET: RouteHandler = async (c) => {
	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForSetupScripts(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return c.json({
		newTaskSetupScript: task.factory.newTaskSetupScript ?? "",
		newTurnSetupScript: task.factory.newTurnSetupScript ?? "",
	});
};

export const PUT: RouteHandler = async (c) => {
	const body = parseUpdateSetupScriptsBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					"Expected newTaskSetupScript or newTurnSetupScript when updating setup scripts",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForSetupScripts(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await db.transact([
		factoryTx(task.factory.id).update(body),
		eventTx(id())
			.create({
				type: "factoryplane.setup_scripts_updated",
				data: {
					updated: Object.keys(body),
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		newTaskSetupScript:
			body.newTaskSetupScript ?? task.factory.newTaskSetupScript ?? "",
		newTurnSetupScript:
			body.newTurnSetupScript ?? task.factory.newTurnSetupScript ?? "",
	});
};

const parseUpdateSetupScriptsBody = (
	value: unknown,
): UpdateSetupScriptsBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const body: UpdateSetupScriptsBody = {};

	if ("newTaskSetupScript" in value) {
		const script = parseSetupScriptValue(value.newTaskSetupScript);

		if (!script.ok) {
			return undefined;
		}

		body.newTaskSetupScript = script.value;
	}

	if ("newTurnSetupScript" in value) {
		const script = parseSetupScriptValue(value.newTurnSetupScript);

		if (!script.ok) {
			return undefined;
		}

		body.newTurnSetupScript = script.value;
	}

	return Object.keys(body).length > 0 ? body : undefined;
};

const parseSetupScriptValue = (
	value: unknown,
): { ok: true; value: string | undefined } | { ok: false } => {
	if (value === null) {
		return { ok: true, value: undefined };
	}

	if (typeof value !== "string") {
		return { ok: false };
	}

	const trimmed = value.trim();
	return { ok: true, value: trimmed.length > 0 ? trimmed : undefined };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
