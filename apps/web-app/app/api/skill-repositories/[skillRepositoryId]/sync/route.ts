import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import db, { id } from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const MAX_SKILL_FILE_BYTES = 256 * 1024;
const MAX_SKILL_PACKAGE_BYTES = 2 * 1024 * 1024;
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
	factory?: {
		id: string;
		githubAccessTokenEncrypted?: string;
		organisation?: {
			members?: Array<{
				user?: {
					id: string;
				};
			}>;
		};
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
		const cloneResult = await cloneSkillRepository(repository);
		checkoutPath = cloneResult.checkoutPath;

		const discoveredSkills = await discoverSkills(
			checkoutPath,
			repository.path,
		);
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
					factory: authResult.factoryId,
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

		await db.transact([
			...skillTransactions,
			...removedSkillTransactions,
			repositoryTx.update({
				status: "idle",
				syncError: undefined,
				lastSyncedAt: startedAt,
				lastSyncedCommit: cloneResult.commit,
			}),
		]);

		return NextResponse.json({
			skillRepositoryId: repository.id,
			skills: discoveredSkills.map((skill) => ({
				name: skill.name,
				slug: skill.slug,
				description: skill.description,
				sourcePath: skill.sourcePath,
				contentHash: skill.contentHash,
			})),
			lastSyncedCommit: cloneResult.commit,
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
				factory: {
					organisation: {
						members: {
							user: {},
						},
					},
				},
				skills: {},
			},
		})
		.then(
			(result) =>
				result.skillRepositories[0] as SkillRepositoryRecord | undefined,
		);

	if (!repository?.factory) {
		return {
			ok: false as const,
			status: 404,
			message: "Skill repository not found",
		};
	}

	if (!hasFactoryAccess(repository.factory, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return {
		ok: true as const,
		repository,
		factoryId: repository.factory.id,
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

const discoverSkills = async (
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

const readSkillManifest = async (skillDirectoryPath: string) => {
	const manifestPath = path.join(skillDirectoryPath, "skill.json");
	const content = await readFile(manifestPath, "utf8").catch(() => undefined);

	if (!content) {
		return undefined;
	}

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

	const encryptedToken = repository.factory?.githubAccessTokenEncrypted;

	if (!encryptedToken) {
		return undefined;
	}

	const encryptionService = createEncryptionService(
		process.env.SECRET_ENCRYPTION_KEY ?? "",
	);
	const token = await encryptionService.decrypt(encryptedToken);
	const encoded = Buffer.from(`x-access-token:${token}`, "utf8").toString(
		"base64",
	);

	return `Authorization: Basic ${encoded}`;
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

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

const hasFactoryAccess = (
	factory: NonNullable<SkillRepositoryRecord["factory"]>,
	userId: string,
) =>
	factory.organisation?.members?.some((member) => member.user?.id === userId) ??
	false;

const getGithubHttpsCloneUrl = (url: string) => {
	const trimmed = url.trim();
	const shorthandMatch = trimmed.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/i);

	if (shorthandMatch?.[1] && shorthandMatch[2]) {
		return `https://github.com/${shorthandMatch[1]}/${shorthandMatch[2].replace(/\.git$/i, "")}.git`;
	}

	const httpsMatch = trimmed.match(
		/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
	);

	if (httpsMatch?.[1] && httpsMatch[2]) {
		return `https://github.com/${httpsMatch[1]}/${httpsMatch[2].replace(/\.git$/i, "")}.git`;
	}

	const sshMatch = trimmed.match(
		/^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
	);

	if (sshMatch?.[1] && sshMatch[2]) {
		return `https://github.com/${sshMatch[1]}/${sshMatch[2].replace(/\.git$/i, "")}.git`;
	}

	return undefined;
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
