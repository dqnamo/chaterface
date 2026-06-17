import { createAdaptorServer } from "@hono/node-server";
import { createApp } from "./app.js";

const startServer = async () => {
	const app = await createApp();
	const port = Number(process.env.PORT ?? 3002);
	const server = createAdaptorServer({ fetch: app.fetch });

	server.listen(port, () => {
		console.log(`api listening on http://localhost:${port}`);
	});
};

startServer().catch((error) => {
	console.error("Failed to start api", error);
	process.exitCode = 1;
});
