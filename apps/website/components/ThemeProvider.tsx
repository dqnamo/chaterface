"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

const Provider = NextThemesProvider as React.ComponentType<
  ThemeProviderProps & { children?: React.ReactNode }
>;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </Provider>
  );
}
