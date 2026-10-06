import test from "node:test";
import assert from "node:assert/strict";
import {
  contentGraphFromManuscript,
  validateContentGraphCoverage,
} from "../src/domain/content/index.js";
import {
  FORMA_EDITORIAL_REPORT,
  validateTemplateFamily,
  instantiateDesignSpec,
  type TemplateFamily,
} from "../src/domain/template-family/index.js";
import {
  validateDesignPlan,
  planDesignDeterministically,
  type DesignPlan,
} from "../src/domain/design-plan/index.js";
import {
  validateDesignSpec,
  validateDesignSpecCopyCoverage,
  type DesignSpec,
} from "../src/domain/design-spec/index.js";
import {
  measureTextElement,
  evaluatePageFit,
  repairPageFit,
  repairDocumentFit,
} from "../src/domain/layout-fit/index.js";
import {
  evaluatePageVisuals,
  applyCorrectionToPage,
  applyBoundedCorrections,
  runDesignIterationLoop,
  renderPageToSvg,
} from "../src/domain/visual-critic/index.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "./fixtures/corporateReportManuscript.js";

// ===================================================
// 1. TEMPLATE FAMILY TESTS
// ===================================================

test("TemplateFamily schema validation passes for Forma Editorial Report", () => {
  const result = validateTemplateFamily(FORMA_EDITORIAL_REPORT);
  assert.equal(result.valid, true);
  assert.equal(result.issues.length, 0);
  assert.equal(FORMA_EDITORIAL_REPORT.layouts.length >= 10, true);
});

test("TemplateFamily rejects duplicate layout IDs, bad slot references, and invalid geometry", () => {
  const badFamily: TemplateFamily = {
    ...FORMA_EDITORIAL_REPORT,
    layouts: [
      {
        id: "duplicate-id",
        name: "Layout 1",
        role: "content",
        slots: [
          {
            id: "slot1",
            accepts: ["paragraph"],
          },
        ],
        baseElements: [
          {
            id: "el-bad-slot",
            type: "text",
            slotId: "nonexistent-slot", // bad slot reference
            x: 50,
            y: 50,
            width: 200,
            height: -10, // negative geometry
          },
        ],
      },
      {
        id: "duplicate-id", // duplicate layout id
        name: "Layout 2",
        role: "content",
        slots: [
          {
            id: "slot1",
            accepts: ["unsupported_unknown_type" as any], // unsupported content type
          },
        ],
        baseElements: [],
      },
    ],
  };

  const result = validateTemplateFamily(badFamily);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.type === "duplicate_layout_id"));
  assert.ok(result.issues.some((i) => i.type === "invalid_slot_reference"));
  assert.ok(result.issues.some((i) => i.type === "invalid_geometry"));
  assert.ok(result.issues.some((i) => i.type === "unsupported_content_type"));
});

// ===================================================
// 2. DESIGN PLAN TESTS
// ===================================================

test("DesignPlan validation passes for deterministic plan from manuscript", () => {
  const graph = contentGraphFromManuscript(
    "Title: Annual Energy Review\n\nParagraph: Clean electricity production expanded by 24% year-over-year.",
  );
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
  const result = validateDesignPlan(plan, FORMA_EDITORIAL_REPORT, graph);
  assert.equal(result.valid, true);
  assert.equal(result.issues.length, 0);
});

test("DesignPlan validation rejects unknown layout, unknown slot, and missing required slots", () => {
  const graph = contentGraphFromManuscript(
    "Title: Q3 Report\n\nParagraph: Revenue was $40M.",
  );
  const badPlan: DesignPlan = {
    version: "1.0",
    id: "bad-plan-1",
    contentGraphId: graph.id,
    templateFamilyId: FORMA_EDITORIAL_REPORT.id,
    pages: [
      {
        id: "page-1",
        order: 1,
        role: "cover",
        layoutId: "nonexistent-layout", // unknown layout
        assignments: [],
      },
      {
        id: "page-2",
        order: 2,
        role: "content",
        layoutId: "heading-body", // required 'heading' slot missing
        assignments: [
          {
            slotId: "nonexistent-slot", // unknown slot
            contentNodeIds: [graph.nodes[0].id],
            sourceSpanIds: [],
          },
        ],
      },
    ],
  };

  const result = validateDesignPlan(badPlan, FORMA_EDITORIAL_REPORT, graph);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.type === "unknown_layout"));
  assert.ok(result.issues.some((i) => i.type === "unknown_slot"));
  assert.ok(result.issues.some((i) => i.type === "missing_required_slot"));
});

