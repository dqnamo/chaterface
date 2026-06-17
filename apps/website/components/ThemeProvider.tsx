"use client";

import { usePathname } from "next/navigation";
import {
	ThemeProvider as NextThemesProvider,
	type ThemeProviderProps,
} from "next-themes";

const Provider = NextThemesProvider as React.ComponentType<
	ThemeProviderProps & { children?: React.ReactNode }
>;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isHomePage = pathname === "/";

	return (
		<Provider
			attribute="class"
			defaultTheme="light"
			enableSystem
			forcedTheme={isHomePage ? "light" : undefined}
			disableTransitionOnChange
		>
			{children}
		</Provider>
	);
}
