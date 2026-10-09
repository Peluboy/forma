import type { PageRole } from "../design-spec/types.js";

/**
 * Reference Design Intelligence v1.
 *
 * A ReferenceDesignProfile describes HOW a reference design communicates
 * visually. It is analysis metadata used to generate a NEW editable design in a
 * similar visual language. It is NOT an editable reconstruction of the source.
 */

export const REFERENCE_PROFILE_VERSION = "1.0" as const;

export type ReferenceSourceType =
  "image" | "forma_project" | "design_spec" | "unknown";

export type ReferenceSource =
  | {
      type: "image";
      assetId?: string;
      dataHash: string;
      width: number;
      height: number;
    }
  | { type: "forma_project"; projectId: string }
  | { type: "design_spec"; designSpecId: string }
  | { type: "unknown" };

export type ReferenceRegionType =
  | "heading"
  | "subheading"
  | "body"
  | "caption"
  | "image"
  | "shape"
  | "card"
  | "stat"
  | "quote"
  | "table"
  | "chart"
  | "logo"
  | "footer"
  | "unknown";

export interface ReferenceRegion {
  id: string;
  type: ReferenceRegionType;
  bounds: { x: number; y: number; width: number; height: number };
  text?: string;
  style?: {
    color?: string;
    background?: string;
    fontSize?: number;
    fontWeight?: string | number;
    alignment?: string;
  };
  confidence: number;
  evidence?: string[];
}

/** Whether a token/observation was read from structure or guessed. */
export type ReferenceInferenceKind = "observed" | "inferred";

export interface ExtractedColorToken {
  id: string;
  value: string;
  role: string;
  frequency: number;
  confidence: number;
  kind: ReferenceInferenceKind;
  evidence: string[];
}

export interface ExtractedTypographyToken {
  id: string;
  role: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: number;
  frequency: number;
  confidence: number;
  kind: ReferenceInferenceKind;
  evidence: string[];
}

export interface ExtractedSpacingToken {
  id: string;
  value: number;
  role: string;
  frequency: number;
  confidence: number;
  kind: ReferenceInferenceKind;
  evidence: string[];
}

export interface ExtractedRadiusToken {
  id: string;
  value: number;
  role: string;
  frequency: number;
  confidence: number;
  kind: ReferenceInferenceKind;
  evidence: string[];
}

export interface ExtractedStrokeToken {
  id: string;
  value: number;
  role: string;
  frequency: number;
  confidence: number;
  kind: ReferenceInferenceKind;
  evidence: string[];
}

export interface ExtractedShadowToken {
  id: string;
  value: string;
  role: string;
  frequency: number;
  confidence: number;
  kind: ReferenceInferenceKind;
  evidence: string[];
}

export interface ExtractedGridToken {
  columns?: number;
  margin?: number;
  gutter?: number;
  confidence: number;
  kind: ReferenceInferenceKind;
  evidence: string[];
}

export interface ExtractedImageTreatment {
  borderRadius?: number;
  aspectRatio?: string;
  fit?: "fill" | "fit" | "crop";
  confidence: number;
  kind: ReferenceInferenceKind;
  evidence: string[];
}

export interface ExtractedDesignTokens {
  colors: ExtractedColorToken[];
  typography: ExtractedTypographyToken[];
  spacing: ExtractedSpacingToken[];
  radii?: ExtractedRadiusToken[];
  strokes?: ExtractedStrokeToken[];
  shadows?: ExtractedShadowToken[];
  grid?: ExtractedGridToken;
  imageTreatment?: ExtractedImageTreatment;
}

export interface TypographyObservation {
  role: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number | string;
  color?: string;
  confidence: number;
}

export interface ColorObservation {
  value: string;
  role: string;
  coverage: number;
  confidence: number;
}

export interface SpacingObservation {
  value: number;
  role: string;
  confidence: number;
}

export interface ImageObservation {
  regionId: string;
  bounds: ReferenceRegion["bounds"];
  treatment?: string;
  confidence: number;
}

export interface TableObservation {
  regionId: string;
  columns?: number;
  headerRows?: number;
  confidence: number;
}

export interface ChartObservation {
  regionId: string;
  chartType?: "bar" | "line" | "pie";
  confidence: number;
}

