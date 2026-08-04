export const DEFAULT_CODEX_MODEL = "gpt-5.5";
export const DEFAULT_CODEX_REASONING_EFFORT = "medium";
export const DEFAULT_CODEX_SPEED = "standard";

export type AgentDefaultOptions = {
	agentModel: string;
	agentReasoningEffort: string;
	agentSpeed: string;
};

export const CODEX_MODEL_OPTIONS = [
	{ value: "gpt-5.5", label: "gpt-5.5" },
	{ value: "gpt-5.4", label: "gpt-5.4" },
] as const;

export const CODEX_REASONING_EFFORT_OPTIONS = [
	{ value: "minimal", label: "minimal" },
	{ value: "low", label: "low" },
	{ value: "medium", label: "medium" },
	{ value: "high", label: "high" },
	{ value: "xhigh", label: "xhigh" },
] as const;

export const CODEX_SPEED_OPTIONS = [
	{ value: "standard", label: "standard" },
	{ value: "fast", label: "fast" },
] as const;

export const getCodexSpeedConfigOverrides = (speed: string) => {
	if (speed !== "fast") {
		return [];
	}

	return ["service_tier=fast", "features.fast_mode=true"];
};

export const getTaskAgentSpeed = (speed: string | undefined) => {
	const resolved = speed ?? DEFAULT_CODEX_SPEED;
	const isValid = CODEX_SPEED_OPTIONS.some(
		(option) => option.value === resolved,
	);

	return isValid ? resolved : DEFAULT_CODEX_SPEED;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getStringSetting = (
	settings: Record<string, unknown>,
	key: string,
	fallback: string,
	options?: readonly { value: string }[],
) => {
	const value = settings[key];

	if (typeof value !== "string" || value.trim().length === 0) {
		return fallback;
	}

	const trimmed = value.trim();

	return !options || options.some((option) => option.value === trimmed)
		? trimmed
		: fallback;
};

export const getAgentDefaultOptions = (
	settings: unknown,
): AgentDefaultOptions => {
	const record = isRecord(settings) ? settings : {};

	return {
		agentModel: getStringSetting(record, "agentModel", DEFAULT_CODEX_MODEL),
		agentReasoningEffort: getStringSetting(
			record,
			"agentReasoningEffort",
			DEFAULT_CODEX_REASONING_EFFORT,
			CODEX_REASONING_EFFORT_OPTIONS,
		),
		agentSpeed: getStringSetting(
			record,
			"agentSpeed",
			DEFAULT_CODEX_SPEED,
			CODEX_SPEED_OPTIONS,
		),
	};
};

export const getAgentSettingsRecord = (
	settings: unknown,
): Record<string, unknown> => (isRecord(settings) ? settings : {});
