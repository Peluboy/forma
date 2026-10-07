import type { PageRole } from "../design-spec/types.js";
import type {
  ReferenceDensity,
  ReferenceLayoutPattern,
  ReferenceLayoutPatternType,
  ReferencePageAnalysis,
  ReferenceRegion,
} from "./types.js";

const CANDIDATE_LAYOUTS: Record<ReferenceLayoutPatternType, string[]> = {
  cover_like: ["cover"],
  heading_body: ["heading-body", "section-opener"],
  two_column_body: ["two-column-body"],
  image_body: ["heading-image-body"],
  stat_layout: ["three-stat", "four-stat"],
  quote_layout: ["quote-feature"],
  table_layout: ["table-page"],
  chart_layout: ["chart-commentary"],
  closing_like: ["closing"],
  unknown: [],
};

function pageArea(page: ReferencePageAnalysis): number {
  return Math.max(1, page.width * page.height);
}

export function pageDensity(page: ReferencePageAnalysis): ReferenceDensity {
  const covered = page.detectedRegions.reduce(
    (sum, region) => sum + region.bounds.width * region.bounds.height,
    0,
  );
  const ratio = covered / pageArea(page);
  if (ratio < 0.18) return "sparse";
  if (ratio < 0.5) return "balanced";
  return "dense";
}

/** Detects side-by-side body regions that imply a multi-column layout. */
export function detectColumnCount(page: ReferencePageAnalysis): number {
  const bodies = page.detectedRegions.filter(
    (region) => region.type === "body" || region.type === "card",
  );
  if (bodies.length < 2) return 1;
  const columns: Array<{ x: number; right: number }> = [];
  for (const region of bodies) {
    const center = region.bounds.x + region.bounds.width / 2;
    const existing = columns.find(
      (column) => Math.abs(column.x - center) < page.width * 0.18,
    );
    if (existing) {
      existing.x = (existing.x + center) / 2;
      existing.right = Math.max(
        existing.right,
        region.bounds.x + region.bounds.width,
      );
    } else {
      columns.push({
        x: center,
        right: region.bounds.x + region.bounds.width,
      });
    }
  }
  return Math.min(3, Math.max(1, columns.length));
}

function regionKinds(page: ReferencePageAnalysis): {
  counts: Record<string, number>;
  imageArea: number;
} {
  const counts: Record<string, number> = {};
  let imageArea = 0;
  for (const region of page.detectedRegions) {
    counts[region.type] = (counts[region.type] ?? 0) + 1;
    if (region.type === "image" || region.type === "logo")
      imageArea += region.bounds.width * region.bounds.height;
  }
  return { counts, imageArea };
}

export function classifyPagePattern(page: ReferencePageAnalysis): {
  type: ReferenceLayoutPatternType;
  columns: number;
  density: ReferenceDensity;
} {
  const { counts, imageArea } = regionKinds(page);
  const density = pageDensity(page);
  const role = page.role;

  if (
    role === "cover" ||
    (page.pageIndex === 0 && counts.heading && !counts.body && !counts.image)
  )
    return { type: "cover_like", columns: 1, density };
  if (role === "closing") return { type: "closing_like", columns: 1, density };
  if ((page.tableObservations?.length ?? 0) > 0 || counts.table)
    return { type: "table_layout", columns: 1, density };
  if ((page.chartObservations?.length ?? 0) > 0 || counts.chart)
    return { type: "chart_layout", columns: 1, density };
  if ((counts.stat ?? 0) >= 2)
    return { type: "stat_layout", columns: 1, density };
  if ((counts.quote ?? 0) >= 1)
    return { type: "quote_layout", columns: 1, density };
  if ((counts.image ?? 0) >= 1) {
    const ratio = imageArea / pageArea(page);
    return {
      type: "image_body",
      columns: 1,
      density: ratio > 0.35 ? ("dense" as ReferenceDensity) : density,
    };
  }
  const columns = detectColumnCount(page);
  if (columns >= 2) return { type: "two_column_body", columns, density };
  if (counts.body) return { type: "heading_body", columns: 1, density };
  return { type: "unknown", columns: 1, density };
}

function averageRegionConfidence(page: ReferencePageAnalysis): number {
  if (!page.detectedRegions.length) return page.confidence;
  const total = page.detectedRegions.reduce(
    (sum, region) => sum + region.confidence,
    0,
  );
  return (total / page.detectedRegions.length) * 0.5 + page.confidence * 0.5;
}

/**
 * Aggregates per-page classifications into reusable layout patterns. Only
 * patterns the reference actually shows are emitted (never a fixed catalogue).
 */
export function extractLayoutPatterns(
  pages: ReferencePageAnalysis[],
): ReferenceLayoutPattern[] {
  const byType = new Map<
    ReferenceLayoutPatternType,
    {
      count: number;
      confidence: number;
      columns: number;
      densities: ReferenceDensity[];
      roles: PageRole[];
      evidence: string[];
    }
  >();

  for (const page of pages) {
    const { type, columns, density } = classifyPagePattern(page);
    if (type === "unknown") continue;
    const entry = byType.get(type) ?? {
      count: 0,
      confidence: 0,
      columns,
      densities: [],
      roles: [],
      evidence: [],
    };
    entry.count += 1;
    entry.confidence += averageRegionConfidence(page);
    entry.columns = Math.max(entry.columns, columns);
    entry.densities.push(density);
    if (page.role) entry.roles.push(page.role);
    entry.evidence.push(
      `page ${page.pageIndex + 1}: ${type} (${density}${columns > 1 ? `, ${columns} columns` : ""})`,
    );
    byType.set(type, entry);
  }

  const patterns: ReferenceLayoutPattern[] = [];
  let index = 0;
  for (const [type, entry] of byType) {
    const dense = entry.densities.filter((d) => d === "dense").length;
    const sparse = entry.densities.filter((d) => d === "sparse").length;
    const density: ReferenceDensity =
      dense >= sparse && dense > 0
        ? "dense"
        : sparse > dense
          ? "sparse"
          : "balanced";
    patterns.push({
      id: `pattern-${type}-${++index}`,
      type,
      candidateLayoutIds: CANDIDATE_LAYOUTS[type],
      columns: entry.columns,
      density,
      occurrenceCount: entry.count,
      confidence: Math.round((entry.confidence / entry.count) * 1000) / 1000,
      pageRoles: [...new Set(entry.roles)],
      evidence: entry.evidence.slice(0, 6),
    });
  }
  return patterns.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}

/** Counts how many layout ids the observed patterns confidently support. */
export function supportedLayoutIdsForPatterns(
  patterns: ReferenceLayoutPattern[],
): string[] {
  const ids = new Set<string>();
  for (const pattern of patterns)
    if (pattern.confidence >= 0.4)
      for (const id of pattern.candidateLayoutIds) ids.add(id);
  return [...ids];
}

export function regionSignature(regions: ReferenceRegion[]): string {
  return regions.map((region) => region.type).join(",");
}
