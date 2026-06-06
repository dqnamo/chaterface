import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import db from "@repo/db/admin";
import type { setupAgentTask } from "@/trigger/setup-agent";

const { typedHandlers, combineHandlers } = db.webhooks.helpers();

const handlers = combineHandlers(
	typedHandlers("agents", "create", async (record) => {
		const idempotencyKey = await idempotencyKeys.create(
			`instant-agent-created-${record.idempotencyKey}`,
			{ scope: "global" },
		);

		const handle = await tasks.trigger<typeof setupAgentTask>(
			"setup-agent",
			{ agentId: record.id },
			{ idempotencyKey, idempotencyKeyTTL: "60d" },
		);

		console.log("Triggered setup-agent task", {
			agentId: record.id,
			runId: handle.id,
		});
	}),
);

export async function POST(req: Request) {
	await db.webhooks.processRequest(handlers, req);
	return new Response("ok");
}
