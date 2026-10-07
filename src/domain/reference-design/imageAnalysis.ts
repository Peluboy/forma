import { makeConfidence, warning } from "./confidence.js";
import { extractDesignTokens } from "./extractTokens.js";
import { extractLayoutPatterns } from "./extractLayoutPatterns.js";
import { inferVisualLanguage } from "./visualLanguage.js";
import {
  REFERENCE_PROFILE_VERSION,
  type ReferenceDesignProfile,
  type ReferencePageAnalysis,
  type ReferenceRegion,
  type ReferenceRegionType,
  type ReferenceWarning,
} from "./types.js";
import {
  REFERENCE_LIMITS,
  hashReferenceImage,
  isSupportedColor,
  normalizeColor,
  sanitizeRegions,
} from "./validation.js";

/** The existing vision endpoint reports geometry in a 720×900 design space. */
export const IMAGE_DESIGN_SPACE = { width: 720, height: 900 } as const;

export interface RawVisionRegion {
  id?: unknown;
  text?: unknown;
  confidence?: unknown;
  box?: { x?: unknown; y?: unknown; width?: unknown; height?: unknown };
  fontSize?: unknown;
  fontFamily?: unknown;
  textColor?: unknown;
  coverColor?: unknown;
  field?: unknown;
}

export interface ImageReferenceInput {
  imageDataUrl: string;
  width: number;
  height: number;
  provider?: string;
  /** Untrusted provider regions. Never trusted directly. */
  regions?: unknown;
  providerWarnings?: string[];
}

export interface ImageProfileResult {
  profile: ReferenceDesignProfile;
  warnings: ReferenceWarning[];
}

