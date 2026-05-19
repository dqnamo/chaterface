import { type BundledLanguage, codeToTokens } from "shiki";

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
  lang: BundledLanguage = "tsx",
): Promise<CodeLine[]> {
  const [light, dark] = await Promise.all([
    codeToTokens(source, { lang, theme: "github-light" }),
    codeToTokens(source, { lang, theme: "github-dark" }),
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