test("DesignPlan validation detects unassigned required content and duplicate assignments", () => {
  const graph = contentGraphFromManuscript(
    "Title: First Topic\n\nParagraph: Critical unassigned copy.",
  );
  const headingNode = graph.nodes.find((n) => n.type === "heading")!;
  const paraNode = graph.nodes.find((n) => n.type === "paragraph")!;

  const planWithDupes: DesignPlan = {
    version: "1.0",
    id: "plan-dupes",
    contentGraphId: graph.id,
    templateFamilyId: FORMA_EDITORIAL_REPORT.id,
    pages: [
      {
        id: "page-1",
        order: 1,
        role: "content",
        layoutId: "heading-body",
        assignments: [
          {
            slotId: "heading",
            contentNodeIds: [headingNode.id],
            sourceSpanIds: headingNode.sourceSpanIds,
          },
          {
            slotId: "body",
            contentNodeIds: [headingNode.id], // duplicate assignment of headingNode
            sourceSpanIds: headingNode.sourceSpanIds,
          },
        ],
      },
    ],
  };

  const result = validateDesignPlan(
    planWithDupes,
    FORMA_EDITORIAL_REPORT,
    graph,
  );
  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some((i) => i.type === "duplicate_content_assignment"),
  );
  assert.ok(
    result.issues.some((i) => i.type === "unassigned_required_content"),
  );
});

// ===================================================
// 3. INSTANTIATION & EXACT COPY TESTS
// ===================================================

test("Deterministic Template Resolver creates valid DesignSpec with preserved exact copy", () => {
  const manuscript =
    "Title: Sustainable Mobility 2026\n\nParagraph: Electric transport fleets reduced operating emissions across major urban corridors.";
  const graph = contentGraphFromManuscript(manuscript);
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);

  const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);
  const specValidation = validateDesignSpec(spec);
  assert.equal(specValidation.valid, true);

  const copyResult = validateDesignSpecCopyCoverage(graph, spec);
  assert.equal(copyResult.valid, true);
  assert.equal(copyResult.issues.length, 0);

  // Check typography tokens applied
  const titleEl = spec.pages[0].elements.find(
    (e) =>
      e.type === "text" && (e as any).text.includes("Sustainable Mobility"),
  );
  assert.ok(titleEl);
  assert.equal((titleEl as any).fontFamily, "Playfair Display");
});

test("Altered numbers in visible elements trigger Exact Copy failure", () => {
  const manuscript =
    "Title: Budget\n\nParagraph: Total allocation is $45,000,000 for expansion.";
  const graph = contentGraphFromManuscript(manuscript);
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
  const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);

  // Intentionally mutate text
  const paraEl = spec.pages[0].elements.find(
    (e) => e.type === "text" && (e as any).text.includes("$45,000,000"),
  ) as any;
  assert.ok(paraEl);
  paraEl.text = "Total allocation is $50,000,000 for expansion."; // Changed number!

  const copyResult = validateDesignSpecCopyCoverage(graph, spec);
  assert.equal(copyResult.valid, false);
  assert.ok(copyResult.issues.some((i) => i.type === "altered_copy"));
});

// ===================================================
// 4. FIT ENGINE TESTS
// ===================================================

