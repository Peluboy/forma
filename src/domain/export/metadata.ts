import type { DesignSpec } from "../design-spec/types.js";
import type { Project } from "../design/schema.js";
import {
  EXPORT_ENGINE_VERSION,
  type ExportFidelityStatus,
  type ExportMetadata,
  type NativeExportInput,
} from "./types.js";

function stringMeta(
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function collectExportMetadata(
  spec: DesignSpec,
  input: NativeExportInput,
  fidelityStatus?: ExportFidelityStatus,
): ExportMetadata {
  const specMeta = (spec.metadata || {}) as Record<string, unknown>;
  const projectMeta = (input.project?.metadata || {}) as Record<
    string,
    unknown
  >;
  return {
    projectId: input.project?.id || stringMeta(specMeta, "projectId"),
    workspaceId:
      input.workspace?.id ||
      input.project?.workspaceId ||
      stringMeta(specMeta, "workspaceId"),
    clientId:
      input.client?.id ||
      input.project?.clientId ||
      stringMeta(specMeta, "clientId"),
    templateFamilyRecordId:
      stringMeta(specMeta, "templateFamilyRecordId") ||
      stringMeta(projectMeta, "templateFamilyRecordId"),
    templateVersionId:
      stringMeta(specMeta, "templateFamilyVersion") ||
      stringMeta(specMeta, "templateVersionId") ||
      stringMeta(projectMeta, "templateFamilyVersion"),
    generatorVersion:
      stringMeta(specMeta, "generatorVersion") ||
      stringMeta(projectMeta, "generatorVersion"),
    exportEngineVersion: EXPORT_ENGINE_VERSION,
    exportedAt: input.now || new Date().toISOString(),
    copyCheckStatus: input.graph
      ? undefined
      : (stringMeta(projectMeta, "copyCheckStatus") as
          ExportMetadata["copyCheckStatus"] | undefined),
    qualityStatus:
      input.qualityStatus || stringMeta(projectMeta, "qualityStatus"),
    exportFidelityStatus: fidelityStatus,
  };
}

export function attachDesignSpecToProject(
  project: Project,
  spec: DesignSpec,
  extras?: Record<string, unknown>,
): Project {
  return {
    ...project,
    metadata: {
      ...(project.metadata || {}),
      designSpec: spec,
      ...extras,
    },
  };
}

export function metadataForPdfProperties(meta: ExportMetadata): {
  title?: string;
  subject?: string;
  creator?: string;
  keywords?: string;
} {
  const keywords = [
    meta.exportEngineVersion ? `engine:${meta.exportEngineVersion}` : "",
    meta.exportFidelityStatus ? `fidelity:${meta.exportFidelityStatus}` : "",
    meta.copyCheckStatus ? `copy:${meta.copyCheckStatus}` : "",
    meta.fitStatus ? `fit:${meta.fitStatus}` : "",
    meta.workspaceId ? `workspace` : "",
    meta.clientId ? `client` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    creator: `Forma native PDF ${EXPORT_ENGINE_VERSION}`,
    subject: "Forma native PDF export",
    keywords,
  };
}
