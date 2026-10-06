import type {
  FidelityImpact,
  FidelityItem,
  FidelityItemKind,
  FidelityOverall,
  FidelitySeverity,
} from "./types.js";

let counter = 0;

/** Stable-enough item IDs for reporting; not persisted. */
export function nextFidelityItemId(): string {
  counter += 1;
  return `fid-${counter}`;
}

export interface FidelityItemInput {
  kind: FidelityItemKind;
  pageId: string;
  elementId?: string;
  property?: string;
  originalValue?: unknown;
  projectedValue?: unknown;
  impact: FidelityImpact;
  severity?: FidelitySeverity;
  userImpact: string;
  recommendedFix?: string;
}

/** Default severity for an impact, used when the projector does not override. */
export function severityForImpact(impact: FidelityImpact): FidelitySeverity {
  switch (impact) {
    case "preserved":
      return "info";
    case "harmless_transformation":
      return "low";
    case "acceptable_approximation":
      return "medium";
    case "quality_affecting":
      return "medium";
    case "editability_affecting":
      return "high";
    case "export_affecting":
      return "high";
    case "copy_affecting":
      return "critical";
    case "unsupported":
      return "high";
    default:
      return "low";
  }
}

export function makeFidelityItem(input: FidelityItemInput): FidelityItem {
  return {
    id: nextFidelityItemId(),
    kind: input.kind,
    pageId: input.pageId,
    elementId: input.elementId,
    property: input.property,
    originalValue: input.originalValue,
    projectedValue: input.projectedValue,
    impact: input.impact,
    severity: input.severity ?? severityForImpact(input.impact),
    userImpact: input.userImpact,
    recommendedFix: input.recommendedFix,
  };
}

export interface FidelityCategory {
  preserved: FidelityItem[];
  transformed: FidelityItem[];
  unsupported: FidelityItem[];
  lost: FidelityItem[];
}

/**
 * Split items by how they should be reported. Copy-affecting loss is always
 * treated as lost (and therefore blocking); decorative approximation stays in
 * the transformed bucket so it does not masquerade as a failure.
 */
export function categorize(items: FidelityItem[]): FidelityCategory {
  const preserved: FidelityItem[] = [];
  const transformed: FidelityItem[] = [];
  const unsupported: FidelityItem[] = [];
  const lost: FidelityItem[] = [];
  for (const item of items) {
    switch (item.impact) {
      case "preserved":
        preserved.push(item);
        break;
      case "harmless_transformation":
      case "acceptable_approximation":
        transformed.push(item);
        break;
      case "unsupported":
        unsupported.push(item);
        break;
      default:
        lost.push(item);
        break;
    }
  }
  return { preserved, transformed, unsupported, lost };
}

const IMPACT_WEIGHT: Record<FidelityImpact, number> = {
  preserved: 1,
  harmless_transformation: 0.98,
  acceptable_approximation: 0.85,
  quality_affecting: 0.5,
  editability_affecting: 0.35,
  export_affecting: 0.3,
  copy_affecting: 0,
  unsupported: 0.25,
};

/** Items whose loss matters most are weighted heavier when scoring. */
const KIND_WEIGHT: Record<FidelityItemKind, number> = {
  text: 3,
  table: 3,
  chart: 1.5,
  image: 1.2,
  typography: 1.2,
  shape: 0.6,
  page: 1,
  style: 0.8,
  group: 0.6,
  asset: 0.8,
};

export function scoreFidelity(items: FidelityItem[]): number {
  if (!items.length) return 100;
  let weighted = 0;
  let total = 0;
  for (const item of items) {
    const weight =
      KIND_WEIGHT[item.kind] *
      (item.property === "text" || item.property === "sourceSpanIds" ? 1.5 : 1);
    weighted += IMPACT_WEIGHT[item.impact] * weight;
    total += weight;
  }
  return Math.max(0, Math.min(100, Math.round((weighted / total) * 100)));
}

export function overallFromScore(
  score: number,
  hasBlocker: boolean,
): FidelityOverall {
  if (hasBlocker || score < 40) return "unsafe";
  if (score < 70) return "low";
  if (score < 90) return "medium";
  return "high";
}
