import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { type NextRequest, NextResponse } from "next/server";
import { createEncryptionService } from "@/encryption";
import db, { id } from "@/instant.admin";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const MAX_SKILL_FILE_BYTES = 256 * 1024;
const MAX_SKILL_PACKAGE_BYTES = 2 * 1024 * 1024;
const SKILL_SYNC_TRANSACTION_BATCH_SIZE = 5;
const SKILL_FILE_IGNORES = new Set([
	".git",
	"node_modules",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
]);

type SkillRepositoryRecord = {
	id: string;
	url: string;
	branch?: string;
	path?: string;
	workspace?: {
		id: string;
		githubAccessTokenEncrypted?: string;
		members?: Array<{
			user?: {
				id: string;
			};
		}>;
	};
	skills?: SkillRecord[];
};

type SkillRecord = {
	id: string;
	sourcePath: string;
	enabled?: boolean;
};

type DiscoveredSkill = {
	name: string;
	slug: string;
	description?: string;
	sourcePath: string;
	instructions: string;
	files: Array<{
		path: string;
		content: string;
		size: number;
	}>;
	manifest?: Record<string, unknown>;
	contentHash: string;
};

type GithubRepositoryRef = {
	owner: string;
	repo: string;
};

type GithubTreeItem = {
	path?: string;
	type?: string;
	sha?: string;
	size?: number;
};

type RepositoryFile = {
	path: string;
	content: string;
	size: number;
};

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ skillRepositoryId: string }> },
) {
	const { skillRepositoryId } = await params;
	const authResult = await authenticateSkillRepositoryRequest(
		req,
		skillRepositoryId,
	);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const repository = authResult.repository;
	const repositoryTx = getSkillRepositoryTx(repository.id);
	const startedAt = new Date().toISOString();

	await db.transact(
		repositoryTx.update({
			status: "syncing",
			syncError: undefined,
		}),
	);

	let checkoutPath: string | undefined;

	try {
		const syncSource = await readSkillRepository(repository);
		checkoutPath = syncSource.checkoutPath;

		const discoveredSkills = syncSource.discoveredSkills;
		const existingSkills = new Map(
			(repository.skills ?? []).map((skill) => [skill.sourcePath, skill]),
		);
		const discoveredSourcePaths = new Set(
			discoveredSkills.map((skill) => skill.sourcePath),
		);
		const skillTransactions = discoveredSkills.map((skill) => {
			const existingSkill = existingSkills.get(skill.sourcePath);

			if (existingSkill) {
				return getSkillTx(existingSkill.id).update({
					name: skill.name,
					slug: skill.slug,
					description: skill.description,
					instructions: skill.instructions,
					files: skill.files,
					manifest: skill.manifest,
					contentHash: skill.contentHash,
					removedAt: undefined,
					updatedAt: startedAt,
				});
			}

			return getSkillTx(id())
				.create({
					name: skill.name,
					slug: skill.slug,
					description: skill.description,
					sourcePath: skill.sourcePath,
					instructions: skill.instructions,
					files: skill.files,
					manifest: skill.manifest,
					enabled: false,
					contentHash: skill.contentHash,
					createdAt: startedAt,
					updatedAt: startedAt,
				})
				.link({
					workspace: authResult.workspaceId,
					skillRepository: repository.id,
				});
		});
		const removedSkillTransactions = (repository.skills ?? [])
			.filter((skill) => !discoveredSourcePaths.has(skill.sourcePath))
			.map((skill) =>
				getSkillTx(skill.id).update({
					enabled: false,
					removedAt: startedAt,
					updatedAt: startedAt,
				}),
			);

		for (const transactionBatch of chunkArray(
			[...skillTransactions, ...removedSkillTransactions],
			SKILL_SYNC_TRANSACTION_BATCH_SIZE,
		)) {
			await db.transact(transactionBatch);
		}

		await db.transact(
			repositoryTx.update({
				status: "idle",
				syncError: undefined,
				lastSyncedAt: startedAt,
				lastSyncedCommit: syncSource.commit,
			}),
		);

		return NextResponse.json({
			skillRepositoryId: repository.id,
			skills: discoveredSkills.map((skill) => ({
				name: skill.name,
				slug: skill.slug,
				description: skill.description,
				sourcePath: skill.sourcePath,
				contentHash: skill.contentHash,
			})),
			lastSyncedCommit: syncSource.commit,
		});
	} catch (error) {
		await db.transact(
			repositoryTx.update({
				status: "failed",
				syncError: getErrorMessage(error),
			}),
		);

		return NextResponse.json(
			{ message: getErrorMessage(error) },
			{ status: 500 },
		);
	} finally {
		if (checkoutPath) {
			await rm(checkoutPath, { recursive: true, force: true }).catch(() => {});
		}
	}
}

