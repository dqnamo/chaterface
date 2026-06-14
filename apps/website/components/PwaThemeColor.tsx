"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const THEME_COLORS = {
	dark: "#111111",
	light: "#ffffff",
} as const;

export default function PwaThemeColor() {
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		const themeColor =
			resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;
		const metaTags = document.querySelectorAll<HTMLMetaElement>(
			'meta[name="theme-color"]',
		);

		for (const metaTag of metaTags) {
			metaTag.content = themeColor;
		}
	}, [resolvedTheme]);

	return null;
}
