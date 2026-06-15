import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Context, Hono, MiddlewareHandler } from "hono";

const ROUTE_FILE = /^route\.(ts|js|mjs|cjs)$/;
const HTTP_METHODS = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"HEAD",
	"OPTIONS",
] as const;

export type RouteHandler = (c: Context) => Response | Promise<Response>;

function segmentToPattern(segment: string): string | null {
	if (segment.startsWith("(") && segment.endsWith(")")) {
		return null;
	}
	if (segment.startsWith("_")) {
		return null;
	}
	const dynamic = segment.match(/^\[(.+)\]$/);
	if (dynamic) {
		return `:${dynamic[1]}`;
	}
	return segment;
}

function filePathToRoutePattern(routesDir: string, filePath: string): string {
	const relative = path.relative(routesDir, path.dirname(filePath));
	if (!relative || relative === ".") {
		return "/";
	}

	const segments = relative.split(path.sep);
	const patternParts: string[] = [];

	for (const segment of segments) {
		const pattern = segmentToPattern(segment);
		if (pattern) {
			patternParts.push(pattern);
		}
	}

	return `/${patternParts.join("/")}`;
}

async function collectRouteFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectRouteFiles(fullPath)));
			continue;
		}
		if (entry.isFile() && ROUTE_FILE.test(entry.name)) {
			files.push(fullPath);
		}
	}

	return files;
}

export async function registerFileRoutes(
	app: Hono,
	routesDir: string,
): Promise<void> {
	const routeFiles = await collectRouteFiles(routesDir);

	for (const filePath of routeFiles.sort()) {
		const pattern = filePathToRoutePattern(routesDir, filePath);
		const module = await import(pathToFileURL(filePath).href);

		for (const method of HTTP_METHODS) {
			const handler = module[method] as RouteHandler | undefined;
			if (typeof handler !== "function") {
				continue;
			}

			const wrapped: MiddlewareHandler = (c) => Promise.resolve(handler(c));
			app.on(method, pattern, wrapped);
		}
	}
}
