import type { Project } from "../../design/schema.js";
import type { DesignSpec } from "../types.js";
import { validateDesignSpec } from "../validation.js";
import { applyEditorChangeToDesignSpec } from "./applyEditorPatch.js";
import { diffFlowDocuments } from "./diff.js";
import { fromFlowDocumentToDesignSpec } from "./fromFlow.js";
import { stableHash } from "./hash.js";
import { validateProjectionLinks } from "./links.js";
import {
  createInSyncState,
  emptySyncState,
  getStoredDesignSpec,
  getStoredSyncState,
  writeSyncMetadata,
} from "./state.js";
import type {
  DesignSpecSyncIssue,
  DesignSpecSyncResult,
  DesignSpecSyncState,
  EditorChangeOperation,
} from "./types.js";

export function inspectProjectSync(project: Project): DesignSpecSyncState {
  const spec = getStoredDesignSpec(project);
  if (!spec) {
    return emptySyncState(project.id, "missing_design_spec");
  }
  const stored = getStoredSyncState(project);
  if (stored && stored.designSpecId === spec.id) return stored;
  if (!project.flow) {
    return createInSyncState(spec.id, project.id);
  }
  const links = validateProjectionLinks(spec, project.flow);
  if (!links.valid) {
    return emptySyncState(project.id, "stale", {
      designSpecId: spec.id,
      blockers: [
        ...links.missingLinks.map((id) => ({
          code: "missing_link",
          message: "An editor element has no native design link.",
          elementId: id,
        })),
        ...links.invalidLinks.map((id) => ({
          code: "invalid_link",
          message: "A linked design element is missing.",
          elementId: id,
        })),
      ],
    });
  }
  return createInSyncState(spec.id, project.id);
}

export function syncProjectAfterEdit(
  previous: Project,
  next: Project,
  now = new Date().toISOString(),
): Project {
  if (next.family !== "document") return next;
  const spec = getStoredDesignSpec(next) || getStoredDesignSpec(previous);
  if (!spec) {
    return writeSyncMetadata(
      next,
      undefined,
      emptySyncState(next.id, "missing_design_spec", {
        lastEditorChangeAt: now,
      }),
    );
  }
  const flowUnchanged = stableHash(previous.flow) === stableHash(next.flow);
  const incomingIsNew =
    getStoredDesignSpec(next) &&
    getStoredDesignSpec(previous) &&
    stableHash(getStoredDesignSpec(next)) !==
      stableHash(getStoredDesignSpec(previous));
  if (flowUnchanged && incomingIsNew) {
    const incoming = getStoredDesignSpec(next)!;
    return writeSyncMetadata(
      next,
      incoming,
      createInSyncState(incoming.id, next.id, {
        lastSyncedAt: now,
        lastKnownHash: stableHash(incoming),
        currentEditorHash: stableHash(next.flow),
      }),
    );
  }
  if (flowUnchanged) {
    const current = getStoredSyncState(next) || getStoredSyncState(previous);
    return writeSyncMetadata(
      next,
      spec,
      current ||
        createInSyncState(spec.id, next.id, {
          lastSyncedAt: now,
          lastKnownHash: stableHash(spec),
          currentEditorHash: stableHash(next.flow),
        }),
    );
  }
  const operations = diffFlowDocuments(
    previous.flow,
    next.flow,
    spec,
    next.id,
    inferSource(previous, next),
    now,
  );
  if (!operations.length) {
    return writeSyncMetadata(
      next,
      spec,
      createInSyncState(spec.id, next.id, {
        lastSyncedAt: now,
        lastKnownHash: stableHash(spec),
        currentEditorHash: stableHash(next.flow),
      }),
    );
  }
  const patched = applyOperations(spec, operations, next.id, now);
  if (!patched.applied && patched.state.status !== "in_sync") {
    return writeSyncMetadata(next, spec, {
      ...patched.state,
      lastKnownHash: stableHash(spec),
      currentEditorHash: stableHash(next.flow),
      recentOperations: summarize(operations, now),
    });
  }
  return writeSyncMetadata(next, patched.spec, {
    ...patched.state,
    lastSyncedAt: now,
    lastEditorChangeAt: now,
    lastKnownHash: stableHash(patched.spec),
    currentEditorHash: stableHash(next.flow),
    recentOperations: summarize(operations, now),
  });
}

