import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerFileRoutes } from "./lib/file-router.js";

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

const port = Number(process.env.PORT ?? 3002);

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`api listening on http://localhost:${info.port}`);
});
