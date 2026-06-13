import { type BundledLanguage, bundledLanguages, codeToTokens } from "shiki";

export type CodeLine = {
	id: string;
	tokens: {
		id: string;
		lightColor: string | undefined;
		darkColor: string | undefined;
		content: string;
	}[];
};

export async function tokenize(
	source: string,
	lang: string = "tsx",
): Promise<CodeLine[]> {
	const language = toBundledLanguage(lang);
	const [light, dark] = await Promise.all([
		codeToTokens(source, { lang: language, theme: "github-light" }),
		codeToTokens(source, { lang: language, theme: "github-dark" }),
	]);

	return light.tokens.map((line, lineIndex) => ({
		id: `line-${lineIndex + 1}`,
		tokens: line.map((token, tokenIndex) => ({
			id: `line-${lineIndex + 1}-token-${tokenIndex + 1}`,
			lightColor: token.color,
			darkColor: dark.tokens[lineIndex]?.[tokenIndex]?.color,
			content: token.content,
		})),
	}));
}

function toBundledLanguage(lang: string): BundledLanguage {
	const normalized = lang.trim().toLowerCase();

	if (normalized in bundledLanguages) {
		return normalized as BundledLanguage;
	}

	return "tsx";
}
