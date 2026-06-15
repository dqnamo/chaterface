import { createSign } from "node:crypto";

const GITHUB_API_VERSION = "2022-11-28";

type GithubAppConfig = {
	appId: string;
	privateKey: string;
};

export const getGithubAppConfig = () => {
	const appId = process.env.GITHUB_APP_ID?.trim();
	const privateKey = normalizeGithubAppPrivateKey(
		process.env.GITHUB_APP_PRIVATE_KEY,
	);

	if (!appId || !privateKey) {
		throw new Error("GitHub App credentials are not configured");
	}

	return { appId, privateKey };
};

export const createInstallationAccessToken = async (installationId: string) => {
	const config = getGithubAppConfig();
	const response = await fetch(
		`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
		{
			method: "POST",
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${createGithubAppJwt(config)}`,
				"User-Agent": "Factoryplane",
				"X-GitHub-Api-Version": GITHUB_API_VERSION,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to create GitHub App installation token");
	}

	const result = (await response.json()) as { token?: string };

	if (!result.token) {
		throw new Error("GitHub App installation token response was empty");
	}

	return result.token;
};

const createGithubAppJwt = ({ appId, privateKey }: GithubAppConfig) => {
	const now = Math.floor(Date.now() / 1000);
	const header = Buffer.from(
		JSON.stringify({ alg: "RS256", typ: "JWT" }),
		"utf8",
	).toString("base64url");
	const payload = Buffer.from(
		JSON.stringify({
			iat: now - 60,
			exp: now + 9 * 60,
			iss: appId,
		}),
		"utf8",
	).toString("base64url");
	const unsignedToken = `${header}.${payload}`;
	const signature = createSign("RSA-SHA256")
		.update(unsignedToken)
		.sign(privateKey, "base64url");

	return `${unsignedToken}.${signature}`;
};

const normalizeGithubAppPrivateKey = (value: string | undefined) => {
	const trimmed = value?.trim();

	if (!trimmed) {
		return undefined;
	}

	return trimmed.replace(/\\n/g, "\n");
};
