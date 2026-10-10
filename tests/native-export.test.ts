import test from "node:test";
import assert from "node:assert/strict";
import { contentGraphFromManuscript } from "../src/domain/content/index.js";
import type {
  DesignSpec,
  DesignElement,
} from "../src/domain/design-spec/types.js";
import {
  addMemberToWorkspace,
  createAgencyWorkspace,
  createClientRecord,
} from "../src/domain/workspace/index.js";
import {
  buildExportFilename,
  canExportProject,
  createExportJob,
  DEFAULT_PDF_OPTIONS,
  isPdfBytes,
  mapFontForPdf,
  normalizePdfOptions,
  pdfContainsText,
  previewNativeExport,
  describePreflightForUser,
  runExportPreflight,
  runNativePdfExport,
  sanitizeFilePart,
  transitionExportJob,
  validatePdfOptions,
} from "../src/domain/export/index.js";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function textEl(
  id: string,
  text: string,
  extra: Partial<DesignElement> = {},
): DesignElement {
  return {
    id,
    type: "text",
    text,
    x: 48,
    y: 48,
    width: 400,
    height: 48,
    fontFamily: "Helvetica",
    fontSize: 18,
    fontWeight: 600,
    color: "#111111",
    ...extra,
  } as DesignElement;
}

function makeSpec(partial: Partial<DesignSpec> = {}): DesignSpec {
  const elements = (partial.pages?.[0]?.elements as
    DesignElement[] | undefined) || [textEl("headline", "Quarterly Review")];
  return {
    version: "1.0",
    id: "spec-export-1",
    name: "Northwind Review",
    family: "document",
    copyPolicy: "light_edit",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        background: { color: "#f7f6f3" },
        elementIds: elements.map((element) => element.id),
        elements,
      },
    ],
    assets: [],
    ...partial,
    pages: partial.pages || [
      {
        id: "page-1",
        width: 612,
        height: 792,
        background: { color: "#f7f6f3" },
        elementIds: elements.map((element) => element.id),
        elements,
      },
    ],
  };
}

test("export job model: valid job, options, and status transitions", () => {
  const spec = makeSpec();
  const job = createExportJob(spec);
  assert.equal(job.version, "1.0");
  assert.equal(job.format, "pdf");
  assert.equal(job.status, "pending");
  assert.equal(job.options.preserveSelectableText, true);
  assert.equal(job.options.embedImages, true);
  assert.equal(job.options.includeMetadata, true);
  const running = transitionExportJob(job, "running");
  const done = transitionExportJob(running, "completed");
  assert.equal(done.status, "completed");
  assert.ok(done.completedAt);
  const blocked = transitionExportJob(createExportJob(spec), "blocked");
  assert.equal(blocked.status, "blocked");
  assert.throws(() => transitionExportJob(done, "running"));
  const invalid = validatePdfOptions({ quality: "ultra" as "high" });
  assert.equal(invalid.valid, false);
  const normalized = normalizePdfOptions({});
  assert.deepEqual(
    {
      preserveSelectableText: normalized.preserveSelectableText,
      embedImages: normalized.embedImages,
      includeMetadata: normalized.includeMetadata,
    },
    {
      preserveSelectableText: DEFAULT_PDF_OPTIONS.preserveSelectableText,
      embedImages: DEFAULT_PDF_OPTIONS.embedImages,
      includeMetadata: DEFAULT_PDF_OPTIONS.includeMetadata,
    },
  );
});

test("preflight: valid spec passes", () => {
  const spec = makeSpec();
  const report = runExportPreflight(spec, { spec }, normalizePdfOptions());
  assert.equal(report.status, "pass");
});

test("preflight: copy issue blocks", () => {
  const graph = contentGraphFromManuscript(
    "Headline: Secret title\n\nBody: Approved paragraph that must appear.",
  );
  const spec = makeSpec({
    copyPolicy: "exact",
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["headline"],
        elements: [textEl("headline", "Different words")],
      },
    ],
  });
  const report = runExportPreflight(
    spec,
    { spec, graph },
    normalizePdfOptions(),
  );
  assert.equal(report.status, "blocked");
  assert.ok(report.blockers.some((item) => item.code === "copy_failure"));
});

