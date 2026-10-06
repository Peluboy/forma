import test from "node:test";
import assert from "node:assert/strict";
import {
  readDesignFile,
  serializeDesignFile,
} from "../src/domain/design/document.js";
import { isProject, sampleManuscript } from "../src/domain/design/model.js";
import {
  buildPptxBlob,
  createPresentationProject,
  fixturePitchDeck,
  getAdapter,
  parsePresentationManuscript,
  PRESENTATION_ADAPTERS,
  presentationIssues,
  contentSlideLines,
} from "../src/domain/design/presentation.js";

test("presentation manuscript parses layouts, bullets, charts and notes", () => {
  const slides = parsePresentationManuscript(`Layout: title
Title: Hello
Notes: Kickoff

---
Layout: chart
Title: Results
| Month | Wins |
| --- | --- |
| Jan | 3 |
| Feb | 5 |
Notes: Pilot data only.`);
  assert.equal(slides.length, 2);
  assert.equal(slides[0].layout, "title");
  assert.equal(slides[0].notes, "Kickoff");
  assert.equal(slides[1].layout, "chart");
  assert.ok(slides[1].chart);
  assert.deepEqual(slides[1].chart?.categories, ["Jan", "Feb"]);
  assert.deepEqual(slides[1].chart?.series[0].values, [3, 5]);
});

test("poster manuscript becomes a readable slide without dropping approved sections", () => {
  const project = createPresentationProject(sampleManuscript);
  const slide = project.presentation!.slides[0];
  const lines = contentSlideLines(slide);
  assert.deepEqual(lines.title, ["Good things", "take shape."]);
  assert.ok(
    lines.copy.some((line) =>
      line.includes("An evening for people who make things happen."),
    ),
  );
  assert.ok(
    lines.copy.some((line) => line.includes("COME CURIOUS. LEAVE INSPIRED.")),
  );
  assert.deepEqual(presentationIssues(project), []);

  const long = createPresentationProject(
    `Headline: Approved title.\n\nBody copy: ${"Keep this exact copy. ".repeat(300)}`,
  );
  assert.match(presentationIssues(long).join(" "), /needs more room/i);
});

test("pitch deck fixture is a valid presentation project", () => {
  const project = fixturePitchDeck();
  assert.equal(project.family, "presentation");
  assert.ok(project.presentation);
  assert.ok(isProject(project));
  assert.equal(presentationIssues(project).length, 0);
  assert.ok(project.presentation!.slides.some((s) => s.layout === "chart"));
});

test("verified adapters declare fidelity limits and PPTX builds", async () => {
  assert.equal(PRESENTATION_ADAPTERS.length, 2);
  const pptx = getAdapter("forma-pptx");
  assert.equal(pptx.verified, true);
  assert.ok(pptx.fidelityLimits.length >= 3);
  const project = createPresentationProject(
    `Layout: title
Title: Adapter check
Notes: Notes travel with the file.

---
Layout: content
Title: Body
- One
- Two`,
  );
  const blob = await buildPptxBlob(project);
  assert.ok(blob.size > 500);
  assert.match(blob.type, /presentationml|octet-stream|zip/i);
  const buf = Buffer.from(await blob.arrayBuffer());
  // ZIP local file header
  assert.equal(buf[0], 0x50);
  assert.equal(buf[1], 0x4b);
});

test("presentation survives editable Forma JSON round-trip", () => {
  const project = fixturePitchDeck();
  const reopened = readDesignFile(JSON.parse(serializeDesignFile(project)));
  assert.equal(reopened.family, "presentation");
  assert.equal(
    reopened.presentation?.slides.length,
    project.presentation?.slides.length,
  );
  assert.equal(reopened.presentation?.slides[2].chart?.series[0].values[2], 24);
});
