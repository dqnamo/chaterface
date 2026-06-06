import type { RouteHandler } from "../../lib/file-router.js";

export const GET: RouteHandler = (c) => c.json({ ok: true });
