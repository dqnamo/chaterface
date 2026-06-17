import db, { id } from "@repo/db/admin";
import { getBearerToken, getTaskForAgentToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

type UpdatePackagesBody = {
	packages: string[];
};

const APT_PACKAGE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9+._:-]*$/;

const workspaceTx = (workspaceId: string) => {
	const tx = db.tx.workspaces[workspaceId];

	if (!tx) {
		throw new Error(`Workspace transaction builder ${workspaceId} not found`);
	}

	return tx;
};

const sandboxPackageTx = (sandboxPackageId: string) => {
	const tx = db.tx.sandboxPackages[sandboxPackageId];

	if (!tx) {
		throw new Error(
			`Sandbox package transaction builder ${sandboxPackageId} not found`,
		);
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

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return c.json({
		packages: getWorkspacePackageNames(task.workspace),
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

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const workspaceId = task.workspace.id;
	const existingPackages = task.workspace.sandboxPackages ?? [];
	const now = new Date().toISOString();

	await db.transact([
		workspaceTx(workspaceId).update({
			environmentPackages: undefined,
		}),
		...existingPackages.map((pkg) => sandboxPackageTx(pkg.id).delete()),
		...body.packages.map((packageName) =>
			sandboxPackageTx(id())
				.create({
					name: packageName,
					createdAt: now,
					updatedAt: now,
				})
				.link({ workspace: workspaceId }),
		),
		eventTx(id())
			.create({
				type: "chaterface.packages_updated",
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

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const workspaceId = task.workspace.id;
	const packages = mergePackageLists(
		getWorkspacePackageNames(task.workspace),
		body.packages,
	);
	const existingPackageNames = new Set(
		(task.workspace.sandboxPackages ?? []).map((pkg) => pkg.name),
	);
	const now = new Date().toISOString();

	await db.transact([
		workspaceTx(workspaceId).update({
			environmentPackages: undefined,
		}),
		...packages
			.filter((packageName) => !existingPackageNames.has(packageName))
			.map((packageName) =>
				sandboxPackageTx(id())
					.create({
						name: packageName,
						createdAt: now,
						updatedAt: now,
					})
					.link({ workspace: workspaceId }),
			),
		eventTx(id())
			.create({
				type: "chaterface.packages_updated",
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

const getWorkspacePackageNames = (workspace: {
	environmentPackages?: unknown;
	sandboxPackages?: Array<{ name: string }>;
}) => {
	const names = new Set<string>();
	const packages: string[] = [];

	for (const pkg of workspace.sandboxPackages ?? []) {
		const packageName = pkg.name.trim();

		if (!APT_PACKAGE_NAME_PATTERN.test(packageName) || names.has(packageName)) {
			continue;
		}

		names.add(packageName);
		packages.push(packageName);
	}

	if (packages.length > 0) {
		return packages;
	}

	return parseEnvironmentPackages(workspace.environmentPackages);
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
