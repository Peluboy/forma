import test from "node:test";
import assert from "node:assert/strict";
import { contentGraphFromManuscript } from "../src/domain/content/index.js";
import type { ContentGraph } from "../src/domain/content/types.js";
import {
  FORMA_EDITORIAL_REPORT,
  instantiateDesignSpec,
} from "../src/domain/template-family/index.js";
import { planDesignDeterministically } from "../src/domain/design-plan/index.js";
import {
  validateDesignSpecCopyCoverage,
  projectDesignSpecToFlowDocument,
  checkEditorExportConsistency,
  buildFidelityReport,
  makeFidelityItem,
  type DesignSpec,
  type FidelityItem,
} from "../src/domain/design-spec/index.js";
import { applyContinuationPagination } from "../src/domain/layout-fit/index.js";
import { assessDeliverableQuality } from "../src/domain/design-quality/trustGate.js";
import { validateAiVisualIssues } from "../src/domain/design-quality/aiCritic.js";
import {
  parseHumanReviews,
  summarizeHumanReviews,
} from "../src/domain/design-quality/humanReview.js";

// ===================================================
// HELPERS
// ===================================================

function preservedItem(overrides: Partial<FidelityItem> = {}): FidelityItem {
  return {
    ...makeFidelityItem({
      kind: "text",
      pageId: "page-1",
      elementId: "el-1",
      property: "text",
      impact: "preserved",
      userImpact: "preserved",
    }),
    ...overrides,
  };
}

/**
 * A template family whose continuation layouts use a compact text box, so a
 * short unit fixture can exercise the splitter without a multi-page manuscript.
 */
function compactContinuationFamily() {
  return {
    ...FORMA_EDITORIAL_REPORT,
    layouts: FORMA_EDITORIAL_REPORT.layouts.map((layout) => {
      if (layout.id === "text-continuation")
        return {
          ...layout,
          baseElements: layout.baseElements.map((element) =>
            element.type === "text"
              ? { ...element, width: 200, height: 40 }
              : element,
          ),
        };
      if (layout.id === "table-continuation")
        return {
          ...layout,
          baseElements: layout.baseElements.map((element) =>
            element.type === "table"
              ? { ...element, width: 504, height: 90 }
              : element,
          ),
        };
      return layout;
    }),
  };
}

function cellSpanIds(graph: ContentGraph, text: string): string[] {
  const span = graph.spans.find(
    (item) => item.role === "content" && item.text === text,
  );
  return span ? [span.id] : [];
}

// ===================================================
// PART B/C: FIDELITY MODEL
// ===================================================

test("Fidelity report promotes copy-affecting loss to a blocker and marks output unsafe", () => {
  const report = buildFidelityReport({
    sourceSpecId: "spec-1",
    projectedProjectId: "proj-1",
    items: [
      preservedItem(),
      makeFidelityItem({
        kind: "text",
        pageId: "page-2",
        elementId: "el-2",
        property: "sourceSpanIds",
        impact: "copy_affecting",
        userImpact: "Visible text lost its manuscript provenance.",
      }),
    ],
  });
  assert.equal(report.overall, "unsafe");
  assert.equal(
    report.blockers.some((b) => b.code === "copy_loss"),
    true,
  );
  assert.equal(report.counts.lost, 1);
  assert.equal(report.counts.blockers, 1);
});

test("Harmless and acceptable approximations stay transformed, never blocking", () => {
  const report = buildFidelityReport({
    sourceSpecId: "spec-1",
    projectedProjectId: "proj-1",
    items: [
      preservedItem(),
      makeFidelityItem({
        kind: "typography",
        pageId: "page-1",
        elementId: "el-1",
        property: "fontFamily",
        impact: "acceptable_approximation",
        userImpact: "Font approximated to Arial.",
      }),
      makeFidelityItem({
        kind: "shape",
        pageId: "page-1",
        elementId: "el-shape",
        property: "shape",
        impact: "harmless_transformation",
        userImpact: "Polygon rendered as rectangle.",
      }),
    ],
  });
  assert.notEqual(report.overall, "unsafe");
  assert.equal(report.blockers.length, 0);
  assert.equal(report.counts.transformed, 2);
});

