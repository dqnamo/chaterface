import db, { id } from "@repo/db/admin";
import { Sandbox } from "e2b";
import type { RouteHandler } from "../../../../lib/file-router.js";

const serviceTx = (serviceId: string) => {
	const tx = db.tx.services[serviceId];

	if (!tx) {
		throw new Error(`Service transaction builder ${serviceId} not found`);
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

	if (typeof service.pid === "number") {
		try {
			const sandbox = await Sandbox.connect(task.sandboxId);
			killed = await sandbox.commands.kill(service.pid);
		} catch (error) {
			await db.transact([
				serviceTx(serviceId).update({
					status: "stop_failed",
				}),
				eventTx(id())
					.create({
						type: "factoryplane.service_stop_failed",
						data: {
							serviceId,
							name: service.name,
							pid: service.pid,
							error: serializeError(error),
						},
						createdAt: new Date().toISOString(),
					})
					.link({ task: task.id }),
			]);

			return c.json(
				{
					error: "Failed to stop service",
					serviceId,
					pid: service.pid,
				},
				500,
			);
		}
	}

	await db.transact([
		serviceTx(serviceId).update({
			status: "stopped",
		}),
		eventTx(id())
			.create({
				type: "factoryplane.service_stopped",
				data: {
					serviceId,
					name: service.name,
					pid: service.pid,
					killed,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		serviceId,
		status: "stopped",
		killed,
	});
};

const serializeError = (error: unknown) => {
	return error instanceof Error ? error.message : String(error);
};
