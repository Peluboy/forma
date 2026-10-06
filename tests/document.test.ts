import { test } from "node:test";
import assert from "node:assert/strict";
import { isProject } from "../src/domain/design/model.ts";
import { layerFits } from "../src/features/editor/components/TextLayers.tsx";
import {
  orderedLayerIds,
  reorderLayer,
  moveAddedLayer,
} from "../src/domain/design/layers.ts";

test("graphics and text stacking survive v3 backups and reject unsafe assets", () => {
  const p = createProject();
  p.textLayers = [
    {
      id: "layer-wording",
      text: "Keep me",
      layout: {
        x: 50,
        y: 50,
        width: 300,
        height: 100,
        size: 24,
        locked: false,
      },
    },
  ];
  p.graphicLayers = [
    {
      id: "graphic-box",
      type: "shape",
      shape: "rectangle",
      name: "Box",
      color: "#112233",
      layout: { x: 50, y: 50, width: 300, height: 100, locked: false },
    },
  ];
  assert.equal(isProject(p), true);
  Object.assign(p, reorderLayer(p, "graphic-box", "backward"));
  assert.deepEqual(orderedLayerIds(p), ["graphic-box", "layer-wording"]);
  const doc = toDesignDocument(p);
  assert.equal(doc.schemaVersion, 3);
  assert.deepEqual(
    doc.pages[0].elements.slice(-2).map((l) => l.id),
    orderedLayerIds(p),
  );
  assert.deepEqual(readDesignFile(JSON.parse(serializeDesignFile(p))), p);
  assert.equal(
    isProject({
      ...p,
      graphicLayers: [
        { ...p.graphicLayers[0], color: "url(https://example.test)" },
      ],
    }),
    false,
  );
  assert.equal(
    isProject({
      ...p,
      graphicLayers: [
        {
          ...p.graphicLayers[0],
          type: "image",
          src: "https://example.test/a.png",
        },
      ],
    }),
    false,
  );
  assert.equal(
    isProject({
      ...p,
      graphicLayers: [
        {
          ...p.graphicLayers[0],
          layout: { ...p.graphicLayers[0].layout, width: 900 },
        },
      ],
    }),
    false,
  );
  assert.equal(
    isProject({ ...p, layerOrder: ["graphic-box", "graphic-box"] }),
    false,
  );
  const moved = moveAddedLayer(p, "graphic-box", 10000, -10000);
  assert.equal(moved.graphicLayers![0].layout.x, 420);
  assert.equal(moved.graphicLayers![0].layout.y, 0);
  p.graphicLayers[0].layout.locked = true;
  assert.deepEqual(reorderLayer(p, "graphic-box", "forward"), {});
  assert.deepEqual(
    moveAddedLayer(p, "graphic-box", 10, 10).graphicLayers,
    p.graphicLayers,
  );
});

test("additional layers survive backups and reject unsafe or unbounded input", () => {
  const p = createProject();
  p.textLayers = [
    {
      id: "layer-test",
      text: "Exact additional wording",
      layout: {
        x: 60,
        y: 60,
        width: 400,
        height: 100,
        size: 24,
        locked: false,
      },
    },
  ];
  const doc = toDesignDocument(p);
  assert.equal(doc.schemaVersion, 2);
  assert.deepEqual(readDesignFile(JSON.parse(serializeDesignFile(p))), p);
  assert.equal(doc.content.at(-1)?.text, p.textLayers[0].text);
  assert.equal(
    isProject({ ...p, textLayers: [...p.textLayers, ...p.textLayers] }),
    false,
  );
  assert.equal(
    isProject({
      ...p,
      textLayers: [
        {
          ...p.textLayers[0],
          layout: {
            ...p.textLayers[0].layout,
            color: "url(https://example.com)",
          },
        },
      ],
    }),
    false,
  );
  assert.equal(
    isProject({ ...p, textLayers: Array(51).fill(p.textLayers[0]) }),
    false,
  );
  p.textLayers[0].text = "Too much text ".repeat(200);
  assert.equal(layerFits(p)[0].fit.overflow, true);
});
import {
  createProject,
  fieldIds,
  formatPresets,
} from "../src/domain/design/model.ts";
import {
  readDesignFile,
  serializeDesignFile,
  toDesignDocument,
} from "../src/domain/design/document.ts";