// ===================================================
// PART D–K: PROJECTION + EXPORT CONSISTENCY
// ===================================================

test("DesignSpec projects into an editable FlowDocument with preserved text and provenance", () => {
  const manuscript =
    "Title: Project Atlas\n\nParagraph: The programme reduced operating emissions across every corridor.\n\nParagraph: A second paragraph keeps the document multi-section.";
  const graph = contentGraphFromManuscript(manuscript);
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
  const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);

  const { project, fidelity } = projectDesignSpecToFlowDocument(
    spec,
    manuscript,
  );
  assert.ok(project.flow);
  assert.notEqual(fidelity.overall, "unsafe");
  assert.equal(fidelity.blockers.length, 0);

  const flowText = project
    .flow!.pages.flatMap((page) => page.elements)
    .filter((element) => element.type === "text");
  assert.ok(flowText.length > 0);
  const withSpans = flowText.filter(
    (element) => (element.sourceSpanIds?.length ?? 0) > 0,
  );
  assert.ok(withSpans.length > 0, "expected projected text to carry spans");

  const consistency = checkEditorExportConsistency(spec, project);
  assert.equal(consistency.valid, true);
  assert.equal(consistency.missingText.length, 0);
});

test("Unknown DesignSpec fonts are approximated and reported, not silently dropped", () => {
  const manuscript =
    "Title: Font Audit\n\nParagraph: Typography substitution must be visible.";
  const graph = contentGraphFromManuscript(manuscript);
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
  const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);
  const title = spec.pages[0].elements.find(
    (element) => element.type === "text" && element.text.includes("Font Audit"),
  );
  assert.ok(title && title.type === "text");
  (title as { fontFamily: string }).fontFamily = "Helvetica Neue";

  const { project, fidelity } = projectDesignSpecToFlowDocument(
    spec,
    manuscript,
  );
  const item = fidelity.transformed.find(
    (entry) => entry.property === "fontFamily",
  );
  assert.ok(item, "expected a font approximation fidelity item");
  assert.equal(item.impact, "acceptable_approximation");
  const projected = project
    .flow!.pages.flatMap((page) => page.elements)
    .find(
      (element) => element.type === "text" && element.fontFamily === "Arial",
    );
  assert.ok(projected, "expected the approximated frame to render in Arial");
});

test("Export consistency detects a text block removed from the projected document", () => {
  const manuscript =
    "Title: Export Audit\n\nParagraph: Every visible sentence must survive projection.";
  const graph = contentGraphFromManuscript(manuscript);
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
  const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);
  const { project } = projectDesignSpecToFlowDocument(spec, manuscript);
  assert.ok(project.flow && project.flow.content.length > 0);

  // Drop the last content block to simulate a projection regression.
  const broken = structuredClone(project);
  broken.flow!.content = broken.flow!.content.slice(0, -1);
  const consistency = checkEditorExportConsistency(spec, broken);
  assert.equal(consistency.valid, false);
  assert.ok(consistency.missingText.length > 0);
  assert.ok(consistency.blockers.some((b) => b.code === "export_text_missing"));
});

// ===================================================
// PART L: TRUST GATE
// ===================================================

test("Trust gate only presents a DesignSpec score when projection fidelity agrees", () => {
  const high = buildFidelityReport({
    sourceSpecId: "s",
    projectedProjectId: "p",
    items: [preservedItem(), preservedItem()],
  });
  const trusted = assessDeliverableQuality(92, high);
  assert.equal(trusted.status, "quality_trusted");
  assert.equal(trusted.trusted, true);

  const approximated = buildFidelityReport({
    sourceSpecId: "s",
    projectedProjectId: "p",
    items: [
      preservedItem(),
      ...Array.from({ length: 4 }, (_, index) =>
        makeFidelityItem({
          kind: "text",
          pageId: "page-1",
          elementId: `el-approx-${index}`,
          property: "fontFamily",
          impact: "acceptable_approximation",
          userImpact: "Font approximated.",
        }),
      ),
    ],
  });
  assert.equal(approximated.overall, "medium");
  const approx = assessDeliverableQuality(92, approximated);
  assert.equal(approx.status, "quality_approximated");
  assert.equal(approx.trusted, true);

  const unsafe = buildFidelityReport({
    sourceSpecId: "s",
    projectedProjectId: "p",
    items: [
      makeFidelityItem({
        kind: "text",
        pageId: "page-1",
        elementId: "el-1",
        property: "sourceSpanIds",
        impact: "copy_affecting",
        userImpact: "Text lost provenance.",
      }),
    ],
  });
  const loss = assessDeliverableQuality(99, unsafe);
  assert.equal(loss.status, "editor_projection_loss_detected");
  assert.equal(loss.trusted, false);
});

