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
					fields: ["workflowInput"],
				},
				workspace: {
					$: {
						fields: [
							"environmentPackages",
							"floorWorkflow",
							"newTaskSetupScript",
							"newTurnSetupScript",
						],
					},
					commands: {
						$: {
							fields: [
								"command",
								"runOnNewTask",
								"runOnNewTurn",
								"createdAt",
								"updatedAt",
							],
						},
					},
					sandboxPackages: {
						$: {
							fields: ["name", "createdAt", "updatedAt"],
						},
					},
					repositories: {
						$: {
							fields: ["url", "path", "branch", "secrets", "createdAt"],
						},
					},
					environmentFiles: {
						$: {
							fields: ["path", "content", "createdAt"],
						},
					},
					mcpServers: {
						$: {
							fields: [
								"name",
								"url",
								"transport",
								"auth",
								"enabled",
								"toolPolicy",
								"createdAt",
								"updatedAt",
							],
						},
					},
				},
			},
		})
		.then((data) => data.tasks[0]);
};
