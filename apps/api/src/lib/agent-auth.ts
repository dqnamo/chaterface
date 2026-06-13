import db from "@repo/db/admin";

export const getBearerToken = (authorizationHeader: string | undefined) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

export const getTaskForAgentToken = async (agentToken: string) => {
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
						fields: [
							"environmentPackages",
							"floorWorkflow",
							"newTaskSetupScript",
							"newTurnSetupScript",
						],
					},
					repositories: {},
					environmentFiles: {},
					mcpServers: {},
					floorChangeProposals: {
						$: {
							fields: ["title", "summary", "status", "createdAt"],
						},
						task: {},
					},
				},
			},
		})
		.then((data) => data.tasks[0]);
};