// ===================================================
// PART M: CONTINUATION PAGINATION
// ===================================================

test("Oversized text splits into a continuation page without splitting a source span", () => {
  const manuscript =
    "First approved line of body copy that continues across the frame boundary.\n\n" +
    "Second approved line of body copy that also continues across the frame boundary.";
  const graph = contentGraphFromManuscript(manuscript);
  const contentSpans = graph.spans.filter((span) => span.role === "content");
  assert.equal(contentSpans.length, 2);

  const body: DesignSpec = {
    version: "1.0",
    id: "cont-spec",
    name: "Continuation fixture",
    family: "document",
    copyPolicy: "exact",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        role: "content",
        width: 612,
        height: 792,
        elementIds: ["body-1"],
        elements: [
          {
            id: "body-1",
            type: "text",
            x: 54,
            y: 72,
            width: 200,
            height: 40,
            fontFamily: "Inter",
            fontSize: 12,
            text: contentSpans.map((span) => span.text).join("\n"),
            sourceSpanIds: contentSpans.map((span) => span.id),
          },
        ],
      },
    ],
  };

  const family = compactContinuationFamily();
  const { spec, report } = applyContinuationPagination(body, family, graph, {
    maxContinuationPages: 4,
  });

  assert.equal(report.applied, true);
  assert.equal(report.continuationPageCount, 1);
  assert.equal(report.unresolvedCount, 0);
  assert.equal(spec.pages.length, 2);
  assert.equal(report.splits[0].kind, "text");
  assert.equal(report.splits[0].spansMoved, 1);

  // No source span is duplicated and coverage is still exact.
  const coverage = validateDesignSpecCopyCoverage(graph, spec);
  assert.equal(coverage.valid, true, JSON.stringify(coverage.issues));

  const first = spec.pages[0].elements[0];
  const second = spec.pages[1].elements[0];
  assert.equal(first.type, "text");
  assert.equal(second.type, "text");
  const firstSpans = new Set(
    (first as { sourceSpanIds?: string[] }).sourceSpanIds ?? [],
  );
  const secondSpans =
    (second as { sourceSpanIds?: string[] }).sourceSpanIds ?? [];
  assert.equal(firstSpans.size, 1);
  assert.equal(secondSpans.length, 1);
  assert.equal(
    [...firstSpans].some((id) => secondSpans.includes(id)),
    false,
  );
});

test("Oversized tables split by rows across continuation pages and keep exact copy", () => {
  const manuscript = [
    "| Metric | Reading |",
    "| --- | --- |",
    "| Reach | 12400 |",
    "| Signups | 860 |",
    "| Churn | 42 |",
    "| Notes | Stable |",
    "| Adjusted | 12 |",
  ].join("\n");
  const graph = contentGraphFromManuscript(manuscript);

  const header = [
    { text: "Metric", sourceSpanIds: cellSpanIds(graph, "Metric") },
    { text: "Reading", sourceSpanIds: cellSpanIds(graph, "Reading") },
  ];
  const bodyRows = [
    ["Reach", "12400"],
    ["Signups", "860"],
    ["Churn", "42"],
    ["Notes", "Stable"],
    ["Adjusted", "12"],
  ].map(([a, b]) => [
    { text: a, sourceSpanIds: cellSpanIds(graph, a) },
    { text: b, sourceSpanIds: cellSpanIds(graph, b) },
  ]);

  const body: DesignSpec = {
    version: "1.0",
    id: "table-cont-spec",
    name: "Table continuation fixture",
    family: "document",
    copyPolicy: "exact",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        role: "table",
        width: 612,
        height: 792,
        elementIds: ["table-1"],
        elements: [
          {
            id: "table-1",
            type: "table",
            x: 54,
            y: 72,
            width: 504,
            height: 90,
            columns: 2,
            headerRows: 1,
            rows: [header, ...bodyRows],
          },
        ],
      },
    ],
  };

  const family = compactContinuationFamily();
  const { spec, report } = applyContinuationPagination(body, family, graph, {
    maxContinuationPages: 4,
  });

  assert.equal(report.applied, true);
  assert.equal(report.splits[0].kind, "table");
  assert.ok(report.continuationPageCount >= 1);
  assert.equal(spec.pages.length, report.continuationPageCount + 1);

  const coverage = validateDesignSpecCopyCoverage(graph, spec);
  assert.equal(coverage.valid, true, JSON.stringify(coverage.issues));
});

