import db, { id } from "@repo/db/admin";
import { getBearerToken, getTaskForAgentToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

type CommandInput = {
	command: string;
	runOnNewTask: boolean;
	runOnNewTurn: boolean;
};

const workspaceTx = (workspaceId: string) => {
	const tx = db.tx.workspaces[workspaceId];

	if (!tx) {
		throw new Error(`Workspace transaction builder ${workspaceId} not found`);
	}

	return tx;
};

const commandTx = (commandId: string) => {
	const tx = db.tx.commands[commandId];

	if (!tx) {
		throw new Error(`Command transaction builder ${commandId} not found`);
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

export const GET: RouteHandler = async (c) => {
	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	const workspace = task.workspace;

	return c.json({
		commands: getWorkspaceCommands(workspace),
	});
};

export const POST: RouteHandler = async (c) => {
	const body = parseCommandsBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					"Expected command or commands with runOnNewTask/runOnNewTurn flags",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	const workspace = task.workspace;

	const workspaceId = workspace.id;
	const now = new Date().toISOString();

	await db.transact([
		workspaceTx(workspaceId).update({
			newTaskSetupScript: undefined,
			newTurnSetupScript: undefined,
		}),
		...body.commands.map((command) =>
			commandTx(id())
				.create({
					...command,
					createdAt: now,
					updatedAt: now,
				})
				.link({ workspace: workspaceId }),
		),
		eventTx(id())
			.create({
				type: "chaterface.commands_updated",
				data: {
					added: body.commands.length,
					commands: body.commands,
				},
				createdAt: now,
			})
			.link({ task: task.id }),
	]);

	return c.json({
		commands: [...getWorkspaceCommands(workspace), ...body.commands],
	});
};

export const PUT: RouteHandler = async (c) => {
	const body = parseCommandsBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					"Expected command or commands with runOnNewTask/runOnNewTurn flags",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	const workspace = task.workspace;

	const workspaceId = workspace.id;
	const existingCommands = workspace.commands ?? [];
	const now = new Date().toISOString();

	await db.transact([
		workspaceTx(workspaceId).update({
			newTaskSetupScript: undefined,
			newTurnSetupScript: undefined,
		}),
		...existingCommands.map((command) => commandTx(command.id).delete()),
		...body.commands.map((command) =>
			commandTx(id())
				.create({
					...command,
					createdAt: now,
					updatedAt: now,
				})
				.link({ workspace: workspaceId }),
		),
		eventTx(id())
			.create({
				type: "chaterface.commands_updated",
				data: {
					replaced: true,
					commands: body.commands,
				},
				createdAt: now,
			})
			.link({ task: task.id }),
	]);

	return c.json({
		commands: body.commands,
	});
};

const getWorkspaceCommands = (workspace: {
	commands?: Array<
		Partial<CommandInput> & {
			id: string;
			command: string;
			createdAt?: string | number | Date;
		}
	>;
}) => {
	return [...(workspace.commands ?? [])]
		.sort(
			(a, b) =>
				new Date(a.createdAt ?? 0).getTime() -
				new Date(b.createdAt ?? 0).getTime(),
		)
		.map((command) => ({
			id: command.id,
			command: command.command,
			runOnNewTask: command.runOnNewTask ?? false,
			runOnNewTurn: command.runOnNewTurn ?? false,
		}));
};

const parseCommandsBody = (value: unknown) => {
	if (!isRecord(value)) {
		return undefined;
	}

	if ("commands" in value) {
		const commands = parseCommandList(value.commands);
		return commands ? { commands } : undefined;
	}

	const command = parseCommandInput(value);
	return command ? { commands: [command] } : undefined;
};

const parseCommandList = (value: unknown) => {
	if (!Array.isArray(value)) {
		return undefined;
	}

	const commands: CommandInput[] = [];

	for (const item of value) {
		const command =
			typeof item === "string"
				? parseCommandInput({ command: item })
				: parseCommandInput(item);

		if (!command) {
			return undefined;
		}

		commands.push(command);
	}

	return commands;
};

const parseCommandInput = (value: unknown): CommandInput | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const command = getNonEmptyString(value.command);
	const runOnNewTask =
		typeof value.runOnNewTask === "boolean" ? value.runOnNewTask : true;
	const runOnNewTurn =
		typeof value.runOnNewTurn === "boolean" ? value.runOnNewTurn : false;

	if (!command || (!runOnNewTask && !runOnNewTurn)) {
		return undefined;
	}

	return {
		command,
		runOnNewTask,
		runOnNewTurn,
	};
};

const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
