import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyContentBlocks,
  changedFields,
  createProject,
  defaultLayouts,
  fitText,
  isProject,
  parseManuscript,
  parseManuscriptBlocks,
  sampleManuscript,
  serializeCopy,
  canvasHeight,
  canvasWidth,
  formatPresets,
  outputPixels,
  resolvePageSize,
  fieldText,
  setFieldText,
  type Project,
} from "../src/domain/design/model.ts";

test("structured field edits preserve every other manuscript section", () => {
  const original =
    "Headline: First\n\nCTA: Keep this\n\nFooter: Also keep this";
  const renamed = setFieldText(original, "title", "Second");
  assert.equal(fieldText(renamed, "title"), "Second");
  assert.match(renamed, /CTA: Keep this/);
  assert.match(renamed, /Footer: Also keep this/);

  const missing = setFieldText(original, "kicker", "NEW");
  assert.match(missing, /Eyebrow: NEW/);
  assert.equal(fieldText(missing, "title"), "First");

  const cleared = setFieldText(original, "footer", "");
  assert.equal(fieldText(cleared, "footer"), "");
  assert.match(cleared, /Headline: First/);

  assert.equal(
    fieldText(sampleManuscript, "title"),
    "Good things\ntake shape.",
  );
});
test("preserves punctuation, Unicode, numbers, and manuscript wording through a round trip", () => {
  const copy = parseManuscript(
    "Headline: Café — 50% off!\n\nBody copy: “Hello”, Chicago.\nTickets: $25.00.\n\nDate & time: 24/10/2026\n6:00 PM",
  );
  assert.equal(copy.title, "Café — 50% off!");
  assert.equal(copy.description, "“Hello”, Chicago.\nTickets: $25.00.");
  assert.deepEqual(parseManuscript(serializeCopy(copy)), copy);
});
test("does not discard unlabelled paragraphs or repeated sections", () => {
  assert.equal(
    parseManuscript("First paragraph\n\nSecond\n\nThird").description,
    "Second\n\nThird",
  );
  const copy = parseManuscript(
    "Do not lose this preamble.\nHeadline: First\nHeadline: Second\nUnknown: retain me",
  );
  assert.equal(copy.description, "Do not lose this preamble.");
  assert.equal(copy.title, "First\nSecond\nUnknown: retain me");
  const blocks = parseManuscriptBlocks(
    "Headline: Keep me\n\nCTA: Join the waitlist\n\nNote: Bring a friend",
  );
  assert.equal(blocks.find((b) => b.fieldId === "title")?.text, "Keep me");
  assert.equal(blocks.find((b) => b.id === "block-extra-0")?.label, "CTA");
  assert.equal(
    blocks.find((b) => b.id === "block-extra-0")?.text,
    "Join the waitlist",
  );
});
test("extra manuscript sections become managed text layers on apply", () => {
  const project = createProject();
  const blocks = parseManuscriptBlocks(
    "Headline: Keep me\n\nCTA: Join the waitlist\n\nNote: Bring a friend",
  );
  const patch = applyContentBlocks(project, blocks, "unused");
  assert.equal(patch.copy?.title, "Keep me");
  assert.equal(patch.textLayers?.length, 2);
  assert.equal(patch.textLayers?.[0].text, "Join the waitlist");
  assert.equal(patch.textLayers?.[1].text, "Bring a friend");
  assert.ok(patch.textLayers?.every((l) => l.id.startsWith("layer-block-")));
  assert.equal(patch.contentBlocks?.length, 3);
  const again = applyContentBlocks(
    { ...project, ...patch } as Project,
    parseManuscriptBlocks("Headline: Keep me\n\nCTA: Join the waitlist"),
    "unused",
  );
  assert.equal(again.textLayers?.length, 1);
});
test("revision diff flags removed fields as well as modified fields", () => {
  const original = parseManuscript(sampleManuscript);
  assert.deepEqual(
    changedFields(original, { ...original, title: "New headline", footer: "" }),
    ["title", "footer"],
  );
});
test("long copy is flagged rather than truncated or shrunk below the floor", () => {
  const text = "All of these words must stay. ".repeat(60).trim();
  const result = fitText(
    text,
    defaultLayouts().description,
    (s, size) => s.length * size * 0.5,
  );
  assert.equal(result.overflow, true);
  assert.ok(result.size >= defaultLayouts().description.size * 0.72);
  assert.equal(result.lines.join(" ").replace(/\s+/g, " "), text);
});
test("long unbreakable words are flagged and empty copy stays empty", () => {
  assert.equal(
    fitText(
      "x".repeat(300),
      defaultLayouts().title,
      (s, size) => s.length * size * 0.5,
    ).overflow,
    true,
  );
  assert.deepEqual(fitText("", defaultLayouts().title, () => 0).lines, []);
});
test("validates imported project structure", () => {
  const p = createProject();
  assert.equal(isProject(p), true);
  assert.equal(isProject({ ...p, template: "fake" }), false);
  assert.equal(isProject({ ...p, reference: "javascript:alert(1)" }), false);
  assert.equal(isProject({ ...p, layouts: {} }), false);
});
test("accepts curated font styles and rejects unsafe spacing values", () => {
  const project = createProject();
  project.layouts.title = {
    ...project.layouts.title,
    fontFamily: "Inter",
    fontWeight: 600,
    underline: true,
    strikeThrough: false,
    letterSpacing: 2,
    lineHeight: 1.3,
    opacity: 0.75,
  };
  assert.equal(isProject(project), true);
  assert.equal(
    isProject({
      ...project,
      layouts: {
        ...project.layouts,
        title: { ...project.layouts.title, lineHeight: 0 },
      },
    }),
    false,
  );
  assert.equal(
    isProject({
      ...project,
      layouts: {
        ...project.layouts,
        title: { ...project.layouts.title, fontWeight: 9999 },
      },
    }),
    false,
  );
});
test("supports banner and custom page sizes while keeping legacy presets", () => {
  const p = createProject();
  assert.deepEqual(resolvePageSize(p), formatPresets.portrait);
  assert.equal(canvasWidth(p), 720);
  assert.equal(canvasHeight(p), 900);
  const banner = { ...p, format: "banner" as const, pageSize: undefined };
  assert.equal(isProject(banner), true);
  assert.deepEqual(resolvePageSize(banner), formatPresets.banner);
  assert.equal(canvasWidth(banner), 1280);
  assert.equal(canvasHeight(banner), 720);
  const custom = {
    ...p,
    format: "custom" as const,
    pageSize: { width: 1000, height: 500 },
  };
  assert.equal(isProject(custom), true);
  assert.deepEqual(resolvePageSize(custom), { width: 1000, height: 500 });
  assert.deepEqual(outputPixels(custom), { width: 3000, height: 1500 });
  assert.equal(
    isProject({ ...p, format: "custom", pageSize: { width: 10, height: 10 } }),
    false,
  );
  assert.equal(
    isProject({ ...p, format: "custom", pageSize: undefined }),
    false,
  );
  const legacy = { ...p };
  delete (legacy as { pageSize?: unknown }).pageSize;
  assert.equal(isProject(legacy), true);
  assert.deepEqual(resolvePageSize(legacy), formatPresets.portrait);
});
