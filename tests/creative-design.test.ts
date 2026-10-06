import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCreativeConcepts,
  projectFromCreativeConcept,
  validCreativeBrief,
  type CreativeBrief,
  type CreativeConcept,
} from "../src/domain/design/creativeDesign.ts";
import { isProject } from "../src/domain/design/model.ts";
import { generateCreativeConcepts } from "../server/creative.ts";

const manuscript =
  "Annual Report 2026\nRevenue grew 18%.\nKeep this exact sentence.";
const brief: CreativeBrief = {
  family: "graphics",
  manuscript,
  freedom: "style",
  format: "portrait",
};
const concepts: CreativeConcept[] = [
  {
    id: "one",
    name: "Editorial",
    rationale: "Large title and generous space.",
    template: "editorial",
    composition: "editorial",
    colors: { background: "#ffffff", text: "#101010", accent: "#d05030" },
    fonts: { display: "Playfair Display", body: "DM Sans" },
  },
  {
    id: "two",
    name: "Centered",
    rationale: "A focused central title.",
    template: "botanical",
    composition: "centered",
    colors: { background: "#f5f5ed", text: "#112211", accent: "#335533" },
    fonts: { display: "Lora", body: "Inter" },
  },
  {
    id: "three",
    name: "Split",
    rationale: "Separate copy from imagery.",
    template: "electric",
    composition: "split",
    colors: { background: "#171727", text: "#ffffff", accent: "#efc420" },
    fonts: { display: "Space Grotesk", body: "Inter" },
  },
];

test("AI design directions accept visual metadata and reject copy or repeated layouts", () => {
  assert.equal(validCreativeBrief(brief), true);
  assert.equal(normalizeCreativeConcepts(concepts).length, 3);
  assert.throws(() =>
    normalizeCreativeConcepts([concepts[0], concepts[0], concepts[2]]),
  );
  assert.throws(() =>
    normalizeCreativeConcepts([
      { ...concepts[0], colors: { ...concepts[0].colors, text: "red" } },
      concepts[1],
      concepts[2],
    ]),
  );
});

test("graphics, documents and slides retain exact source copy in editable projects", () => {
  for (const family of ["graphics", "document", "presentation"] as const) {
    const project = projectFromCreativeConcept(
      { ...brief, family },
      concepts[0],
    );
    assert.equal(project.manuscript, manuscript);
    assert.equal(project.family, family);
    assert.equal(isProject(project), true);
    if (family === "document") {
      assert.ok(project.flow?.pages.length);
      assert.equal(project.flow?.master.header, "");
      assert.equal(project.flow?.master.showPageNumbers, false);
    }
    if (family === "presentation")
      assert.ok(project.presentation?.slides.length);
  }
});

test("Gemini receives the brief but returns only bounded design metadata", async () => {
  const oldKey = process.env.GEMINI_API_KEY;
  const oldModel = process.env.GEMINI_VISION_MODEL;
  const oldFetch = globalThis.fetch;
  let request: Record<string, unknown> | undefined;
  let attempts = 0;
  try {
    process.env.GEMINI_API_KEY = "test-only-key";
    process.env.GEMINI_VISION_MODEL = "test-model";
    globalThis.fetch = async (_url, options) => {
      attempts++;
      if (attempts === 1) throw new Error("temporary network failure");
      request = JSON.parse(String(options?.body));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify({ concepts }) }] },
            },
          ],
        }),
        { status: 200 },
      );
    };
    const result = await generateCreativeConcepts(brief);
    assert.equal(attempts, 2);
    assert.equal(result.length, 3);
    const submitted = request as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    assert.equal(
      JSON.parse(submitted.contents[0].parts[0].text)
        .approvedManuscriptForPlanningOnly,
      manuscript,
    );
    assert.equal(JSON.stringify(result).includes(manuscript), false);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.GEMINI_VISION_MODEL;
    else process.env.GEMINI_VISION_MODEL = oldModel;
  }
});