const readSkillRepository = async (repository: SkillRepositoryRecord) => {
	const githubRef = getGithubRepositoryRef(repository.url);

	if (githubRef) {
		return readGithubSkillRepository(repository, githubRef);
	}

	const cloneResult = await cloneSkillRepository(repository);
	const discoveredSkills = await discoverSkillsFromCheckout(
		cloneResult.checkoutPath,
		repository.path,
	);

	return {
		...cloneResult,
		discoveredSkills,
	};
};

const authenticateSkillRepositoryRequest = async (
	req: NextRequest,
	skillRepositoryId: string | undefined,
) => {
	if (!skillRepositoryId) {
		return {
			ok: false as const,
			status: 400,
			message: "skillRepositoryId is required",
		};
	}

	const refreshToken = getBearerToken(req.headers.get("Authorization"));

	if (!refreshToken) {
		return {
			ok: false as const,
			status: 401,
			message: "Unauthorized",
		};
	}

	const user = await db.auth.verifyToken(refreshToken).catch(() => undefined);

	if (!user) {
		return {
			ok: false as const,
			status: 401,
			message: "Unauthorized",
		};
	}

	const repository = await db
		.query({
			skillRepositories: {
				$: {
					where: {
						id: skillRepositoryId,
					},
				},
				workspace: {
					members: {
						user: {},
					},
				},
				skills: {},
			},
		})
		.then(
			(result) =>
				result.skillRepositories[0] as SkillRepositoryRecord | undefined,
		);

	if (!repository?.workspace) {
		return {
			ok: false as const,
			status: 404,
			message: "Skill repository not found",
		};
	}

	if (!hasWorkspaceAccess(repository.workspace, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return {
		ok: true as const,
		repository,
		workspaceId: repository.workspace.id,
	};
};

const cloneSkillRepository = async (repository: SkillRepositoryRecord) => {
	const checkoutPath = await mkdtemp(
		path.join(tmpdir(), "factoryplane-skills-"),
	);
	const cloneUrl =
		getGithubHttpsCloneUrl(repository.url) ?? repository.url.trim();
	const extraHeader = await getGithubAuthHeader(repository);
	const args = ["clone", "--depth", "1"];

	if (repository.branch?.trim()) {
		args.push("--branch", repository.branch.trim());
	}

	args.push(cloneUrl, checkoutPath);

	await git(args, extraHeader);

	const commit = (
		await git(["-C", checkoutPath, "rev-parse", "HEAD"], extraHeader)
	).trim();

	return { checkoutPath, commit };
};

const readGithubSkillRepository = async (
	repository: SkillRepositoryRecord,
	githubRef: GithubRepositoryRef,
) => {
	const token = await getGithubToken(repository);
	const repositoryInfo = await githubFetchJson<{
		default_branch?: string;
	}>(
		`https://api.github.com/repos/${githubRef.owner}/${githubRef.repo}`,
		token,
	);
	const refName = repository.branch?.trim() || repositoryInfo.default_branch;

	if (!refName) {
		throw new Error("GitHub repository default branch could not be resolved.");
	}

	const branchInfo = await githubFetchJson<{
		commit?: { sha?: string };
	}>(
		`https://api.github.com/repos/${githubRef.owner}/${githubRef.repo}/branches/${encodeURIComponent(refName)}`,
		token,
	);
	const commit = branchInfo.commit?.sha;

	if (!commit) {
		throw new Error(`GitHub branch ${refName} could not be resolved.`);
	}

	const treeResponse = await githubFetchJson<{
		truncated?: boolean;
		tree?: GithubTreeItem[];
	}>(
		`https://api.github.com/repos/${githubRef.owner}/${githubRef.repo}/git/trees/${commit}?recursive=1`,
		token,
	);

	if (treeResponse.truncated) {
		throw new Error("GitHub repository tree is too large to sync.");
	}

	const tree = (treeResponse.tree ?? []).filter(
		(
			item,
		): item is Required<Pick<GithubTreeItem, "path" | "sha">> &
			GithubTreeItem =>
			item.type === "blob" && Boolean(item.path) && Boolean(item.sha),
	);
	const discoveredSkills = await discoverSkillsFromGithubTree(
		githubRef,
		token,
		tree,
		repository.path,
	);

	return {
		commit,
		discoveredSkills,
		checkoutPath: undefined,
	};
};

const discoverSkillsFromCheckout = async (
	checkoutPath: string,
	configuredPath: string | undefined,
) => {
	const scanRoot = path.join(
		checkoutPath,
		normalizeRepositoryPath(configuredPath),
	);
	const scanRootStat = await stat(scanRoot).catch(() => undefined);

	if (!scanRootStat?.isDirectory()) {
		throw new Error("Skills path was not found in the repository.");
	}

	const skillFiles = await findSkillFiles(scanRoot);
	const skills = await Promise.all(
		skillFiles.map((skillFilePath) =>
			readSkillPackage(checkoutPath, path.dirname(skillFilePath)),
		),
	);

	return skills.sort((first, second) =>
		first.sourcePath.localeCompare(second.sourcePath),
	);
};

const findSkillFiles = async (rootPath: string) => {
	const skillFiles: string[] = [];

	const visit = async (directoryPath: string) => {
		const entries = await readdir(directoryPath, { withFileTypes: true });

		if (entries.some((entry) => entry.isFile() && entry.name === "SKILL.md")) {
			skillFiles.push(path.join(directoryPath, "SKILL.md"));
			return;
		}

		await Promise.all(
			entries
				.filter(
					(entry) => entry.isDirectory() && !SKILL_FILE_IGNORES.has(entry.name),
				)
				.map((entry) => visit(path.join(directoryPath, entry.name))),
		);
	};

	await visit(rootPath);
	return skillFiles;
};

const readSkillPackage = async (
	checkoutPath: string,
	skillDirectoryPath: string,
): Promise<DiscoveredSkill> => {
	const sourcePath = toPosixPath(
		path.relative(checkoutPath, skillDirectoryPath),
	);
	const skillMdPath = path.join(skillDirectoryPath, "SKILL.md");
	const instructions = await readFile(skillMdPath, "utf8");
	const manifest = await readSkillManifest(skillDirectoryPath);
	const metadata = getSkillMetadata(instructions, manifest, sourcePath);
	const files = await readSkillFiles(skillDirectoryPath);
	const contentHash = createHash("sha256")
		.update(JSON.stringify({ sourcePath, files }))
		.digest("hex");

	return {
		...metadata,
		sourcePath,
		instructions,
		files,
		manifest,
		contentHash,
	};
};

const readSkillFiles = async (skillDirectoryPath: string) => {
	const files: DiscoveredSkill["files"] = [];
	let totalBytes = 0;

	const visit = async (directoryPath: string) => {
		const entries = await readdir(directoryPath, { withFileTypes: true });

		for (const entry of entries) {
			if (SKILL_FILE_IGNORES.has(entry.name)) {
				continue;
			}

			const entryPath = path.join(directoryPath, entry.name);

			if (entry.isDirectory()) {
				await visit(entryPath);
				continue;
			}

			if (!entry.isFile()) {
				continue;
			}

			const entryStat = await stat(entryPath);

			if (entryStat.size > MAX_SKILL_FILE_BYTES) {
				continue;
			}

			totalBytes += entryStat.size;

			if (totalBytes > MAX_SKILL_PACKAGE_BYTES) {
				throw new Error("Skill package is too large to sync.");
			}

			const content = await readFile(entryPath, "utf8").catch(() => undefined);

			if (content === undefined || content.includes("\u0000")) {
				continue;
			}

			files.push({
				path: toPosixPath(path.relative(skillDirectoryPath, entryPath)),
				content,
				size: entryStat.size,
			});
		}
	};

	await visit(skillDirectoryPath);
	return files.sort((first, second) => first.path.localeCompare(second.path));
};

const discoverSkillsFromGithubTree = async (
	githubRef: GithubRepositoryRef,
	token: string | undefined,
	tree: Array<Required<Pick<GithubTreeItem, "path" | "sha">> & GithubTreeItem>,
	configuredPath: string | undefined,
) => {
	const scanRoot = normalizeRepositoryPath(configuredPath);
	const skillDirectories = getGithubSkillDirectories(tree, scanRoot);

	if (skillDirectories.length === 0) {
		throw new Error("No SKILL.md files were found in the repository.");
	}

	const skills = await Promise.all(
		skillDirectories.map((skillDirectory) =>
			readGithubSkillPackage(githubRef, token, tree, skillDirectory),
		),
	);

	return skills.sort((first, second) =>
		first.sourcePath.localeCompare(second.sourcePath),
	);
};

const getGithubSkillDirectories = (
	tree: Array<Required<Pick<GithubTreeItem, "path" | "sha">> & GithubTreeItem>,
	scanRoot: string,
) => {
	const discoveredDirectories = tree
		.filter((item) => isPathUnderRoot(item.path, scanRoot))
		.filter((item) => path.posix.basename(item.path) === "SKILL.md")
		.map((item) => path.posix.dirname(item.path))
		.sort((first, second) => first.localeCompare(second));
	const skillDirectories: string[] = [];

	for (const directory of discoveredDirectories) {
		if (
			skillDirectories.some(
				(existingDirectory) =>
					directory !== existingDirectory &&
					directory.startsWith(`${existingDirectory}/`),
			)
		) {
			continue;
		}

		skillDirectories.push(directory);
	}

	return skillDirectories;
};

const readGithubSkillPackage = async (
	githubRef: GithubRepositoryRef,
	token: string | undefined,
	tree: Array<Required<Pick<GithubTreeItem, "path" | "sha">> & GithubTreeItem>,
	skillDirectory: string,
): Promise<DiscoveredSkill> => {
	const packageFiles = tree
		.filter((item) => isPathUnderRoot(item.path, skillDirectory))
		.filter((item) => !hasIgnoredPathSegment(item.path))
		.filter((item) => (item.size ?? 0) <= MAX_SKILL_FILE_BYTES);
	let totalBytes = 0;
	const files: RepositoryFile[] = [];

	for (const item of packageFiles) {
		totalBytes += item.size ?? 0;

		if (totalBytes > MAX_SKILL_PACKAGE_BYTES) {
			throw new Error("Skill package is too large to sync.");
		}

		const content = await readGithubBlobText(githubRef, token, item.sha);

		if (content.includes("\u0000")) {
			continue;
		}

		files.push({
			path: removePathPrefix(item.path, skillDirectory),
			content,
			size: item.size ?? Buffer.byteLength(content),
		});
	}

	const instructions = files.find((file) => file.path === "SKILL.md")?.content;

	if (!instructions) {
		throw new Error(`Missing SKILL.md in ${skillDirectory}`);
	}

	const manifestFile = files.find((file) => file.path === "skill.json");
	const manifest = manifestFile
		? parseSkillManifest(manifestFile.content, manifestFile.path)
		: undefined;
	const metadata = getSkillMetadata(instructions, manifest, skillDirectory);
	const contentHash = createHash("sha256")
		.update(JSON.stringify({ sourcePath: skillDirectory, files }))
		.digest("hex");

	return {
		...metadata,
		sourcePath: skillDirectory,
		instructions,
		files: files.sort((first, second) => first.path.localeCompare(second.path)),
		manifest,
		contentHash,
	};
};

const readGithubBlobText = async (
	githubRef: GithubRepositoryRef,
	token: string | undefined,
	sha: string,
) => {
	const blob = await githubFetchJson<{ content?: string; encoding?: string }>(
		`https://api.github.com/repos/${githubRef.owner}/${githubRef.repo}/git/blobs/${sha}`,
		token,
	);

	if (blob.encoding !== "base64" || typeof blob.content !== "string") {
		throw new Error("GitHub blob response was not base64 encoded.");
	}

	return Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString(
		"utf8",
	);
};

const readSkillManifest = async (skillDirectoryPath: string) => {
	const manifestPath = path.join(skillDirectoryPath, "skill.json");
	const content = await readFile(manifestPath, "utf8").catch(() => undefined);

	if (!content) {
		return undefined;
	}

	try {
		return parseSkillManifest(content, manifestPath);
	} catch {
		throw new Error(`Invalid skill manifest at ${manifestPath}`);
	}
};

const parseSkillManifest = (content: string, manifestPath: string) => {
	try {
		const parsed = JSON.parse(content) as unknown;
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		throw new Error(`Invalid skill manifest at ${manifestPath}`);
	}
};

const getSkillMetadata = (
	instructions: string,
	manifest: Record<string, unknown> | undefined,
	sourcePath: string,
) => {
	const manifestName = getNonEmptyString(manifest?.name);
	const headingName = instructions.match(/^#\s+(.+)$/m)?.[1]?.trim();
	const name = manifestName ?? headingName ?? path.basename(sourcePath);
	const description =
		getNonEmptyString(manifest?.description) ??
		getFirstDescriptionParagraph(instructions);

	return {
		name,
		slug: slugify(getNonEmptyString(manifest?.slug) ?? name),
		description,
	};
};

const getFirstDescriptionParagraph = (instructions: string) => {
	const lines = instructions
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));

	return lines[0]?.slice(0, 240);
};

const getGithubAuthHeader = async (repository: SkillRepositoryRecord) => {
	if (!getGithubHttpsCloneUrl(repository.url)) {
		return undefined;
	}

	const token = await getGithubToken(repository);

	if (!token) {
		return undefined;
	}

	const encoded = Buffer.from(`x-access-token:${token}`, "utf8").toString(
		"base64",
	);

	return `Authorization: Basic ${encoded}`;
};

const getGithubToken = async (repository: SkillRepositoryRecord) => {
	const encryptedToken = repository.workspace?.githubAccessTokenEncrypted;

	if (!encryptedToken) {
		return undefined;
	}

	const encryptionService = createEncryptionService(
		process.env.SECRET_ENCRYPTION_KEY ?? "",
	);
	return encryptionService.decrypt(encryptedToken);
};

const githubFetchJson = async <TResponse>(
	url: string,
	token: string | undefined,
): Promise<TResponse> => {
	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.github+json",
			"User-Agent": "Chaterface",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`GitHub API request failed (${response.status}): ${body || response.statusText}`,
		);
	}

	return (await response.json()) as TResponse;
};

