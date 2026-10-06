// ============================================================
// DesignSpec → Editor Projection Fidelity model (Phase 2B)
//
// This model answers a single question: when a scored DesignSpec is
// projected into the editable FlowDocument the user actually receives,
// what survived, what was transformed, and what was lost?
// ============================================================

export type FidelitySeverity = "info" | "low" | "medium" | "high" | "critical";

/**
 * How a projection difference affects the delivered, editable artifact.
 * The categories are deliberately ordered from harmless to disqualifying.
 */
export type FidelityImpact =
  | "preserved"
  | "harmless_transformation"
  | "acceptable_approximation"
  | "quality_affecting"
  | "copy_affecting"
  | "export_affecting"
  | "editability_affecting"
  | "unsupported";

export type FidelityItemKind =
  | "text"
  | "typography"
  | "shape"
  | "image"
  | "table"
  | "chart"
  | "group"
  | "page"
  | "asset"
  | "style";

export interface FidelityItem {
  id: string;
  kind: FidelityItemKind;
  pageId: string;
  elementId?: string;
  property?: string;
  /** Only recorded when it is safe to serialize (small primitives). */
  originalValue?: unknown;
  projectedValue?: unknown;
  impact: FidelityImpact;
  severity: FidelitySeverity;
  userImpact: string;
  recommendedFix?: string;
}

export interface FidelityWarning {
  code: string;
  pageId?: string;
  elementId?: string;
  message: string;
  severity: FidelitySeverity;
}

export interface FidelityBlocker {
  code: string;
  pageId?: string;
  elementId?: string;
  message: string;
  impact: Extract<
    FidelityImpact,
    "copy_affecting" | "export_affecting" | "editability_affecting"
  >;
}

export type FidelityOverall = "high" | "medium" | "low" | "unsafe";

export interface EditorProjectionFidelityReport {
  sourceSpecId: string;
  projectedProjectId: string;
  overall: FidelityOverall;
  score: number;
  preserved: FidelityItem[];
  transformed: FidelityItem[];
  unsupported: FidelityItem[];
  lost: FidelityItem[];
  warnings: FidelityWarning[];
  blockers: FidelityBlocker[];
  counts: {
    total: number;
    preserved: number;
    transformed: number;
    unsupported: number;
    lost: number;
    blockers: number;
  };
}

/** A single projector's contribution before the report is assembled. */
export interface ProjectionOutcome<T> {
  projected: T;
  fidelityItems: FidelityItem[];
  warnings: FidelityWarning[];
  blockers: FidelityBlocker[];
}
