const GRAYSCALE_OPTIONS = [
  { id: "gray", label: "Gray" },
  { id: "mauve", label: "Mauve" },
  { id: "slate", label: "Slate" },
  { id: "sage", label: "Sage" },
  { id: "olive", label: "Olive" },
  { id: "sand", label: "Sand" },
] as const;

const ACCENT_OPTIONS = [
  { id: "bronze", label: "Bronze" },
  { id: "gold", label: "Gold" },
  { id: "brown", label: "Brown" },
  { id: "orange", label: "Orange" },
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
  { id: "cyan", label: "Cyan" },
  { id: "teal", label: "Teal" },
  { id: "jade", label: "Jade" },
  { id: "green", label: "Green" },
  { id: "grass", label: "Grass" },
] as const;

export const THEME_COLOR_OPTIONS = {
  grayscale: {
    storageKey: "factory:grayscale",
    defaultValue: "gray",
    values: GRAYSCALE_OPTIONS,
  },
  accent: {
    storageKey: "factory:accent",
    defaultValue: "blue",
    values: ACCENT_OPTIONS,
  },
} as const;

export type ThemeColorAxis = keyof typeof THEME_COLOR_OPTIONS;

export type ThemeColorValue<TAxis extends ThemeColorAxis> =
  (typeof THEME_COLOR_OPTIONS)[TAxis]["values"][number]["id"];