export interface ReferencePageAnalysis {
  id: string;
  pageIndex: number;
  width: number;
  height: number;
  role?: PageRole;
  visualType?: string;
  detectedRegions: ReferenceRegion[];
  typographyObservations: TypographyObservation[];
  colorObservations: ColorObservation[];
  spacingObservations: SpacingObservation[];
  imageObservations: ImageObservation[];
  tableObservations?: TableObservation[];
  chartObservations?: ChartObservation[];
  confidence: number;
  warnings: ReferenceWarning[];
}

export type ReferenceLayoutPatternType =
  | "cover_like"
  | "heading_body"
  | "two_column_body"
  | "image_body"
  | "stat_layout"
  | "quote_layout"
  | "table_layout"
  | "chart_layout"
  | "closing_like"
  | "unknown";

export interface ReferenceLayoutPattern {
  id: string;
  type: ReferenceLayoutPatternType;
  /** Candidate editorial layout ids this pattern suggests. */
  candidateLayoutIds: string[];
  columns: number;
  density: "sparse" | "balanced" | "dense";
  occurrenceCount: number;
  confidence: number;
  pageRoles: PageRole[];
  evidence: string[];
}

export type ReferenceVisualTone =
  | "corporate"
  | "editorial"
  | "premium"
  | "minimal"
  | "bold"
  | "data_forward"
  | "image_led"
  | "playful"
  | "unknown";

export type ReferenceDensity = "sparse" | "balanced" | "dense";
export type ReferenceComposition =
  | "grid_based"
  | "asymmetric"
  | "centered"
  | "modular"
  | "editorial"
  | "unknown";
export type ReferenceImageUsage =
  "none" | "supporting" | "hero" | "background" | "heavy" | "unknown";
export type ReferenceDataUsage = "none" | "light" | "moderate" | "heavy";

export interface ReferenceVisualLanguage {
  tone: ReferenceVisualTone;
  density: ReferenceDensity;
  composition: ReferenceComposition;
  imageUsage: ReferenceImageUsage;
  dataUsage: ReferenceDataUsage;
  notes?: string[];
  confidence: number;
  kind: ReferenceInferenceKind;
}

export type ReferenceWarningCode =
  | "low_resolution_reference"
  | "insufficient_text_detected"
  | "typography_uncertain"
  | "layout_regions_uncertain"
  | "no_reusable_patterns_detected"
  | "image_only_reference"
  | "multi_page_reference_not_available"
  | "extraction_provider_unavailable"
  | "unsupported_reference_format"
  | "too_many_regions_truncated"
  | "invalid_region_dropped"
  | "unknown_region_type"
  | "unsupported_color_value"
  | "partial_extraction";

export interface ReferenceWarning {
  code: ReferenceWarningCode;
  message: string;
  severity: "info" | "low" | "medium" | "high";
}

export interface ReferenceConfidence {
  overall: number;
  colors: number;
  typography: number;
  layout: number;
  imagery: number;
  data: number;
}

export interface ReferenceDesignProfile {
  version: "1.0";
  id: string;
  name?: string;
  source: ReferenceSource;
  pages: ReferencePageAnalysis[];
  extractedTokens: ExtractedDesignTokens;
  layoutPatterns: ReferenceLayoutPattern[];
  visualLanguage: ReferenceVisualLanguage;
  confidence: ReferenceConfidence;
  warnings: ReferenceWarning[];
  metadata?: Record<string, unknown>;
  workspaceId?: string;
  clientId?: string;
}

// ─── Reference template gate (Part L) ────────────────────────────────────────

export type ReferenceTemplateStatus =
  | "reference_template_ready"
  | "reference_guided_only"
  | "reference_low_confidence"
  | "reference_unusable";

export type ReferenceUsageMode =
  | "none"
  | "reference_guided_tokens"
  | "reference_derived_template"
  | "reference_low_confidence_fallback";

export interface ReferenceTemplateGateResult {
  status: ReferenceTemplateStatus;
  ready: boolean;
  reasons: string[];
  layoutIds: string[];
}

// ─── Similarity (Part Q) ─────────────────────────────────────────────────────

export interface ReferenceSimilarityReport {
  overall: number;
  palette: number;
  typography: number;
  layout: number;
  density: number;
  imagery: number;
  warnings: ReferenceWarning[];
}
