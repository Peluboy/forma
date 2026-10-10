import type { DesignSpecSyncState } from "./types.js";
import { nativeExportAllowed } from "./state.js";

export function describeSyncForUser(state?: DesignSpecSyncState): string {
  if (!state || state.status === "missing_design_spec")
    return "Selectable PDF is unavailable for this project.";
  if (state.status === "in_sync")
    return "Selectable PDF matches your latest edits.";
  if (state.status === "sync_with_approximations")
    return "Selectable PDF has minor limits.";
  if (state.copyChanged) return "Copy changed after generation.";
  return "Selectable PDF may not match recent edits.";
}

export function describeSyncAction(state?: DesignSpecSyncState): string {
  const gate = nativeExportAllowed(state);
  if (gate === "unavailable") return "Use flattened PDF instead.";
  if (gate === "block") return "Sync latest edits or use flattened PDF.";
  if (gate === "warn") return "Export selectable PDF with notes.";
  return "Export selectable PDF.";
}

export function mapSyncStatus(status: string): {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral";
} {
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
      return { label: "Needs sync", variant: "warning" };
    case "unsupported_edit_detected":
      return { label: "Export may not match", variant: "danger" };
    case "missing_design_spec":
      return { label: "Selectable PDF unavailable", variant: "neutral" };
    default:
      return { label: "Needs review", variant: "warning" };
  }
}
