import type { DesignSpec } from "../design-spec/types.js";
import { buildExportFilename } from "./fileNaming.js";
import { buildExportFidelity, emptyFidelity } from "./fidelity.js";
import { collectExportMetadata } from "./metadata.js";
import { normalizePdfOptions, validatePdfOptions } from "./options.js";
import { renderDesignSpecPdf } from "./pdfRenderer.js";
import { runExportPreflight } from "./preflight.js";
import { resolveDesignSpecFromProject } from "./resolveSpec.js";
import type {
  ExportJob,
  ExportJobStatus,
  NativeExportInput,
  PdfExportOptions,
} from "./types.js";
import { EXPORT_ENGINE_VERSION } from "./types.js";

export function createExportJob(
  spec: DesignSpec,
  options?: Partial<PdfExportOptions>,
  extras?: Partial<ExportJob>,
): ExportJob {
  const now = extras?.createdAt || new Date().toISOString();
  return {
    id: extras?.id || `export-${now.replace(/[^\d]/g, "").slice(0, 14)}`,
    version: "1.0",
    sourceDesignSpecId: spec.id,
    projectId: extras?.projectId,
    workspaceId: extras?.workspaceId,
    clientId: extras?.clientId,
    format: "pdf",
    status: extras?.status || "pending",
    options: normalizePdfOptions(options),
    createdAt: now,
    error: extras?.error,
  };
}

export function transitionExportJob(
  job: ExportJob,
  status: ExportJobStatus,
  extras?: Partial<ExportJob>,
): ExportJob {
  const allowed: Record<ExportJobStatus, ExportJobStatus[]> = {
    pending: ["running", "blocked", "failed"],
    running: ["completed", "failed", "blocked"],
    completed: ["completed"],
    failed: ["failed"],
    blocked: ["blocked"],
  };
  if (!allowed[job.status].includes(status) && job.status !== status) {
    throw new Error(`Cannot move export from ${job.status} to ${status}.`);
  }
  return {
    ...job,
    ...extras,
    status,
    completedAt:
      status === "completed" || status === "failed" || status === "blocked"
        ? extras?.completedAt || new Date().toISOString()
        : job.completedAt,
  };
}

export function previewNativeExport(input: NativeExportInput): {
  spec: DesignSpec;
  job: ExportJob;
} {
  const resolved = resolveInputSpec(input);
  const options = normalizePdfOptions(input.options);
  const job = createExportJob(resolved.spec, options, {
    projectId: input.project?.id,
    workspaceId:
      input.workspace?.id ||
      input.project?.workspaceId ||
      (typeof resolved.spec.metadata?.workspaceId === "string"
        ? resolved.spec.metadata.workspaceId
        : undefined),
    clientId:
      input.client?.id ||
      input.project?.clientId ||
      (typeof resolved.spec.metadata?.clientId === "string"
        ? resolved.spec.metadata.clientId
        : undefined),
    createdAt: input.now,
  });
  const preflight = runExportPreflight(resolved.spec, input, options);
  return {
    spec: resolved.spec,
    job: {
      ...job,
      preflight,
      status: preflight.status === "blocked" ? "blocked" : job.status,
      error:
        preflight.status === "blocked"
          ? preflight.blockers[0]?.message
          : undefined,
    },
  };
}

