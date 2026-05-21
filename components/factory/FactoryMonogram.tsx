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

  const wordInitials = parts
    .map((part) => part.match(/[A-Za-z]/)?.[0])
    .filter((letter): letter is string => Boolean(letter))
    .slice(0, 2)
    .join("");

  if (wordInitials.length >= 2) {
    return wordInitials.toUpperCase();
  }

  const letters = name.match(/[A-Za-z]/g)?.join("") ?? "FA";
  return letters.slice(0, 2).padEnd(2, "F").toUpperCase();
}