const git = async (args: string[], extraHeader: string | undefined) => {
	const gitArgs = extraHeader
		? ["-c", `http.https://github.com/.extraheader=${extraHeader}`, ...args]
		: args;

	try {
		const result = await execFileAsync("git", gitArgs, {
			timeout: 120_000,
			maxBuffer: 1024 * 1024,
		});

		return result.stdout;
	} catch (error) {
		throw new Error(`Git command failed: ${getErrorMessage(error)}`);
	}
};

const getSkillRepositoryTx = (skillRepositoryId: string) => {
	const tx = db.tx.skillRepositories[skillRepositoryId];

	if (!tx) {
		throw new Error(
			`Skill repository transaction builder ${skillRepositoryId} not found`,
		);
	}

	return tx;
};

const getSkillTx = (skillId: string) => {
	const tx = db.tx.skills[skillId];

	if (!tx) {
		throw new Error(`Skill transaction builder ${skillId} not found`);
	}

	return tx;
};

const chunkArray = <TValue>(values: TValue[], size: number) => {
	const chunks: TValue[][] = [];

	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size));
	}

	return chunks;
};

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

const hasWorkspaceAccess = (
	workspace: NonNullable<SkillRepositoryRecord["workspace"]>,
	userId: string,
) => workspace.members?.some((member) => member.user?.id === userId) ?? false;

