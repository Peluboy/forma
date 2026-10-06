/** Versioned, deliberately small catalog. Every hosted family ships with the app. */
export const fontCatalog = [
  { family: "Arial", category: "System", weights: [400, 500, 700] },
  { family: "Georgia", category: "System", weights: [400, 500, 700] },
  { family: "Verdana", category: "System", weights: [400, 500, 700] },
  { family: "Trebuchet MS", category: "System", weights: [400, 500, 700] },
  { family: "Courier New", category: "System", weights: [400, 500, 700] },
  {
    family: "Inter",
    category: "Sans",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Roboto",
    category: "Sans",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "DM Sans",
    category: "Sans",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Manrope",
    category: "Sans",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Plus Jakarta Sans",
    category: "Sans",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Space Grotesk",
    category: "Display",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Playfair Display",
    category: "Serif",
    weights: [400, 500, 600, 700, 800],
  },
  { family: "Lora", category: "Serif", weights: [400, 500, 600, 700] },
] as const;

export const fontFamilies = fontCatalog.map((font) => font.family);
export type FontFamily = (typeof fontCatalog)[number]["family"];

export function fontWeights(family: FontFamily): readonly number[] {
  return (
    fontCatalog.find((font) => font.family === family)?.weights || [400, 700]
  );
}

export function nearestFontWeight(
  family: FontFamily,
  requested: number,
): number {
  return fontWeights(family).reduce((best, value) =>
    Math.abs(value - requested) < Math.abs(best - requested) ? value : best,
  );
}

export function effectiveFontWeight(
  layout: { fontWeight?: number; bold?: boolean },
  fallback = 400,
): number {
  return layout.fontWeight ?? (layout.bold ? 700 : fallback);
}
