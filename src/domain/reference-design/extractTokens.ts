import type {
  ExtractedColorToken,
  ExtractedDesignTokens,
  ExtractedSpacingToken,
  ExtractedTypographyToken,
  ReferenceInferenceKind,
  ReferencePageAnalysis,
} from "./types.js";
import { isSupportedColor, REFERENCE_LIMITS } from "./validation.js";

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return 0;
  const delta = max - min;
  return lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
}

interface ColorCandidate {
  value: string;
  count: number;
  backgrounds: number;
  texts: number;
}

function rankColors(pages: ReferencePageAnalysis[]): {
  order: string[];
  candidates: Map<string, ColorCandidate>;
  total: number;
} {
  const candidates = new Map<string, ColorCandidate>();
  let total = 0;
  for (const page of pages)
    for (const observation of page.colorObservations) {
      if (!isSupportedColor(observation.value)) continue;
      const value = observation.value.toLowerCase();
      const entry = candidates.get(value) ?? {
        value,
        count: 0,
        backgrounds: 0,
        texts: 0,
      };
      entry.count += 1;
      if (observation.role === "background") entry.backgrounds += 1;
      else entry.texts += 1;
      candidates.set(value, entry);
      total += 1;
    }
  // Also count region colors directly if observations were sparse.
  if (total === 0) {
    for (const page of pages)
      for (const region of page.detectedRegions) {
        const color = region.style?.color;
        const background = region.style?.background;
        for (const value of [color, background]) {
          if (!isSupportedColor(value)) continue;
          const key = value.toLowerCase();
          const entry = candidates.get(key) ?? {
            value: key,
            count: 0,
            backgrounds: 0,
            texts: 0,
          };
          entry.count += 1;
          if (value === background) entry.backgrounds += 1;
          else entry.texts += 1;
          candidates.set(key, entry);
          total += 1;
        }
      }
  }
  const order = [...candidates.values()]
    .sort((a, b) => b.count - a.count)
    .map((c) => c.value);
  return { order, candidates, total };
}

function assignColorRoles(
  order: string[],
  candidates: Map<string, ColorCandidate>,
  total: number,
): ExtractedColorToken[] {
  const roles = new Map<string, string>();
  const lightest = order.find((c) => luminance(c) > 0.85);
  const darkest = order.find((c) => luminance(c) < 0.25);
  const saturated = order.find((c) => saturation(c) > 0.35);
  if (lightest) roles.set(lightest, "background");
  if (darkest) roles.set(darkest, "primary");
  if (saturated && saturated !== lightest) roles.set(saturated, "accent");
  order.forEach((value, index) => {
    if (roles.has(value)) return;
    if (luminance(value) > 0.55)
      roles.set(value, index < 5 ? "surface" : "muted");
    else roles.set(value, index < 5 ? "secondary" : "muted");
  });

  return order.slice(0, REFERENCE_LIMITS.maxColors).map((value, index) => {
    const entry = candidates.get(value)!;
    const role = roles.get(value) ?? "muted";
    const frequency =
      total > 0 ? Math.round((entry.count / total) * 1000) / 1000 : 0;
    const evidence = [
      `seen ${entry.count} time(s)`,
      entry.backgrounds > entry.texts
        ? "used as fill/background"
        : "used as text",
    ];
    return {
      id: `color-${role}-${index + 1}`,
      value,
      role,
      frequency,
      confidence: Math.min(0.95, 0.45 + Math.min(entry.count, 8) * 0.06),
      kind: "inferred" as ReferenceInferenceKind,
      evidence,
    };
  });
}

const TYPOGRAPHY_ROLE_ORDER = [
  "title",
  "sectionHeading",
  "heading",
  "subheading",
  "statNumber",
  "quote",
  "bodyLarge",
  "body",
  "caption",
  "metadata",
  "attribution",
  "subtitle",
] as const;

function assignTypographyRoles(
  groups: Array<{
    fontFamily: string;
    fontSize: number;
    fontWeight?: number | string;
    color?: string;
    count: number;
  }>,
  total: number,
): ExtractedTypographyToken[] {
  const sorted = [...groups].sort((a, b) => b.fontSize - a.fontSize);
  return sorted.slice(0, 12).map((group, index) => {
    const role = TYPOGRAPHY_ROLE_ORDER[index] ?? "body";
    const frequency =
      total > 0 ? Math.round((group.count / total) * 1000) / 1000 : 0;
    return {
      id: `type-${role}`,
      role,
      fontFamily: group.fontFamily,
      fontSize: Math.round(group.fontSize * 10) / 10,
      ...(group.fontWeight !== undefined
        ? { fontWeight: group.fontWeight }
        : {}),
      frequency,
      confidence: Math.min(0.9, 0.4 + Math.min(group.count, 6) * 0.07),
      kind: "inferred",
      evidence: [
        `observed at ${Math.round(group.fontSize * 10) / 10}pt`,
        `${group.fontFamily} seen ${group.count} time(s)`,
      ],
    };
  });
}

export function extractDesignTokens(
  pages: ReferencePageAnalysis[],
  options: { kind?: ReferenceInferenceKind } = {},
): ExtractedDesignTokens {
  const kind: ReferenceInferenceKind = options.kind ?? "inferred";
  const { order, candidates, total } = rankColors(pages);
  const colors = assignColorRoles(order, candidates, total).map((token) => ({
    ...token,
    kind,
  }));

  const typographyGroups = new Map<
    string,
    {
      fontFamily: string;
      fontSize: number;
      fontWeight?: number | string;
      color?: string;
      count: number;
    }
  >();
  let typographyTotal = 0;
  for (const page of pages)
    for (const observation of page.typographyObservations) {
      if (!observation.fontFamily || !Number.isFinite(observation.fontSize))
        continue;
      const key = `${observation.fontFamily}:${Math.round(observation.fontSize)}`;
      const entry = typographyGroups.get(key) ?? {
        fontFamily: observation.fontFamily,
        fontSize: observation.fontSize,
        fontWeight: observation.fontWeight,
        color: observation.color,
        count: 0,
      };
      entry.count += 1;
      typographyGroups.set(key, entry);
      typographyTotal += 1;
    }
  const typography = assignTypographyRoles(
    [...typographyGroups.values()],
    typographyTotal,
  ).map((token) => ({ ...token, kind }));

  const spacingCounts = new Map<number, number>();
  for (const page of pages)
    for (const observation of page.spacingObservations) {
      if (!Number.isFinite(observation.value) || observation.value <= 0)
        continue;
      const rounded = Math.round(observation.value);
      spacingCounts.set(rounded, (spacingCounts.get(rounded) ?? 0) + 1);
    }
  const spacingTotal = [...spacingCounts.values()].reduce((a, b) => a + b, 0);
  const spacingValues = [...spacingCounts.entries()].sort(
    (a, b) => a[0] - b[0],
  );
  const spacingRoles = ["xs", "sm", "md", "lg", "xl", "xxl"];
  const spacing: ExtractedSpacingToken[] = spacingValues
    .slice(0, 6)
    .map(([value, count], index) => ({
      id: `space-${spacingRoles[index] ?? `s${index + 1}`}`,
      value,
      role: spacingRoles[index] ?? `s${index + 1}`,
      frequency:
        spacingTotal > 0 ? Math.round((count / spacingTotal) * 1000) / 1000 : 0,
      confidence: Math.min(0.9, 0.4 + Math.min(count, 6) * 0.07),
      kind,
      evidence: [`interval observed ${count} time(s)`],
    }));

  return { colors, typography, spacing };
}