test("preflight: unresolved fit warns and export still completes", async () => {
  const spec = makeSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["overflow"],
        elements: [
          textEl("overflow", "word ".repeat(80).trim(), {
            width: 70,
            height: 18,
            fontSize: 16,
          }),
        ],
      },
    ],
  });
  const report = runExportPreflight(spec, { spec }, normalizePdfOptions());
  assert.equal(report.status, "pass_with_warnings");
  assert.ok(report.warnings.some((item) => item.code === "unresolved_fit"));
  assert.equal(report.blockers.length, 0);
  assert.ok(
    describePreflightForUser(report).includes("Some text is tight on the page"),
  );
  const job = await runNativePdfExport({ spec });
  assert.equal(job.status, "completed");
  assert.ok(job.output?.bytes && isPdfBytes(job.output.bytes));
});

test("preflight: missing required image blocks and decorative image warns", () => {
  const required = makeSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["photo"],
        elements: [
          {
            id: "photo",
            type: "image",
            x: 48,
            y: 120,
            width: 200,
            height: 120,
            assetRef: "missing-asset",
            fit: "crop",
          },
        ],
      },
    ],
  });
  const requiredReport = runExportPreflight(
    required,
    { spec: required },
    normalizePdfOptions(),
  );
  assert.equal(requiredReport.status, "blocked");
  assert.ok(
    requiredReport.blockers.some(
      (item) => item.code === "missing_required_image",
    ),
  );

  const decorative = makeSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["deco"],
        elements: [
          {
            id: "deco",
            type: "image",
            x: 48,
            y: 120,
            width: 200,
            height: 120,
            assetRef: "missing-deco",
            fit: "fit",
            metadata: { role: "decorative" },
          },
        ],
      },
    ],
  });
  const decoReport = runExportPreflight(
    decorative,
    { spec: decorative },
    normalizePdfOptions(),
  );
  assert.equal(decoReport.status, "pass_with_warnings");
  assert.ok(
    decoReport.warnings.some(
      (item) => item.code === "missing_decorative_image",
    ),
  );
});

test("preflight: unknown font warns and invalid page size blocks", () => {
  const fontSpec = makeSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["t"],
        elements: [textEl("t", "Hello", { fontFamily: "Pristina Fancy" })],
      },
    ],
  });
  const fontReport = runExportPreflight(
    fontSpec,
    { spec: fontSpec },
    normalizePdfOptions(),
  );
  assert.equal(fontReport.status, "pass_with_warnings");
  assert.ok(
    fontReport.warnings.some((item) => item.code === "font_substitution"),
  );

  const badPage = makeSpec({
    pages: [
      {
        id: "page-1",
        width: 0,
        height: 792,
        elementIds: ["t"],
        elements: [textEl("t", "Hello")],
      },
    ],
  });
  const sizeReport = runExportPreflight(
    badPage,
    { spec: badPage },
    normalizePdfOptions(),
  );
  assert.equal(sizeReport.status, "blocked");
});

test("preflight: unsupported effect warns", () => {
  const spec = makeSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["card"],
        elements: [
          {
            id: "card",
            type: "shape",
            shape: "rounded",
            x: 40,
            y: 40,
            width: 120,
            height: 80,
            fill: { color: "#0c7e61" },
            metadata: { shadow: true },
          },
        ],
      },
    ],
  });
  const report = runExportPreflight(spec, { spec }, normalizePdfOptions());
  assert.ok(report.warnings.some((item) => item.code === "unsupported_effect"));
});

