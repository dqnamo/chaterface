import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { E2BSandbox as Sandbox } from "@/trigger/e2b-sandbox";
import { authErrorResponse, authenticateTaskRequest } from "../../../_lib/auth";

export const runtime = "nodejs";

const DEFAULT_WORKSPACE_PATH = "/home/user";
const MAX_FILE_BYTES = 1024 * 1024;
const EXCLUDED_PATHS = [
	".git",
	".next",
	".turbo",
	"node_modules",
	"dist",
	"build",
	"coverage",
	".cache",
	".pnpm-store",
	".venv",
	"venv",
];

export async function GET(
	req: NextRequest,
	context: { params: Promise<{ taskId: string }> },
) {
	const { taskId } = await context.params;
	const authResult = await authenticateTaskRequest(req, taskId);

	if (!authResult.ok) {
		return authErrorResponse(authResult);
	}

	const task = authResult.entity;

	if (!task?.sandboxId) {
		return NextResponse.json(
			{ message: "Task sandbox is not available yet" },
			{ status: 409 },
		);
	}

	const sandbox = await Sandbox.connect(task.sandboxId);
	const root = DEFAULT_WORKSPACE_PATH;
	const filePath = req.nextUrl.searchParams.get("path");
	const directoryPath = req.nextUrl.searchParams.get("directory");

	if (filePath) {
		const relativePath = validateRelativePath(filePath);

		if (!relativePath.ok) {
			return NextResponse.json(
				{ message: relativePath.message },
				{ status: 400 },
			);
		}

		const fullPath = joinSandboxPath(root, relativePath.path);
		const content = await sandbox.files.read(fullPath).catch((error) => {
			const message = error instanceof Error ? error.message : String(error);

			return NextResponse.json(
				{ message: `Failed to read ${relativePath.path}: ${message}` },
				{ status: 404 },
			);
		});

		if (content instanceof NextResponse) {
			return content;
		}

		return NextResponse.json(
			{
				content,
				path: relativePath.path,
				root,
			},
			{
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	}

	const directory = validateDirectoryPath(directoryPath ?? "");

	if (!directory.ok) {
		return NextResponse.json({ message: directory.message }, { status: 400 });
	}

	const result = await sandbox.commands.run(
		buildListDirectoryCommand(root, directory.path),
		{
			timeoutMs: 30_000,
		},
	);

	if (result.exitCode !== 0) {
		return NextResponse.json(
			{ message: result.stderr || "Failed to list sandbox directory" },
			{ status: 502 },
		);
	}

	const entries = result.stdout
		.split("\n")
		.map(parseDirectoryEntry)
		.filter((entry) => entry !== null);

	return NextResponse.json(
		{
			directory: directory.path,
			entries,
			root,
		},
		{
			headers: {
				"Cache-Control": "no-store",
			},
		},
	);
}

export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ taskId: string }> },
) {
	const { taskId } = await context.params;
	const authResult = await authenticateTaskRequest(req, taskId);

	if (!authResult.ok) {
		return authErrorResponse(authResult);
	}

	const task = authResult.entity;

	if (!task?.sandboxId) {
		return NextResponse.json(
			{ message: "Task sandbox is not available yet" },
			{ status: 409 },
		);
	}

	const body = (await req.json().catch(() => null)) as {
		content?: unknown;
		path?: unknown;
	} | null;
	const relativePath = validateRelativePath(
		typeof body?.path === "string" ? body.path : "",
	);

	if (!relativePath.ok) {
		return NextResponse.json(
			{ message: relativePath.message },
			{ status: 400 },
		);
	}

	if (typeof body?.content !== "string") {
		return NextResponse.json(
			{ message: "File content must be a string" },
			{ status: 400 },
		);
	}

	if (Buffer.byteLength(body.content, "utf8") > MAX_FILE_BYTES) {
		return NextResponse.json(
			{ message: "File is too large to save from the browser editor" },
			{ status: 413 },
		);
	}

	const sandbox = await Sandbox.connect(task.sandboxId);
	const root = DEFAULT_WORKSPACE_PATH;
	const fullPath = joinSandboxPath(root, relativePath.path);
	const parentPath = path.posix.dirname(fullPath);

	await sandbox.commands.run(`mkdir -p ${shellQuote(parentPath)}`, {
		timeoutMs: 30_000,
	});
	await sandbox.files.write(fullPath, body.content);

	return NextResponse.json({
		path: relativePath.path,
		root,
		saved: true,
	});
}

const validateRelativePath = (value: string) => {
	const trimmed = value.trim();

	if (!trimmed) {
		return { ok: false as const, message: "File path is required" };
	}

	if (trimmed.includes("\0") || path.posix.isAbsolute(trimmed)) {
		return { ok: false as const, message: "File path must be relative" };
	}

	const normalized = path.posix.normalize(trimmed);

	if (
		normalized === "." ||
		normalized === ".." ||
		normalized.startsWith("../") ||
		normalized.includes("/../")
	) {
		return { ok: false as const, message: "File path escapes the workspace" };
	}

	return { ok: true as const, path: normalized };
};

const validateDirectoryPath = (value: string) => {
	const trimmed = value.trim();

	if (!trimmed) {
		return { ok: true as const, path: "" };
	}

	const relativePath = validateRelativePath(trimmed);

	if (!relativePath.ok) {
		return relativePath;
	}

	return relativePath;
};

const joinSandboxPath = (root: string, relativePath: string) =>
	path.posix.join(root, relativePath);

const buildListDirectoryCommand = (root: string, directoryPath: string) => {
	const excludedExpression = EXCLUDED_PATHS.flatMap((excludedPath) => [
		`-name ${shellQuote(excludedPath)}`,
		"-o",
	]).slice(0, -1);
	const target = directoryPath || ".";

	return [
		"set -e",
		`cd ${shellQuote(root)}`,
		[
			"find",
			shellQuote(target),
			"-mindepth 1 -maxdepth 1 \\(",
			excludedExpression.join(" "),
			"\\) -prune -o \\(",
			"-type d -printf 'directory\\t%p\\n'",
			"-o",
			`-type f -size -${MAX_FILE_BYTES}c -printf 'file\\t%p\\n'`,
			"\\)",
			"| sed 's#\\t./#\\t#'",
			"| sort -k2",
		].join(" "),
	].join("\n");
};

const parseDirectoryEntry = (line: string) => {
	const [type, rawPath] = line.split("\t");
	const entryPath = rawPath?.trim();

	if ((type !== "directory" && type !== "file") || !entryPath) {
		return null;
	}

	return {
		path: entryPath,
		type,
	};
};

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
