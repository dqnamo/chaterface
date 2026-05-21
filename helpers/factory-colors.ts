export const FACTORY_COLOR_OPTIONS = [
  { id: "bronze", label: "Bronze" },
  { id: "gold", label: "Gold" },
  { id: "brown", label: "Brown" },
  { id: "orange", label: "Orange" },
  { id: "amber", label: "Amber" },
  { id: "tomato", label: "Tomato" },
  { id: "red", label: "Red" },
  { id: "ruby", label: "Ruby" },
  { id: "crimson", label: "Crimson" },
  { id: "pink", label: "Pink" },
  { id: "plum", label: "Plum" },
  { id: "purple", label: "Purple" },
  { id: "violet", label: "Violet" },
  { id: "iris", label: "Iris" },
  { id: "indigo", label: "Indigo" },
  { id: "blue", label: "Blue" },
  { id: "sky", label: "Sky" },
  { id: "cyan", label: "Cyan" },
  { id: "teal", label: "Teal" },
  { id: "mint", label: "Mint" },
  { id: "jade", label: "Jade" },
  { id: "green", label: "Green" },
  { id: "grass", label: "Grass" },
  { id: "lime", label: "Lime" },
] as const;

export type FactoryColorValue = (typeof FACTORY_COLOR_OPTIONS)[number]["id"];

const FACTORY_COLOR_IDS = new Set<string>(
  FACTORY_COLOR_OPTIONS.map((option) => option.id),
);

export const DEFAULT_FACTORY_COLOR = "orange" satisfies FactoryColorValue;

export function isFactoryColor(value: unknown): value is FactoryColorValue {
  return typeof value === "string" && FACTORY_COLOR_IDS.has(value);
}

export function getFactoryColor(value: unknown): FactoryColorValue {
  return isFactoryColor(value) ? value : DEFAULT_FACTORY_COLOR;
}