const getGithubRepositoryRef = (
	url: string,
): GithubRepositoryRef | undefined => {
	const trimmed = url.trim();
	const shorthandMatch = trimmed.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/i);

	if (shorthandMatch?.[1] && shorthandMatch[2]) {
		return {
			owner: shorthandMatch[1],
			repo: shorthandMatch[2].replace(/\.git$/i, ""),
		};
	}

	const httpsMatch = trimmed.match(
		/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
	);

	if (httpsMatch?.[1] && httpsMatch[2]) {
		return {
			owner: httpsMatch[1],
			repo: httpsMatch[2].replace(/\.git$/i, ""),
		};
	}

	const sshMatch = trimmed.match(
		/^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
	);

	if (sshMatch?.[1] && sshMatch[2]) {
		return {
			owner: sshMatch[1],
			repo: sshMatch[2].replace(/\.git$/i, ""),
		};
	}

	return undefined;
};

const getGithubHttpsCloneUrl = (url: string) => {
	const githubRef = getGithubRepositoryRef(url);

	if (!githubRef) {
		return undefined;
	}

	return `https://github.com/${githubRef.owner}/${githubRef.repo}.git`;
};

const normalizeRepositoryPath = (value: string | undefined) => {
	if (!value) {
		return "";
	}

	const segments = value
		.trim()
		.replaceAll("\\", "/")
		.split("/")
		.filter(
			(segment) => segment.length > 0 && segment !== "." && segment !== "..",
		);

	return segments.join("/");
};

const toPosixPath = (value: string) => value.split(path.sep).join("/");

const isPathUnderRoot = (filePath: string, rootPath: string) => {
	if (!rootPath) {
		return true;
	}

	return filePath === rootPath || filePath.startsWith(`${rootPath}/`);
};

const removePathPrefix = (filePath: string, parentPath: string) => {
	if (filePath === parentPath) {
		return path.posix.basename(filePath);
	}

	return filePath.slice(parentPath.length + 1);
};

const hasIgnoredPathSegment = (filePath: string) =>
	filePath.split("/").some((segment) => SKILL_FILE_IGNORES.has(segment));

const slugify = (value: string) => {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return slug || randomUUID();
};

const getNonEmptyString = (value: unknown) =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);
