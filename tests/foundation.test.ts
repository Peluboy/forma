import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  contentGraphFromManuscript,
  validateContentGraphCoverage,
  compareSourceCoverage,
  normalizeForStructuralComparison,
  createSourceSpans,
} from "../src/domain/content/index.ts";
import {
  fromLegacyGraphicProject,
  fromFlowDocument,
  validateDesignSpec,
  validateDesignSpecCopyCoverage,
  type DesignSpec,
} from "../src/domain/design-spec/index.ts";
import { createProject } from "../src/domain/design/model.ts";
import {
  createDocumentProject,
  fixtureOnePager,
} from "../src/domain/design/flowDocument.ts";
import { inspectDocumentVisibility } from "../src/domain/design/documentVisibility.ts";
import { DocumentPageView } from "../src/features/editor/canvas/DocumentCanvas.tsx";
import { validateExport } from "../src/features/editor/lib/exports.tsx";
import {
  fixturePitchDeck,
  buildPptxBlob,
} from "../src/domain/design/presentation.ts";
import JSZip from "jszip";
import {
  serializeDesignFile,
  readDesignFile,
} from "../src/domain/design/document.ts";

test("ContentGraph preserves raw source, stable spans, unknown content, and table relationships", () => {
  const raw =
    "Heading: Quarterly 2026\n\n- First item\nUnexpected / glyphs\n| Metric | Value |\n| --- | --- |\n| Reach | 12,400 |";
  const first = contentGraphFromManuscript(raw);
  const second = contentGraphFromManuscript(raw);
  assert.equal(first.sourceText, raw);
  assert.equal(first.copyPolicy, "exact");
  assert.deepEqual(
    first.spans.map((span) => span.id),
    second.spans.map((span) => span.id),
  );
  assert.equal(validateContentGraphCoverage(first).valid, true);
  assert.equal(first.spans.map((span) => span.text).join(""), raw);
  assert.ok(first.nodes.some((node) => node.type === "heading"));
  assert.ok(first.nodes.some((node) => node.type === "list_item"));
  assert.ok(first.nodes.some((node) => node.type === "paragraph"));
  const table = first.nodes.find((node) => node.type === "table");
  assert.ok(
    table?.children?.some((row) =>
      row.children?.some((cell) => cell.type === "table_cell"),
    ),
  );
  assert.equal(table?.metadata?.extractionConfidence, "low");
  const retained = createSourceSpans("Alpha\nBeta", "same-source").find(
    (span) => span.text === "Beta",
  )?.id;
  assert.equal(
    createSourceSpans("New\nAlpha\nBeta", "same-source").find(
      (span) => span.text === "Beta",
    )?.id,
    retained,
  );
});

test("Exact Copy checks words, numbers, punctuation, duplicates, order, case, and layout wraps", () => {
  const graph = contentGraphFromManuscript("Alpha 12,400.\nBeta Client");
  const spans = graph.spans.filter((span) => span.role === "content");
  assert.equal(spans.length, 2);
  const exact = [
    {
      pageId: "p",
      elementId: "a",
      text: "Alpha 12,400.",
      sourceSpanIds: [spans[0].id],
    },
    {
      pageId: "p",
      elementId: "b",
      text: "Beta\nClient",
      sourceSpanIds: [spans[1].id],
    },
  ];
  assert.equal(compareSourceCoverage(graph, exact).valid, true);
  assert.equal(normalizeForStructuralComparison("Beta\nClient"), "Beta Client");
  for (const value of [
    "Alpha 12,401.",
    "Alpha 12,400!",
    "alpha 12,400.",
    "12,400.",
    "Alpha 12,400.",
  ]) {
    const changed = value === "Alpha 12,400." ? "Alpha 12,400. extra" : value;
    assert.ok(
      compareSourceCoverage(graph, [
        { ...exact[0], text: changed },
        exact[1],
      ]).issues.some((issue) => issue.type === "altered_copy"),
    );
  }
  assert.ok(
    compareSourceCoverage(graph, [exact[0]]).issues.some(
      (issue) => issue.type === "missing_source_span",
    ),
  );
  assert.ok(
    compareSourceCoverage(graph, [exact[0], exact[0], exact[1]]).issues.some(
      (issue) => issue.type === "duplicated_source_span",
    ),
  );
  assert.ok(
    compareSourceCoverage(graph, [exact[1], exact[0]]).issues.some(
      (issue) => issue.type === "reordered_source_span",
    ),
  );
  assert.ok(
    compareSourceCoverage(graph, [
      exact[0],
      exact[1],
      { pageId: "p", elementId: "extra", text: "Added", sourceSpanIds: [] },
    ]).issues.some((issue) => issue.type === "untracked_text"),
  );
});

