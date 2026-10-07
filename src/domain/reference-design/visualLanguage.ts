import type {
  ExtractedDesignTokens,
  ReferenceComposition,
  ReferenceDataUsage,
  ReferenceDensity,
  ReferenceImageUsage,
  ReferenceInferenceKind,
  ReferenceLayoutPattern,
  ReferenceVisualLanguage,
  ReferenceVisualTone,
} from "./types.js";

const SERIF_HINTS = [
  "playfair",
  "lora",
  "georgia",
  "times",
  "serif",
  "garamond",
  "merriweather",
  "cambria",
  "palatino",
];

function isSerif(fontFamily: string): boolean {
  const lower = fontFamily.toLowerCase();
  return SERIF_HINTS.some((hint) => lower.includes(hint));
}

function densityFromPatterns(
  patterns: ReferenceLayoutPattern[],
): ReferenceDensity {
  const weights = { sparse: 0, balanced: 0, dense: 0 } as Record<
    ReferenceDensity,
    number
  >;
  for (const pattern of patterns)
    weights[pattern.density] += pattern.occurrenceCount;
  const entries = Object.entries(weights) as Array<[ReferenceDensity, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][1] > 0 ? entries[0][0] : "balanced";
}

/**
 * High-level visual summary. Everything here is an inference from observed
 * tokens and layout patterns and is safe to surface as an estimate.
 */
export function inferVisualLanguage(
  tokens: ExtractedDesignTokens,
  patterns: ReferenceLayoutPattern[],
): ReferenceVisualLanguage {
  const density = densityFromPatterns(patterns);
  const notes: string[] = [];

  const patternTypes = new Set(patterns.map((pattern) => pattern.type));
  const imagePatterns = patterns.filter(
    (pattern) => pattern.type === "image_body",
  );
  const dataPatterns = patterns.filter((pattern) =>
    ["stat_layout", "table_layout", "chart_layout"].includes(pattern.type),
  );

  let imageUsage: ReferenceImageUsage;
  if (imagePatterns.length === 0) imageUsage = "none";
  else {
    const imagePages = imagePatterns.reduce(
      (sum, pattern) => sum + pattern.occurrenceCount,
      0,
    );
    if (imagePages >= 3) imageUsage = "heavy";
    else if (imagePatterns.some((pattern) => pattern.density === "dense"))
      imageUsage = "hero";
    else imageUsage = "supporting";
  }

  let dataUsage: ReferenceDataUsage;
  const dataPages = dataPatterns.reduce(
    (sum, pattern) => sum + pattern.occurrenceCount,
    0,
  );
  if (dataPages === 0) dataUsage = "none";
  else if (dataPages === 1) dataUsage = "light";
  else if (dataPages <= 3) dataUsage = "moderate";
  else dataUsage = "heavy";

  let composition: ReferenceComposition;
  if (patternTypes.has("two_column_body")) composition = "grid_based";
  else if (
    patternTypes.has("stat_layout") ||
    patternTypes.has("table_layout") ||
    patternTypes.has("chart_layout")
  )
    composition = "modular";
  else if (patternTypes.has("cover_like") && patternTypes.size <= 2)
    composition = "centered";
  else composition = "editorial";

  const serifTypography = tokens.typography.some((token) =>
    isSerif(token.fontFamily),
  );
  if (serifTypography) notes.push("Serif display typography detected.");

  const accent = tokens.colors.find((token) => token.role === "accent");
  const background = tokens.colors.find((token) => token.role === "background");
  const paletteSize = tokens.colors.length;
  if (paletteSize <= 3)
    notes.push("Restrained palette (three or fewer colors).");
  if (background) notes.push(`Light background ${background.value}.`);

  let tone: ReferenceVisualTone;
  if (tokens.typography.length === 0 && tokens.colors.length === 0)
    tone = "unknown";
  else if (dataUsage === "heavy" || dataUsage === "moderate")
    tone = "data_forward";
  else if (imageUsage === "heavy" || imageUsage === "hero") tone = "image_led";
  else if (paletteSize <= 3 && density === "sparse") tone = "minimal";
  else if (accent && serifTypography && imageUsage === "none")
    tone = serifTypography ? "premium" : "corporate";
  else if (serifTypography && composition === "editorial") tone = "editorial";
  else tone = "corporate";

  const patternConfidence = patterns.length
    ? patterns.reduce((sum, pattern) => sum + pattern.confidence, 0) /
      patterns.length
    : 0;
  const kind: ReferenceInferenceKind = "inferred";

  return {
    tone,
    density,
    composition,
    imageUsage,
    dataUsage,
    notes,
    confidence: Math.round(Math.min(1, patternConfidence) * 1000) / 1000,
    kind,
  };
}
