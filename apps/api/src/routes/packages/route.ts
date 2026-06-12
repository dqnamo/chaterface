import db, { id } from "@repo/db/admin";
import { getBearerToken, getTaskForAgentToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

type UpdatePackagesBody = {
	packages: string[];
};

const APT_PACKAGE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9+._:-]*$/;

const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
	}

	return tx;
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

export const GET: RouteHandler = async (c) => {
	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return c.json({
		packages: parseEnvironmentPackages(task.factory.environmentPackages),
	});
};

export const PUT: RouteHandler = async (c) => {
	const body = parseUpdatePackagesBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					'Expected packages to be an array of apt package names, e.g. ["jq", "ffmpeg"]',
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const environmentPackages =
		body.packages.length > 0 ? body.packages : undefined;

	await db.transact([
		factoryTx(task.factory.id).update({
			environmentPackages,
		}),
		eventTx(id())
			.create({
				type: "factoryplane.packages_updated",
				data: {
					packages: body.packages,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		packages: body.packages,
	});
};

export const POST: RouteHandler = async (c) => {
	const body = parseUpdatePackagesBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					'Expected packages to be an array of apt package names, e.g. ["jq", "ffmpeg"]',
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const packages = mergePackageLists(
		parseEnvironmentPackages(task.factory.environmentPackages),
		body.packages,
	);

	const environmentPackages = packages.length > 0 ? packages : undefined;

	await db.transact([
		factoryTx(task.factory.id).update({
			environmentPackages,
		}),
		eventTx(id())
			.create({
				type: "factoryplane.packages_updated",
				data: {
					added: body.packages,
					packages,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		packages,
	});
};

const parseUpdatePackagesBody = (
	value: unknown,
): UpdatePackagesBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const packages = parsePackageList(value.packages);

	if (!packages) {
		return undefined;
	}

	return { packages };
};

const parseEnvironmentPackages = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const seen = new Set<string>();
	const packages: string[] = [];

	for (const item of value) {
		if (typeof item !== "string") {
			continue;
		}

		const packageName = item.trim();

		if (!APT_PACKAGE_NAME_PATTERN.test(packageName) || seen.has(packageName)) {
			continue;
		}

		seen.add(packageName);
		packages.push(packageName);
	}

	return packages;
};

const mergePackageLists = (current: string[], next: string[]) => {
	const seen = new Set<string>();
	const packages: string[] = [];

	for (const packageName of [...current, ...next]) {
		if (seen.has(packageName)) {
			continue;
		}

		seen.add(packageName);
		packages.push(packageName);
	}

	return packages;
};

const parsePackageList = (value: unknown): string[] | undefined => {
	if (!Array.isArray(value)) {
		return undefined;
	}

	const seen = new Set<string>();
	const packages: string[] = [];

	for (const item of value) {
		if (typeof item !== "string") {
			return undefined;
		}

		const packageName = item.trim();

		if (!APT_PACKAGE_NAME_PATTERN.test(packageName)) {
			return undefined;
		}

		if (seen.has(packageName)) {
			continue;
		}

		seen.add(packageName);
		packages.push(packageName);
	}

	return packages;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