function simpleSpec(): DesignSpec {
  return {
    version: "1.0",
    id: "design",
    name: "Fixture",
    family: "graphic",
    copyPolicy: "exact",
    documentSize: { width: 720, height: 900, unit: "px" },
    assets: [{ id: "photo", kind: "image", uri: "asset://photo" }],
    styles: { textStyles: { heading: { fontFamily: "Arial", fontSize: 28 } } },
    pages: [
      {
        id: "page",
        width: 720,
        height: 900,
        elementIds: ["title", "image", "shape", "table"],
        elements: [
          {
            id: "title",
            type: "text",
            x: 10,
            y: 10,
            width: 400,
            height: 50,
            text: "Hello",
            sourceSpanIds: ["span"],
            fontFamily: "Arial",
            fontSize: 28,
            styleRef: "heading",
          },
          {
            id: "image",
            type: "image",
            x: 10,
            y: 80,
            width: 100,
            height: 100,
            assetRef: "photo",
            fit: "fill",
          },
          {
            id: "shape",
            type: "shape",
            x: 120,
            y: 80,
            width: 100,
            height: 100,
            shape: "rectangle",
            fill: { color: "#000000" },
          },
          {
            id: "table",
            type: "table",
            x: 10,
            y: 200,
            width: 400,
            height: 100,
            columns: 2,
            headerRows: 1,
            rows: [
              [
                { text: "A", sourceSpanIds: ["a"] },
                { text: "B", sourceSpanIds: ["b"] },
              ],
            ],
          },
        ],
      },
    ],
  };
}

test("DesignSpec validates typed elements and rejects broken IDs, geometry, references, and groups", () => {
  const base = simpleSpec();
  assert.equal(validateDesignSpec(base).valid, true);
  assert.ok(
    validateDesignSpec({
      ...base,
      pages: null,
    } as unknown as DesignSpec).issues.some(
      (issue) => issue.type === "invalid_root",
    ),
  );
  const duplicate = structuredClone(base);
  duplicate.pages[0].elements[1].id = "title";
  assert.ok(
    validateDesignSpec(duplicate).issues.some(
      (issue) => issue.type === "duplicate_id",
    ),
  );
  const geometry = structuredClone(base);
  geometry.pages[0].elements[0].width = Number.NaN;
  assert.ok(
    validateDesignSpec(geometry).issues.some(
      (issue) => issue.type === "invalid_geometry",
    ),
  );
  const style = structuredClone(base);
  style.pages[0].elements[0].styleRef = "missing";
  assert.ok(
    validateDesignSpec(style).issues.some(
      (issue) => issue.type === "invalid_style_ref",
    ),
  );
  const asset = structuredClone(base);
  const image = asset.pages[0].elements[1];
  if (image.type === "image") image.assetRef = "missing";
  assert.ok(
    validateDesignSpec(asset).issues.some(
      (issue) => issue.type === "invalid_asset_ref",
    ),
  );
  const group = structuredClone(base);
  group.pages[0].elements.push({
    id: "group",
    type: "group",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    childIds: ["missing"],
  });
  group.pages[0].elementIds.push("group");
  assert.ok(
    validateDesignSpec(group).issues.some(
      (issue) => issue.type === "invalid_parent",
    ),
  );
  const cycle = structuredClone(base);
  cycle.pages[0].elements.push(
    {
      id: "g1",
      type: "group",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      parentId: "g2",
      childIds: ["g2"],
    },
    {
      id: "g2",
      type: "group",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      parentId: "g1",
      childIds: ["g1"],
    },
  );
  cycle.pages[0].elementIds.push("g1", "g2");
  assert.ok(
    validateDesignSpec(cycle).issues.some(
      (issue) => issue.type === "group_cycle",
    ),
  );
  const table = structuredClone(base);
  const tableElement = table.pages[0].elements[3];
  if (tableElement.type === "table") tableElement.rows[0][0].sourceSpanIds = [];
  assert.ok(
    validateDesignSpec(table).issues.some(
      (issue) => issue.type === "copy_policy",
    ),
  );
});

