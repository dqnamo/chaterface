import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import db from "@/instant.admin";
import type { processEventTask } from "@/trigger/process-event";

const { typedHandlers, combineHandlers } = db.webhooks.helpers();

const handlers = combineHandlers(
	typedHandlers("events", "create", async (record) => {
		const idempotencyKey = await idempotencyKeys.create(
			`instant-event-created-${record.idempotencyKey}`,
			{ scope: "global" },
		);

		if (
			record.after.type !== "factoryplane.new_user_message" &&
			record.after.type !== "factoryplane.new_task"
		) {
			console.log("Skipping event", record.after.type);
			return;
		}

		const handle = await tasks.trigger<typeof processEventTask>(
			"process-event",
			{ eventId: record.id },
			{ idempotencyKey, idempotencyKeyTTL: "60d" },
		);

		console.log("Triggered process-event task", {
			eventId: record.id,
			runId: handle.id,
		});
	}),
);

export async function POST(req: Request) {
	await db.webhooks.processRequest(handlers, req);
	return new Response("ok");
}
