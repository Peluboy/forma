// ============================================================
// Design Quality Engine — Aggregated Page + Document Scorer
// Phase 2 Parts A, B, C, D, E, F, G
// ============================================================

import type { DesignPage } from "../design-spec/types.js";
import type { DesignSpec } from "../design-spec/types.js";
import type { TemplateFamily } from "../template-family/types.js";
import type {
  DesignQualityScore,
  DesignQualityDimensions,
  DesignQualityIssue,
  DesignQualityStrength,
} from "./qualityTypes.js";
import { QUALITY_DIMENSION_WEIGHTS as WEIGHTS } from "./qualityTypes.js";
import type { DesignQualityPreset } from "./qualityTypes.js";
import { getQualityPreset } from "./presets.js";
import { analyzeTypography } from "./typography.js";
import {
  analyzeSpacing,
  analyzeAlignment,
  analyzeDensity,
  analyzeBalance,
} from "./metrics.js";
import { analyzeComposition } from "./composition.js";
import { analyzeImageQuality } from "./image.js";
import { analyzeDocumentRhythm } from "./documentRhythm.js";
import type { DocumentRhythmReport } from "./qualityTypes.js";

// ─── Brand Consistency ────────────────────────────────────────────────────────

function analyzeBrandConsistency(
  page: DesignPage,
  family: TemplateFamily,
): { score: number; issues: DesignQualityIssue[] } {
  const issues: DesignQualityIssue[] = [];
  let score = 100;

  const allowedColors = new Set(
    [
      ...Object.values(family.designTokens.colors),
      ...Object.values(family.designTokens.typography)
        .map((style) => style.color)
        .filter((color): color is string => Boolean(color)),
    ].map((color) => color.toLowerCase()),
  );
  const allowedFonts = new Set(
    Object.values(family.designTokens.typography).map((t) => t.fontFamily),
  );
  allowedColors.add("#000000");
  allowedColors.add("#ffffff");

  const textEls = page.elements.filter(
    (el): el is import("../design-spec/types.js").TextElement =>
      el.type === "text" && !el.hidden,
  );

  for (const t of textEls) {
    if (t.color && !allowedColors.has(t.color.toLowerCase())) {
      score -= 5;
      issues.push({
        id: `${page.id}-brand-color-${t.id}`,
        type: "brand_color_misuse",
        severity: "medium",
        pageId: page.id,
        elementIds: [t.id],
        message: `Element '${t.id}' uses unauthorized color '${t.color}'.`,
        evidence: `color: ${t.color}`,
        recommendedActions: [],
      });
    }
    if (t.fontFamily && !allowedFonts.has(t.fontFamily)) {
      score -= 8;
      issues.push({
        id: `${page.id}-brand-font-${t.id}`,
        type: "off_brand_typography",
        severity: "high",
        pageId: page.id,
        elementIds: [t.id],
        message: `Element '${t.id}' uses unauthorized font '${t.fontFamily}'.`,
        evidence: `fontFamily: ${t.fontFamily}`,
        recommendedActions: [],
      });
    }
  }
  for (const shape of page.elements.filter(
    (element) => element.type === "shape" && !element.hidden,
  )) {
    if (shape.type !== "shape") continue;
    for (const color of [shape.fill?.color, shape.stroke?.color]) {
      if (color && !allowedColors.has(color.toLowerCase())) {
        score -= 5;
        issues.push({
          id: `${page.id}-brand-shape-${shape.id}-${color}`,
          type: "brand_color_misuse",
          severity: "medium",
          pageId: page.id,
          elementIds: [shape.id],
          message: "Shape uses a color outside the template tokens.",
          evidence: `color: ${color}`,
          recommendedActions: [],
        });
      }
    }
  }

  return { score: Math.max(20, Math.min(100, score)), issues };
}

// ─── Weighted Score Computation ───────────────────────────────────────────────

function computeWeightedOverall(dims: DesignQualityDimensions): number {
  let total = 0;
  for (const [key, weight] of Object.entries(WEIGHTS) as Array<
    [keyof DesignQualityDimensions, number]
  >) {
    total += dims[key] * weight;
  }
  return Math.max(20, Math.min(100, Math.round(total)));
}

// ─── Page Quality Score ───────────────────────────────────────────────────────

