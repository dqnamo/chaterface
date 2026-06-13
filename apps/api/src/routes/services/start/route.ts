import db, { id } from "@repo/db/admin";
import type { CommandHandle } from "e2b/dist/index.mjs";
import { Sandbox } from "e2b/dist/index.mjs";
import type { RouteHandler } from "../../../lib/file-router.js";

type StartServiceBody = {
	name: string;
	command: string;
	cwd: string;
	portNumber: number;
	healthPath: string;
};

const serviceTx = (serviceId: string) => {
	const tx = db.tx.services[serviceId];

	if (!tx) {
		throw new Error(`Service transaction builder ${serviceId} not found`);
	}

	return tx;
};

const terminalSessionTx = (terminalSessionId: string) => {
	const tx = db.tx.terminalSessions[terminalSessionId];

	if (!tx) {
		throw new Error(
			`Terminal session transaction builder ${terminalSessionId} not found`,
		);
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

export const POST: RouteHandler = async (c) => {
	const body = parseStartServiceBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					"Expected name, command, cwd, and portNumber when starting a service",
			},
			400,
		);
	}

	const token = c.req.header("Authorization")?.split(" ")[1];

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await db
		.query({
			tasks: {
				$: {
					fields: ["sandboxId", "sandboxTrafficAccessToken"],
					where: {
						agentToken: token,
					},
				},
			},
		})
		.then((data) => data.tasks[0]);

	if (!task) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!task.sandboxId) {
		return c.json({ error: "Task is missing sandbox id" }, 400);
	}

	if (!task.sandboxTrafficAccessToken) {
		return c.json(
			{
				error:
					"Task sandbox is missing a private preview token. Recreate the task sandbox before starting services.",
			},
			409,
		);
	}

	const sandbox = await Sandbox.connect(task.sandboxId);
	const serviceId = id();
	const terminalSessionId = id();
	const host = sandbox.getHost(body.portNumber);
	const e2bUrl = `https://${host}`;
	const url = getPreviewUrl(serviceId);
	const now = new Date().toISOString();

	await db.transact([
		terminalSessionTx(terminalSessionId)
			.create({
				name: body.name,
				command: body.command,
				cwd: body.cwd,
				status: "starting",
				startedBy: "agent",
				startedAt: now,
				lastActivityAt: now,
			})
			.link({ task: task.id }),
		serviceTx(serviceId)
			.create({
				name: body.name,
				command: body.command,
				cwd: body.cwd,
				healthPath: body.healthPath,
				portNumber: body.portNumber,
				status: "starting",
				e2bHost: host,
				e2bUrl,
				url,
			})
			.link({ task: task.id, terminalSession: terminalSessionId }),
	]);

	let process: CommandHandle;

	try {
		process = await sandbox.commands.run(
			buildServiceCommand(body.cwd, body.command),
			{
				background: true,
				timeoutMs: 0,
			},
		);
	} catch (error) {
		await markServiceFailed(serviceId, terminalSessionId, task.id, {
			name: body.name,
			portNumber: body.portNumber,
			url,
			error: serializeError(error),
		});

		return c.json(
			{
				error: "Failed to start service command",
				serviceId,
				terminalSessionId,
				url,
			},
			500,
		);
	}

	await db.transact([
		terminalSessionTx(terminalSessionId).update({
			pid: process.pid,
			lastActivityAt: new Date().toISOString(),
		}),
		serviceTx(serviceId).update({
			pid: process.pid,
		}),
	]);

	const isReady = await waitForService(
		sandbox,
		body.portNumber,
		body.healthPath,
	);

	if (!isReady) {
		await markServiceFailed(serviceId, terminalSessionId, task.id, {
			name: body.name,
			portNumber: body.portNumber,
			url,
			pid: process.pid,
			error: `Timed out waiting for ${body.portNumber}${body.healthPath}`,
		});

		return c.json(
			{
				error: "Service command started, but the port did not become ready",
				serviceId,
				terminalSessionId,
				url,
				pid: process.pid,
			},
			502,
		);
	}

	await db.transact([
		terminalSessionTx(terminalSessionId).update({
			status: "running",
			lastActivityAt: new Date().toISOString(),
		}),
		serviceTx(serviceId).update({
			status: "running",
		}),
		eventTx(id())
			.create({
				type: "factoryplane.service_started",
				data: {
					serviceId,
					terminalSessionId,
					name: body.name,
					portNumber: body.portNumber,
					url,
					e2bHost: host,
					pid: process.pid,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	const persistedService = await getPersistedPreviewService(serviceId);

	if (persistedService?.e2bHost !== host || persistedService.url !== url) {
		await markServiceFailed(serviceId, terminalSessionId, task.id, {
			name: body.name,
			portNumber: body.portNumber,
			url,
			e2bHost: host,
			pid: process.pid,
			error: "Preview service metadata did not persist correctly",
		});

		return c.json(
			{
				error: "Preview service metadata did not persist correctly",
				serviceId,
				terminalSessionId,
				url,
			},
			500,
		);
	}

	return c.json({
		serviceId,
		terminalSessionId,
		url,
		status: "running",
		pid: process.pid,
	});
};

const parseStartServiceBody = (
	value: unknown,
): StartServiceBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const name = getNonEmptyString(value.name);
	const command = getNonEmptyString(value.command);
	const cwd = getNonEmptyString(value.cwd);
	const portNumber = value.portNumber;

	if (
		!name ||
		!command ||
		!cwd ||
		typeof portNumber !== "number" ||
		!Number.isInteger(portNumber)
	) {
		return undefined;
	}

	return {
		name,
		command,
		cwd,
		portNumber,
		healthPath: normalizeHealthPath(value.healthPath),
	};
};

const markServiceFailed = async (
	serviceId: string,
	terminalSessionId: string,
	taskId: string,
	data: Record<string, unknown>,
) => {
	const now = new Date().toISOString();
	const error = typeof data.error === "string" ? data.error : undefined;

	await db.transact([
		terminalSessionTx(terminalSessionId).update({
			status: "failed",
			error,
			stoppedAt: now,
			lastActivityAt: now,
		}),
		serviceTx(serviceId).update({
			status: "failed",
		}),
		eventTx(id())
			.create({
				type: "factoryplane.service_failed",
				data: {
					serviceId,
					terminalSessionId,
					...data,
				},
				createdAt: now,
			})
			.link({ task: taskId }),
	]);
};

const getPersistedPreviewService = async (serviceId: string) => {
	return db
		.query({
			services: {
				$: {
					fields: ["url", "e2bHost"],
					where: {
						id: serviceId,
					},
				},
			},
		})
		.then((data) => data.services[0]);
};

const waitForService = async (
	sandbox: Sandbox,
	portNumber: number,
	healthPath: string,
) => {
	const url = `http://127.0.0.1:${portNumber}${healthPath}`;
	const script = [
		"for _ in $(seq 1 30); do",
		`  curl -fsS ${shellQuote(url)} >/dev/null 2>&1 && exit 0`,
		"  sleep 1",
		"done",
		"exit 1",
	].join("\n");

	try {
		const result = await sandbox.commands.run(
			`/bin/bash -lc ${shellQuote(script)}`,
			{ timeoutMs: 35_000 },
		);

		return getExitCode(result) === 0;
	} catch {
		return false;
	}
};

const buildServiceCommand = (cwd: string, command: string) => {
	const script = `cd ${shellQuote(cwd)} && exec ${command}`;
	return `/bin/bash -lc ${shellQuote(script)}`;
};

const getPreviewUrl = (serviceId: string) => {
	const domain =
		process.env.FACTORYPLANE_PREVIEWS_DOMAIN ?? "previews.factoryplane.com";
	return `https://${serviceId}.${domain}`;
};

const getExitCode = (result: unknown) => {
	if (isRecord(result) && typeof result.exitCode === "number") {
		return result.exitCode;
	}

	return 0;
};

const normalizeHealthPath = (value: unknown) => {
	if (typeof value !== "string" || !value.startsWith("/")) {
		return "/";
	}

	return value;
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

const serializeError = (error: unknown) => {
	return error instanceof Error ? error.message : String(error);
};

const shellQuote = (value: string) => {
	return `'${value.replaceAll("'", "'\\''")}'`;
};
