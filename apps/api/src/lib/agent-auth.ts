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
					repositories: {},
					environmentFiles: {},
					mcpServers: {},
				},
			},
		})
		.then((data) => data.tasks[0]);
};