// ===================================================
// PART O: AI VISUAL CRITIC INFLUENCE
// ===================================================

test("AI visual issues are rejected when disabled or referencing unknown ids", () => {
  const manuscript =
    "Title: AI Gate\n\nParagraph: Deterministic review remains authoritative.";
  const graph = contentGraphFromManuscript(manuscript);
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
  const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);

  const disabled = validateAiVisualIssues(
    spec,
    [
      {
        type: "weak_hierarchy",
        severity: "high",
        pageId: spec.pages[0].id,
        message: "x",
      },
    ],
    { enabled: false },
  );
  assert.equal(disabled.accepted.length, 0);
  assert.equal(disabled.rejected.length, 1);

  const unknownPage = validateAiVisualIssues(
    spec,
    [
      {
        type: "weak_hierarchy",
        severity: "high",
        pageId: "does-not-exist",
        message: "x",
      },
    ],
    { enabled: true },
  );
  assert.equal(unknownPage.accepted.length, 0);
  assert.ok(unknownPage.rejected[0].reason.includes("page id"));

  const valid = validateAiVisualIssues(
    spec,
    [
      {
        type: "insufficient_whitespace",
        severity: "high",
        pageId: spec.pages[0].id,
        elementIds: [spec.pages[0].elements[0].id],
        message: "Too tight near the heading.",
        confidence: "high",
      },
    ],
    { enabled: true },
  );
  assert.equal(valid.accepted.length, 1);
  assert.equal(valid.accepted[0].source, "ai_visual");
});

// ===================================================
// PART N: HUMAN REVIEW CALIBRATION
// ===================================================

test("Human review summary computes calibration, complaints, and false positives", () => {
  const reviews = parseHumanReviews([
    {
      caseId: "case-1",
      reviewer: "ana",
      acceptable: true,
      rating: 5,
      verdict: "acceptable",
      notes: "Strong hierarchy and clean spacing.",
    },
    {
      caseId: "case-2",
      reviewer: "ben",
      acceptable: false,
      rating: 2,
      verdict: "needs_redesign",
      notes: "Whitespace is cramped and the table is crowded.",
    },
    {
      caseId: "case-3",
      reviewer: "cara",
      acceptable: true,
      rating: 4,
      verdict: "acceptable",
      notes: "Font size a touch small but readable.",
    },
  ]);

  const summary = summarizeHumanReviews(reviews, [
    { caseId: "case-1", heuristicScore: 95 },
    { caseId: "case-2", heuristicScore: 90 },
    { caseId: "case-3", heuristicScore: 60 },
  ]);

  assert.equal(summary.totalReviews, 3);
  assert.equal(summary.averageRating, 3.67);
  assert.equal(summary.percentAcceptable, 67);
  assert.equal(summary.verdictBreakdown.acceptable, 2);
  // case-2 scored 90 but was judged needs_redesign -> false positive.
  assert.equal(summary.falsePositives.length, 1);
  assert.equal(summary.falsePositives[0].caseId, "case-2");
  // case-3 scored 60 but was accepted with rating 4 -> false negative.
  assert.equal(summary.falseNegatives.length, 1);
  assert.equal(summary.falseNegatives[0].caseId, "case-3");
  assert.notEqual(summary.correlation, null);
  assert.ok(summary.mostCommonComplaints.length > 0);
});

// ===================================================
// PART T: EXTENDED ADAPTER FIDELITY & CONTINUATION TESTS
// ===================================================

