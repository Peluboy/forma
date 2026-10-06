// ============================================================
// Page Composition Analyzer — Phase 2 Part E
// ============================================================

import type { DesignPage } from "../design-spec/types.js";
import type {
  PageCompositionAnalysis,
  CompositionRegion,
  DesignQualityIssue,
} from "./qualityTypes.js";

export function analyzeComposition(page: DesignPage): PageCompositionAnalysis {
  const issues: DesignQualityIssue[] = [];
  const pageW = page.width ?? 612;
  const pageH = page.height ?? 792;
  const halfW = pageW / 2;
  const halfH = pageH / 2;

  const visibleEls = page.elements.filter((el) => !el.hidden);

  // Quadrant occupation
  const quadrants: CompositionRegion[] = [
    { quadrant: "tl", occupiedRatio: 0, elementIds: [] },
    { quadrant: "tr", occupiedRatio: 0, elementIds: [] },
    { quadrant: "bl", occupiedRatio: 0, elementIds: [] },
    { quadrant: "br", occupiedRatio: 0, elementIds: [] },
  ];
  const quadrantArea = { tl: 0, tr: 0, bl: 0, br: 0 };
  const quadrantPageArea = (pageW * pageH) / 4;

  for (const el of visibleEls) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const area = el.width * el.height;
    const q =
      cx < halfW && cy < halfH
        ? "tl"
        : cx >= halfW && cy < halfH
          ? "tr"
          : cx < halfW && cy >= halfH
            ? "bl"
            : "br";
    quadrantArea[q] += area;
    const qData = quadrants.find((r) => r.quadrant === q)!;
    qData.elementIds.push(el.id);
  }

  for (const q of quadrants) {
    q.occupiedRatio = Math.min(1, quadrantArea[q.quadrant] / quadrantPageArea);
  }

  // Focal point candidate: largest element or highest-placed heading
  let focalPoint: PageCompositionAnalysis["focalPointCandidate"];
  const focalCandidates = visibleEls.filter(
    (el) => el.type === "text" || el.type === "image" || el.type === "chart",
  );
  const largestEl = focalCandidates.reduce(
    (best, el) =>
      el.width * el.height > (best?.width ?? 0) * (best?.height ?? 0)
        ? el
        : best,
    focalCandidates[0],
  );
  if (largestEl) {
    focalPoint = {
      x: largestEl.x + largestEl.width / 2,
      y: largestEl.y + largestEl.height / 2,
      elementId: largestEl.id,
    };
  }

  // Whitespace ratio
  const pageArea = pageW * pageH;
  const occupiedArea = visibleEls.reduce(
    (s, el) => s + el.width * el.height,
    0,
  );
  const whitespaceRatio = Math.max(0, 1 - occupiedArea / pageArea);

  // Detect orphaned elements (isolated, far from any others)
  for (const el of visibleEls) {
    if (el.type === "shape" || el.type === "table" || el.height > pageH * 0.3)
      continue;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const hasNeighbour = visibleEls.some((other) => {
      if (other.id === el.id || other.type === "shape") return false;
      const dx = Math.max(
        0,
        other.x - (el.x + el.width),
        el.x - (other.x + other.width),
      );
      const dy = Math.max(
        0,
        other.y - (el.y + el.height),
        el.y - (other.y + other.height),
      );
      return dx < 36 && dy < 72;
    });
    if (!hasNeighbour && visibleEls.length > 2) {
      issues.push({
        id: `${page.id}-orphan-${el.id}`,
        type: "orphaned_element",
        severity: "low",
        pageId: page.id,
        elementIds: [el.id],
        message: `Element '${el.id}' appears visually isolated from other page content.`,
        evidence: `Position: (${Math.round(cx)}, ${Math.round(cy)})`,
        recommendedActions: [],
      });
    }
  }

  // Weak focal point: no single dominant element
  if (visibleEls.length > 3 && !focalPoint) {
    issues.push({
      id: `${page.id}-weak-focal`,
      type: "weak_focal_point",
      severity: "low",
      pageId: page.id,
      message: "Page has no clear visual focal point.",
      evidence: `${visibleEls.length} elements of similar visual weight.`,
      recommendedActions: [],
    });
  }

  return {
    pageId: page.id,
    focalPointCandidate: focalPoint,
    leftWeight: Math.round(quadrantArea.tl + quadrantArea.bl),
    rightWeight: Math.round(quadrantArea.tr + quadrantArea.br),
    topWeight: Math.round(quadrantArea.tl + quadrantArea.tr),
    bottomWeight: Math.round(quadrantArea.bl + quadrantArea.br),
    quadrants,
    whitespaceRatio,
    elementCount: visibleEls.length,
    issues,
  };
}
