import type { ContentGraph } from "../content/types.js";
import type { Project } from "../design/schema.js";
import type { DesignSpec } from "../design-spec/types.js";
import type { DocumentFitReport } from "../layout-fit/types.js";
import type { ClientRecord } from "../workspace/client.js";
import type { WorkspaceActor, WorkspaceRecord } from "../workspace/types.js";

export const EXPORT_ENGINE_VERSION = "1.0";

export type ExportFormat = "pdf";
export type ExportJobStatus =
  "pending" | "running" | "completed" | "failed" | "blocked";
export type ExportPreflightStatus = "pass" | "pass_with_warnings" | "blocked";
export type ExportFidelityStatus =
  | "export_trusted"
  | "export_with_approximations"
  | "export_unverified"
  | "export_blocked";
export type PdfQuality = "draft" | "standard" | "high";
export type PdfPageRange = "all" | number[];

export interface PdfExportOptions {
  pageRange?: PdfPageRange;
  quality?: PdfQuality;
  includeMetadata?: boolean;
  rasterizeUnsupportedEffects?: boolean;
  preserveSelectableText?: boolean;
  embedImages?: boolean;
  includeBleed?: boolean;
  includeCropMarks?: boolean;
}

export interface ExportWarning {
  code: string;
  message: string;
  pageId?: string;
  elementId?: string;
}

export interface ExportBlocker {
  code: string;
  message: string;
  pageId?: string;
  elementId?: string;
}

export interface ExportPreflightReport {
  status: ExportPreflightStatus;
  warnings: ExportWarning[];
  blockers: ExportBlocker[];
}

export interface ExportFidelityItem {
  kind:
    | "text"
    | "shape"
    | "image"
    | "table"
    | "chart"
    | "group"
    | "page"
    | "font"
    | "effect";
  pageId?: string;
  elementId?: string;
  property: string;
  status:
    "preserved" | "substituted" | "approximated" | "rasterized" | "omitted";
  detail: string;
}

export interface ExportFidelityReport {
  status: ExportFidelityStatus;
  score: number;
  preservedText: string[];
  selectableText: boolean;
  items: ExportFidelityItem[];
  fontSubstitutions: Array<{
    requested: string;
    used: string;
    pageId?: string;
    elementId?: string;
  }>;
  approximatedShapes: number;
  rasterizedEffects: number;
  imageChanges: number;
  chartApproximations: number;
  tableChanges: number;
  unsupportedProperties: string[];
  warnings: ExportWarning[];
  blockedItems: ExportBlocker[];
  chartData?: Array<{
    elementId: string;
    chartType: string;
    labels: string[];
    data: number[];
    title?: string;
  }>;
}

export interface ExportMetadata {
  projectId?: string;
  workspaceId?: string;
  clientId?: string;
  templateFamilyRecordId?: string;
  templateVersionId?: string;
  generatorVersion?: string;
  exportEngineVersion: string;
  exportedAt: string;
  copyCheckStatus?: "pass" | "fail" | "skipped";
  fitStatus?: "pass" | "unresolved" | "skipped";
  qualityStatus?: string;
  exportFidelityStatus?: ExportFidelityStatus;
}

export interface ExportOutput {
  filename: string;
  mimeType: "application/pdf";
  sizeBytes?: number;
  url?: string;
  blob?: Blob;
  bytes?: Uint8Array;
  path?: string;
}

export interface ExportJob {
  id: string;
  version: "1.0";
  sourceDesignSpecId: string;
  projectId?: string;
  workspaceId?: string;
  clientId?: string;
  format: ExportFormat;
  status: ExportJobStatus;
  options: PdfExportOptions;
  preflight?: ExportPreflightReport;
  fidelity?: ExportFidelityReport;
  metadata?: ExportMetadata;
  output?: ExportOutput;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface NativeExportInput {
  spec?: DesignSpec;
  project?: Project;
  graph?: ContentGraph;
  fitReport?: DocumentFitReport;
  options?: Partial<PdfExportOptions>;
  user?: WorkspaceActor | null;
  workspace?: WorkspaceRecord | null;
  client?: ClientRecord | null;
  clientName?: string;
  projectName?: string;
  now?: string;
  qualityStatus?: string;
}

export const DEFAULT_PDF_OPTIONS: Required<
  Omit<PdfExportOptions, "pageRange">
> & { pageRange: PdfPageRange } = {
  pageRange: "all",
  quality: "standard",
  includeMetadata: true,
  rasterizeUnsupportedEffects: false,
  preserveSelectableText: true,
  embedImages: true,
  includeBleed: false,
  includeCropMarks: false,
};
