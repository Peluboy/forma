// ============================================================
// Spacing, Alignment & Density Metrics — Phase 2 Part C
// ============================================================

import type { DesignElement, DesignPage } from "../design-spec/types.js";
import type {
  DesignQualityIssue,
  DesignQualityDimensions,
} from "./qualityTypes.js";

function occupiedRatio(page: DesignPage, elements: DesignElement[]): number {
  const cols = 30;
  const rows = 40;
  let occupied = 0;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = ((col + 0.5) * page.width) / cols;
      const y = ((row + 0.5) * page.height) / rows;
      if (
        elements.some(
          (element) =>
            x >= element.x &&
            x <= element.x + element.width &&
            y >= element.y &&
            y <= element.y + element.height,
        )
      )
        occupied++;
    }
  return occupied / (cols * rows);
}

// ─── Spacing ────────────────────────────────────────────────────────────────

export interface SpacingMetrics {
  marginViolationCount: number;
  crowdedPairCount: number;
  deadSpaceRatio: number; // ratio of unusually large empty regions
  issues: DesignQualityIssue[];
  score: number;
}

export function analyzeSpacing(
  page: DesignPage,
  margin: number = 54,
): SpacingMetrics {
  const issues: DesignQualityIssue[] = [];
  let score = 100;
  let marginViolations = 0;
  let crowdedPairs = 0;

  const visibleEls = page.elements.filter((el) => !el.hidden);

  // Check margin violations
  for (const el of visibleEls) {
    if (el.x < margin - 6 && el.type === "text") {
      marginViolations++;
      score -= 8;
      issues.push({
        id: `${page.id}-margin-${el.id}`,
        type: "inconsistent_spacing",
        severity: "medium",
        pageId: page.id,
        elementIds: [el.id],
        message: `Element '${el.id}' left position ${Math.round(el.x)}pt bleeds inside margin (${margin}pt).`,
        evidence: `x: ${Math.round(el.x)}, margin: ${margin}`,
        recommendedActions: [
          {
            type: "align_to_grid",
            pageId: page.id,
            elementId: el.id,
            params: { value: margin },
            rationale: "Move element to respect grid margin.",
            expectedImprovements: ["alignment", "spacing"] as Array<
              keyof DesignQualityDimensions
            >,
            confidence: "high",
          },
        ],
      });
    }
  }

  // Check crowded adjacent pairs (vertical)
  const sortedByY = [...visibleEls].sort((a, b) => a.y - b.y);
  for (let i = 0; i < sortedByY.length - 1; i++) {
    const a = sortedByY[i];
    const b = sortedByY[i + 1];
    const gap = b.y - (a.y + a.height);
    if (gap >= 0 && gap < 4) {
      crowdedPairs++;
      score -= 6;
      issues.push({
        id: `${page.id}-crowded-${a.id}-${b.id}`,
        type: "insufficient_whitespace",
        severity: "medium",
        pageId: page.id,
        elementIds: [a.id, b.id],
        message: `Elements '${a.id}' and '${b.id}' are only ${Math.round(gap)}pt apart.`,
        evidence: `gap: ${Math.round(gap)}pt`,
        recommendedActions: [
          {
            type: "increase_spacing",
            pageId: page.id,
            elementId: b.id,
            params: { amount: 8, axis: "y" },
            rationale: "Add breathing room between adjacent elements.",
            expectedImprovements: ["spacing", "readability"] as Array<
              keyof DesignQualityDimensions
            >,
            confidence: "high",
          },
        ],
      });
    }
  }

  // Estimate dead space ratio (content clustered in <40% of page)
  const pageH = page.height ?? 792;
  const pageW = page.width ?? 612;
  const pageArea = pageW * pageH;
  const occupancyRatio = occupiedRatio(page, visibleEls);
  const occupiedArea = occupancyRatio * pageArea;
  // Flag if < 0.15 (near empty) or > 0.80 (extremely dense)
  let deadSpaceRatio = 0;
  if (occupancyRatio < 0.15 && visibleEls.length > 0) {
    deadSpaceRatio = 1 - occupancyRatio;
    score -= 12;
    issues.push({
      id: `${page.id}-dead-space`,
      type: "excessive_whitespace",
      severity: "medium",
      pageId: page.id,
      message: `Page has very low content density (${Math.round(occupancyRatio * 100)}% occupied).`,
      evidence: `occupiedArea: ${Math.round(occupiedArea)}, pageArea: ${Math.round(pageArea)}`,
      recommendedActions: [],
    });
  }

  return {
    marginViolationCount: marginViolations,
    crowdedPairCount: crowdedPairs,
    deadSpaceRatio,
    issues,
    score: Math.max(20, Math.min(100, score)),
  };
}