export function resyncLinkedDesignSpec(
  project: Project,
  mode: "patch" | "rebuild" = "patch",
  now = new Date().toISOString(),
): DesignSpecSyncResult & { project: Project } {
  const spec = getStoredDesignSpec(project);
  if (!spec) {
    const state = emptySyncState(project.id, "missing_design_spec");
    return {
      spec: {
        version: "1.0",
        id: `${project.id}-missing`,
        name: project.name,
        family: "document",
        copyPolicy: project.copyPolicy || "exact",
        documentSize: { width: 612, height: 792, unit: "pt" },
        pages: [],
      },
      state,
      issues: [
        {
          code: "missing_design_spec",
          message: "This project has no linked native design.",
          severity: "blocker",
        },
      ],
      applied: false,
      project: writeSyncMetadata(project, undefined, state),
    };
  }
  if (!project.flow) {
    const state = createInSyncState(spec.id, project.id, { lastSyncedAt: now });
    return { spec, state, issues: [], applied: true, project };
  }
  void mode;
  return commitRebuild(project, spec, now);
}

function commitRebuild(
  project: Project,
  spec: DesignSpec,
  now: string,
): DesignSpecSyncResult & { project: Project } {
  const rebuilt = fromFlowDocumentToDesignSpec(project, spec);
  const validation = validateDesignSpec(rebuilt.spec);
  if (!validation.valid) {
    const state = emptySyncState(project.id, "stale", {
      designSpecId: spec.id,
      lastEditorChangeAt: now,
      blockers: [
        {
          code: "resync_failed",
          message: validation.issues[0]?.message || "Resync failed validation.",
        },
      ],
    });
    return {
      spec,
      state,
      issues: [
        {
          code: "resync_failed",
          message: state.blockers[0].message,
          severity: "blocker",
        },
      ],
      applied: false,
      project: writeSyncMetadata(project, spec, state),
    };
  }
  const links = project.flow
    ? validateProjectionLinks(rebuilt.spec, project.flow)
    : { valid: true };
  const state = createInSyncState(rebuilt.spec.id, project.id, {
    lastSyncedAt: now,
    lastKnownHash: stableHash(rebuilt.spec),
    currentEditorHash: stableHash(project.flow),
    status: links.valid ? "in_sync" : "sync_with_approximations",
    warnings: rebuilt.warnings.map((message) => ({
      code: "rebuild_warning",
      message,
    })),
  });
  return {
    spec: rebuilt.spec,
    state,
    issues: [],
    applied: true,
    project: writeSyncMetadata(project, rebuilt.spec, state),
  };
}

function applyOperations(
  spec: DesignSpec,
  operations: EditorChangeOperation[],
  projectId: string,
  now: string,
): DesignSpecSyncResult {
  let current = spec;
  const issues: DesignSpecSyncIssue[] = [];
  let supported = 0;
  let unsupported = 0;
  let copyChanged = false;
  let status: DesignSpecSyncState["status"] = "in_sync";
  for (const operation of operations) {
    const result = applyEditorChangeToDesignSpec(current, operation);
    issues.push(...result.issues);
    if (result.applied) {
      current = result.spec;
      supported += 1;
    } else {
      unsupported += 1;
    }
    if (result.state.copyChanged) copyChanged = true;
    if (result.state.status === "unsupported_edit_detected")
      status = "unsupported_edit_detected";
    else if (result.state.status === "stale" && status === "in_sync")
      status = "stale";
    else if (
      result.state.status === "sync_with_approximations" &&
      status === "in_sync"
    )
      status = "sync_with_approximations";
  }
  if (copyChanged && status === "in_sync") status = "sync_with_approximations";
  const state = emptySyncState(projectId, status, {
    designSpecId: current.id,
    lastSyncedAt: now,
    lastEditorChangeAt: now,
    supportedEditCount: supported,
    unsupportedEditCount: unsupported,
    copyChanged,
    warnings: issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => ({
        code: issue.code,
        message: issue.message,
        pageId: issue.pageId,
        elementId: issue.elementId,
      })),
    blockers: issues
      .filter((issue) => issue.severity === "blocker")
      .map((issue) => ({
        code: issue.code,
        message: issue.message,
        pageId: issue.pageId,
        elementId: issue.elementId,
      })),
  });
  return {
    spec: current,
    state,
    issues,
    applied: unsupported === 0,
  };
}

function inferSource(
  previous: Project,
  next: Project,
): EditorChangeOperation["source"] {
  if (previous.metadata?.qualityStatus !== next.metadata?.qualityStatus)
    return "quality_fix";
  return "user";
}

function summarize(operations: EditorChangeOperation[], now: string) {
  return operations.slice(-12).map((operation) => ({
    kind: operation.kind,
    pageId: operation.pageId,
    elementId: operation.editorElementId,
    at: now,
  }));
}