export async function runNativePdfExport(
  input: NativeExportInput,
): Promise<ExportJob> {
  const optionCheck = validatePdfOptions(input.options);
  const resolved = resolveInputSpec(input);
  let job = createExportJob(resolved.spec, input.options, {
    projectId: input.project?.id,
    workspaceId:
      input.workspace?.id ||
      input.project?.workspaceId ||
      (typeof resolved.spec.metadata?.workspaceId === "string"
        ? resolved.spec.metadata.workspaceId
        : undefined),
    clientId:
      input.client?.id ||
      input.project?.clientId ||
      (typeof resolved.spec.metadata?.clientId === "string"
        ? resolved.spec.metadata.clientId
        : undefined),
    createdAt: input.now,
  });
  if (!optionCheck.valid) {
    return transitionExportJob(job, "failed", {
      error: optionCheck.issues.join(" "),
    });
  }
  const preflight = runExportPreflight(resolved.spec, input, job.options);
  job = { ...job, preflight, status: "running" };
  if (preflight.status === "blocked") {
    return transitionExportJob(job, "blocked", {
      fidelity: emptyFidelity("export_blocked", {
        warnings: preflight.warnings,
        blockedItems: preflight.blockers,
      }),
      error: preflight.blockers[0]?.message || "Export blocked",
    });
  }

  try {
    const metadata = collectExportMetadata(resolved.spec, input);
    metadata.copyCheckStatus = inferCopyStatus(input, preflight.status);
    metadata.fitStatus = inferFitStatus(input, preflight);
    const rendered = renderDesignSpecPdf(resolved.spec, job.options, metadata);
    const fidelity = buildExportFidelity({
      preflight,
      preservedText: rendered.preservedText,
      items: rendered.items,
      warnings: rendered.warnings,
      rasterized: rendered.rasterized,
      selectableText: rendered.selectableText,
    });
    fidelity.chartData = rendered.chartData;
    metadata.exportFidelityStatus = fidelity.status;
    metadata.exportEngineVersion = EXPORT_ENGINE_VERSION;
    const filename = buildExportFilename({
      clientName: input.clientName || input.client?.name,
      projectName:
        input.projectName || input.project?.name || resolved.spec.name,
      kind: resolved.spec.family === "document" ? "Report" : "Export",
      now: input.now || metadata.exportedAt,
    });
    const bytes = rendered.bytes;
    const blob =
      typeof Blob !== "undefined"
        ? new Blob([Uint8Array.from(bytes)], { type: "application/pdf" })
        : undefined;
    return transitionExportJob(job, "completed", {
      fidelity,
      metadata,
      output: {
        filename,
        mimeType: "application/pdf",
        sizeBytes: bytes.byteLength,
        blob,
        bytes,
      },
    });
  } catch (error) {
    return transitionExportJob(job, "failed", {
      error: error instanceof Error ? error.message : "Export failed.",
    });
  }
}

function bytesAsLatin1(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined")
    return Buffer.from(bytes).toString("latin1");
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return raw;
}

export function pdfContainsText(bytes: Uint8Array, text: string): boolean {
  const raw = bytesAsLatin1(bytes);
  if (raw.includes(text)) return true;
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  if (raw.includes(`(${escaped})`)) return true;
  const hex = Array.from(text, (char) =>
    char.charCodeAt(0).toString(16).padStart(2, "0"),
  )
    .join("")
    .toLowerCase();
  if (raw.toLowerCase().includes(hex)) return true;
  const utf16 = Array.from(text, (char) =>
    char.charCodeAt(0).toString(16).padStart(4, "0"),
  )
    .join("")
    .toLowerCase();
  return raw.toLowerCase().includes(utf16);
}

export function isPdfBytes(bytes: Uint8Array | undefined): boolean {
  if (!bytes || bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function resolveInputSpec(input: NativeExportInput): {
  spec: DesignSpec;
  warnings: string[];
} {
  if (input.spec) return { spec: input.spec, warnings: [] };
  if (!input.project) {
    throw new Error("A design is required to export.");
  }
  return resolveDesignSpecFromProject(input.project);
}

function inferCopyStatus(
  input: NativeExportInput,
  _preflightStatus: string,
): "pass" | "fail" | "skipped" {
  if (input.graph) return "pass";
  const stored = input.project?.metadata?.copyCheckStatus;
  if (stored === "fail" || stored === "pass") return stored;
  return "skipped";
}

function inferFitStatus(
  input: NativeExportInput,
  preflight: {
    blockers: Array<{ code: string }>;
    warnings: Array<{ code: string }>;
  },
): "pass" | "unresolved" | "skipped" {
  if (
    preflight.blockers.some((item) => item.code === "unresolved_fit") ||
    preflight.warnings.some((item) => item.code === "unresolved_fit")
  )
    return "unresolved";
  if (input.fitReport) return input.fitReport.valid ? "pass" : "unresolved";
  return "pass";
}
