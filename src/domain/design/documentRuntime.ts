import {
  readDesignFile,
  serializeDesignFile,
  toDesignDocument,
  type DesignDocument,
} from "./document";
import {
  canvasHeight,
  canvasWidth,
  fieldIds,
  isProject,
  type Project,
} from "./model";

/**
 * When enabled, browser storage and editable-file IO treat DesignDocument as
 * the authority. The live editor and cloud API still consume the legacy
 * Project projection from compatibility.project until renderers migrate.
 */
export function documentRuntimeEnabled(): boolean {
  if (
    typeof process !== "undefined" &&
    process.env?.FORMA_DOCUMENT_RUNTIME === "0"
  )
    return false;
  try {
    if (
      typeof import.meta !== "undefined" &&
      (import.meta as { env?: { VITE_FORMA_DOCUMENT_RUNTIME?: string } }).env
        ?.VITE_FORMA_DOCUMENT_RUNTIME === "0"
    )
      return false;
  } catch {
    /* ignore non-Vite hosts */
  }
  return true;
}

export function encodeStoredProject(
  project: Project,
): DesignDocument | Project {
  if (!documentRuntimeEnabled()) return project;
  return toDesignDocument(project);
}

export function decodeStoredProject(value: unknown): Project | null {
  try {
    return readDesignFile(value);
  } catch {
    return null;
  }
}

export function readStoredProjectList(raw: unknown): Project[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => decodeStoredProject(entry))
    .filter((project): project is Project => Boolean(project));
}

export function serializeStoredProject(project: Project): string {
  return documentRuntimeEnabled()
    ? serializeDesignFile(project)
    : JSON.stringify(project, null, 2);
}

/** Copy, page size and layered text must survive document encode → decode. */
export function projectionPreserved(project: Project): boolean {
  if (!isProject(project)) return false;
  const restored = readDesignFile(toDesignDocument(project));
  if (
    canvasWidth(restored) !== canvasWidth(project) ||
    canvasHeight(restored) !== canvasHeight(project) ||
    restored.format !== project.format ||
    JSON.stringify(restored.pageSize) !== JSON.stringify(project.pageSize) ||
    JSON.stringify(restored.contentBlocks) !==
      JSON.stringify(project.contentBlocks)
  )
    return false;
  if (!fieldIds.every((id) => restored.copy[id] === project.copy[id]))
    return false;
  return (
    JSON.stringify(restored.textLayers || []) ===
      JSON.stringify(project.textLayers || []) &&
    JSON.stringify(restored.graphicLayers || []) ===
      JSON.stringify(project.graphicLayers || []) &&
    JSON.stringify(restored.layerOrder || []) ===
      JSON.stringify(project.layerOrder || [])
  );
}