test("Fit Engine measures text and successfully applies bounded font scale repair for overflowing text", () => {
  const layout = FORMA_EDITORIAL_REPORT.layouts.find(
    (l) => l.id === "heading-body",
  )!;
  const longText =
    "This is an exceptionally extensive headline that cannot possibly fit on one single line at thirty points and must be adjusted gracefully.";

  const testPage = {
    id: "test-fit-page",
    name: "Fit Test",
    width: 612,
    height: 792,
    elementIds: ["test-fit-page:hb-heading"],
    elements: [
      {
        id: "test-fit-page:hb-heading",
        type: "text" as const,
        x: 54,
        y: 72,
        width: 300,
        height: 60, // constrained height causes overflow at 24pt (201.6pt), resolved at 14pt (58.8pt)
        fontSize: 24,
        fontFamily: "Playfair Display",
        text: longText,
        constraints: {
          minFontSize: 14,
          maxFontSize: 28,
          allowResize: false,
        },
      },
    ],
  };

  const initialReport = evaluatePageFit(testPage, layout);
  assert.equal(initialReport.resolved, false);
  assert.equal(initialReport.measurements[0].overflow, true);

  const {
    page: repairedPage,
    actions,
    resolved,
  } = repairPageFit(testPage, layout, 792, 54);
  assert.equal(resolved, true);
  assert.ok(actions.some((a) => a.type === "scale_font" && a.applied));

  const postEl = repairedPage.elements[0] as any;
  assert.ok(postEl.fontSize < 24);
  assert.ok(postEl.fontSize >= 14);
});

test("Fit Engine flags unresolved overflow when content exceeds constraints", () => {
  const layout = FORMA_EDITORIAL_REPORT.layouts.find(
    (l) => l.id === "heading-body",
  )!;
  const giantText = "Word ".repeat(600); // 3000 words cannot fit in 40pt box at minFontSize 12

  const testPage = {
    id: "test-overflow-page",
    name: "Overflow Test",
    width: 612,
    height: 792,
    elementIds: ["test-overflow-page:hb-heading"],
    elements: [
      {
        id: "test-overflow-page:hb-heading",
        type: "text" as const,
        x: 54,
        y: 72,
        width: 200,
        height: 40,
        fontSize: 14,
        fontFamily: "Inter",
        text: giantText,
        constraints: {
          minFontSize: 12,
          maxFontSize: 16,
          allowResize: false,
        },
      },
    ],
  };

  const { resolved, actions } = repairPageFit(testPage, layout, 792, 54);
  assert.equal(resolved, false);
  assert.ok(actions.some((a) => a.type === "unresolved_overflow"));
});

// ===================================================
// 5. VISUAL CRITIC & BOUNDED CORRECTIONS TESTS
// ===================================================

test("Visual Critic evaluates hierarchy and returns bounded correction action", () => {
  const page = {
    id: "vis-page",
    width: 612,
    height: 792,
    elementIds: ["heading-1", "body-1"],
    elements: [
      {
        id: "heading-1",
        type: "text" as const,
        x: 54,
        y: 72,
        width: 504,
        height: 60,
        fontSize: 13, // Weak heading size compared to body 12
        fontFamily: "Inter",
        text: "Low Contrast Heading",
      },
      {
        id: "body-1",
        type: "text" as const,
        x: 54,
        y: 150,
        width: 504,
        height: 200,
        fontSize: 12,
        fontFamily: "Inter",
        text: "Standard editorial body text paragraph.",
      },
    ],
  };

  const report = evaluatePageVisuals(page, FORMA_EDITORIAL_REPORT);
  assert.ok(report.scores.overall > 0);
  assert.ok(report.issues.some((i) => i.type === "weak_hierarchy"));
  const rec = report.issues.find(
    (i) => i.type === "weak_hierarchy",
  )?.recommendedAction;
  assert.ok(rec);
  assert.equal(rec?.type, "increase_text_scale");
});

test("Bounded corrections reject invalid element IDs and actions causing overflow", () => {
  const layout = FORMA_EDITORIAL_REPORT.layouts.find(
    (l) => l.id === "heading-body",
  )!;
  const page = {
    id: "page-1",
    width: 612,
    height: 792,
    elementIds: ["hb-title"],
    elements: [
      {
        id: "hb-title",
        type: "text" as const,
        x: 54,
        y: 72,
        width: 504,
        height: 40,
        fontSize: 22,
        fontFamily: "Inter",
        text: "Heading that tightly fills forty points height.",
        constraints: { minFontSize: 16, maxFontSize: 24 },
      },
    ],
  };

  // Action on non-existent element
  const badAction = applyCorrectionToPage(
    page,
    {
      type: "increase_text_scale",
      pageId: "page-1",
      elementId: "non-existent-element",
      amount: 4,
    },
    layout,
  );
  assert.equal(badAction.applied, false);
  assert.ok(badAction.reason?.includes("not found"));

  // Action causing overflow
  const overflowAction = applyCorrectionToPage(
    page,
    {
      type: "increase_text_scale",
      pageId: "page-1",
      elementId: "hb-title",
      amount: 10, // push past max constraint
    },
    layout,
  );
  assert.equal(overflowAction.applied, false);
});

