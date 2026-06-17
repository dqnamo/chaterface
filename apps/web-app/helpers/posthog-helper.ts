import posthog from "posthog-js";

type ProductEventProperties = Record<
	string,
	string | number | boolean | null | undefined
>;

const isPostHogConfigured = Boolean(
	process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim(),
);

export const captureProductEvent = (
	eventName: string,
	properties?: ProductEventProperties,
) => {
	if (!isPostHogConfigured) {
		return;
	}

	posthog.capture(eventName, properties);
};

export const identifyProductUser = (
	userId: string,
	properties?: ProductEventProperties,
) => {
	if (!isPostHogConfigured) {
		return;
	}

	posthog.identify(userId, properties);
};

export const resetProductUser = () => {
	if (!isPostHogConfigured) {
		return;
	}

	posthog.reset();
};