test("old and versioned backups preserve every legacy setting and Unicode copy", () => {
  for (const format of ["portrait", "square", "story", "banner"] as const) {
    const p = createProject();
    p.format = format;
    p.pageSize = { ...formatPresets[format] };
    p.copy.title = "Café — 报告 50%";
    p.layouts.title.locked = true;
    p.backgroundColor = "#123456";
    const before = JSON.stringify(p);
    assert.deepEqual(readDesignFile(JSON.parse(serializeDesignFile(p))), p);
    assert.deepEqual(readDesignFile(p), p);
    assert.equal(JSON.stringify(p), before);
    const doc = toDesignDocument(p);
    assert.equal(doc.pages[0].width, formatPresets[format].width);
    assert.equal(doc.pages[0].height, formatPresets[format].height);
    assert.deepEqual(
      doc.content.map((b) => b.text),
      fieldIds.map((id) => p.copy[id]),
    );
    doc.compatibility.project.copy.title = "Changed snapshot";
    assert.equal(p.copy.title, "Café — 报告 50%");
  }
  const custom = createProject();
  custom.format = "custom";
  custom.pageSize = { width: 1100, height: 600 };
  const customDoc = toDesignDocument(custom);
  assert.equal(customDoc.pages[0].width, 1100);
  assert.equal(customDoc.pages[0].height, 600);
  assert.deepEqual(readDesignFile(customDoc), custom);
});

test("reference migration retains mapping, covers, image and unmapped content", () => {
  const p = createProject();
  p.designMode = "reference";
  p.reference = "data:image/png;base64,aGVsbG8=";
  p.referenceHeight = 1200;
  p.mappedFields = ["title"];
  p.covers = { title: "#112233" };
  const doc = toDesignDocument(p);
  assert.equal(doc.pages[0].elements.filter((e) => e.visible).length, 1);
  assert.equal(doc.content.length, 6);
  assert.equal(doc.pages[0].elements[1].y, p.layouts.title.y * (1200 / 900));
  assert.deepEqual(readDesignFile(doc), p);
  assert.equal(serializeDesignFile(p).split(p.reference).length - 1, 1);
});

test("unsupported versions, changed content and extra pages never silently downgrade", () => {
  const doc = toDesignDocument(createProject());
  assert.throws(
    () => readDesignFile({ ...doc, schemaVersion: 99 }),
    /unsupported/,
  );
  assert.throws(
    () => readDesignFile({ ...doc, pages: [...doc.pages, doc.pages[0]] }),
    /cannot safely open/,
  );
  const changed = structuredClone(doc);
  changed.content[0].text = "New wording";
  assert.throws(() => readDesignFile(changed), /cannot safely open/);
  assert.throws(() => readDesignFile({ ...doc, compatibility: null }));
  assert.throws(() => readDesignFile(null));
  assert.throws(() =>
    readDesignFile({
      ...doc.compatibility.project,
      reference: "https://untrusted.test/image",
    }),
  );
  // JSON object property order is not semantically meaningful.
  const reordered = Object.fromEntries(Object.entries(doc).reverse());
  assert.deepEqual(readDesignFile(reordered), doc.compatibility.project);
});

import {
  decodeStoredProject,
  documentRuntimeEnabled,
  encodeStoredProject,
  projectionPreserved,
  readStoredProjectList,
  serializeStoredProject,
} from "../src/domain/design/documentRuntime.ts";

test("document runtime preserves projection and encodes browser storage records", () => {
  const p = createProject();
  p.format = "banner";
  p.pageSize = { ...formatPresets.banner };
  p.copy.title = "Runtime check";
  p.textLayers = [
    {
      id: "layer-wording",
      text: "Extra",
      layout: {
        x: 40,
        y: 40,
        width: 200,
        height: 60,
        size: 20,
        locked: false,
      },
    },
  ];
  assert.equal(documentRuntimeEnabled(), true);
  assert.equal(projectionPreserved(p), true);
  const encoded = encodeStoredProject(p);
  assert.equal((encoded as { kind?: string }).kind, "forma-design");
  assert.deepEqual(decodeStoredProject(encoded), p);
  assert.deepEqual(readStoredProjectList([encoded, p, { bad: true }]), [p, p]);
  assert.equal(JSON.parse(serializeStoredProject(p)).kind, "forma-design");
});
