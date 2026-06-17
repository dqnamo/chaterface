import { createHash, randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import db, { id } from "@/instant.admin";
import {
	authenticateWorkspaceRequest,
	getNonEmptyString,
	readJson,
} from "../../github/_lib/github-app";

export const runtime = "nodejs";

const MAX_SKILL_FILE_BYTES = 256 * 1024;
const MAX_SKILL_PACKAGE_BYTES = 2 * 1024 * 1024;

type SkillsShDetailResponse = {
	id?: string;
	source?: string;
	slug?: string;
	installs?: number;
	hash?: string | null;
	files?: Array<{
		path?: string;
		contents?: string;
	}> | null;
};

type WorkspaceSkillRecord = {
	id: string;
	sourcePath?: string;
	externalId?: string;
};

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const workspaceId = getNonEmptyString(body.workspaceId);
	const skillId = getNonEmptyString(body.skillId);
	const skillName = getNonEmptyString(body.name);
	const externalUrl = getNonEmptyString(body.url);
	const installUrl = getNonEmptyString(body.installUrl);

	if (!workspaceId || !skillId) {
		return NextResponse.json(
			{ message: "workspaceId and skillId are required" },
			{ status: 400 },
		);
	}

	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	try {
		const detail = await getSkillDetail(skillId);
		const skill = buildSkillRecord(detail, {
			name: skillName,
			externalUrl,
			installUrl,
		});
		const existingSkill = await getExistingWorkspaceSkill(
			workspaceId,
			skill.externalId,
		);
		const now = new Date().toISOString();

		if (existingSkill) {
			await db.transact(
				getSkillTx(existingSkill.id).update({
					...skill,
					enabled: true,
					removedAt: undefined,
					updatedAt: now,
				}),
			);

			return NextResponse.json({ skillId: existingSkill.id, skill });
		}

		const newSkillId = id();

		await db.transact(
			getSkillTx(newSkillId)
				.create({
					...skill,
					enabled: true,
					createdAt: now,
					updatedAt: now,
				})
				.link({ workspace: workspaceId }),
		);

		return NextResponse.json({ skillId: newSkillId, skill });
	} catch (error) {
		return NextResponse.json(
			{ message: getErrorMessage(error) },
			{ status: 500 },
		);
	}
}

const getSkillDetail = async (skillId: string) => {
	const url = new URL(
		`https://skills.sh/api/v1/skills/${skillId
			.split("/")
			.map(encodeURIComponent)
			.join("/")}`,
	);
	const response = await fetch(url, {
		headers: getSkillsShHeaders(),
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(await getSkillsShErrorMessage(response));
	}

	return (await response.json()) as SkillsShDetailResponse;
};

const buildSkillRecord = (
	detail: SkillsShDetailResponse,
	listing: { name?: string; externalUrl?: string; installUrl?: string },
) => {
	if (!detail.id || !detail.source || !detail.slug) {
		throw new Error("skills.sh returned an invalid skill response.");
	}

	const files = getSkillFiles(detail.files);
	const instructions = files.find((file) => file.path === "SKILL.md")?.content;

	if (!instructions) {
		throw new Error("skills.sh skill did not include a SKILL.md file.");
	}

	const manifestFile = files.find((file) => file.path === "skill.json");
	const manifest = manifestFile
		? parseSkillManifest(manifestFile.content, manifestFile.path)
		: undefined;
	const metadata = getSkillMetadata(
		instructions,
		manifest,
		listing.name ?? detail.slug,
	);
	const sourcePath = `skills.sh:${detail.id}`;

	return {
		name: metadata.name,
		slug: slugify(`${detail.source}-${detail.slug}`),
		description: metadata.description,
		sourcePath,
		sourceType: "skills.sh",
		externalId: detail.id,
		externalUrl: listing.externalUrl,
		installUrl: listing.installUrl,
		installs: detail.installs,
		instructions,
		files,
		manifest,
		contentHash:
			detail.hash ??
			createHash("sha256")
				.update(JSON.stringify({ sourcePath, files }))
				.digest("hex"),
	};
};

const getSkillFiles = (files: SkillsShDetailResponse["files"]) => {
	if (!files) {
		throw new Error("skills.sh skill did not include a file snapshot.");
	}

	let totalBytes = 0;

	return files
		.flatMap((file) => {
			const filePath = normalizeSkillFilePath(file.path);
			const content =
				typeof file.contents === "string" ? file.contents : undefined;

			if (!filePath || content === undefined || content.includes("\u0000")) {
				return [];
			}

			const size = Buffer.byteLength(content);

			if (size > MAX_SKILL_FILE_BYTES) {
				return [];
			}

			totalBytes += size;

			if (totalBytes > MAX_SKILL_PACKAGE_BYTES) {
				throw new Error("Skill package is too large to install.");
			}

			return [{ path: filePath, content, size }];
		})
		.sort((first, second) => first.path.localeCompare(second.path));
};

const getExistingWorkspaceSkill = async (
	workspaceId: string,
	externalId: string,
) => {
	const workspace = await db
		.query({
			workspaces: {
				$: {
					where: {
						id: workspaceId,
					},
				},
				skills: {},
			},
		})
		.then(
			(result) => result.workspaces[0] as { skills?: WorkspaceSkillRecord[] },
		);

	return workspace.skills?.find(
		(skill) =>
			skill.externalId === externalId ||
			skill.sourcePath === `skills.sh:${externalId}`,
	);
};

const getSkillTx = (skillId: string) => {
	const tx = db.tx.skills[skillId];

	if (!tx) {
		throw new Error(`Skill transaction builder ${skillId} not found`);
	}

	return tx;
};

const getSkillsShHeaders = () => {
	const token =
		getNonEmptyString(process.env.SKILLS_SH_TOKEN) ??
		getNonEmptyString(process.env.VERCEL_OIDC_TOKEN);

	return {
		Accept: "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
};

const getSkillsShErrorMessage = async (response: Response) => {
	const body = await response.json().catch(() => undefined);

	if (isRecord(body) && typeof body.message === "string") {
		return body.message;
	}

	return `skills.sh request failed (${response.status})`;
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
	fallbackName: string,
) => {
	const manifestName = getNonEmptyString(manifest?.name);
	const headingName = instructions.match(/^#\s+(.+)$/m)?.[1]?.trim();
	const name = manifestName ?? headingName ?? fallbackName;
	const description =
		getNonEmptyString(manifest?.description) ??
		getFirstDescriptionParagraph(instructions);

	return {
		name,
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

const normalizeSkillFilePath = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const normalized = value.trim().replaceAll("\\", "/");

	if (!normalized || normalized.startsWith("/")) {
		return undefined;
	}

	const segments = normalized.split("/");

	if (
		segments.some(
			(segment) => segment.length === 0 || segment === "." || segment === "..",
		)
	) {
		return undefined;
	}

	return segments.join("/");
};

const slugify = (value: string) => {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return slug || randomUUID();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);
