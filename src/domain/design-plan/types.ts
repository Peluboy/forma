import type { PageRole } from "../design-spec/types.js";

export interface SlotAssignment {
  slotId: string;
  contentNodeIds: string[];
  sourceSpanIds: string[];
}

export interface PlannedPage {
  id: string;
  order: number;
  role: PageRole;
  layoutId: string;
  assignments: SlotAssignment[];
  rationale?: string;
  /** A content page may omit its heading when the preceding page owns the only approved heading. */
  continuationOfPrevious?: boolean;
}

export interface DesignPlanMetadata {
  artDirectorModel?: string;
  plannedAt?: string;
  estimatedPageCount?: number;
  [key: string]: unknown;
}

export interface DesignPlan {
  version: "1.0";
  id: string;
  contentGraphId: string;
  templateFamilyId: string;
  pages: PlannedPage[];
  metadata?: DesignPlanMetadata;
}

export type DesignPlanIssueType =
  | "invalid_root"
  | "invalid_page_order"
  | "duplicate_page_id"
  | "unknown_layout"
  | "unknown_slot"
  | "missing_required_slot"
  | "disallowed_content_type"
  | "exceeded_max_items"
  | "duplicate_content_assignment"
  | "unassigned_required_content"
  | "unknown_node_reference"
  | "unknown_span_reference";

export interface DesignPlanIssue {
  type: DesignPlanIssueType;
  pageId?: string;
  layoutId?: string;
  slotId?: string;
  nodeId?: string;
  spanId?: string;
  message: string;
}

export interface DesignPlanValidationResult {
  valid: boolean;
  issues: DesignPlanIssue[];
}
