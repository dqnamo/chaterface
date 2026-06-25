import { start } from "workflow/api";
import db from "@/instant.admin";
import { processEventWorkflow } from "@/workflows/process-event";

type EventForWorkflowStart = {
	workflowRunId?: string;
};

const { typedHandlers, combineHandlers } = db.webhooks.helpers();

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

const handlers = combineHandlers(
	typedHandlers("events", "create", async (record) => {
		if (
			record.after.type !== "chaterface.new_user_message" &&
			record.after.type !== "chaterface.new_task"
		) {
			console.log("Skipping event", record.after.type);
			return;
		}

		const event = await db
			.query({
				events: {
					$: {
						fields: ["workflowRunId"],
						where: {
							id: record.id,
						},
					},
				},
			})
			.then((result) => result.events[0] as EventForWorkflowStart | undefined);

		if (event?.workflowRunId) {
			console.log("Skipping already-started workflow event", {
				eventId: record.id,
				runId: event.workflowRunId,
			});
			return;
		}

		const run = await start(processEventWorkflow, [{ eventId: record.id }]);

		await db.transact(
			eventTx(record.id).update({
				workflowRunId: run.runId,
			}),
		);

		console.log("Started process-event workflow", {
			eventId: record.id,
			runId: run.runId,
		});
	}),
);

export async function POST(req: Request) {
	await db.webhooks.processRequest(handlers, req);
	return new Response("ok");
}
