import test from "node:test";
import assert from "node:assert/strict";
import { contentGraphFromManuscript } from "../src/domain/content/contentGraph.js";
import { validateDesignSpecCopyCoverage } from "../src/domain/design-spec/copyCoverage.js";
import { planDesignDeterministically } from "../src/domain/design-plan/artDirector.js";
import { instantiateDesignSpec } from "../src/domain/template-family/resolver.js";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import { evaluateDocumentQuality } from "../src/domain/design-quality/documentQuality.js";
import { analyzeTypography } from "../src/domain/design-quality/typography.js";
import { analyzeDocumentRhythm } from "../src/domain/design-quality/documentRhythm.js";
import { applyQualityCorrection } from "../src/domain/design-quality/correctionExecutor.js";
import { runQualityLoop } from "../src/domain/design-quality/qualityLoop.js";
import { getQualityPreset } from "../src/domain/design-quality/presets.js";
import { repairPageFit } from "../src/domain/layout-fit/engine.js";
import type { DesignPage } from "../src/domain/design-spec/types.js";
import sharp from "sharp";
import { critiqueQualityImages } from "../server/qualityCritic.js";

const family = FORMA_EDITORIAL_REPORT;
const preset = getQualityPreset("editorial_report");

function makeReport(manuscript: string) {
  const graph = contentGraphFromManuscript(manuscript);
  const plan = planDesignDeterministically(graph, family);
  return { graph, spec: instantiateDesignSpec(family, plan, graph) };
}

test("quality rubric returns bounded, weighted dimensions and document rhythm", () => {
  const { spec } = makeReport(
    "# Quality Review\n\nThis approved paragraph explains the result.",
  );
  const report = evaluateDocumentQuality(spec, family);
  assert.ok(report.overallScore >= 0 && report.overallScore <= 100);
  assert.equal(Object.keys(report.pageScores[0].score.dimensions).length, 12);
  assert.ok(report.rhythmReport.score >= 0);
});

test("fit repair preserves the input snapshot and does not expand into another content frame", () => {
  const page: DesignPage = {
    id: "fit-page",
    width: 612,
    height: 792,
    elementIds: ["body", "next"],
    elements: [
      {
        id: "body",
        type: "text",
        x: 54,
        y: 54,
        width: 300,
        height: 30,
        fontFamily: "Inter",
        fontSize: 12,
        text: "This approved paragraph is deliberately long enough to need several lines of text in its narrow frame.",
        constraints: { minFontSize: 12, allowResize: true },
      },
      {
        id: "next",
        type: "text",
        x: 54,
        y: 92,
        width: 300,
        height: 40,
        fontFamily: "Inter",
        fontSize: 12,
        text: "Following content.",
      },
    ],
  };
  const before = JSON.stringify(page);
  const result = repairPageFit(
    page,
    family.layouts.find((layout) => layout.id === "heading-body")!,
  );
  assert.equal(JSON.stringify(page), before);
  assert.equal(result.resolved, false);
  assert.equal(result.page.elements[0].height, 30);
});

test("typography catches weak hierarchy and undersized body text", () => {
  const page: DesignPage = {
    id: "p",
    width: 612,
    height: 792,
    elementIds: ["heading", "body"],
    elements: [
      {
        id: "heading",
        type: "text",
        x: 54,
        y: 54,
        width: 504,
        height: 40,
        fontFamily: "Inter",
        fontSize: 12,
        text: "Section heading",
      },
      {
        id: "body",
        type: "text",
        x: 54,
        y: 110,
        width: 504,
        height: 80,
        fontFamily: "Inter",
        fontSize: 8,
        text: "Small but approved body copy.",
      },
    ],
  };
  const result = analyzeTypography(page, preset);
  assert.ok(result.issues.some((issue) => issue.type === "small_body_text"));
  assert.ok(result.hierarchyRatio > 1);
});