// ─── Alignment ───────────────────────────────────────────────────────────────

export interface AlignmentMetrics {
  sharedLeftEdgeGroups: number;
  misalignedPairs: number;
  issues: DesignQualityIssue[];
  score: number;
}

export function analyzeAlignment(
  page: DesignPage,
  _margin: number = 54,
): AlignmentMetrics {
  const issues: DesignQualityIssue[] = [];
  let score = 100;

  const visibleEls = page.elements.filter((el) => !el.hidden);

  // Group elements by approximate left x edge (within 4pt)
  const xBuckets = new Map<number, DesignElement[]>();
  for (const el of visibleEls) {
    const snapped = Math.round(el.x / 4) * 4;
    if (!xBuckets.has(snapped)) xBuckets.set(snapped, []);
    xBuckets.get(snapped)!.push(el);
  }
  const sharedLeftGroups = [...xBuckets.values()].filter(
    (g) => g.length >= 2,
  ).length;

  // Detect misaligned adjacent pairs that should share an x edge
  let misalignedPairs = 0;
  for (let i = 0; i < visibleEls.length - 1; i++) {
    for (let j = i + 1; j < visibleEls.length; j++) {
      const a = visibleEls[i];
      const b = visibleEls[j];
      const xDiff = Math.abs(a.x - b.x);
      const yOverlap =
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      // Elements at similar Y that are slightly off-grid
      if (xDiff > 4 && xDiff < 20 && yOverlap > 10) {
        misalignedPairs++;
        score -= 5;
        if (issues.length < 5) {
          issues.push({
            id: `${page.id}-misalign-${a.id}-${b.id}`,
            type: "inconsistent_alignment",
            severity: "low",
            pageId: page.id,
            elementIds: [a.id, b.id],
            message: `Elements '${a.id}' and '${b.id}' have similar Y position but differ by ${Math.round(xDiff)}pt on X.`,
            evidence: `xDiff: ${Math.round(xDiff)}pt`,
            recommendedActions: [
              {
                type: "align_elements",
                pageId: page.id,
                elementId: b.id,
                params: { value: a.x, axis: "x" },
                rationale: "Align to shared left edge.",
                expectedImprovements: ["alignment"] as Array<
                  keyof DesignQualityDimensions
                >,
                confidence: "medium",
              },
            ],
          });
        }
      }
    }
  }

  return {
    sharedLeftEdgeGroups: sharedLeftGroups,
    misalignedPairs,
    issues,
    score: Math.max(20, Math.min(100, score)),
  };
}

// ─── Density ─────────────────────────────────────────────────────────────────

export interface DensityMetrics {
  occupancyRatio: number; // 0–1 proportion of page area used
  textAreaRatio: number;
  imageAreaRatio: number;
  elementCount: number;
  densityByQuadrant: {
    tl: number;
    tr: number;
    bl: number;
    br: number;
  };
  level: "sparse" | "light" | "medium" | "dense" | "crowded";
  issues: DesignQualityIssue[];
  score: number;
}