// ===================================================
// 6. PRIMARY ACCEPTANCE FIXTURE PIPELINE TEST
// ===================================================

test("Primary Acceptance Fixture runs end-to-end multi-page report pipeline", async () => {
  const result = await runAiDesignerPipeline(CORPORATE_REPORT_MANUSCRIPT, {
    family: FORMA_EDITORIAL_REPORT,
    maxCriticIterations: 2,
  });

  // 1. Success check
  assert.equal(
    result.success,
    true,
    `Pipeline errors: ${result.errors.join("; ")}`,
  );
  assert.equal(result.errors.length, 0);

  // 2. Multi-page document created (between 6 and 10 pages)
  assert.ok(
    result.finalSpec.pages.length >= 6 && result.finalSpec.pages.length <= 10,
    `Expected 6-10 pages, got ${result.finalSpec.pages.length}`,
  );

  // 3. ContentGraph provenance verified
  assert.equal(validateContentGraphCoverage(result.graph).valid, true);

  // 4. DesignPlan verified
  const planVal = validateDesignPlan(
    result.plan,
    FORMA_EDITORIAL_REPORT,
    result.graph,
  );
  assert.equal(planVal.valid, true);

  // 5. Layout selection includes cover, stats, table, quote, content, and closing
  const usedLayouts = new Set(
    result.finalSpec.pages.map((p) => p.metadata?.layoutId),
  );
  assert.ok(usedLayouts.has("cover"), "Missing cover layout");
  assert.ok(
    usedLayouts.has("three-stat") || usedLayouts.has("four-stat"),
    "Missing stats layout",
  );
  assert.ok(usedLayouts.has("quote-feature"), "Missing quote layout");
  assert.ok(usedLayouts.has("table-page"), "Missing table layout");
  assert.ok(usedLayouts.has("heading-body"), "Missing content layout");
  assert.ok(usedLayouts.has("closing"), "Missing closing layout");

  // 6. DesignSpec validation passes
  const specVal = validateDesignSpec(result.finalSpec);
  assert.equal(specVal.valid, true);

  // 7. Exact Copy coverage passes with zero missing, duplicated, or altered copy
  const copyVal = validateDesignSpecCopyCoverage(
    result.graph,
    result.finalSpec,
  );
  assert.equal(copyVal.valid, true);
  assert.equal(copyVal.issues.length, 0);

  // 8. Visual Critic executed and rendered SVG snapshots exist for all pages
  assert.equal(result.pageSvgs.length, result.finalSpec.pages.length);
  for (const svg of result.pageSvgs) {
    assert.ok(svg.startsWith("<svg"));
    assert.ok(svg.endsWith("</svg>"));
  }
  assert.ok(result.iterationReport.finalQualityScore >= 80);

  // 9. Editable Project generated with FlowDocument for live editor
  assert.equal(result.project.family, "document");
  assert.ok(result.project.flow);
  assert.equal(result.project.flow.pages.length, result.finalSpec.pages.length);

  // 10. Generation provenance persisted
  assert.equal(result.provenance.generatorVersion, "forma-pipeline-v2b");
  assert.ok(result.provenance.contentHash);
  assert.ok(result.provenance.generatedAt);

  // 11. DesignSpec-to-editor projection measured and trustworthy
  assert.notEqual(result.projectionFidelity.overall, "unsafe");
  assert.ok(result.projectionFidelity.score > 0);
  assert.equal(result.exportConsistency.valid, true);
  assert.equal(result.deliverableQuality.trusted, true);
  assert.equal(result.deliverableQuality.status, "quality_trusted");

  // 12. Continuation pagination reported (applied or cleanly not required)
  assert.equal(typeof result.continuation.applied, "boolean");
  assert.equal(result.continuation.unresolvedCount, 0);

  // 13. AI visual critic influence is off by default and reported
  assert.equal(result.aiCritic.enabled, false);
  assert.equal(result.aiCritic.source, "deterministic");
});
