import { type NextRequest, NextResponse } from "next/server";
import {
	authenticateWorkspaceRequest,
	createInstallationAccessToken,
	getGithubAppConfig,
	getNonEmptyString,
} from "../_lib/github-app";

type GithubRepository = {
	full_name: string;
	clone_url: string;
	default_branch: string;
	private: boolean;
	html_url: string;
};

type GithubRepositoriesResponse = {
	repositories?: GithubRepository[];
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

	const installationId = authResult.workspace.githubAppInstallationId;

	if (!installationId) {
		return NextResponse.json(
			{ message: "GitHub is not connected for this workspace" },
			{ status: 409 },
		);
	}

	const config = getGithubAppConfig();

	if (!config.ok) {
		return NextResponse.json({ message: config.message }, { status: 500 });
	}

	const accessToken = await createInstallationAccessToken(
		installationId,
		config,
	);
	const result = await loadGithubRepositories(accessToken);
	const repositories = result.map((repository) => ({
		fullName: repository.full_name,
		cloneUrl: repository.clone_url,
		defaultBranch: repository.default_branch,
		private: repository.private,
		htmlUrl: repository.html_url,
	}));

	return NextResponse.json({ repositories });
}

const loadGithubRepositories = async (accessToken: string) => {
	const repositories: GithubRepository[] = [];

	for (let page = 1; ; page += 1) {
		const url = new URL("https://api.github.com/installation/repositories");
		url.searchParams.set("per_page", "100");
		url.searchParams.set("page", String(page));

		const response = await fetch(url, {
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${accessToken}`,
				"User-Agent": "Chaterface",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});

		if (!response.ok) {
			throw new Error("Failed to load GitHub repositories");
		}

		const result = (await response.json()) as GithubRepositoriesResponse;
		const pageRepositories = result.repositories ?? [];
		repositories.push(...pageRepositories);

		if (pageRepositories.length < 100) {
			return repositories;
		}
	}
};
