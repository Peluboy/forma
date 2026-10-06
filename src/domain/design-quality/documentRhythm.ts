// ============================================================
// Document Rhythm Engine — Phase 2 Part F
// ============================================================

import type { DesignSpec } from "../design-spec/types.js";
import type { TemplateFamily } from "../template-family/types.js";
import type { DesignQualityPreset } from "./qualityTypes.js";
import type {
  DocumentRhythmReport,
  DocumentRhythmIssue,
} from "./qualityTypes.js";
import { analyzeDensity } from "./metrics.js";

function layoutVisualType(layoutId: string): string {
  if (layoutId.includes("stat")) return "data";
  if (layoutId.includes("quote")) return "quote";
  if (layoutId.includes("table")) return "table";
  if (layoutId.includes("chart")) return "chart";
  if (layoutId.includes("cover")) return "editorial";
  if (layoutId.includes("section-opener")) return "editorial";
  if (layoutId.includes("image")) return "image";
  if (layoutId.includes("closing")) return "editorial";
  return "editorial";
}

export function analyzeDocumentRhythm(
  spec: DesignSpec,
  preset: DesignQualityPreset,
  family?: TemplateFamily,
): DocumentRhythmReport {
  const issues: DocumentRhythmIssue[] = [];
  let score = 100;

  const pageSequence = spec.pages.map((page) => {
    const layoutId = (page.metadata?.layoutId as string) ?? "heading-body";
    const density = analyzeDensity(page);
    return {
      pageId: page.id,
      layoutId,
      role: (page.metadata?.role as string) ?? "content",
      densityScore: Math.round(density.occupancyRatio * 100),
      visualType:
        family?.varietyRules?.[layoutId]?.visualType ??
        layoutVisualType(layoutId),
    };
  });

  // 1. Repeated layout pattern
  for (let i = 0; i < pageSequence.length; i++) {
    const maxRepeat =
      family?.varietyRules?.[pageSequence[i].layoutId]?.repeatLimit ??
      preset.maxLayoutRepeat;
    if (i + maxRepeat >= pageSequence.length) continue;
    const window = pageSequence.slice(i, i + maxRepeat + 1);
    const allSameLayout = window.every(
      (p) => p.layoutId === window[0].layoutId,
    );
    if (
      allSameLayout &&
      window[0].layoutId !== "cover" &&
      window[0].layoutId !== "closing"
    ) {
      const ids = window.map((p) => p.pageId);
      score -= 12;
      issues.push({
        type: "repeated_layout_pattern",
        pages: ids,
        severity: "medium",
        recommendation: `Layout '${window[0].layoutId}' repeats ${window.length}× in sequence. Consider introducing an alternate compatible layout.`,
      });
      i += maxRepeat; // skip ahead to avoid duplicate
    }
  }

  // 2. Dense page sequence (3+ pages with density > 70%)
  let denseRun: string[] = [];
  for (const p of pageSequence) {
    if (p.densityScore > 70) {
      denseRun.push(p.pageId);
      if (denseRun.length >= 3) {
        score -= 10;
        issues.push({
          type: "dense_sequence",
          pages: [...denseRun],
          severity: "medium",
          recommendation: `${denseRun.length} consecutive dense pages detected. Insert a lighter layout to aid reading pace.`,
        });
        denseRun = [];
      }
    } else {
      denseRun = [];
    }
  }

  // 3. Stat-heavy sequence
  let statRun: string[] = [];
  for (const p of pageSequence) {
    if (p.visualType === "data") {
      statRun.push(p.pageId);
      if (statRun.length >= 3) {
        score -= 8;
        issues.push({
          type: "stat_heavy_sequence",
          pages: [...statRun],
          severity: "low",
          recommendation:
            "Multiple data-heavy pages in a row. Consider alternating with editorial prose pages.",
        });
        statRun = [];
      }
    } else {
      statRun = [];
    }
  }

  // 4. Visual monotony: > 70% pages have same visual type
  const typeCounts = new Map<string, number>();
  for (const p of pageSequence) {
    typeCounts.set(p.visualType, (typeCounts.get(p.visualType) ?? 0) + 1);
  }
  for (const [type, count] of typeCounts) {
    const frac = count / Math.max(1, pageSequence.length);
    if (frac > 0.7 && pageSequence.length >= 4) {
      score -= 10;
      issues.push({
        type: "visual_monotony",
        pages: pageSequence
          .filter((p) => p.visualType === type)
          .map((p) => p.pageId),
        severity: "medium",
        recommendation: `Over 70% of pages have the same visual type ('${type}'). Introduce variety with image, data, or quote layouts.`,
      });
    }
  }

  // 5. Abrupt density spike between adjacent pages
  for (let i = 1; i < pageSequence.length; i++) {
    const prev = pageSequence[i - 1];
    const curr = pageSequence[i];
    const avoid =
      family?.varietyRules?.[prev.layoutId]?.avoidFollowingTypes ?? [];
    if (avoid.includes(curr.visualType)) {
      score -= 5;
      issues.push({
        type: "visual_monotony",
        pages: [prev.pageId, curr.pageId],
        severity: "low",
        recommendation: `Avoid two ${curr.visualType} pages in sequence when another compatible layout is available.`,
      });
    }
    const spike = Math.abs(curr.densityScore - prev.densityScore);
    if (spike > preset.maxDensityVariation) {
      score -= 6;
      issues.push({
        type: "inconsistent_density",
        pages: [prev.pageId, curr.pageId],
        severity: "low",
        recommendation: `Density changes abruptly from ${prev.densityScore}% to ${curr.densityScore}% between pages. Consider softening the transition.`,
      });
    }
  }

  return {
    score: Math.max(20, Math.min(100, score)),
    issues,
    pageSequence,
  };
}
