import { type NextRequest, NextResponse } from "next/server";
import {
	authenticateWorkspaceRequest,
	getNonEmptyString,
} from "../github/_lib/github-app";

export const runtime = "nodejs";

type SkillsShSkill = {
	id?: string;
	slug?: string;
	name?: string;
	source?: string;
	installs?: number;
	sourceType?: string;
	installUrl?: string | null;
	url?: string;
	isDuplicate?: boolean;
};

type SkillsShSearchResponse = {
	data?: SkillsShSkill[];
};

type SkillsShCuratedResponse = {
	data?: Array<{
		skills?: SkillsShSkill[];
	}>;
};

export async function GET(req: NextRequest) {
	const workspaceId = getNonEmptyString(
		req.nextUrl.searchParams.get("workspaceId"),
	);
	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const query = getNonEmptyString(req.nextUrl.searchParams.get("q"));
	const limit = clampInteger(req.nextUrl.searchParams.get("limit"), 1, 100, 24);
	const skills = query
		? await searchSkills(query, limit)
		: await getCuratedSkills(limit);

	return NextResponse.json({ skills });
}

const searchSkills = async (query: string, limit: number) => {
	if (query.length < 2) {
		return [];
	}

	const url = new URL("https://skills.sh/api/v1/skills/search");
	url.searchParams.set("q", query);
	url.searchParams.set("limit", String(limit));

	const response = await skillsShFetchJson<SkillsShSearchResponse>(url);
	return normalizeSkills(response.data ?? []).slice(0, limit);
};

const getCuratedSkills = async (limit: number) => {
	const response = await skillsShFetchJson<SkillsShCuratedResponse>(
		new URL("https://skills.sh/api/v1/skills/curated"),
	);
	const skills = (response.data ?? []).flatMap((owner) => owner.skills ?? []);

	return normalizeSkills(skills).slice(0, limit);
};

const normalizeSkills = (skills: SkillsShSkill[]) => {
	const seen = new Set<string>();

	return skills.flatMap((skill) => {
		if (
			!skill.id ||
			!skill.slug ||
			!skill.name ||
			!skill.source ||
			skill.isDuplicate
		) {
			return [];
		}

		if (seen.has(skill.id)) {
			return [];
		}

		seen.add(skill.id);

		return [
			{
				id: skill.id,
				slug: skill.slug,
				name: skill.name,
				source: skill.source,
				installs: skill.installs ?? 0,
				sourceType: skill.sourceType,
				installUrl: skill.installUrl,
				url: skill.url,
			},
		];
	});
};

const skillsShFetchJson = async <TResponse>(url: URL): Promise<TResponse> => {
	const response = await fetch(url, {
		headers: getSkillsShHeaders(),
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(await getSkillsShErrorMessage(response));
	}

	return (await response.json()) as TResponse;
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

const clampInteger = (
	value: string | null,
	minimum: number,
	maximum: number,
	fallback: number,
) => {
	const parsed = Number.parseInt(value ?? "", 10);

	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return Math.min(maximum, Math.max(minimum, parsed));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