test("DesignSpec copy coverage detects missing and altered elements", () => {
  const graph = contentGraphFromManuscript("Heading: Approved 2026.");
  const span = graph.spans.find((item) => item.role === "content")!;
  const spec = simpleSpec();
  const title = spec.pages[0].elements[0];
  if (title.type !== "text") throw new Error("Bad fixture");
  title.text = span.text;
  title.sourceSpanIds = [span.id];
  spec.pages[0].elements = [title];
  spec.pages[0].elementIds = [title.id];
  assert.equal(validateDesignSpecCopyCoverage(graph, spec).valid, true);
  title.text = "Approved 2027.";
  assert.ok(
    validateDesignSpecCopyCoverage(graph, spec).issues.some(
      (issue) => issue.type === "altered_copy",
    ),
  );
  spec.pages[0].elements = [];
  spec.pages[0].elementIds = [];
  assert.ok(
    validateDesignSpecCopyCoverage(graph, spec).issues.some(
      (issue) => issue.type === "missing_source_span",
    ),
  );
});

test("legacy graphics and flow adapters preserve geometry, copy, and explicit unsupported warnings", () => {
  const graphic = createProject();
  const before = structuredClone(graphic);
  const adapted = fromLegacyGraphicProject(graphic);
  assert.equal(validateDesignSpec(adapted.spec).valid, true);
  assert.equal(
    adapted.spec.pages[0].elements.some(
      (element) =>
        element.type === "text" && element.text === graphic.copy.title,
    ),
    true,
  );
  assert.equal(
    adapted.spec.pages[0].elements.find((element) =>
      element.id.endsWith(":field:title"),
    )?.x,
    graphic.layouts.title.x,
  );
  assert.ok(adapted.warnings.some((warning) => /artwork/i.test(warning)));
  assert.deepEqual(graphic, before);
  const graph = contentGraphFromManuscript(graphic.manuscript);
  assert.equal(validateDesignSpecCopyCoverage(graph, adapted.spec).valid, true);
  const reference = structuredClone(graphic);
  reference.designMode = "reference";
  reference.reference = "data:image/png;base64,iVBORw0KGgo=";
  const referenceResult = fromLegacyGraphicProject(reference);
  assert.ok(
    referenceResult.spec.pages[0].elements.some(
      (element) => element.type === "image",
    ),
  );
  assert.ok(
    referenceResult.warnings.some((warning) => /raster/i.test(warning)),
  );

  const flow = fixtureOnePager();
  const old = structuredClone(flow);
  const result = fromFlowDocument(flow);
  assert.equal(result.spec.pages.length, flow.flow!.pages.length);
  assert.equal(validateDesignSpec(result.spec).valid, true);
  assert.equal(
    result.spec.pages[0].elements[0].x,
    flow.flow!.pages[0].elements[0].x,
  );
  assert.ok(
    result.spec.pages.some((page) =>
      page.elements.some((element) => element.type === "table"),
    ),
  );
  assert.ok(
    result.spec.pages
      .flatMap((page) => page.elements)
      .some(
        (element) =>
          element.type === "table" &&
          element.rows.some((row) =>
            row.some((cell) => cell.text === "12,400"),
          ),
      ),
  );
  assert.ok(result.warnings.some((warning) => /Master/i.test(warning)));
  assert.deepEqual(flow, old);
});

