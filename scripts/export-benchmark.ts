import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { contentGraphFromManuscript } from "../src/domain/content/index.js";
import type { DesignSpec } from "../src/domain/design-spec/types.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import {
  addMemberToWorkspace,
  createAgencyWorkspace,
  createClientRecord,
} from "../src/domain/workspace/index.js";
import {
  isPdfBytes,
  pdfContainsText,
  runNativePdfExport,
} from "../src/domain/export/index.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "../tests/fixtures/corporateReportManuscript.js";

const flags = new Set(
  process.argv.slice(2).filter((arg) => arg.startsWith("--")),
);
const outputDirectory = flags.has("--artifacts")
  ? resolve("test-results/export-benchmark")
  : null;
if (outputDirectory) await mkdir(outputDirectory, { recursive: true });

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

type CaseResult = {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
  status?: string;
  preflight?: string;
  fidelity?: string;
  sizeBytes?: number;
};

const cases: CaseResult[] = [];

function record(result: CaseResult) {
  cases.push(result);
}

function baseSpec(partial: Partial<DesignSpec> = {}): DesignSpec {
  return {
    version: "1.0",
    id: "bench-spec",
    name: "Benchmark",
    family: "document",
    copyPolicy: "light_edit",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        background: { color: "#ffffff" },
        elementIds: ["t"],
        elements: [
          {
            id: "t",
            type: "text",
            text: "Simple report",
            x: 48,
            y: 48,
            width: 400,
            height: 40,
            fontFamily: "Helvetica",
            fontSize: 18,
          },
        ],
      },
    ],
    ...partial,
  };
}

// 1. simple report
{
  const pipeline = await runAiDesignerPipeline(CORPORATE_REPORT_MANUSCRIPT, {
    family: FORMA_EDITORIAL_REPORT,
  });
  const job = await runNativePdfExport({
    spec: pipeline.finalSpec,
    project: pipeline.project,
    graph: pipeline.graph,
    fitReport: pipeline.fitReport,
  });
  record({
    id: "case-1-simple-report",
    name: "simple report",
    passed: job.status === "completed" && isPdfBytes(job.output?.bytes),
    detail: `status=${job.status} pages=${pipeline.finalSpec.pages.length}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
    sizeBytes: job.output?.sizeBytes,
  });
}

// 2. text-heavy
{
  const spec = baseSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["body"],
        elements: [
          {
            id: "body",
            type: "text",
            text: "Paragraph copy for a dense report. ".repeat(12),
            x: 48,
            y: 48,
            width: 500,
            height: 600,
            fontFamily: "Helvetica",
            fontSize: 12,
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  record({
    id: "case-2-text-heavy",
    name: "text-heavy report",
    passed:
      job.status === "completed" &&
      Boolean(job.fidelity?.selectableText) &&
      Boolean(job.fidelity?.preservedText.length),
    detail: `selectable=${job.fidelity?.selectableText}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
    sizeBytes: job.output?.sizeBytes,
  });
}

