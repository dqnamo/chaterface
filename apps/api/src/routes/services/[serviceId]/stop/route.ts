import db, { id } from "@repo/db/admin";
import { E2BSandbox as Sandbox } from "../../../../lib/e2b-sandbox.js";
import type { RouteHandler } from "../../../../lib/file-router.js";

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
	const serviceId = c.req.param("serviceId");
	const token = c.req.header("Authorization")?.split(" ")[1];

	if (!serviceId) {
		return c.json({ error: "Missing service id" }, 400);
	}

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await db
		.query({
			tasks: {
				$: {
					fields: ["sandboxId"],
					where: {
						agentToken: token,
					},
				},
				services: {
					$: {
						fields: ["name", "pid"],
					},
					terminalSession: {
						$: {
							fields: ["name", "pid"],
						},
					},
				},
			},
		})
		.then((data) => data.tasks[0]);

	if (!task) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const service = task.services?.find((service) => service.id === serviceId);

	if (!service) {
		return c.json({ error: "Service not found" }, 404);
	}

	if (!task.sandboxId) {
		return c.json({ error: "Task is missing sandbox id" }, 400);
	}

	let killed: boolean | undefined;
	const terminalSessionId = service.terminalSession?.id;
	const pid = service.terminalSession?.pid ?? service.pid;

	if (typeof pid === "number") {
		try {
			const sandbox = await Sandbox.connect(task.sandboxId);
			killed = terminalSessionId
				? await sandbox.pty.kill(pid)
				: await sandbox.commands.kill(pid);

			if (!killed && typeof service.pid === "number") {
				killed = await sandbox.commands.kill(service.pid);
			}
		} catch (error) {
			const now = new Date().toISOString();

			if (terminalSessionId) {
				await db.transact(
					terminalSessionTx(terminalSessionId).update({
						status: "stop_failed",
						error: serializeError(error),
						lastActivityAt: now,
					}),
				);
			}

			await db.transact([
				serviceTx(serviceId).update({
					status: "stop_failed",
				}),
				eventTx(id())
					.create({
						type: "factoryplane.service_stop_failed",
						data: {
							serviceId,
							terminalSessionId,
							name: service.name,
							pid,
							error: serializeError(error),
						},
						createdAt: now,
					})
					.link({ task: task.id }),
			]);

			return c.json(
				{
					error: "Failed to stop service",
					serviceId,
					terminalSessionId,
					pid,
				},
				500,
			);
		}
	}

	const now = new Date().toISOString();

	if (terminalSessionId) {
		await db.transact(
			terminalSessionTx(terminalSessionId).update({
				status: "stopped",
				stoppedAt: now,
				lastActivityAt: now,
			}),
		);
	}

	await db.transact([
		serviceTx(serviceId).delete(),
		eventTx(id())
			.create({
				type: "factoryplane.service_stopped",
				data: {
					serviceId,
					terminalSessionId,
					name: service.name,
					pid,
					killed,
				},
				createdAt: now,
			})
			.link({ task: task.id }),
	]);

	return c.json({
		serviceId,
		terminalSessionId,
		status: "stopped",
		killed,
		deleted: true,
	});
};

const serializeError = (error: unknown) => {
	return error instanceof Error ? error.message : String(error);
};
