import type { CSSProperties } from "react";
import { cn } from "@/helpers/classname-helper";
import {
  type FactoryColorValue,
  getFactoryColor,
} from "@/helpers/factory-colors";

export default function FactoryMonogram({
  color,
  name,
  selected,
}: {
  color?: FactoryColorValue | null | string;
  name: string;
  selected?: boolean;
}) {
  const initials = getInitials(name);
  const factoryColor = getFactoryColor(color);
  const style = {
    "--factory-monogram-bg": `var(--${factoryColor}-9)`,
    "--factory-monogram-border": `var(--${factoryColor}-10)`,
    "--factory-monogram-fg": `white`,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold uppercase transition-opacity",
        selected === false && "opacity-50 hover:opacity-75",
        selected === true && "opacity-100",
      )}
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
