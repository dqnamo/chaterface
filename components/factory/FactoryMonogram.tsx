import type { CSSProperties } from "react";
import {
  type FactoryColorValue,
  getFactoryColor,
} from "@/helpers/factory-colors";

export default function FactoryMonogram({
  color,
  name,
}: {
  color?: FactoryColorValue | null | string;
  name: string;
}) {
  const initials = getInitials(name);
  const factoryColor = getFactoryColor(color);
  const style = {
    "--factory-monogram-bg": `var(--${factoryColor}-3)`,
    "--factory-monogram-border": `var(--${factoryColor}-6)`,
    "--factory-monogram-fg": `var(--${factoryColor}-11)`,
  } as CSSProperties;

  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold uppercase"
      style={{
        ...style,
        backgroundColor: "var(--factory-monogram-bg)",
        borderColor: "var(--factory-monogram-border)",
        color: "var(--factory-monogram-fg)",
      }}
    >
      {initials}
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "F";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}