export function evaluatePageQuality(
  page: DesignPage,
  family: TemplateFamily,
  preset: DesignQualityPreset,
): DesignQualityScore {
  const margin = family.designTokens.grid?.margin ?? 54;

  const typo = analyzeTypography(page, preset);
  const spacing = analyzeSpacing(page, margin);
  const alignment = analyzeAlignment(page, margin);
  const density = analyzeDensity(page);
  const balance = analyzeBalance(page);
  const composition = analyzeComposition(page);
  const imagery = analyzeImageQuality(page);
  const brand = analyzeBrandConsistency(page, family);

  const dims: DesignQualityDimensions = {
    hierarchy: typo.score,
    typography: typo.score,
    spacing: spacing.score,
    alignment: alignment.score,
    composition: Math.round(
      composition.issues.length === 0
        ? 90
        : Math.max(60, 90 - composition.issues.length * 8),
    ),
    balance: balance.score,
    density: density.score,
    rhythm: 80, // page-level rhythm evaluated at document level
    brandConsistency: brand.score,
    imagery: imagery.score,
    readability: Math.round(typo.score * 0.6 + spacing.score * 0.4),
    consistency: Math.round(brand.score * 0.7 + alignment.score * 0.3),
  };

  const allIssues: DesignQualityIssue[] = [
    ...typo.issues,
    ...spacing.issues,
    ...alignment.issues,
    ...density.issues,
    ...balance.issues,
    ...composition.issues,
    ...imagery.issues,
    ...brand.issues,
  ];

  const severityPenalty = Math.min(
    18,
    allIssues.reduce(
      (sum, issue) =>
        sum +
        (issue.severity === "critical"
          ? 5
          : issue.severity === "high"
            ? 3
            : issue.severity === "medium"
              ? 1.5
              : issue.severity === "low"
                ? 0.4
                : 0),
      0,
    ),
  );
  const uncappedOverall = Math.max(
    20,
    Math.round(computeWeightedOverall(dims) - severityPenalty),
  );
  const issueCap = allIssues.some((issue) => issue.severity === "critical")
    ? 64
    : allIssues.some((issue) => issue.severity === "high")
      ? 79
      : allIssues.some((issue) => issue.severity === "medium")
        ? 89
        : 100;
  const overall = Math.min(issueCap, uncappedOverall);

  const strengths: DesignQualityStrength[] = [];
  for (const [key, val] of Object.entries(dims) as Array<
    [keyof DesignQualityDimensions, number]
  >) {
    if (val >= 90) {
      strengths.push({
        dimension: key,
        message: `Strong ${key}: ${val}/100`,
      });
    }
  }

  return { overall, dimensions: dims, issues: allIssues, strengths };
}

// ─── Document Quality ─────────────────────────────────────────────────────────

export interface DocumentQualityReport {
  overallScore: number;
  pageScores: Array<{ pageId: string; score: DesignQualityScore }>;
  rhythmReport: DocumentRhythmReport;
  aggregateIssues: DesignQualityIssue[];
  averagePageScore: number;
  worstPageId?: string;
  bestPageId?: string;
}

export function evaluateDocumentQuality(
  spec: DesignSpec,
  family: TemplateFamily,
  presetId: string = "editorial_report",
): DocumentQualityReport {
  const preset = getQualityPreset(presetId);

  const pageScores = spec.pages.map((page) => ({
    pageId: page.id,
    score: evaluatePageQuality(page, family, preset),
  }));

  const rhythm = analyzeDocumentRhythm(spec, preset, family);

  const avg =
    pageScores.reduce((s, p) => s + p.score.overall, 0) /
    Math.max(1, pageScores.length);

  const aggregateIssues = pageScores.flatMap((p) => p.score.issues);

  const sorted = [...pageScores].sort(
    (a, b) => a.score.overall - b.score.overall,
  );
  const worstPageId = sorted[0]?.pageId;
  const bestPageId = sorted[sorted.length - 1]?.pageId;

  // Blend page avg with rhythm score
  const overallScore = Math.round(avg * 0.8 + rhythm.score * 0.2);

  return {
    overallScore,
    pageScores,
    rhythmReport: rhythm,
    aggregateIssues,
    averagePageScore: Math.round(avg),
    worstPageId,
    bestPageId,
  };
}
