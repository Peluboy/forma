import type {
  ReferenceRegion,
  ReferenceRegionType,
  ReferenceWarning,
} from "./types.js";

/**
 * Low-level reference-intelligence validation. Shared by the DesignSpec
 * extractor, the image-analysis mapper, and the profile schema.
 */

export const REFERENCE_LIMITS = {
  maxRegionsPerPage: 120,
  maxPages: 40,
  maxRegionText: 4000,
  maxObservations: 60,
  maxColors: 24,
} as const;

export const REFERENCE_REGION_TYPES: ReadonlySet<ReferenceRegionType> = new Set(
  [
    "heading",
    "subheading",
    "body",
    "caption",
    "image",
    "shape",
    "card",
    "stat",
    "quote",
    "table",
    "chart",
    "logo",
    "footer",
    "unknown",
  ],
);

export function clamp01(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export function isValidConfidence(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isSupportedColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

export function normalizeColor(value: unknown): string | undefined {
  if (isSupportedColor(value)) return value.toLowerCase();
  if (typeof value === "string") {
    const short = /^#([0-9a-fA-F]{3})$/.exec(value.trim());
    if (short) {
      const [r, g, b] = short[1].split("");
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(
      value.trim(),
    );
    if (rgb) {
      const toHex = (part: string) =>
        Math.max(0, Math.min(255, Number(part)))
          .toString(16)
          .padStart(2, "0");
      return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
    }
  }
  return undefined;
}

export function isKnownRegionType(
  value: unknown,
): value is ReferenceRegionType {
  return (
    typeof value === "string" &&
    REFERENCE_REGION_TYPES.has(value as ReferenceRegionType)
  );
}

export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A region is impossible when geometry is non-finite, negative, or off-page. */
export function boundsAreImpossible(
  bounds: Partial<RegionBounds> | undefined,
  pageWidth: number,
  pageHeight: number,
): boolean {
  if (!bounds) return true;
  const values = [bounds.x, bounds.y, bounds.width, bounds.height];
  if (!values.every((v) => typeof v === "number" && Number.isFinite(v)))
    return true;
  const { x, y, width, height } = bounds as RegionBounds;
  if (width < 0 || height < 0) return true;
  if (x < 0 || y < 0) return true;
  if (x > pageWidth || y > pageHeight) return true;
  if (x + width > pageWidth + 1 || y + height > pageHeight + 1) return true;
  return false;
}

export interface SanitizedRegions {
  regions: ReferenceRegion[];
  warnings: ReferenceWarning[];
}

/**
 * Drops invalid/unknown regions and warns instead of failing the whole
 * extraction. Bounds are clamped to the page, text is truncated, colors are
 * normalized, and region types are whitelisted.
 */
export function sanitizeRegions(
  candidates: unknown,
  pageWidth: number,
  pageHeight: number,
): SanitizedRegions {
  const regions: ReferenceRegion[] = [];
  const warnings: ReferenceWarning[] = [];
  if (!Array.isArray(candidates)) {
    warnings.push({
      code: "layout_regions_uncertain",
      message: "Region data was not an array; no regions were extracted.",
      severity: "high",
    });
    return { regions, warnings };
  }

  let dropped = 0;
  let unknownTypes = 0;
  let truncated = false;

  for (const raw of candidates) {
    if (regions.length >= REFERENCE_LIMITS.maxRegionsPerPage) {
      truncated = true;
      break;
    }
    if (!raw || typeof raw !== "object") {
      dropped++;
      continue;
    }
    const candidate = raw as Record<string, unknown>;
    const bounds = candidate.bounds as Partial<RegionBounds> | undefined;
    if (!isKnownRegionType(candidate.type)) {
      unknownTypes++;
      continue;
    }
    if (boundsAreImpossible(bounds, pageWidth, pageHeight)) {
      dropped++;
      continue;
    }
    const box = bounds as RegionBounds;
    if (box.width <= 0 || box.height <= 0) {
      dropped++;
      continue;
    }
    const style: ReferenceRegion["style"] = {};
    if (candidate.style && typeof candidate.style === "object") {
      const rawStyle = candidate.style as Record<string, unknown>;
      const color = normalizeColor(rawStyle.color);
      const background = normalizeColor(rawStyle.background);
      if (color) style.color = color;
      if (background) style.background = background;
      if (
        typeof rawStyle.fontSize === "number" &&
        Number.isFinite(rawStyle.fontSize) &&
        rawStyle.fontSize > 0 &&
        rawStyle.fontSize < 400
      )
        style.fontSize = rawStyle.fontSize;
      if (
        typeof rawStyle.fontWeight === "number" ||
        typeof rawStyle.fontWeight === "string"
      )
        style.fontWeight = rawStyle.fontWeight as string | number;
      if (
        rawStyle.alignment === "left" ||
        rawStyle.alignment === "center" ||
        rawStyle.alignment === "right" ||
        rawStyle.alignment === "justify"
      )
        style.alignment = rawStyle.alignment;
    }

    const text =
      typeof candidate.text === "string" && candidate.text.trim()
        ? candidate.text.trim().slice(0, REFERENCE_LIMITS.maxRegionText)
        : undefined;

    regions.push({
      id:
        typeof candidate.id === "string" && candidate.id
          ? candidate.id
          : `region-${regions.length + 1}`,
      type: candidate.type,
      bounds: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      },
      ...(text ? { text } : {}),
      ...(Object.keys(style).length ? { style } : {}),
      confidence: clamp01(candidate.confidence, 0.2),
      ...(Array.isArray(candidate.evidence)
        ? {
            evidence: candidate.evidence
              .filter((e): e is string => typeof e === "string")
              .slice(0, 8),
          }
        : {}),
    });
  }

  if (dropped)
    warnings.push({
      code: "invalid_region_dropped",
      message: `${dropped} region(s) were dropped as impossible or malformed.`,
      severity: "low",
    });
  if (unknownTypes)
    warnings.push({
      code: "unknown_region_type",
      message: `${unknownTypes} region(s) had an unknown type and were dropped.`,
      severity: "low",
    });
  if (truncated)
    warnings.push({
      code: "too_many_regions_truncated",
      message: `Only the first ${REFERENCE_LIMITS.maxRegionsPerPage} regions were kept.`,
      severity: "medium",
    });

  return { regions, warnings };
}

export function hashReferenceImage(data: string): string {
  let hash = 2166136261;
  for (let index = 0; index < data.length; index++) {
    hash ^= data.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
