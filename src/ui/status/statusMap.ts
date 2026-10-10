import type { StatusVariant } from "../theme";

export interface StatusMeta {
  label: string;
  variant: StatusVariant;
  description?: string;
}

/**
 * Maps internal quality, fidelity, copy, and fit states to plain English UI terms.
 * Adheres to Phase 7.5 copy guidelines (no technical jargon, no em dashes).
 */
export function mapQualityStatus(score: number, fidelity?: string): StatusMeta {
  if (fidelity === "loss_detected" || fidelity === "unsupported") {
    return {
      label: "Editing may differ",
      variant: "danger",
      description: "Some elements were simplified for editable canvas mode.",
    };
  }
  if (score >= 90) {
    return {
      label: "Ready",
      variant: "success",
      description: "Output layout looks correct and fits properly.",
    };
  }
  if (score >= 75) {
    return {
      label: "Minor limits",
      variant: "warning",
      description: "Minor font or spacing adjustments applied.",
    };
  }
  return {
    label: "Needs review",
    variant: "warning",
    description: "Some elements may need manual alignment.",
  };
}

export function mapCopyStatus(valid: boolean): StatusMeta {
  return valid
    ? { label: "Copy check passed", variant: "success" }
    : {
        label: "Copy needs review",
        variant: "danger",
        description: "Some text was omitted or altered.",
      };
}

export function mapFitStatus(valid: boolean): StatusMeta {
  return valid
    ? { label: "Fits page", variant: "success" }
    : {
        label: "Layout needs review",
        variant: "warning",
        description: "Text exceeds page margins.",
      };
}

export function mapTemplateStatus(status: string): StatusMeta {
  switch (status) {
    case "approved":
      return { label: "Approved", variant: "success" };
    case "draft":
      return { label: "Draft", variant: "neutral" };
    case "candidate":
      return { label: "Candidate", variant: "info" };
    case "needs_changes":
      return { label: "Needs changes", variant: "warning" };
    case "rejected":
      return { label: "Rejected", variant: "danger" };
    case "archived":
      return { label: "Archived", variant: "neutral" };
    default:
      return { label: status, variant: "neutral" };
  }
}

export function mapReferenceConfidence(
  confidence: string | number,
): StatusMeta {
  if (typeof confidence === "number") {
    if (confidence >= 0.8) return { label: "Ready to use", variant: "success" };
    if (confidence >= 0.5) return { label: "Style only", variant: "info" };
    return { label: "Needs review", variant: "warning" };
  }
  switch (confidence) {
    case "high":
    case "ready":
      return { label: "Ready to use", variant: "success" };
    case "medium":
    case "style_only":
      return { label: "Style only", variant: "info" };
    case "low":
    case "needs_review":
      return { label: "Needs review", variant: "warning" };
    case "unusable":
      return { label: "Not enough detail", variant: "danger" };
    default:
      return { label: "Needs review", variant: "warning" };
  }
}

export function mapExportPreflight(status: string): StatusMeta {
  switch (status) {
    case "pass":
      return { label: "Ready to export", variant: "success" };
    case "pass_with_warnings":
      return {
        label: "Ready with notes",
        variant: "warning",
        description: "The file will download. Some fonts or images may change.",
      };
    case "blocked":
      return { label: "Export blocked", variant: "danger" };
    default:
      return { label: "Export needs review", variant: "warning" };
  }
}

export function mapDesignSyncStatus(status: string): StatusMeta {
  switch (status) {
    case "in_sync":
    case "design_current":
    case "native_export_current":
      return { label: "Up to date", variant: "success" };
    case "sync_with_approximations":
      return { label: "Needs review", variant: "warning" };
    case "stale":
    case "design_out_of_sync":
    case "native_export_stale":
      return {
        label: "Needs sync",
        variant: "warning",
        description: "Selectable PDF may not match recent edits.",
      };
    case "unsupported_edit_detected":
      return { label: "Export may not match", variant: "danger" };
    case "missing_design_spec":
      return { label: "Selectable PDF unavailable", variant: "neutral" };
    case "resync_failed":
      return { label: "Sync failed", variant: "danger" };
    default:
      return { label: "Needs review", variant: "warning" };
  }
}

export function mapExportFidelity(status: string): StatusMeta {
  switch (status) {
    case "export_trusted":
      return { label: "Ready to export", variant: "success" };
    case "export_with_approximations":
      return {
        label: "Some fonts will be replaced",
        variant: "warning",
      };
    case "export_blocked":
      return { label: "Export blocked", variant: "danger" };
    default:
      return { label: "Export needs review", variant: "warning" };
  }
}

export function mapWorkspaceRole(role: string): StatusMeta {
  switch (role) {
    case "owner":
      return { label: "Owner", variant: "accent" };
    case "admin":
      return { label: "Admin", variant: "info" };
    case "designer":
      return { label: "Designer", variant: "neutral" };
    case "viewer":
      return { label: "View only", variant: "neutral" };
    default:
      return { label: role, variant: "neutral" };
  }
}
