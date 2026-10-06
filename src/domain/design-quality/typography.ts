// ============================================================
// Typography Quality Metrics — Phase 2 Part D
// ============================================================

import { computeLineWraps } from "../layout-fit/measure.js";
import type { DesignPage, TextElement } from "../design-spec/types.js";
import type { DesignQualityIssue } from "./qualityTypes.js";
import type { DesignQualityPreset } from "./qualityTypes.js";

export interface TypographyMetrics {
  headingCount: number;
  bodyCount: number;
  maxHeadingSize: number;
  minBodySize: number;
  avgBodySize: number;
  hierarchyRatio: number; // maxHeading / avgBody
  typeSizeCount: number; // number of distinct font sizes
  typeWeightCount: number; // number of distinct weights
  maxLineLength: number; // in characters (longest line)
  avgLineLength: number;
  tightLeadingCount: number; // elements with lineHeight < 1.2
  looseLeadingCount: number; // elements with lineHeight > 2.0
  belowFloorCount: number; // elements below minBodyFontSize
  issues: DesignQualityIssue[];
  score: number; // 0-100
}

export function analyzeTypography(
  page: DesignPage,
  preset: DesignQualityPreset,
): TypographyMetrics {
  const textEls = page.elements.filter(
    (el): el is TextElement => el.type === "text" && !el.hidden,
  );

  const issues: DesignQualityIssue[] = [];
  let score = 100;

  // Distinct sizes and weights
  const sizes = new Set(textEls.map((t) => t.fontSize ?? 12));
  const weights = new Set(textEls.map((t) => t.fontWeight ?? 400));

  const isHeading = (text: TextElement) =>
    text.metadata?.semanticRole
      ? ["heading", "display", "h1", "h2", "h3"].includes(
          String(text.metadata.semanticRole),
        )
      : /(?:^|[-:])(heading|title)$/.test(text.id) ||
        (text.fontSize >= 18 && !text.id.includes("subtitle"));
  const headings = textEls.filter(isHeading);
  const bodyEls = textEls.filter(
    (text) =>
      !isHeading(text) &&
      ![
        "caption",
        "attribution",
        "kicker",
        "stat_value",
        "stat_label",
      ].includes(String(text.metadata?.semanticRole)),
  );

  const maxHeadingSize = headings.length
    ? Math.max(...headings.map((h) => h.fontSize ?? 18))
    : 0;
  const minBodySize = bodyEls.length
    ? Math.min(...bodyEls.map((b) => b.fontSize ?? 11))
    : 11;
  const avgBodySize = bodyEls.length
    ? bodyEls.reduce((s, b) => s + (b.fontSize ?? 11), 0) / bodyEls.length
    : 11;

  const hierarchyRatio =
    maxHeadingSize > 0 && avgBodySize > 0 ? maxHeadingSize / avgBodySize : 1;

  // Hierarchy ratio check
  if (headings.length > 0 && bodyEls.length > 0) {
    if (hierarchyRatio < preset.minHierarchyRatio) {
      score -= 18;
      issues.push({
        id: `${page.id}-weak-hierarchy`,
        type: "weak_hierarchy",
        severity: "high",
        pageId: page.id,
        elementIds: headings.map((h) => h.id),
        message: `Heading/body ratio ${hierarchyRatio.toFixed(2)} is below target ${preset.minHierarchyRatio}.`,
        evidence: `Max heading: ${maxHeadingSize}pt, avg body: ${Math.round(avgBodySize)}pt`,
        recommendedActions: [
          {
            type: "increase_text_scale",
            pageId: page.id,
            elementId: headings[0]?.id,
            params: { amount: 2 },
            rationale:
              "Increase heading size to establish stronger visual hierarchy.",
            expectedImprovements: ["hierarchy", "readability"],
            confidence: "high",
          },
        ],
      });
    }
  }

  // Too many type sizes
  if (sizes.size > preset.maxTypeStyleCount) {
    score -= 10;
    issues.push({
      id: `${page.id}-too-many-sizes`,
      type: "too_many_type_sizes",
      severity: "medium",
      pageId: page.id,
      message: `Page uses ${sizes.size} distinct font sizes (max recommended: ${preset.maxTypeStyleCount}).`,
      evidence: `Sizes: ${Array.from(sizes).join(", ")}pt`,
      recommendedActions: [],
    });
  }

  // Body too small
  const belowFloorEls = bodyEls.filter(
    (t) => (t.fontSize ?? 12) < preset.minBodyFontSize,
  );
  if (belowFloorEls.length > 0) {
    score -= 15;
    issues.push({
      id: `${page.id}-small-body`,
      type: "small_body_text",
      severity: "high",
      pageId: page.id,
      elementIds: belowFloorEls.map((el) => el.id),
      message: `${belowFloorEls.length} text element(s) below legibility floor (${preset.minBodyFontSize}pt).`,
      evidence: `Sizes: ${belowFloorEls.map((t) => (t.fontSize ?? 12) + "pt").join(", ")}`,
      recommendedActions: belowFloorEls.map((el) => ({
        type: "increase_text_scale" as const,
        pageId: page.id,
        elementId: el.id,
        params: { amount: preset.minBodyFontSize - (el.fontSize ?? 12) },
        rationale: "Raise body text to legibility floor.",
        expectedImprovements: ["readability", "typography"] as Array<
          keyof import("./qualityTypes.js").DesignQualityDimensions
        >,
        confidence: "high" as const,
      })),
    });
  }

  // Leading checks
  let tightLeadingCount = 0;
  let looseLeadingCount = 0;
  for (const t of bodyEls) {
    const lh = t.lineHeight ?? 1.4;
    if (lh < 1.15) {
      tightLeadingCount++;
      score -= 5;
      issues.push({
        id: `${page.id}-tight-leading-${t.id}`,
        type: "overly_tight_leading",
        severity: "medium",
        pageId: page.id,
        elementIds: [t.id],
        message: `Element '${t.id}' has tight line-height ${lh} (< 1.15).`,
        evidence: `lineHeight: ${lh}`,
        recommendedActions: [],
      });
    }
    if (lh > 2.2) {
      looseLeadingCount++;
      score -= 3;
      issues.push({
        id: `${page.id}-loose-leading-${t.id}`,
        type: "overly_loose_leading",
        severity: "low",
        pageId: page.id,
        elementIds: [t.id],
        message: `Element '${t.id}' has loose line-height ${lh} (> 2.2).`,
        evidence: `lineHeight: ${lh}`,
        recommendedActions: [],
      });
    }
  }

  // Line length checks
  let maxLineLength = 0;
  let totalLineLen = 0;
  let lineCount = 0;
  let shortLastLines = 0;
  let allCapsBlocks = 0;
  const longLineElements: TextElement[] = [];
  for (const t of bodyEls) {
    const lines = computeLineWraps(
      t.text,
      t.width,
      t.fontFamily ?? "Inter",
      t.fontSize ?? 12,
    );
    for (const line of lines) {
      const len = line.length;
      if (len > maxLineLength) maxLineLength = len;
      totalLineLen += len;
      lineCount++;
    }
    if (lines.some((line) => line.length > preset.maxBodyLineLength))
      longLineElements.push(t);
    if (lines.length > 2 && lines.at(-1)!.trim().length < 12) {
      shortLastLines++;
      issues.push({
        id: `${page.id}-last-line-${t.id}`,
        type: "short_last_line",
        severity: "low",
        pageId: page.id,
        elementIds: [t.id],
        message: "Text block ends with a very short line.",
        evidence: `lastLineCharacters: ${lines.at(-1)!.trim().length}`,
        recommendedActions: [],
      });
    }
    const letters = t.text.replace(/[^A-Za-z]/g, "");
    if (letters.length > 80 && letters === letters.toUpperCase()) {
      allCapsBlocks++;
      issues.push({
        id: `${page.id}-caps-${t.id}`,
        type: "all_caps_overuse",
        severity: "low",
        pageId: page.id,
        elementIds: [t.id],
        message: "Long all-caps text may be hard to read.",
        evidence: `letters: ${letters.length}`,
        recommendedActions: [],
      });
    }
  }
  score -= Math.min(8, shortLastLines * 2 + allCapsBlocks * 4);
  const avgLineLength = lineCount > 0 ? totalLineLen / lineCount : 0;

  if (bodyEls.length && maxLineLength > preset.maxBodyLineLength) {
    score -= 8;
    issues.push({
      id: `${page.id}-long-lines`,
      type: "excessive_line_length",
      severity: "medium",
      pageId: page.id,
      elementIds: longLineElements.map((element) => element.id),
      message: `Max line length ${maxLineLength} chars exceeds recommended ${preset.maxBodyLineLength}.`,
      evidence: `avg: ${Math.round(avgLineLength)}, max: ${maxLineLength} chars`,
      recommendedActions: longLineElements
        .filter(
          (element) =>
            element.width > 400 && element.constraints?.allowResize !== false,
        )
        .map((element) => ({
          type: "adjust_region_width" as const,
          pageId: page.id,
          elementId: element.id,
          params: { value: Math.round(element.width * 0.84) },
          rationale:
            "Narrow the text measure while preserving the approved copy.",
          expectedImprovements: ["readability", "typography"] as Array<
            keyof import("./qualityTypes.js").DesignQualityDimensions
          >,
          confidence: "medium" as const,
        })),
    });
  }

  return {
    headingCount: headings.length,
    bodyCount: bodyEls.length,
    maxHeadingSize,
    minBodySize,
    avgBodySize,
    hierarchyRatio,
    typeSizeCount: sizes.size,
    typeWeightCount: weights.size,
    maxLineLength,
    avgLineLength,
    tightLeadingCount,
    looseLeadingCount,
    belowFloorCount: belowFloorEls.length,
    issues,
    score: Math.max(20, Math.min(100, score)),
  };
}