// 3. image-heavy
{
  const spec = baseSpec({
    assets: [
      { id: "a", kind: "image", uri: TINY_PNG, mimeType: "image/png" },
      { id: "b", kind: "image", uri: TINY_PNG, mimeType: "image/png" },
    ],
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["i1", "i2"],
        elements: [
          {
            id: "i1",
            type: "image",
            x: 40,
            y: 40,
            width: 200,
            height: 120,
            assetRef: "a",
            fit: "crop",
            metadata: { role: "decorative" },
          },
          {
            id: "i2",
            type: "image",
            x: 40,
            y: 180,
            width: 200,
            height: 120,
            assetRef: "b",
            fit: "fit",
            metadata: { role: "decorative" },
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  record({
    id: "case-3-image-heavy",
    name: "image-heavy report",
    passed:
      job.status === "completed" &&
      (job.fidelity?.items.filter((item) => item.kind === "image").length ||
        0) >= 2,
    detail: `images=${job.fidelity?.items.filter((item) => item.kind === "image").length}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
    sizeBytes: job.output?.sizeBytes,
  });
}

// 4. chart-heavy
{
  const spec = baseSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["bar", "line", "pie"],
        elements: [
          {
            id: "bar",
            type: "chart",
            chartType: "bar",
            x: 40,
            y: 40,
            width: 240,
            height: 160,
            labels: ["Q1", "Q2"],
            data: [4, 8],
            title: "Bar",
          },
          {
            id: "line",
            type: "chart",
            chartType: "line",
            x: 300,
            y: 40,
            width: 240,
            height: 160,
            labels: ["Q1", "Q2"],
            data: [2, 6],
            title: "Line",
          },
          {
            id: "pie",
            type: "chart",
            chartType: "pie",
            x: 40,
            y: 220,
            width: 240,
            height: 160,
            labels: ["A", "B"],
            data: [1, 3],
            title: "Pie",
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  record({
    id: "case-4-chart-heavy",
    name: "chart-heavy report",
    passed:
      job.status === "completed" &&
      (job.fidelity?.chartData?.length || 0) === 3,
    detail: `charts=${job.fidelity?.chartData?.length}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
    sizeBytes: job.output?.sizeBytes,
  });
}

// 5. table-heavy
{
  const spec = baseSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["grid"],
        elements: [
          {
            id: "grid",
            type: "table",
            x: 48,
            y: 48,
            width: 500,
            height: 200,
            columns: 3,
            headerRows: 1,
            rows: [
              [{ text: "A" }, { text: "B" }, { text: "C" }],
              [{ text: "1" }, { text: "2" }, { text: "3" }],
              [{ text: "4" }, { text: "5" }, { text: "6" }],
            ],
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  record({
    id: "case-5-table-heavy",
    name: "table-heavy report",
    passed:
      job.status === "completed" &&
      Boolean(job.fidelity?.preservedText.includes("A")),
    detail: `status=${job.status}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
    sizeBytes: job.output?.sizeBytes,
  });
}

// 6. continuation pages
{
  const spec = baseSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["t1"],
        elements: [
          {
            id: "t1",
            type: "text",
            text: "Page one",
            x: 48,
            y: 48,
            width: 400,
            height: 30,
            fontFamily: "Helvetica",
            fontSize: 14,
          },
        ],
      },
      {
        id: "page-2",
        width: 612,
        height: 792,
        metadata: { continuation: true },
        elementIds: ["t2"],
        elements: [
          {
            id: "t2",
            type: "text",
            text: "Page two continued",
            x: 48,
            y: 48,
            width: 400,
            height: 30,
            fontFamily: "Helvetica",
            fontSize: 14,
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  record({
    id: "case-6-continuation",
    name: "continuation pages",
    passed:
      job.status === "completed" &&
      Boolean(
        job.output?.bytes && pdfContainsText(job.output.bytes, "continued"),
      ),
    detail: `pages=2`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
    sizeBytes: job.output?.sizeBytes,
  });
}

// 7. unknown font fallback
{
  const spec = baseSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["t"],
        elements: [
          {
            id: "t",
            type: "text",
            text: "Fallback still exports",
            x: 48,
            y: 48,
            width: 400,
            height: 40,
            fontFamily: "Unknown Fancy",
            fontSize: 16,
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  record({
    id: "case-7-font-fallback",
    name: "unknown font fallback",
    passed:
      job.status === "completed" &&
      (job.fidelity?.fontSubstitutions.length || 0) > 0,
    detail: `subs=${job.fidelity?.fontSubstitutions.length}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
    sizeBytes: job.output?.sizeBytes,
  });
}

// 8. missing optional image
{
  const spec = baseSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["img"],
        elements: [
          {
            id: "img",
            type: "image",
            x: 40,
            y: 40,
            width: 120,
            height: 80,
            assetRef: "gone",
            fit: "crop",
            metadata: { role: "decorative" },
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  record({
    id: "case-8-missing-optional-image",
    name: "missing optional image",
    passed:
      job.status === "completed" &&
      job.preflight?.status === "pass_with_warnings",
    detail: `preflight=${job.preflight?.status}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
    sizeBytes: job.output?.sizeBytes,
  });
}

// 9. unresolved fit blocks
{
  const spec = baseSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["t"],
        elements: [
          {
            id: "t",
            type: "text",
            text: "overflow ".repeat(60),
            x: 48,
            y: 48,
            width: 60,
            height: 16,
            fontFamily: "Helvetica",
            fontSize: 16,
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  record({
    id: "case-9-fit-warns",
    name: "unresolved fit warns and export still completes",
    passed:
      job.status === "completed" &&
      Boolean(
        job.preflight?.warnings.some((item) => item.code === "unresolved_fit"),
      ),
    detail: `status=${job.status}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
  });
}

// 10. copy failure blocks
{
  const graph = contentGraphFromManuscript(
    "Headline: Required title\n\nBody: Required body copy.",
  );
  const spec = baseSpec({
    copyPolicy: "exact",
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["t"],
        elements: [
          {
            id: "t",
            type: "text",
            text: "Unrelated",
            x: 48,
            y: 48,
            width: 400,
            height: 40,
            fontFamily: "Helvetica",
            fontSize: 16,
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec, graph });
  record({
    id: "case-10-copy-blocks",
    name: "copy failure blocks export",
    passed: job.status === "blocked",
    detail: `status=${job.status}`,
    status: job.status,
    preflight: job.preflight?.status,
    fidelity: job.fidelity?.status,
  });
}

// 11–12 workspace
{
  let workspace = createAgencyWorkspace("Agency", "owner-1", "Owner");
  workspace = addMemberToWorkspace(workspace, {
    userId: "designer-1",
    role: "designer",
    status: "active",
  });
  workspace = addMemberToWorkspace(workspace, {
    userId: "viewer-1",
    role: "viewer",
    status: "active",
  });
  const client = createClientRecord({
    workspaceId: workspace.id,
    name: "Client One",
  });
  const spec = baseSpec({
    metadata: { workspaceId: workspace.id, clientId: client.id },
  });
  const project = {
    id: "proj-ws",
    name: "Client Report",
    workspaceId: workspace.id,
    clientId: client.id,
  } as const;
  const allowed = await runNativePdfExport({
    spec,
    project: project as never,
    user: { userId: "designer-1" },
    workspace,
    client,
    clientName: client.name,
    projectName: "Client Report",
  });
  record({
    id: "case-11-workspace-allowed",
    name: "workspace/client scoped export",
    passed:
      allowed.status === "completed" &&
      allowed.metadata?.clientId === client.id,
    detail: `filename=${allowed.output?.filename}`,
    status: allowed.status,
    preflight: allowed.preflight?.status,
    fidelity: allowed.fidelity?.status,
    sizeBytes: allowed.output?.sizeBytes,
  });
  const denied = await runNativePdfExport({
    spec,
    project: project as never,
    user: { userId: "viewer-1" },
    workspace,
    client,
  });
  record({
    id: "case-12-unauthorized",
    name: "unauthorized export denied",
    passed: denied.status === "blocked",
    detail: `status=${denied.status}`,
    status: denied.status,
    preflight: denied.preflight?.status,
    fidelity: denied.fidelity?.status,
  });
}

const passed = cases.filter((item) => item.passed).length;
const blocked = cases.filter((item) => item.status === "blocked").length;
const warningCount = cases.filter(
  (item) => item.preflight === "pass_with_warnings",
).length;
const selectable = cases.filter((item) =>
  ["case-2-text-heavy", "case-1-simple-report"].includes(item.id)
    ? item.passed
    : item.passed,
).length;
const report = {
  totalCases: cases.length,
  exportSuccessRate: passed / cases.length,
  preflightPassRate:
    cases.filter(
      (item) =>
        item.preflight === "pass" || item.preflight === "pass_with_warnings",
    ).length / cases.length,
  blockedCount: blocked,
  warningCount,
  selectableTextPass: cases
    .filter((item) =>
      ["case-1-simple-report", "case-2-text-heavy"].includes(item.id),
    )
    .every((item) => item.passed),
  tableExportPass: cases.find((item) => item.id === "case-5-table-heavy")
    ?.passed,
  chartExportPass: cases.find((item) => item.id === "case-4-chart-heavy")
    ?.passed,
  imageExportPass: cases.find((item) => item.id === "case-3-image-heavy")
    ?.passed,
  fontSubstitutions: cases.find((item) => item.id === "case-7-font-fallback")
    ?.passed,
  averageExportFidelity:
    Math.round(
      (cases
        .filter((item) => typeof item.sizeBytes === "number")
        .reduce((sum, item) => {
          if (item.fidelity === "export_trusted") return sum + 100;
          if (item.fidelity === "export_with_approximations") return sum + 80;
          if (item.fidelity === "export_unverified") return sum + 50;
          return sum;
        }, 0) /
        Math.max(
          1,
          cases.filter((item) => item.status === "completed").length,
        )) *
        10,
    ) / 10,
  permissionChecks: {
    authorized: cases.find((item) => item.id === "case-11-workspace-allowed")
      ?.passed,
    unauthorized: cases.find((item) => item.id === "case-12-unauthorized")
      ?.passed,
  },
  cases,
};

if (outputDirectory) {
  await writeFile(
    resolve(outputDirectory, "summary.json"),
    JSON.stringify(report, null, 2),
  );
}

console.log(`Export benchmark: ${passed}/${cases.length} passed`);
console.log(`Blocked: ${blocked}. Warnings: ${warningCount}.`);
for (const item of cases) {
  console.log(`${item.passed ? "PASS" : "FAIL"} ${item.id} — ${item.detail}`);
}
if (passed !== cases.length) process.exitCode = 1;
