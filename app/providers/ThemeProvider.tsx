"use client";

import { create } from "zustand";
import { useEffect } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "system",
  resolvedTheme: "dark", // Default to dark until resolved
  setTheme: (theme) => set({ theme }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.resolvedTheme === "light" ? "dark" : "light";
      return { theme: newTheme };
    }),
}));

export function ThemeSynchronizer() {
  const { theme, resolvedTheme, setTheme, setResolvedTheme } = useThemeStore();

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme") as Theme | null;
      if (storedTheme) {
        setTheme(storedTheme);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // 2. Persist to LocalStorage on Change
  useEffect(() => {
    if (theme) {
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  // 3. Resolve theme (handle "system")
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      if (theme === "system") {
        setResolvedTheme(mediaQuery.matches ? "dark" : "light");
      } else {
        setResolvedTheme(theme === "dark" ? "dark" : "light");
      }
    };

    applyTheme();

    if (theme === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [theme, setResolvedTheme]);

  // 4. Apply to document
  useEffect(() => {
    const body = document.body;
    if (resolvedTheme === "dark") {
      body.classList.add("dark");
    } else {
      body.classList.remove("dark");
    }
  }, [resolvedTheme]);

  return null;
}