export function analyzeDensity(page: DesignPage): DensityMetrics {
  const issues: DesignQualityIssue[] = [];
  let score = 100;

  const pageW = page.width ?? 612;
  const pageH = page.height ?? 792;
  const pageArea = pageW * pageH;
  const halfW = pageW / 2;
  const halfH = pageH / 2;

  const visibleEls = page.elements.filter((el) => !el.hidden);

  let textArea = 0;
  let imageArea = 0;
  const quadrantArea = { tl: 0, tr: 0, bl: 0, br: 0 };

  for (const el of visibleEls) {
    const area = el.width * el.height;
    if (el.type === "text") textArea += area;
    if (el.type === "image") imageArea += area;

    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const q =
      cx < halfW && cy < halfH
        ? "tl"
        : cx >= halfW && cy < halfH
          ? "tr"
          : cx < halfW && cy >= halfH
            ? "bl"
            : "br";
    quadrantArea[q] += area;
  }

  const occupancyRatio = occupiedRatio(page, visibleEls);
  const textAreaRatio = pageArea > 0 ? textArea / pageArea : 0;
  const imageAreaRatio = pageArea > 0 ? imageArea / pageArea : 0;

  const level: DensityMetrics["level"] =
    occupancyRatio > 0.8
      ? "crowded"
      : occupancyRatio > 0.6
        ? "dense"
        : occupancyRatio > 0.35
          ? "medium"
          : occupancyRatio > 0.15
            ? "light"
            : "sparse";

  if (level === "crowded") {
    score -= 20;
    issues.push({
      id: `${page.id}-crowded`,
      type: "body_too_dense",
      severity: "high",
      pageId: page.id,
      message: `Page content density is very high (${Math.round(occupancyRatio * 100)}% occupied).`,
      evidence: `Occupancy: ${Math.round(occupancyRatio * 100)}%`,
      recommendedActions: [
        {
          type: "redistribute_whitespace",
          pageId: page.id,
          params: {},
          rationale:
            "Increase margins or reduce element sizes to improve breathing room.",
          expectedImprovements: ["spacing", "readability"] as Array<
            keyof DesignQualityDimensions
          >,
          confidence: "medium",
        },
      ],
    });
  }

  if (level === "sparse" && visibleEls.length > 1) {
    score -= 10;
    issues.push({
      id: `${page.id}-sparse`,
      type: "underused_visual_area",
      severity: "low",
      pageId: page.id,
      message: `Page content density is very low (${Math.round(occupancyRatio * 100)}% occupied).`,
      evidence: `Occupancy: ${Math.round(occupancyRatio * 100)}%`,
      recommendedActions: [],
    });
  }

  const quadrantNorm = Object.fromEntries(
    Object.entries(quadrantArea).map(([k, v]) => [
      k,
      pageArea > 0 ? v / (pageArea / 4) : 0,
    ]),
  ) as DensityMetrics["densityByQuadrant"];

  return {
    occupancyRatio,
    textAreaRatio,
    imageAreaRatio,
    elementCount: visibleEls.length,
    densityByQuadrant: quadrantNorm,
    level,
    issues,
    score: Math.max(20, Math.min(100, score)),
  };
}

// ─── Balance ─────────────────────────────────────────────────────────────────

export interface BalanceMetrics {
  leftWeight: number; // 0–100
  rightWeight: number;
  topWeight: number;
  bottomWeight: number;
  horizontalImbalance: number; // abs difference
  verticalImbalance: number;
  issues: DesignQualityIssue[];
  score: number;
}

export function analyzeBalance(page: DesignPage): BalanceMetrics {
  const issues: DesignQualityIssue[] = [];
  let score = 100;

  const pageW = page.width ?? 612;
  const pageH = page.height ?? 792;
  const visibleEls = page.elements.filter((el) => !el.hidden);

  let leftMass = 0;
  let rightMass = 0;
  let topMass = 0;
  let bottomMass = 0;

  for (const el of visibleEls) {
    const area = el.width * el.height;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const leftFrac = Math.max(0, Math.min(1, 1 - cx / pageW));
    const rightFrac = 1 - leftFrac;
    const topFrac = Math.max(0, Math.min(1, 1 - cy / pageH));
    const bottomFrac = 1 - topFrac;
    leftMass += area * leftFrac;
    rightMass += area * rightFrac;
    topMass += area * topFrac;
    bottomMass += area * bottomFrac;
  }

  const totalMass = leftMass + rightMass || 1;
  const totalVMass = topMass + bottomMass || 1;
  const leftW = Math.round((leftMass / totalMass) * 100);
  const rightW = 100 - leftW;
  const topW = Math.round((topMass / totalVMass) * 100);
  const bottomW = 100 - topW;

  const hImbalance = Math.abs(leftW - rightW);
  const vImbalance = Math.abs(topW - bottomW);

  if (hImbalance > 50) {
    score -= 15;
    issues.push({
      id: `${page.id}-h-imbalance`,
      type: "visual_weight_imbalance",
      severity: "medium",
      pageId: page.id,
      message: `Strong horizontal imbalance: left ${leftW}% vs right ${rightW}%.`,
      evidence: `hImbalance: ${hImbalance}`,
      recommendedActions: [],
    });
  }

  return {
    leftWeight: leftW,
    rightWeight: rightW,
    topWeight: topW,
    bottomWeight: bottomW,
    horizontalImbalance: hImbalance,
    verticalImbalance: vImbalance,
    issues,
    score: Math.max(20, Math.min(100, score)),
  };
}