test("PDF rendering: text, shapes, images, tables, charts, background", async () => {
  const spec = makeSpec({
    assets: [
      {
        id: "hero",
        kind: "image",
        uri: TINY_PNG,
        mimeType: "image/png",
        legacyInline: true,
      },
    ],
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        background: { color: "#fffaf2" },
        elementIds: ["headline", "rule", "photo", "grid", "bars"],
        elements: [
          textEl("headline", "Northwind Quarterly"),
          {
            id: "rule",
            type: "shape",
            shape: "rectangle",
            x: 48,
            y: 100,
            width: 200,
            height: 8,
            fill: { color: "#0c7e61" },
          },
          {
            id: "photo",
            type: "image",
            x: 48,
            y: 120,
            width: 160,
            height: 90,
            assetRef: "hero",
            fit: "fit",
            metadata: { role: "decorative" },
          },
          {
            id: "grid",
            type: "table",
            x: 48,
            y: 230,
            width: 400,
            height: 80,
            columns: 2,
            headerRows: 1,
            rows: [
              [{ text: "Region" }, { text: "Revenue" }],
              [{ text: "West" }, { text: "120" }],
            ],
          },
          {
            id: "bars",
            type: "chart",
            chartType: "bar",
            x: 48,
            y: 330,
            width: 400,
            height: 180,
            title: "Sales mix",
            labels: ["A", "B"],
            data: [10, 20],
          },
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  assert.equal(job.status, "completed");
  assert.ok(job.output?.bytes);
  assert.ok(isPdfBytes(job.output?.bytes));
  assert.ok(job.fidelity?.preservedText.includes("Northwind Quarterly"));
  assert.equal(job.fidelity?.selectableText, true);
  assert.ok(pdfContainsText(job.output!.bytes!, "Northwind Quarterly"));
  assert.ok(job.fidelity?.items.some((item) => item.kind === "shape"));
  assert.ok(job.fidelity?.items.some((item) => item.kind === "image"));
  assert.ok(job.fidelity?.items.some((item) => item.kind === "table"));
  assert.ok(job.fidelity?.items.some((item) => item.kind === "chart"));
  assert.ok(job.fidelity?.items.some((item) => item.kind === "page"));
});

test("charts: bar, line, pie preserve labels, values, and approximation", async () => {
  const types = ["bar", "line", "pie"] as const;
  for (const chartType of types) {
    const spec = makeSpec({
      pages: [
        {
          id: "page-1",
          width: 612,
          height: 792,
          elementIds: ["c1"],
          elements: [
            {
              id: "c1",
              type: "chart",
              chartType,
              x: 40,
              y: 40,
              width: 360,
              height: 220,
              title: `${chartType} chart`,
              labels: ["Alpha", "Beta"],
              data: [3, 7],
            },
          ],
        },
      ],
    });
    const job = await runNativePdfExport({ spec });
    assert.equal(job.status, "completed", chartType);
    assert.ok(job.fidelity?.preservedText.includes("Alpha"));
    assert.ok(job.fidelity?.preservedText.some((text) => text.includes("7")));
    assert.ok(job.fidelity?.chartData?.[0]?.data.includes(7));
    assert.ok(
      job.fidelity?.items.some(
        (item) => item.kind === "chart" && item.status === "approximated",
      ),
    );
  }
});

test("tables: header, long cell, continuation, overflow warning", async () => {
  const long = "Lengthy cell copy that should wrap inside the table cell.";
  const spec = makeSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["table-a"],
        elements: [
          {
            id: "table-a",
            type: "table",
            x: 48,
            y: 80,
            width: 500,
            height: 36,
            columns: 2,
            headerRows: 1,
            rows: [
              [{ text: "Metric" }, { text: "Value" }],
              [{ text: long }, { text: "42" }],
            ],
          },
        ],
      },
      {
        id: "page-2",
        width: 612,
        height: 792,
        metadata: { continuation: true },
        elementIds: ["table-b"],
        elements: [
          {
            id: "table-b",
            type: "table",
            x: 48,
            y: 80,
            width: 500,
            height: 60,
            columns: 2,
            headerRows: 1,
            rows: [
              [{ text: "Metric" }, { text: "Value" }],
              [{ text: "Continued row" }, { text: "99" }],
            ],
          },
        ],
      },
    ],
  });
  const preview = previewNativeExport({ spec });
  assert.ok(
    preview.job.preflight?.warnings.some(
      (item) => item.code === "table_overflow",
    ),
  );
  const job = await runNativePdfExport({ spec });
  assert.equal(job.status, "completed");
  assert.ok(job.fidelity?.preservedText.includes("Metric"));
  assert.ok(job.fidelity?.preservedText.includes("Continued row"));
  assert.ok(job.fidelity?.preservedText.includes(long));
});

