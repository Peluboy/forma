import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  editCanvasText,
  parseManuscriptBlocks,
  applyContentBlocks,
  isProject,
  type Project,
} from "../src/domain/design/model.ts";
import {
  documentColors,
  replaceProjectColor,
} from "../src/domain/design/colors.ts";
import { validGraphics } from "../src/domain/design/layers.ts";
import { normalizeBrand } from "../src/domain/design/designSystem.ts";

test("direct canvas editing updates manuscript and managed text without losing other blocks", () => {
  const project = createProject();
  const blocks = parseManuscriptBlocks(
    "Headline: First\n\nCTA: Keep this\n\nFooter: Also keep this",
  );
  const applied = {
    ...project,
    ...applyContentBlocks(
      project,
      blocks,
      "Headline: First\n\nCTA: Keep this\n\nFooter: Also keep this",
    ),
  } as Project;
  const changed = {
    ...applied,
    ...editCanvasText(applied, "title", "New headline"),
  } as Project;
  assert.equal(changed.copy.title, "New headline");
  assert.match(changed.manuscript, /CTA: Keep this/);
  const layerId = changed.textLayers?.find(
    (layer) => layer.text === "Keep this",
  )?.id;
  assert.ok(layerId);
  const edited = {
    ...changed,
    ...editCanvasText(changed, layerId, "New CTA"),
  } as Project;
  assert.match(edited.manuscript, /CTA: New CTA/);
  assert.match(edited.manuscript, /Footer: Also keep this/);
  assert.equal(
    edited.textLayers?.find((layer) => layer.id === layerId)?.text,
    "New CTA",
  );
});

test("replace matching design colors leaves unlike colors and wording intact", () => {
  const project = createProject();
  project.layouts.title.color = "#123456";
  project.layouts.footer.color = "#123456";
  project.layouts.date.color = "#654321";
  const changed = {
    ...project,
    ...replaceProjectColor(project, "#123456", "#abcdef"),
  } as Project;
  assert.equal(changed.layouts.title.color, "#abcdef");
  assert.equal(changed.layouts.footer.color, "#abcdef");
  assert.equal(changed.layouts.date.color, "#654321");
  assert.equal(changed.manuscript, project.manuscript);
  assert.ok(documentColors(changed).includes("#abcdef"));
});

test("photo frames and expanded brand palettes survive validation", () => {
  const project = createProject();
  project.graphicLayers = [
    {
      id: "graphic-frame-1",
      name: "Photo frame",
      type: "frame",
      shape: "rounded",
      layout: { x: 40, y: 50, width: 200, height: 150, locked: false },
    },
  ];
  assert.equal(validGraphics(project.graphicLayers), true);
  assert.equal(isProject(project), true);
  const brand = normalizeBrand({
    id: "brand-test",
    version: 2,
    name: "Test",
    colors: { text: "#112233", background: "#ffffff", accent: "#445566" },
    fonts: { display: "Playfair Display", body: "Inter" },
    palette: ["#aabbcc"],
  });
  assert.equal(brand.fonts.display, "Playfair Display");
  assert.deepEqual(brand.palette, ["#aabbcc"]);
});
