import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SYSTEM_PROMPT_PATH = [
	path.join(process.cwd(), "workflows/prompts/system.md"),
	fileURLToPath(new URL("./prompts/system.md", import.meta.url)),
].find(existsSync);

const DEFAULT_API_URL = "https://api.chaterface.com";
const API_URL_PLACEHOLDER = "{{TASK_API_URL}}";

export const getCodexDeveloperInstructions = () => {
	const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
	if (!SYSTEM_PROMPT_PATH) {
		throw new Error("Unable to locate the Codex system prompt");
	}

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
