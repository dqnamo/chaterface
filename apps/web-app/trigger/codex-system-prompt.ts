import { readFileSync } from "node:fs";
import path from "node:path";

const SYSTEM_PROMPT_PATH = path.join(
	process.cwd(),
	"trigger/prompts/system.md",
);

export const getCodexDeveloperInstructions = () => {
	return readFileSync(SYSTEM_PROMPT_PATH, "utf8").trim();
};

export const formatCodexDeveloperInstructionsConfig = (instructions: string) => {
	return `developer_instructions="""\n${instructions}\n"""`;
};
