import type {
  DesignElement,
  DesignPage,
  DesignSpec,
  PageRole,
} from "../design-spec/types.js";
import { makeConfidence, warning } from "./confidence.js";
import { extractDesignTokens } from "./extractTokens.js";
import { extractLayoutPatterns } from "./extractLayoutPatterns.js";
import { inferVisualLanguage } from "./visualLanguage.js";
import {
  REFERENCE_PROFILE_VERSION,
  type ReferencePageAnalysis,
  type ReferenceRegion,
  type ReferenceRegionType,
  type ReferenceWarning,
} from "./types.js";

const INFERENCE_CONFIDENCE = 0.95;

function metadataRole(element: DesignElement): string | undefined {
  const role = element.metadata?.semanticRole;
  return typeof role === "string" ? role : undefined;
}

function isTextLike(element: DesignElement): boolean {
  return element.type === "text";
}

function classifyTextRegion(
  element: DesignElement,
  maxFontSize: number,
): ReferenceRegionType {
  const semanticRole = metadataRole(element);
  switch (semanticRole) {
    case "heading":
      return "heading";
    case "subheading":
    case "kicker":
      return "subheading";
    case "quote":
      return "quote";
    case "stat_value":
    case "stat_label":
    case "stat_description":
      return "stat";
    case "caption":
      return "caption";
    case "body":
      return "body";
    case undefined:
      break;
    default:
      break;
  }
  if (element.type !== "text") return "unknown";
  const size = element.fontSize;
  const text = element.text.trim();
  if (size >= maxFontSize * 0.85 && text.length <= 80) return "heading";
  if (size >= maxFontSize * 0.6) return "subheading";
  if (/^["“]/.test(text) && text.length > 40) return "quote";
  if (size <= 9.5) return "caption";
  if (/^\s*[€$£]?\d[\d,.]*\s*(%|k|m|bn)?\s*$/i.test(text)) return "stat";
  return "body";
}

function regionStyle(element: DesignElement): ReferenceRegion["style"] {
  if (element.type === "text")
    return {
      ...(element.color ? { color: element.color } : {}),
      fontSize: element.fontSize,
      ...(element.fontWeight !== undefined
        ? { fontWeight: element.fontWeight }
        : {}),
      ...(element.align ? { alignment: element.align } : {}),
    };
  if (element.type === "shape" && element.fill?.color)
    return { background: element.fill.color };
  return {};
}

function elementToRegion(
  element: DesignElement,
  page: DesignPage,
  index: number,
  maxFontSize: number,
): ReferenceRegion {
  let type: ReferenceRegionType;
  if (isTextLike(element)) type = classifyTextRegion(element, maxFontSize);
  else if (element.type === "image" || element.type === "frame") type = "image";
  else if (element.type === "table") type = "table";
  else if (element.type === "chart") type = "chart";
  else if (element.type === "shape") {
    const area = element.width * element.height;
    type =
      area > page.width * page.height * 0.2 && element.shape !== "line"
        ? "card"
        : "shape";
  } else type = "unknown";

  const regStyle: ReferenceRegion["style"] = {
    ...regionStyle(element),
  };
  const text = element.type === "text" ? element.text.trim() : undefined;

  return {
    id: `ref-region-${index + 1}`,
    type,
    bounds: {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    },
    ...(text ? { text } : {}),
    ...(Object.keys(regStyle).length ? { style: regStyle } : {}),
    confidence: INFERENCE_CONFIDENCE,
    evidence: ["read directly from DesignSpec geometry"],
  };
}

function analyzePage(
  page: DesignPage,
  pageIndex: number,
): ReferencePageAnalysis {
  const textElements = page.elements.filter(
    (element): element is Extract<DesignElement, { type: "text" }> =>
      element.type === "text",
  );
  const maxFontSize = textElements.reduce(
    (max, element) => Math.max(max, element.fontSize),
    0,
  );

  const warnings: ReferenceWarning[] = [];
  const regions = page.elements.map((element, index) =>
    elementToRegion(element, page, index, maxFontSize),
  );

  const typographyObservations = textElements.map((element) => ({
    role: metadataRole(element) ?? "body",
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    ...(element.fontWeight !== undefined
      ? { fontWeight: element.fontWeight }
      : {}),
    ...(element.color ? { color: element.color } : {}),
    confidence: INFERENCE_CONFIDENCE,
  }));

  const colorObservations: ReferencePageAnalysis["colorObservations"] = [];
  for (const element of page.elements) {
    if (element.type === "text" && element.color)
      colorObservations.push({
        value: element.color,
        role: "text",
        coverage: 0,
        confidence: INFERENCE_CONFIDENCE,
      });
    else if (element.type === "shape" && element.fill?.color) {
      const area = element.width * element.height;
      colorObservations.push({
        value: element.fill.color,
        role: area > page.width * page.height * 0.2 ? "background" : "fill",
        coverage: area / (page.width * page.height),
        confidence: INFERENCE_CONFIDENCE,
      });
    }
  }
  if (page.background?.color)
    colorObservations.push({
      value: page.background.color,
      role: "background",
      coverage: 1,
      confidence: INFERENCE_CONFIDENCE,
    });

  const sorted = [...page.elements].sort((a, b) => a.y - b.y);
  const spacingObservations: ReferencePageAnalysis["spacingObservations"] = [];
  for (let index = 1; index < sorted.length; index++) {
    const gap =
      sorted[index].y - (sorted[index - 1].y + sorted[index - 1].height);
    if (gap > 0 && gap < 200)
      spacingObservations.push({
        value: gap,
        role: "vertical-gap",
        confidence: INFERENCE_CONFIDENCE,
      });
  }
  if (sorted.length) {
    const left = Math.min(...sorted.map((element) => element.x));
    if (left > 0)
      spacingObservations.push({
        value: left,
        role: "margin",
        confidence: INFERENCE_CONFIDENCE,
      });
  }

  const imageObservations = regions
    .filter((region) => region.type === "image")
    .map((region) => ({
      regionId: region.id,
      bounds: region.bounds,
      confidence: region.confidence,
    }));
  const tableObservations = regions
    .filter((region) => region.type === "table")
    .map((region) => ({ regionId: region.id, confidence: region.confidence }));
  const chartObservations = regions
    .filter((region) => region.type === "chart")
    .map((region) => ({ regionId: region.id, confidence: region.confidence }));

  if (regions.length === 0)
    warnings.push(
      warning(
        "insufficient_text_detected",
        "Page had no extractable elements.",
        "medium",
      ),
    );

  return {
    id: `ref-page-${pageIndex + 1}`,
    pageIndex,
    width: page.width,
    height: page.height,
    ...(page.role ? { role: page.role as PageRole } : {}),
    visualType: (page.metadata?.layoutId as string | undefined) ?? undefined,
    detectedRegions: regions,
    typographyObservations,
    colorObservations,
    spacingObservations,
    imageObservations,
    ...(tableObservations.length ? { tableObservations } : {}),
    ...(chartObservations.length ? { chartObservations } : {}),
    confidence: INFERENCE_CONFIDENCE,
    warnings,
  };
}

export interface DesignSpecExtractionOptions {
  id?: string;
  name?: string;
}

/**
 * Deterministic, high-confidence reference intelligence from a DesignSpec.
 * Every value here is read from the artifact, not guessed.
 */
export function buildReferenceProfileFromDesignSpec(
  spec: DesignSpec,
  options: DesignSpecExtractionOptions = {},
): import("./types.js").ReferenceDesignProfile {
  const pages = spec.pages.map((page, index) => analyzePage(page, index));
  const warnings: ReferenceWarning[] = [];
  const tokens = extractDesignTokens(pages, { kind: "observed" });
  const layoutPatterns = extractLayoutPatterns(pages);
  const visualLanguage = inferVisualLanguage(tokens, layoutPatterns);

  const hasImage = pages.some((page) => page.imageObservations.length > 0);
  const hasData = pages.some(
    (page) =>
      (page.tableObservations?.length ?? 0) > 0 ||
      (page.chartObservations?.length ?? 0) > 0 ||
      page.detectedRegions.some((region) => region.type === "stat"),
  );

  if (!layoutPatterns.length)
    warnings.push(
      warning(
        "no_reusable_patterns_detected",
        "No reusable layout patterns were detected in the reference.",
        "high",
      ),
    );

  const confidence = makeConfidence({
    colors: tokens.colors.length ? 0.9 : 0.1,
    typography: tokens.typography.length ? 0.9 : 0.1,
    layout: layoutPatterns.length ? 0.9 : 0.2,
    imagery: hasImage ? 0.85 : 0.4,
    data: hasData ? 0.85 : 0.4,
  });

  return {
    version: REFERENCE_PROFILE_VERSION,
    id: options.id ?? `ref-${spec.id}`,
    name: options.name ?? `${spec.name} (reference)`,
    source: { type: "design_spec", designSpecId: spec.id },
    pages,
    extractedTokens: tokens,
    layoutPatterns,
    visualLanguage,
    confidence,
    warnings,
    metadata: {
      extractionMethod: "designspec_deterministic",
      sourceFamily: spec.family,
      pageCount: spec.pages.length,
    },
  };
}
