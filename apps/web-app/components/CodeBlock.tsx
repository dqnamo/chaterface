"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { type CodeLine, tokenize } from "@/helpers/syntax";

export default function CodeBlock({
	code,
	language = "tsx",
}: {
	code: string;
	language?: string;
}) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [lines, setLines] = useState<CodeLine[] | null>(null);
	const isDark = mounted && resolvedTheme === "dark";

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		let cancelled = false;

		setLines(null);
		tokenize(code, language)
			.then((nextLines) => {
				if (!cancelled) {
					setLines(nextLines);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setLines(null);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [code, language]);

	return (
		<pre className="max-w-full overflow-x-auto bg-grayscale-2 p-2 font-mono text-[11px] leading-5 text-grayscale-12 ring-1 ring-grayscale-4">
			<code>
				{lines
					? lines.map((line) => (
							<span className="block" key={line.id}>
								{line.tokens.map((token) => (
									<span
										key={token.id}
										style={{
											color: isDark ? token.darkColor : token.lightColor,
										}}
									>
										{token.content}
									</span>
								))}
							</span>
						))
					: code}
			</code>
		</pre>
	);
}
