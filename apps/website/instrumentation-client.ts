import posthog from "posthog-js";

const posthogProjectToken =
	process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();

if (posthogProjectToken) {
	posthog.init(posthogProjectToken, {
		api_host:
			process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
			"https://us.i.posthog.com",
		capture_pageview: true,
		defaults: "2026-01-30",
		loaded: (posthogClient) => {
			if (process.env.NODE_ENV === "development") {
				posthogClient.debug();
			}
		},
	});
}