test("fidelity: font substitution, missing asset, status", async () => {
  const mapped = mapFontForPdf("Inter");
  assert.equal(mapped.family, "helvetica");
  assert.equal(mapped.substituted, true);
  const unknown = mapFontForPdf("Unknown Display");
  assert.equal(unknown.family, "helvetica");
  assert.equal(unknown.substituted, true);
  assert.ok(unknown.warning);

  const spec = makeSpec({
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        elementIds: ["t"],
        elements: [
          textEl("t", "Fallback copy", { fontFamily: "Unknown Display" }),
        ],
      },
    ],
  });
  const job = await runNativePdfExport({ spec });
  assert.equal(job.status, "completed");
  assert.ok(job.fidelity?.fontSubstitutions.length);
  assert.equal(job.fidelity?.status, "export_with_approximations");
  assert.ok(job.fidelity?.preservedText.includes("Fallback copy"));
});

test("workspace: authorized export, unauthorized blocked, metadata included", async () => {
  let workspace = createAgencyWorkspace("Studio", "owner-1", "Owner");
  workspace = addMemberToWorkspace(workspace, {
    userId: "designer-1",
    name: "Dana",
    role: "designer",
    status: "active",
  });
  workspace = addMemberToWorkspace(workspace, {
    userId: "viewer-1",
    name: "Vic",
    role: "viewer",
    status: "active",
  });
  const client = createClientRecord({
    workspaceId: workspace.id,
    name: "Bloom Health",
  });
  const spec = makeSpec({
    metadata: { workspaceId: workspace.id, clientId: client.id },
  });
  const project = {
    id: "proj-1",
    name: "Q3 Report",
    workspaceId: workspace.id,
    clientId: client.id,
  } as Parameters<typeof canExportProject>[1];

  const designer = canExportProject(
    { userId: "designer-1" },
    project,
    workspace,
    client,
  );
  assert.equal(designer.allowed, true);
  const viewer = canExportProject(
    { userId: "viewer-1" },
    project,
    workspace,
    client,
  );
  assert.equal(viewer.allowed, false);
  const stranger = canExportProject(
    { userId: "stranger" },
    project,
    workspace,
    client,
  );
  assert.equal(stranger.allowed, false);

  const allowed = await runNativePdfExport({
    spec,
    project,
    user: { userId: "designer-1" },
    workspace,
    client,
    clientName: client.name,
    projectName: "Q3 Report",
  });
  assert.equal(allowed.status, "completed");
  assert.equal(allowed.workspaceId, workspace.id);
  assert.equal(allowed.clientId, client.id);
  assert.ok(allowed.output?.filename.includes("Bloom_Health"));
  assert.equal(allowed.metadata?.workspaceId, workspace.id);

  const denied = await runNativePdfExport({
    spec,
    project,
    user: { userId: "viewer-1" },
    workspace,
    client,
  });
  assert.equal(denied.status, "blocked");

  const personal = await runNativePdfExport({
    spec: makeSpec({ metadata: {} }),
    project: { id: "p2", name: "Personal" } as Parameters<
      typeof canExportProject
    >[1],
    user: { userId: "anyone" },
  });
  assert.equal(personal.status, "completed");
});

test("file naming: sanitize, truncate, fallback", () => {
  assert.equal(sanitizeFilePart("Acme/Health: Q3"), "Acme_Health_Q3");
  const long = buildExportFilename({
    clientName: "A".repeat(60),
    projectName: "B".repeat(60),
    now: "2026-10-09T12:00:00.000Z",
  });
  assert.ok(long.endsWith(".pdf"));
  assert.ok(long.length <= 84);
  const fallback = buildExportFilename({ now: "2026-10-09T12:00:00.000Z" });
  assert.match(fallback, /Export_2026-10-09\.pdf/);
});