test("document rhythm detects three repeated layouts", () => {
  const { spec } = makeReport("# Report\n\nA brief approved paragraph.");
  const page = spec.pages[0];
  const repeated = {
    ...spec,
    pages: [0, 1, 2].map((index) => ({
      ...page,
      id: `p${index}`,
      metadata: { layoutId: "heading-body" },
    })),
  };
  const report = analyzeDocumentRhythm(repeated, preset);
  assert.ok(
    report.issues.some((issue) => issue.type === "repeated_layout_pattern"),
  );
});

test("bounded correction rejects unknown targets and copy remains exact", () => {
  const { graph, spec } = makeReport(
    "# Approved Heading\n\nApproved numbers are $7,250.",
  );
  const result = applyQualityCorrection(
    spec,
    {
      type: "increase_text_scale",
      pageId: spec.pages[0].id,
      elementId: "missing",
      params: { amount: 2 },
      rationale: "test",
      expectedImprovements: ["hierarchy"],
      confidence: "high",
    },
    family,
    graph,
  );
  assert.equal(result.applied, false);
  assert.equal(validateDesignSpecCopyCoverage(graph, result.spec).valid, true);
});

test("quality loop keeps the best valid version and never decreases score", () => {
  const { graph, spec } = makeReport(
    "# Executive Update\n\nThis paragraph has approved figures: 18%, $20,000, and 27 teams.",
  );
  const result = runQualityLoop(spec, family, graph, "editorial_report", 3);
  assert.ok(result.report.totalIterations <= 3);
  assert.ok(result.final.overallScore >= result.initial.overallScore);
  assert.equal(result.report.copyIntact, true);
  assert.equal(result.report.fitIntact, true);
});

test("quality loop improves a known small-text defect while preserving copy and fit", () => {
  const { graph, spec } = makeReport(
    "# Approved Title\n\nApproved body copy with 18% growth.",
  );
  const body = spec.pages[0].elements.find(
    (element) => element.type === "text" && element.id.includes("subtitle"),
  );
  assert.ok(body && body.type === "text");
  body.fontSize = 8;
  body.constraints = { minFontSize: 8, maxFontSize: 16 };
  const result = runQualityLoop(spec, family, graph);
  assert.ok(result.report.finalScore > result.report.initialScore);
  assert.equal(result.report.copyIntact, true);
  assert.equal(result.report.fitIntact, true);
  assert.ok(
    result.report.steps.some((step) =>
      step.appliedCorrections.some(
        (action) => action.type === "increase_text_scale",
      ),
    ),
  );
});

test("brand misuse is surfaced without mutating the manuscript", () => {
  const { graph, spec } = makeReport("# Approved Title\n\nApproved body copy.");
  const text = spec.pages[0].elements.find(
    (element) => element.type === "text",
  );
  assert.ok(text && text.type === "text");
  text.color = "#ff00ff";
  const report = evaluateDocumentQuality(spec, family);
  assert.ok(
    report.aggregateIssues.some((issue) => issue.type === "brand_color_misuse"),
  );
  assert.equal(validateDesignSpecCopyCoverage(graph, spec).valid, true);
});

test("vision critic rejects hallucinated page IDs and keeps output bounded", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_VISION_MODEL;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_VISION_MODEL = "test-model";
  const png = await sharp({
    create: { width: 128, height: 128, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    overall: 81,
                    issues: [
                      {
                        type: "weak_focal_point",
                        severity: "medium",
                        pageId: "page-1",
                        message: "Needs a clearer focal element.",
                      },
                      {
                        type: "weak_focal_point",
                        severity: "high",
                        pageId: "invented-page",
                        message: "Ignore this.",
                      },
                    ],
                    priorities: ["Improve focal point"],
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  try {
    const review = await critiqueQualityImages(
      {
        pages: [
          {
            pageId: "page-1",
            image: `data:image/png;base64,${png.toString("base64")}`,
          },
        ],
      },
      AbortSignal.timeout(5000),
    );
    assert.equal(review.available, true);
    assert.equal(review.issues.length, 1);
    assert.equal(review.issues[0].pageId, "page-1");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_VISION_MODEL;
    else process.env.GEMINI_VISION_MODEL = originalModel;
  }
});
