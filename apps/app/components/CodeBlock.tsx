"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { CodeLine } from "@/helpers/syntax";

export default function CodeBlock({ lines }: { lines: CodeLine[] }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
      <code>
        {lines.map((line) => (
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
        ))}
      </code>
    </pre>
  );
}
