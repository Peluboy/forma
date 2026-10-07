import {
  REFERENCE_PROFILE_VERSION,
  type ReferenceConfidence,
  type ReferenceDesignProfile,
  type ReferenceLayoutPatternType,
  type ReferenceWarning,
} from "./types.js";
import {
  REFERENCE_LIMITS,
  isKnownRegionType,
  isValidConfidence,
  boundsAreImpossible,
} from "./validation.js";

export interface ReferenceProfileIssue {
  code:
    | "invalid_root"
    | "invalid_version"
    | "invalid_confidence"
    | "invalid_source"
    | "invalid_page"
    | "impossible_bounds"
    | "unknown_region_type"
    | "too_many_regions"
    | "invalid_region_text"
    | "invalid_token"
    | "invalid_layout_pattern"
    | "invalid_visual_language";
  path: string;
  message: string;
}

export interface ReferenceProfileValidation {
  valid: boolean;
  issues: ReferenceProfileIssue[];
}

const LAYOUT_PATTERN_TYPES: ReadonlySet<ReferenceLayoutPatternType> = new Set([
  "cover_like",
  "heading_body",
  "two_column_body",
  "image_body",
  "stat_layout",
  "quote_layout",
  "table_layout",
  "chart_layout",
  "closing_like",
  "unknown",
]);

const TONES = new Set([
  "corporate",
  "editorial",
  "premium",
  "minimal",
  "bold",
  "data_forward",
  "image_led",
  "playful",
  "unknown",
]);

function checkConfidence(
  confidence: unknown,
  issues: ReferenceProfileIssue[],
  path: string,
): void {
  if (!confidence || typeof confidence !== "object") {
    issues.push({
      code: "invalid_confidence",
      path,
      message: "Confidence must be an object.",
    });
    return;
  }
  const value = confidence as ReferenceConfidence;
  for (const key of [
    "overall",
    "colors",
    "typography",
    "layout",
    "imagery",
    "data",
  ] as const) {
    if (!isValidConfidence(value[key]))
      issues.push({
        code: "invalid_confidence",
        path: `${path}.${key}`,
        message: `Confidence '${key}' must be a number in [0, 1].`,
      });
  }
}

/**
 * Structural validation for a ReferenceDesignProfile. Rejects impossible
 * geometry, unknown region types, invalid confidence, and oversized payloads.
 * Returns issues rather than throwing so callers can surface them.
 */
export function validateReferenceDesignProfile(
  profile: unknown,
): ReferenceProfileValidation {
  const issues: ReferenceProfileIssue[] = [];
  const add = (
    code: ReferenceProfileIssue["code"],
    path: string,
    message: string,
  ) => issues.push({ code, path, message });

  if (!profile || typeof profile !== "object") {
    add("invalid_root", "$", "Profile must be an object.");
    return { valid: false, issues };
  }
  const p = profile as ReferenceDesignProfile;
  if (!p.id || typeof p.id !== "string")
    add("invalid_root", "$.id", "Profile id is required.");
  if (p.version !== REFERENCE_PROFILE_VERSION)
    add(
      "invalid_version",
      "$.version",
      `Profile version must be '${REFERENCE_PROFILE_VERSION}'.`,
    );
  if (!p.source || typeof p.source !== "object" || !p.source.type)
    add("invalid_source", "$.source", "Profile source is required.");
  checkConfidence(p.confidence, issues, "$.confidence");

  if (!Array.isArray(p.pages) || p.pages.length === 0)
    add("invalid_page", "$.pages", "At least one analysed page is required.");
  else {
    if (p.pages.length > REFERENCE_LIMITS.maxPages)
      add("invalid_page", "$.pages", "Too many pages in profile.");
    p.pages.forEach((page, index) => {
      const path = `$.pages[${index}]`;
      if (!page || typeof page !== "object") {
        add("invalid_page", path, "Page must be an object.");
        return;
      }
      if (
        !Number.isFinite(page.width) ||
        !Number.isFinite(page.height) ||
        page.width <= 0 ||
        page.height <= 0
      )
        add("invalid_page", `${path}.width/height`, "Page size is invalid.");
      if (!isValidConfidence(page.confidence))
        add(
          "invalid_confidence",
          `${path}.confidence`,
          "Invalid page confidence.",
        );
      if (!Array.isArray(page.detectedRegions)) {
        add(
          "invalid_page",
          `${path}.detectedRegions`,
          "Regions must be an array.",
        );
        return;
      }
      if (page.detectedRegions.length > REFERENCE_LIMITS.maxRegionsPerPage)
        add(
          "too_many_regions",
          `${path}.detectedRegions`,
          `More than ${REFERENCE_LIMITS.maxRegionsPerPage} regions on one page.`,
        );
      page.detectedRegions.forEach((region, regionIndex) => {
        const rPath = `${path}.detectedRegions[${regionIndex}]`;
        if (!isKnownRegionType(region?.type)) {
          add("unknown_region_type", `${rPath}.type`, "Unknown region type.");
          return;
        }
        if (
          boundsAreImpossible(region.bounds, page.width, page.height) ||
          region.bounds.width <= 0 ||
          region.bounds.height <= 0
        )
          add(
            "impossible_bounds",
            `${rPath}.bounds`,
            "Region bounds are impossible or off-page.",
          );
        if (!isValidConfidence(region.confidence))
          add(
            "invalid_confidence",
            `${rPath}.confidence`,
            "Invalid region confidence.",
          );
        if (
          region.text !== undefined &&
          (typeof region.text !== "string" ||
            region.text.length > REFERENCE_LIMITS.maxRegionText)
        )
          add(
            "invalid_region_text",
            `${rPath}.text`,
            "Region text is invalid or too long.",
          );
      });
    });
  }

  if (!p.extractedTokens || typeof p.extractedTokens !== "object")
    add("invalid_token", "$.extractedTokens", "Extracted tokens are required.");
  else {
    const tokens = p.extractedTokens;
    for (const key of ["colors", "typography", "spacing"] as const) {
      if (!Array.isArray(tokens[key]))
        add("invalid_token", `$.extractedTokens.${key}`, "Token list missing.");
    }
  }

  if (!Array.isArray(p.layoutPatterns))
    add(
      "invalid_layout_pattern",
      "$.layoutPatterns",
      "Layout patterns required.",
    );
  else
    p.layoutPatterns.forEach((pattern, index) => {
      if (!pattern || !LAYOUT_PATTERN_TYPES.has(pattern.type))
        add(
          "invalid_layout_pattern",
          `$.layoutPatterns[${index}].type`,
          "Unknown layout pattern type.",
        );
      else if (!isValidConfidence(pattern.confidence))
        add(
          "invalid_layout_pattern",
          `$.layoutPatterns[${index}].confidence`,
          "Invalid pattern confidence.",
        );
    });

  if (!p.visualLanguage || !TONES.has(p.visualLanguage.tone))
    add(
      "invalid_visual_language",
      "$.visualLanguage",
      "Valid visual language summary is required.",
    );

  if (!Array.isArray(p.warnings))
    add("invalid_root", "$.warnings", "Warnings must be an array.");

  return { valid: issues.length === 0, issues };
}

export function isReferenceDesignProfile(
  value: unknown,
): value is ReferenceDesignProfile {
  return validateReferenceDesignProfile(value).valid;
}

export function referenceWarning(
  code: ReferenceWarning["code"],
  message: string,
  severity: ReferenceWarning["severity"] = "low",
): ReferenceWarning {
  return { code, message, severity };
}
