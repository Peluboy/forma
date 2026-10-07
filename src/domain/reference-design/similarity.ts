import type { DesignSpec } from "../design-spec/types.js";
import { warning } from "./confidence.js";
import type {
  ReferenceDesignProfile,
  ReferenceDensity,
  ReferenceSimilarityReport,
  ReferenceWarning,
} from "./types.js";
import { isSupportedColor } from "./validation.js";

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

interface SpecFacts {
  colors: string[];
  fonts: string[];
  roles: string[];
  layoutIds: string[];
  density: ReferenceDensity;
  imageRatio: number;
  fontSizes: number[];
}

function collectSpecFacts(spec: DesignSpec): SpecFacts {
  const colors = new Set<string>();
  const fonts = new Set<string>();
  const roles: string[] = [];
  const layoutIds: string[] = [];
  const fontSizes: number[] = [];
  let imageArea = 0;
  let totalArea = 0;

  for (const page of spec.pages) {
    roles.push(page.role ?? "custom");
    if (typeof page.metadata?.layoutId === "string")
      layoutIds.push(page.metadata.layoutId);
    if (page.background?.color && isSupportedColor(page.background.color))
      colors.add(page.background.color.toLowerCase());
    for (const element of page.elements) {
      const area = element.width * element.height;
      totalArea += area;
      if (element.type === "text") {
        if (element.color && isSupportedColor(element.color))
          colors.add(element.color.toLowerCase());
        fonts.add(element.fontFamily);
        fontSizes.push(element.fontSize);
      } else if (element.type === "shape") {
        if (element.fill?.color && isSupportedColor(element.fill.color))
          colors.add(element.fill.color.toLowerCase());
        if (element.stroke?.color && isSupportedColor(element.stroke.color))
          colors.add(element.stroke.color.toLowerCase());
      } else if (element.type === "image" || element.type === "frame") {
        imageArea += area;
      }
    }
  }
  const covered =
    totalArea > 0
      ? Math.min(
          1,
          totalArea /
            (spec.pages.length *
              spec.documentSize.width *
              spec.documentSize.height),
        )
      : 0;
  const density: ReferenceDensity =
    covered < 0.18 ? "sparse" : covered < 0.5 ? "balanced" : "dense";
  return {
    colors: [...colors],
    fonts: [...fonts],
    roles,
    layoutIds,
    density,
    imageRatio: totalArea > 0 ? imageArea / totalArea : 0,
    fontSizes,
  };
}

const TOLERANCE = 40;

function paletteSimilarity(
  profile: ReferenceDesignProfile,
  facts: SpecFacts,
): number {
  const reference = profile.extractedTokens.colors.filter((token) =>
    isSupportedColor(token.value),
  );
  if (!reference.length || !facts.colors.length) return 0;
  let matched = 0;
  for (const token of reference) {
    const weight = Math.max(0.25, token.frequency);
    const found = facts.colors.some(
      (color) => colorDistance(token.value, color) <= TOLERANCE,
    );
    if (found) matched += weight;
  }
  const total = reference.reduce(
    (sum, token) => sum + Math.max(0.25, token.frequency),
    0,
  );
  return Math.round(Math.min(1, matched / total) * 1000) / 1000;
}

function typographySimilarity(
  profile: ReferenceDesignProfile,
  facts: SpecFacts,
): number {
  const reference = profile.extractedTokens.typography;
  if (!reference.length || !facts.fonts.length) return 0;
  let matched = 0;
  for (const token of reference) {
    if (
      token.fontFamily &&
      token.fontFamily !== "unknown" &&
      facts.fonts.some(
        (font) => font.toLowerCase() === token.fontFamily.toLowerCase(),
      )
    )
      matched += 1;
  }
  const familyScore = matched / reference.length;
  const maxSpec = facts.fontSizes.length ? Math.max(...facts.fontSizes) : 0;
  const maxRef = reference.reduce(
    (max, token) => Math.max(max, token.fontSize),
    0,
  );
  const scaleScore =
    maxRef > 0 && maxSpec > 0
      ? Math.max(0, 1 - Math.abs(maxRef - maxSpec) / maxRef)
      : 0;
  return Math.round((familyScore * 0.6 + scaleScore * 0.4) * 1000) / 1000;
}

const ROLE_MATCH: Record<string, string[]> = {
  cover_like: ["cover"],
  heading_body: ["content", "section"],
  two_column_body: ["content"],
  image_body: ["content"],
  stat_layout: ["stats"],
  quote_layout: ["quote"],
  table_layout: ["table"],
  chart_layout: ["chart"],
  closing_like: ["closing"],
  unknown: [],
};

function layoutSimilarity(
  profile: ReferenceDesignProfile,
  facts: SpecFacts,
): number {
  if (!profile.layoutPatterns.length) return 0;
  let matched = 0;
  for (const pattern of profile.layoutPatterns) {
    const expected = ROLE_MATCH[pattern.type] ?? [];
    const byRole = facts.roles.some((role) => expected.includes(role));
    const byLayout = pattern.candidateLayoutIds.some((id) =>
      facts.layoutIds.includes(id),
    );
    if (byRole || byLayout) matched += pattern.occurrenceCount;
  }
  const total = profile.layoutPatterns.reduce(
    (sum, pattern) => sum + pattern.occurrenceCount,
    0,
  );
  return total > 0 ? Math.round(Math.min(1, matched / total) * 1000) / 1000 : 0;
}

function densitySimilarity(
  profile: ReferenceDesignProfile,
  facts: SpecFacts,
): number {
  return profile.visualLanguage.density === facts.density ? 1 : 0.4;
}

function imagerySimilarity(
  profile: ReferenceDesignProfile,
  facts: SpecFacts,
): number {
  const usage = profile.visualLanguage.imageUsage;
  if (usage === "none") return facts.imageRatio < 0.02 ? 1 : 0.3;
  if (usage === "unknown") return 0.5;
  return facts.imageRatio > 0.15 ? 1 : 0.4;
}

/**
 * A heuristic similarity signal between a reference profile and a generated
 * DesignSpec. This is NOT proof of legal or brand compliance, and NOT an
 * objective quality score.
 */
export function computeReferenceSimilarity(
  profile: ReferenceDesignProfile,
  spec: DesignSpec,
): ReferenceSimilarityReport {
  const facts = collectSpecFacts(spec);
  const palette = paletteSimilarity(profile, facts);
  const typography = typographySimilarity(profile, facts);
  const layout = layoutSimilarity(profile, facts);
  const density = densitySimilarity(profile, facts);
  const imagery = imagerySimilarity(profile, facts);
  const overall =
    Math.round(
      (palette * 0.25 +
        typography * 0.25 +
        layout * 0.25 +
        density * 0.15 +
        imagery * 0.1) *
        1000,
    ) / 1000;

  const warnings: ReferenceWarning[] = [];
  if (profile.confidence.overall < 0.4)
    warnings.push(
      warning(
        "partial_extraction",
        "Reference confidence is low; similarity should be read with caution.",
        "medium",
      ),
    );
  if (typography < 0.5)
    warnings.push(
      warning(
        "typography_uncertain",
        "Typography similarity is limited; fonts are estimates, not matches.",
        "low",
      ),
    );
  if (palette < 0.5)
    warnings.push(
      warning(
        "unsupported_color_value",
        "Palette similarity is partial; some reference colors were not reused.",
        "low",
      ),
    );

  return { overall, palette, typography, layout, density, imagery, warnings };
}
