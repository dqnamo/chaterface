"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "@/components/public/Switch";

export function ThemeToggle({ size = 16 }: { size?: number }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checked = mounted && resolvedTheme === "dark";

  return (
    <Switch.Composed
      aria-label="Toggle dark mode"
      checked={checked}
      disabled={!mounted}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      size={size}
    />
  );
}