test("document visibility catches long heading, paragraph, table cells, and hidden/multi-page copy", () => {
  const heading = createDocumentProject(
    `Heading: ${"W".repeat(200)}`,
    "Long heading",
  );
  assert.ok(
    inspectDocumentVisibility(heading.flow!).some(
      (issue) => issue.type === "text_overflow",
    ),
  );
  assert.throws(() => validateExport(heading), /Page 1/);
  const paragraph = createDocumentProject(
    `Heading: Intro\n\n${"Paragraph text. ".repeat(220)}`,
    "Long paragraph",
  );
  assert.ok(
    inspectDocumentVisibility(paragraph.flow!).some(
      (issue) =>
        issue.type === "text_overflow" || issue.type === "duplicate_content",
    ),
  );
  assert.throws(() => validateExport(paragraph));
  const dense = createDocumentProject(
    "| Label | Value |\n| --- | --- |\n| Short | " +
      "WideValue".repeat(20) +
      " |",
    "Table",
  );
  assert.ok(
    inspectDocumentVisibility(dense.flow!).some(
      (issue) => issue.type === "table_overflow",
    ),
  );
  assert.throws(() => validateExport(dense), /table/i);
  const normal = createDocumentProject(
    "Heading: Short\n\nBrief copy.",
    "Normal",
  );
  const first = normal.flow!.pages[0];
  const textFrame = first.elements.find((element) => element.type === "text");
  assert.ok(textFrame && textFrame.type === "text");
  textFrame.fontSize = 0;
  assert.throws(() => validateExport(normal), /font size/i);
  textFrame.fontSize = 22;
  normal.flow!.pages.push({
    id: "page-extra",
    elements: [{ ...textFrame, id: "repeat-frame" }],
  });
  assert.ok(
    inspectDocumentVisibility(normal.flow!).some(
      (issue) => issue.type === "duplicate_content" && issue.pageNumber === 2,
    ),
  );
  assert.throws(() => validateExport(normal));
  normal.flow!.pages[1].hidden = true;
  assert.equal(
    inspectDocumentVisibility(normal.flow!).some(
      (issue) => issue.type === "duplicate_content",
    ),
    false,
  );
});

test("document/PPTX export structures retain text and legacy backups remain readable", async () => {
  const doc = createDocumentProject(
    "Heading: " +
      "A".repeat(140) +
      "\n\n| Key | Value |\n| --- | --- |\n| Reach | " +
      "9".repeat(50) +
      " |",
    "Coverage",
  );
  const svg = renderToStaticMarkup(
    createElement(DocumentPageView, {
      flow: doc.flow!,
      page: doc.flow!.pages[0],
      pageNumber: 1,
      total: doc.flow!.pages.length,
    }),
  );
  assert.ok(svg.includes("9".repeat(50)));
  assert.ok((svg.match(/A/g) || []).length >= 140);
  assert.equal(
    readDesignFile(JSON.parse(serializeDesignFile(doc))).manuscript,
    doc.manuscript,
  );
  const graphic = createProject();
  const presentation = fixturePitchDeck();
  for (const project of [graphic, presentation])
    assert.equal(
      readDesignFile(JSON.parse(serializeDesignFile(project))).id,
      project.id,
    );
  const pptx = await buildPptxBlob(presentation);
  const zip = await JSZip.loadAsync(await pptx.arrayBuffer());
  const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");
  assert.ok(
    slideXml && slideXml.includes(presentation.presentation!.slides[0].title),
  );
});
