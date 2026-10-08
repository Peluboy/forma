import type { TemplateFamily } from "../template-family/types.js";
import type {
  LayoutApprovalState,
  LayoutApprovalStatus,
  TemplateApprovalState,
  TemplateWarning,
} from "./types.js";

/**
 * Approval workflow (Part C).
 *
 * Rules encoded here (never in the UI):
 * - candidate/draft templates are not production-usable unless experimental mode allows it
 * - approved templates are usable in /create
 * - rejected layouts can never be selected by the generation planner
 * - needs_changes layouts are excluded by default, included only when explicitly flagged
 */

export function emptyLayoutApproval(): LayoutApprovalState {
  return { status: "unreviewed" };
}

export function initialApprovalState(
  layoutIds: string[],
  options: { approved?: boolean; approvedBy?: string } = {},
): TemplateApprovalState {
  const reviewedLayouts: Record<string, LayoutApprovalState> = {};
  for (const id of layoutIds) reviewedLayouts[id] = emptyLayoutApproval();
  return {
    approved: options.approved ?? false,
    ...(options.approved && options.approvedBy
      ? { approvedBy: options.approvedBy }
      : {}),
    ...(options.approved ? { approvedAt: new Date().toISOString() } : {}),
    reviewedLayouts,
    unresolvedWarnings: [],
  };
}

export function reviewLayout(
  approval: TemplateApprovalState,
  layoutId: string,
  status: LayoutApprovalStatus,
  notes?: string,
): TemplateApprovalState {
  return {
    ...approval,
    reviewedLayouts: {
      ...approval.reviewedLayouts,
      [layoutId]: {
        status,
        ...(notes !== undefined ? { reviewerNotes: notes } : {}),
        lastReviewedAt: new Date().toISOString(),
      },
    },
  };
}

export function layoutApprovalStatus(
  approval: TemplateApprovalState | undefined,
  layoutId: string,
): LayoutApprovalStatus {
  return approval?.reviewedLayouts?.[layoutId]?.status ?? "unreviewed";
}

export interface ApprovalFilterOptions {
  /** Production generation requires approved layouts only. */
  requireApprovedLayouts?: boolean;
  /** Include needs_changes layouts (feature-flagged experimental path). */
  includeNeedsChanges?: boolean;
  /** Include unreviewed layouts (authoring/review preview). */
  includeUnreviewed?: boolean;
}

/**
 * Returns the family with non-usable layouts removed so the generation planner
 * can never pick them. Rejected layouts are always removed.
 */
export function applyApprovalToFamily(
  family: TemplateFamily,
  approval: TemplateApprovalState | undefined,
  options: ApprovalFilterOptions = {},
): TemplateFamily {
  const {
    requireApprovedLayouts = false,
    includeNeedsChanges = false,
    includeUnreviewed = true,
  } = options;

  const layouts = family.layouts.filter((layout) => {
    const status = layoutApprovalStatus(approval, layout.id);
    if (status === "rejected") return false;
    if (status === "needs_changes" && !includeNeedsChanges) return false;
    if (status === "unreviewed" && requireApprovedLayouts && !includeUnreviewed)
      return false;
    return true;
  });

  return { ...family, layouts };
}

export interface ApprovalSummary {
  layoutCount: number;
  approvedLayoutCount: number;
  rejectedLayoutCount: number;
  needsChangesLayoutCount: number;
  unreviewedLayoutCount: number;
  allApproved: boolean;
}

export function summarizeApproval(
  approval: TemplateApprovalState | undefined,
  family: TemplateFamily,
): ApprovalSummary {
  let approvedLayoutCount = 0;
  let rejectedLayoutCount = 0;
  let needsChangesLayoutCount = 0;
  let unreviewedLayoutCount = 0;
  for (const layout of family.layouts) {
    switch (layoutApprovalStatus(approval, layout.id)) {
      case "approved":
        approvedLayoutCount++;
        break;
      case "rejected":
        rejectedLayoutCount++;
        break;
      case "needs_changes":
        needsChangesLayoutCount++;
        break;
      default:
        unreviewedLayoutCount++;
    }
  }
  return {
    layoutCount: family.layouts.length,
    approvedLayoutCount,
    rejectedLayoutCount,
    needsChangesLayoutCount,
    unreviewedLayoutCount,
    allApproved:
      approvedLayoutCount === family.layouts.length &&
      rejectedLayoutCount === 0 &&
      needsChangesLayoutCount === 0 &&
      unreviewedLayoutCount === 0,
  };
}

export function approveAllLayouts(
  approval: TemplateApprovalState,
  family: TemplateFamily,
  notes?: string,
): TemplateApprovalState {
  let next = approval;
  for (const layout of family.layouts)
    next = reviewLayout(next, layout.id, "approved", notes);
  return next;
}

export function setApprovalWarnings(
  approval: TemplateApprovalState,
  warnings: TemplateWarning[],
): TemplateApprovalState {
  return { ...approval, unresolvedWarnings: warnings };
}

/** Marks the whole template approved. Callers must gate this on usability. */
export function setTemplateApproved(
  approval: TemplateApprovalState,
  approvedBy: string,
): TemplateApprovalState {
  return {
    ...approval,
    approved: true,
    approvedAt: new Date().toISOString(),
    approvedBy,
  };
}

export function setTemplateUnapproved(
  approval: TemplateApprovalState,
  notes?: string,
): TemplateApprovalState {
  return {
    ...approval,
    approved: false,
    approvedAt: undefined,
    approvedBy: undefined,
    ...(notes !== undefined ? { notes } : {}),
  };
}
