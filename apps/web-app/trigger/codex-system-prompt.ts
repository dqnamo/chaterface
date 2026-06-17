import { readFileSync } from "node:fs";
import path from "node:path";

const SYSTEM_PROMPT_PATH = path.join(
	process.cwd(),
	"trigger/prompts/system.md",
);

const DEFAULT_API_URL = "https://api.factoryplane.com";
const API_URL_PLACEHOLDER = "{{FACTORYPLANE_API_URL}}";

export const getCodexDeveloperInstructions = () => {
	const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

	return readFileSync(SYSTEM_PROMPT_PATH, "utf8")
		.replaceAll(API_URL_PLACEHOLDER, apiUrl)
		.trim();
};

const normalizeApiUrl = (value: string | undefined) => {
	const trimmed = value?.trim();

	if (!trimmed) {
		return DEFAULT_API_URL;
	}

	return trimmed.replace(/\/+$/, "");
};

export const formatCodexDeveloperInstructionsConfig = (
	instructions: string,
) => {
	return `developer_instructions="""\n${instructions}\n"""`;
};
