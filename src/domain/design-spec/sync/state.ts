import type { Project } from "../../design/schema.js";
import type { DesignSpec } from "../types.js";
import { DESIGNSPEC_SYNC_VERSION, type DesignSpecSyncState } from "./types.js";

function isStoredSpec(value: unknown): value is DesignSpec {
  if (!value || typeof value !== "object") return false;
  const spec = value as DesignSpec;
  return (
    spec.version === "1.0" &&
    typeof spec.id === "string" &&
    Array.isArray(spec.pages)
  );
}

export function emptySyncState(
  projectId: string,
  status: DesignSpecSyncState["status"] = "missing_design_spec",
  extras?: Partial<DesignSpecSyncState>,
): DesignSpecSyncState {
  return {
    version: DESIGNSPEC_SYNC_VERSION,
    designSpecId: extras?.designSpecId || "",
    projectId,
    status,
    supportedEditCount: 0,
    unsupportedEditCount: 0,
    warnings: [],
    blockers: [],
    ...extras,
  };
}

export function createInSyncState(
  specId: string,
  projectId: string,
  extras?: Partial<DesignSpecSyncState>,
): DesignSpecSyncState {
  return emptySyncState(projectId, "in_sync", {
    designSpecId: specId,
    lastSyncedAt: extras?.lastSyncedAt || new Date().toISOString(),
    ...extras,
  });
}

export function isDesignSpecSyncState(
  value: unknown,
): value is DesignSpecSyncState {
  if (!value || typeof value !== "object") return false;
  const state = value as DesignSpecSyncState;
  return (
    state.version === "1.0" &&
    typeof state.projectId === "string" &&
    typeof state.status === "string"
  );
}

export function getStoredDesignSpec(project: Project): DesignSpec | undefined {
  return isStoredSpec(project.metadata?.designSpec)
    ? project.metadata.designSpec
    : undefined;
}

export function getStoredSyncState(
  project: Project,
): DesignSpecSyncState | undefined {
  return isDesignSpecSyncState(project.metadata?.designSpecSync)
    ? project.metadata.designSpecSync
    : undefined;
}

export function hasLinkedDesignSpec(project: Project): boolean {
  return Boolean(getStoredDesignSpec(project));
}

export function writeSyncMetadata(
  project: Project,
  spec: DesignSpec | undefined,
  state: DesignSpecSyncState,
): Project {
  return {
    ...project,
    metadata: {
      ...(project.metadata || {}),
      ...(spec ? { designSpec: spec } : {}),
      designSpecSync: state,
      copyCheckStatus: state.copyChanged
        ? "fail"
        : project.metadata?.copyCheckStatus,
    },
  };
}

export function nativeExportAllowed(
  state?: DesignSpecSyncState,
): "allow" | "warn" | "block" | "unavailable" {
  if (!state || state.status === "missing_design_spec") return "unavailable";
  if (state.status === "in_sync") return "allow";
  if (state.status === "sync_with_approximations") return "warn";
  return "block";
}