test("Shapes project into FlowDocument with preserved styling and geometry", () => {
  const spec: DesignSpec = {
    version: "1.0",
    id: "shape-spec",
    name: "Shape Test",
    family: "document",
    copyPolicy: "exact",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        role: "content",
        width: 612,
        height: 792,
        elementIds: ["shape-rect", "shape-line"],
        elements: [
          {
            id: "shape-rect",
            type: "shape",
            shape: "rectangle",
            x: 40,
            y: 50,
            width: 200,
            height: 100,
            fill: { type: "solid", color: "#1e293b" },
            stroke: { type: "solid", color: "#3b82f6" },
            strokeWidth: 2,
            opacity: 0.9,
          },
          {
            id: "shape-line",
            type: "shape",
            shape: "line",
            x: 40,
            y: 180,
            width: 532,
            height: 2,
            stroke: { type: "solid", color: "#cbd5e1" },
            strokeWidth: 1,
          },
        ],
      },
    ],
  };

  const { project, fidelity } = projectDesignSpecToFlowDocument(spec, "");
  assert.ok(project.flow);
  const shapes = (project.flow.pages[0].decorations || []).filter(
    (e) => e.type === "shape",
  );
  assert.equal(shapes.length, 2);
  const rect = shapes.find((s) => s.id === "shape-rect");
  assert.ok(rect && rect.type === "shape");
  assert.equal(rect.fill, "#1e293b");
  assert.equal(rect.stroke, "#3b82f6");
  assert.equal(rect.width, 200);
  assert.equal(rect.opacity, 0.9);

  // No blocker for shapes
  assert.equal(fidelity.blockers.length, 0);
  assert.notEqual(fidelity.overall, "unsafe");
});

test("Images project into FlowDocument with fit modes, and crop emits fidelity warning", () => {
  const spec: DesignSpec = {
    version: "1.0",
    id: "img-spec",
    name: "Image Test",
    family: "document",
    copyPolicy: "exact",
    documentSize: { width: 612, height: 792, unit: "pt" },
    assets: [
      {
        id: "asset-hero",
        type: "image",
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    ],
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        role: "cover",
        width: 612,
        height: 792,
        elementIds: ["img-hero"],
        elements: [
          {
            id: "img-hero",
            type: "image",
            assetRef: "asset-hero",
            fit: "crop",
            focalPoint: { x: 0.5, y: 0.3 },
            altText: "Hero cover image",
            x: 54,
            y: 72,
            width: 504,
            height: 250,
          },
        ],
      },
    ],
  };

  const { project, fidelity } = projectDesignSpecToFlowDocument(spec, "");
  assert.ok(project.flow);
  const images = (project.flow.pages[0].decorations || []).filter(
    (e) => e.type === "image",
  );
  assert.equal(images.length, 1);
  const img = images[0];
  assert.ok(img && img.type === "image");
  assert.equal(img.assetRef, "asset-hero");
  assert.equal(img.altText, "Hero cover image");

  // Crop was recorded as an acceptable approximation, not silently dropped
  const cropItem = fidelity.transformed.find(
    (item) => item.property === "focalPoint",
  );
  assert.ok(cropItem, "Expected focal point approximation item");
  assert.equal(cropItem.impact, "acceptable_approximation");
});

test("Charts project with structured fallback and preserved metadata", () => {
  const spec: DesignSpec = {
    version: "1.0",
    id: "chart-spec",
    name: "Chart Test",
    family: "document",
    copyPolicy: "exact",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        role: "chart",
        width: 612,
        height: 792,
        elementIds: ["chart-1"],
        elements: [
          {
            id: "chart-1",
            type: "chart",
            chartType: "bar",
            title: "Quarterly Revenue",
            labels: ["Q1", "Q2", "Q3", "Q4"],
            data: [100, 120, 140, 180],
            x: 54,
            y: 72,
            width: 504,
            height: 300,
          },
        ],
      },
    ],
  };

  const { project, fidelity } = projectDesignSpecToFlowDocument(spec, "");
  assert.ok(project.flow);
  const chartEl = (project.flow.pages[0].decorations || []).find(
    (e) => e.type === "chart",
  );
  assert.ok(chartEl, "Expected chart element in flow page decorations");

  // Emits an informative fidelity warning that chart is not freeform vector editable
  assert.ok(
    fidelity.warnings.some((w) => w.code.includes("chart")),
    "Expected chart fidelity warning",
  );
});

