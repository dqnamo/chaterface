import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerFileRoutes } from "./lib/file-router.js";

export const createApp = async () => {
	const app = new Hono();

	app.use(
		"*",
		cors({
			allowHeaders: ["Authorization", "Content-Type", "token"],
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			origin: "*",
		}),
	);

	const routesDir = path.join(
		path.dirname(fileURLToPath(import.meta.url)),
		"routes",
	);

	await registerFileRoutes(app, routesDir);

	return app;
};
