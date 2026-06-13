import type { Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdaptorServer } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerFileRoutes } from "./lib/file-router.js";
import { attachTerminalSessionWebSocket } from "./lib/terminal-session-websocket.js";

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
const server = createAdaptorServer({ fetch: app.fetch });

attachTerminalSessionWebSocket(server as Server);

server.listen(port, () => {
	console.log(`api listening on http://localhost:${port}`);
});