test("Page background color is preserved in projection", () => {
  const spec: DesignSpec = {
    version: "1.0",
    id: "bg-spec",
    name: "Background Test",
    family: "document",
    copyPolicy: "exact",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        name: "Cover",
        role: "cover",
        width: 612,
        height: 792,
        background: { color: "#0f172a" },
        elementIds: [],
        elements: [],
      },
    ],
  };

  const { project, fidelity } = projectDesignSpecToFlowDocument(spec, "");
  assert.ok(project.flow);
  assert.equal(project.flow.pages[0].background, "#0f172a");
  assert.equal(fidelity.blockers.length, 0);
});

test("Lost decorative element produces a warning; lost text produces a blocker", () => {
  const decorLoss = buildFidelityReport({
    sourceSpecId: "s",
    projectedProjectId: "p",
    items: [
      preservedItem(),
      makeFidelityItem({
        kind: "shape",
        pageId: "page-1",
        elementId: "decor-1",
        property: "dropShadow",
        impact: "quality_affecting",
        severity: "low",
        userImpact: "Shadow not rendered in editor.",
      }),
    ],
  });
  assert.notEqual(decorLoss.overall, "unsafe");
  assert.equal(decorLoss.blockers.length, 0);
  const decorAssessment = assessDeliverableQuality(90, decorLoss);
  assert.equal(decorAssessment.trusted, true);

  const textLoss = buildFidelityReport({
    sourceSpecId: "s",
    projectedProjectId: "p",
    items: [
      makeFidelityItem({
        kind: "text",
        pageId: "page-1",
        elementId: "heading-1",
        property: "text",
        impact: "copy_affecting",
        severity: "critical",
        userImpact: "Heading text was dropped during projection.",
      }),
    ],
  });
  assert.equal(textLoss.overall, "unsafe");
  assert.ok(textLoss.blockers.length > 0);
  const textAssessment = assessDeliverableQuality(95, textLoss);
  assert.equal(textAssessment.trusted, false);
  assert.equal(textAssessment.status, "editor_projection_loss_detected");
});

test("Oversized lists split across continuation pages preserving exact copy and span order", () => {
  const manuscript = [
    "- Strategic milestone 1: Platform infrastructure migration completed.",
    "- Strategic milestone 2: Quality trust gating deployed to production.",
    "- Strategic milestone 3: Continuation pagination implemented for oversized elements.",
    "- Strategic milestone 4: Visual critic loop bounded and deterministic.",
  ].join("\n");
  const graph = contentGraphFromManuscript(manuscript);
  const contentSpans = graph.spans.filter((s) => s.role === "content");
  assert.equal(contentSpans.length, 4);

  const body: DesignSpec = {
    version: "1.0",
    id: "list-cont-spec",
    name: "List continuation fixture",
    family: "document",
    copyPolicy: "exact",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        role: "content",
        width: 612,
        height: 792,
        elementIds: ["list-1"],
        elements: [
          {
            id: "list-1",
            type: "text",
            x: 54,
            y: 72,
            width: 200,
            height: 40,
            fontFamily: "Inter",
            fontSize: 12,
            text: contentSpans.map((s) => s.text).join("\n"),
            sourceSpanIds: contentSpans.map((s) => s.id),
          },
        ],
      },
    ],
  };

  const family = compactContinuationFamily();
  const { spec, report } = applyContinuationPagination(body, family, graph, {
    maxContinuationPages: 4,
  });

  assert.equal(report.applied, true);
  assert.ok(spec.pages.length > 1);

  // Exact copy must be 100% valid
  const coverage = validateDesignSpecCopyCoverage(graph, spec);
  assert.equal(coverage.valid, true);

  // Verify all source spans appear in order across the pages without duplication
  const allEmittedSpans = spec.pages.flatMap((page) =>
    page.elements.flatMap((el) =>
      el.type === "text" ? (el.sourceSpanIds ?? []) : [],
    ),
  );
  assert.equal(allEmittedSpans.length, contentSpans.length);
  assert.deepEqual(
    allEmittedSpans,
    contentSpans.map((s) => s.id),
  );
});