function finite(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function regionTypeFromField(
  field: unknown,
  text: string,
  fontSize: number,
  maxFontSize: number,
): ReferenceRegionType {
  if (field === "title") return "heading";
  if (field === "kicker") return "subheading";
  if (field === "description") return "body";
  if (field === "footer") return "footer";
  if (field === "date" || field === "location") return "body";
  if (!text) return "unknown";
  if (fontSize >= maxFontSize * 0.9 && text.length <= 80) return "heading";
  if (fontSize >= maxFontSize * 0.62) return "subheading";
  if (/^["“]/.test(text) && text.length > 40) return "quote";
  if (fontSize <= maxFontSize * 0.55 && text.length <= 80) return "caption";
  return "body";
}

export interface VisionRegionValidation {
  regions: ReferenceRegion[];
  warnings: ReferenceWarning[];
}

/**
 * Converts untrusted vision regions into sanitized ReferenceRegions. Rejects
 * impossible bounds, unknown types, oversized text, and unsupported colors.
 */
export function validateVisionRegions(
  rawRegions: unknown,
  designSpace: { width: number; height: number } = IMAGE_DESIGN_SPACE,
): VisionRegionValidation {
  const warnings: ReferenceWarning[] = [];
  if (!Array.isArray(rawRegions)) {
    if (rawRegions !== undefined)
      warnings.push(
        warning(
          "layout_regions_uncertain",
          "Vision provider did not return a region array.",
          "medium",
        ),
      );
    return { regions: [], warnings };
  }

  const candidates: Array<Record<string, unknown>> = [];
  for (const raw of rawRegions) {
    if (!raw || typeof raw !== "object") continue;
    const region = raw as RawVisionRegion;
    const box = region.box;
    if (!box) continue;
    const text = typeof region.text === "string" ? region.text : "";
    const background = normalizeColor(region.coverColor);
    const color = normalizeColor(region.textColor);
    candidates.push({
      id: typeof region.id === "string" ? region.id : undefined,
      type: "body",
      bounds: {
        x: finite(box.x, 0),
        y: finite(box.y, 0),
        width: finite(box.width, 0),
        height: finite(box.height, 0),
      },
      text,
      confidence: finite(region.confidence, 0.3),
      style: {
        ...(color ? { color } : {}),
        ...(background ? { background } : {}),
        fontSize: finite(region.fontSize, 12),
        ...(typeof region.fontFamily === "string"
          ? { fontFamily: region.fontFamily }
          : {}),
      },
      evidence: ["vision provider region"],
    });
  }

  // Re-clamp through the shared sanitizer for bounds/limits/type checks.
  const sanitized = sanitizeRegions(
    candidates.map((candidate) => ({
      ...candidate,
      bounds: candidate.bounds,
    })),
    designSpace.width,
    designSpace.height,
  );
  warnings.push(...sanitized.warnings);

  const maxFontSize = candidates.reduce((max, candidate) => {
    const style = candidate.style as { fontSize?: number } | undefined;
    return Math.max(max, style?.fontSize ?? 0);
  }, 0);
  const fieldByIndex = rawRegions.map((raw) =>
    raw && typeof raw === "object" ? (raw as RawVisionRegion).field : undefined,
  );

  const regions = sanitized.regions.map((region, index) => {
    const style = region.style as { fontSize?: number } | undefined;
    const fontSize = style?.fontSize ?? 12;
    const text = region.text ?? "";
    return {
      ...region,
      type: regionTypeFromField(
        fieldByIndex[index],
        text,
        fontSize,
        maxFontSize,
      ),
      evidence: ["vision provider region"],
    };
  });

  // Drop regions whose inferred type is unknown AND that have no text.
  const usable = regions.filter(
    (region) => region.type !== "unknown" || region.text,
  );
  if (usable.length !== regions.length)
    warnings.push(
      warning(
        "layout_regions_uncertain",
        "Some regions carried no usable text or type and were dropped.",
        "low",
      ),
    );
  return { regions: usable, warnings };
}

function buildImagePage(
  regions: ReferenceRegion[],
  width: number,
  height: number,
): ReferencePageAnalysis {
  const typographyObservations = regions
    .filter((region) => region.text && region.style?.fontSize)
    .map((region) => ({
      role: region.type,
      fontFamily:
        (region.style as { fontFamily?: string }).fontFamily ?? "unknown",
      fontSize: region.style!.fontSize ?? 12,
      ...(region.style?.color ? { color: region.style.color } : {}),
      confidence: region.confidence,
    }));
  const colorObservations = regions.flatMap((region) => {
    const out: ReferencePageAnalysis["colorObservations"] = [];
    if (isSupportedColor(region.style?.color))
      out.push({
        value: region.style.color,
        role: "text",
        coverage: 0,
        confidence: region.confidence,
      });
    if (isSupportedColor(region.style?.background))
      out.push({
        value: region.style.background,
        role: "background",
        coverage: 0,
        confidence: region.confidence * 0.8,
      });
    return out;
  });
  return {
    id: "ref-page-1",
    pageIndex: 0,
    width,
    height,
    visualType: "image_reference",
    detectedRegions: regions,
    typographyObservations,
    colorObservations,
    spacingObservations: [],
    imageObservations: [],
    confidence: regions.length
      ? regions.reduce((sum, region) => sum + region.confidence, 0) /
        regions.length
      : 0.1,
    warnings: [],
  };
}

/**
 * Builds a cautious, low-confidence profile from image analysis. Never claims
 * reconstruction; only regions, palette and typography estimates.
 */
export function buildReferenceProfileFromImage(
  input: ImageReferenceInput,
): ImageProfileResult {
  const warnings: ReferenceWarning[] = [];
  const dataHash = hashReferenceImage(input.imageDataUrl);
  const { regions, warnings: regionWarnings } = validateVisionRegions(
    input.regions,
  );
  warnings.push(...regionWarnings);

  if (input.width < 600 || input.height < 600)
    warnings.push(
      warning(
        "low_resolution_reference",
        "The reference is low resolution; token estimates may be unreliable.",
        "medium",
      ),
    );
  if (regions.length < 2)
    warnings.push(
      warning(
        "insufficient_text_detected",
        "Fewer than two text regions were detected; layout extraction is limited.",
        "high",
      ),
    );
  if (!regions.length)
    warnings.push(
      warning(
        "image_only_reference",
        "No text regions were detected; this is treated as an image-only reference.",
        "high",
      ),
    );
  warnings.push(
    warning(
      "typography_uncertain",
      "Font families and sizes are approximate estimates from the image.",
      "medium",
    ),
  );
  warnings.push(
    warning(
      "layout_regions_uncertain",
      "Layout regions are approximate; verify before generation.",
      "medium",
    ),
  );

  const page = buildImagePage(
    regions,
    IMAGE_DESIGN_SPACE.width,
    IMAGE_DESIGN_SPACE.height,
  );
  const pages = [page];
  const tokens = extractDesignTokens(pages, { kind: "inferred" });
  const layoutPatterns = extractLayoutPatterns(pages);
  const visualLanguage = inferVisualLanguage(tokens, layoutPatterns);

  // Image confidence scales with the provider's own region confidence, so a
  // single shaky region does not read as a confident reference.
  const averageRegionConfidence = regions.length
    ? regions.reduce((sum, region) => sum + region.confidence, 0) /
      regions.length
    : 0;
  const band = (base: number, present: boolean) =>
    present
      ? Math.round((base + 0.5 * averageRegionConfidence) * 1000) / 1000
      : 0.08;
  const confidence = makeConfidence({
    colors: band(0.2, tokens.colors.length > 0),
    typography: band(0.15, tokens.typography.length > 0),
    layout: band(0.1, layoutPatterns.length > 0),
    imagery: 0.15,
    data: 0.15,
  });
  if (averageRegionConfidence < 0.4)
    warnings.push(
      warning(
        "layout_regions_uncertain",
        "Region confidence is low; this reference is treated cautiously.",
        "high",
      ),
    );

  return {
    profile: {
      version: REFERENCE_PROFILE_VERSION,
      id: `ref-image-${dataHash}`,
      name: "Uploaded image reference",
      source: {
        type: "image",
        dataHash,
        width: input.width,
        height: input.height,
      },
      pages,
      extractedTokens: tokens,
      layoutPatterns,
      visualLanguage,
      confidence,
      warnings,
      metadata: {
        extractionMethod: "image_vision_regions",
        provider: input.provider ?? "unknown",
        designSpace: IMAGE_DESIGN_SPACE,
        providerWarnings: input.providerWarnings ?? [],
        regionCount: regions.length,
      },
    },
    warnings,
  };
}

/** Safe fallback when the provider is unavailable or returns unusable output. */
export function buildFallbackImageProfile(input: {
  imageDataUrl: string;
  width: number;
  height: number;
  reason: string;
}): ReferenceDesignProfile {
  const dataHash = hashReferenceImage(input.imageDataUrl);
  const notes = [
    "Reference style intelligence unavailable; the design will use the standard family.",
  ];
  return {
    version: REFERENCE_PROFILE_VERSION,
    id: `ref-image-fallback-${dataHash}`,
    name: "Uploaded image reference (fallback)",
    source: {
      type: "image",
      dataHash,
      width: input.width,
      height: input.height,
    },
    pages: [
      {
        id: "ref-page-1",
        pageIndex: 0,
        width: IMAGE_DESIGN_SPACE.width,
        height: IMAGE_DESIGN_SPACE.height,
        visualType: "image_reference",
        detectedRegions: [],
        typographyObservations: [],
        colorObservations: [],
        spacingObservations: [],
        imageObservations: [],
        confidence: 0,
        warnings: [],
      },
    ],
    extractedTokens: { colors: [], typography: [], spacing: [] },
    layoutPatterns: [],
    visualLanguage: {
      tone: "unknown",
      density: "balanced",
      composition: "unknown",
      imageUsage: "unknown",
      dataUsage: "none",
      notes,
      confidence: 0,
      kind: "inferred",
    },
    confidence: makeConfidence({}),
    warnings: [
      warning(
        "extraction_provider_unavailable",
        input.reason || "Reference analysis provider was unavailable.",
        "high",
      ),
      warning(
        "image_only_reference",
        "Falling back to image-only reference metadata.",
        "high",
      ),
    ],
    metadata: { extractionMethod: "image_fallback" },
  };
}

/** Parses a provider's structured JSON text, rejecting invalid output. */
export function parseStructuredAnalysis(
  text: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (typeof text !== "string")
    return { ok: false, error: "Analysis was empty." };
  if (text.length > 200000)
    return { ok: false, error: "Analysis output was too large." };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "Analysis output was not valid JSON." };
  }
}

export const IMAGE_ANALYSIS_LIMITS = REFERENCE_LIMITS;
