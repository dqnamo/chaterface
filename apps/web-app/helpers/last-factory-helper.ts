"use client";

const LAST_FACTORY_COOKIE = "factoryplane_last_factory";
const LAST_FACTORY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type LastFactory = {
	factoryId: string;
	orgHandle: string;
	userId: string;
};

export const rememberLastFactory = (lastFactory: LastFactory) => {
	if (typeof document === "undefined") {
		return;
	}

	// biome-ignore lint/suspicious/noDocumentCookie: This preference needs a traditional cookie so it is available across all app routes.
	document.cookie = `${LAST_FACTORY_COOKIE}=${encodeURIComponent(
		JSON.stringify(lastFactory),
	)}; path=/; max-age=${LAST_FACTORY_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
};

export const getRememberedFactory = (userId: string) => {
	if (typeof document === "undefined") {
		return;
	}

	const cookie = document.cookie
		.split("; ")
		.find((part) => part.startsWith(`${LAST_FACTORY_COOKIE}=`));

	if (!cookie) {
		return;
	}

	try {
		const parsed = JSON.parse(decodeURIComponent(cookie.split("=")[1] ?? ""));

		if (
			isLastFactory(parsed) &&
			parsed.userId === userId &&
			parsed.orgHandle.length > 0 &&
			parsed.factoryId.length > 0
		) {
			return parsed;
		}
	} catch {
		return;
	}
};

const isLastFactory = (value: unknown): value is LastFactory => {
	return (
		typeof value === "object" &&
		value !== null &&
		"factoryId" in value &&
		"orgHandle" in value &&
		"userId" in value &&
		typeof value.factoryId === "string" &&
		typeof value.orgHandle === "string" &&
		typeof value.userId === "string"
	);
};
