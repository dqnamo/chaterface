import type { InstaQLEntity } from "@instantdb/react";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";

type Agent = InstaQLEntity<AppSchema, "agents">;

export default function Agent({ agent }: { agent: Agent }) {
	const deleteAgent = async () => {
		await db.transact(db.tx.agents[agent.id]!.delete());
	};

	return (
		<div className="flex flex-row gap-2">
			<div className="text-sm font-medium">{agent.name ?? "Unnamed agent"}</div>
			<div className="text-sm text-gray-500">{agent.status}</div>
			<button
				type="button"
				onClick={() => {
					deleteAgent();
				}}
			>
				Delete
			</button>
		</div>
	);
}
