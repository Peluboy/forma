import test from "node:test";
import assert from "node:assert/strict";
import { projectDesignSpecToFlowDocument } from "../src/domain/design-spec/adapters/toFlowDocument.js";
import type { DesignSpec } from "../src/domain/design-spec/types.js";
import {
  applyEditorChangeToDesignSpec,
  createInSyncState,
  describeSyncForUser,
  diffFlowDocuments,
  fromFlowDocumentToDesignSpec,
  getDesignSpecLinkFromEditorElement,
  getEditorElementsForDesignSpecElement,
  getStoredDesignSpec,
  getStoredSyncState,
  inspectProjectSync,
  nativeExportAllowed,
  resyncLinkedDesignSpec,
  syncProjectAfterEdit,
  validateProjectionLinks,
} from "../src/domain/design-spec/sync/index.js";
import {
  normalizePdfOptions,
  runExportPreflight,
  runNativePdfExport,
} from "../src/domain/export/index.js";
import { createProject, type Project } from "../src/domain/design/model.js";

function makeSpec(): DesignSpec {
  return {
    version: "1.0",
    id: "spec-sync-1",
    name: "Sync Report",
    family: "document",
    copyPolicy: "light_edit",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        background: { color: "#f7f6f3" },
        elementIds: ["headline", "photo", "card", "grid", "bars"],
        elements: [
          {
            id: "headline",
            type: "text",
            text: "Quarterly Review",
            x: 48,
            y: 48,
            width: 400,
            height: 48,
            fontFamily: "Helvetica",
            fontSize: 22,
            fontWeight: 700,
            color: "#111111",
            sourceSpanIds: ["span-headline"],
          },
          {
            id: "photo",
            type: "image",
            x: 48,
            y: 120,
            width: 200,
            height: 120,
            assetRef: "asset-1",
            fit: "crop",
            focalPoint: { x: 0.5, y: 0.5 },
          },
          {
            id: "card",
            type: "shape",
            shape: "rectangle",
            x: 280,
            y: 120,
            width: 240,
            height: 80,
            fill: { color: "#e8e4dc" },
          },
          {
            id: "grid",
            type: "table",
            x: 48,
            y: 280,
            width: 500,
            height: 80,
            columns: 2,
            headerRows: 1,
            rows: [
              [
                { text: "Region", sourceSpanIds: ["span-h"] },
                { text: "Value" },
              ],
              [{ text: "North" }, { text: "12" }],
            ],
          },
          {
            id: "bars",
            type: "chart",
            chartType: "bar",
            x: 48,
            y: 400,
            width: 500,
            height: 160,
            labels: ["A", "B"],
            data: [10, 20],
            title: "Results",
          },
        ],
      },
    ],
    assets: [
      {
        id: "asset-1",
        kind: "image",
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mimeType: "image/png",
      },
    ],
  };
}

function linkedProject(spec = makeSpec()) {
  const { project } = projectDesignSpecToFlowDocument(
    spec,
    spec.pages[0].elements[0].type === "text"
      ? spec.pages[0].elements[0].text
      : "Quarterly Review",
  );
  project.id = "proj-sync-1";
  project.metadata = {
    designSpec: spec,
    copyCheckStatus: "pass",
    designSpecSync: createInSyncState(spec.id, project.id),
  };
  return { spec, project };
}

function editFlow(project: Project, mutate: (next: Project) => void): Project {
  const next = structuredClone(project);
  mutate(next);
  return syncProjectAfterEdit(project, next);
}

test("sync state: missing, in_sync, stale, and unsupported", () => {
  const plain = createProject();
  plain.family = "document";
  assert.equal(inspectProjectSync(plain).status, "missing_design_spec");
  const { project } = linkedProject();
  assert.equal(inspectProjectSync(project).status, "in_sync");
  const stale = editFlow(project, (next) => {
    next.flow!.pages[0].elements.push({
      id: "orphan",
      type: "text",
      contentIds: [],
      x: 10,
      y: 10,
      width: 80,
      height: 20,
      fontSize: 12,
      fontFamily: "Arial",
      color: "#000",
      overflow: false,
    });
  });
  assert.equal(getStoredSyncState(stale)?.status, "unsupported_edit_detected");
  const missingLink = structuredClone(project);
  missingLink.flow!.pages[0].elements[0].id = "moved-off";
  delete missingLink.flow!.pages[0].elements[0].designLink;
  missingLink.metadata = { designSpec: getStoredDesignSpec(project) };
  const inspected = inspectProjectSync(missingLink);
  assert.equal(inspected.status, "stale");
});

test("element mapping: projected nodes keep DesignSpec links", () => {
  const { spec, project } = linkedProject();
  const frame = project.flow!.pages[0].elements[0];
  const link = getDesignSpecLinkFromEditorElement(
    frame,
    project.flow!.pages[0],
  );
  assert.ok(link);
  assert.equal(link?.designSpecElementId, "headline");
  assert.equal(link?.designSpecPageId, "page-1");
  const matches = getEditorElementsForDesignSpecElement(
    project.flow!,
    "headline",
  );
  assert.equal(matches.length, 1);
  const report = validateProjectionLinks(spec, project.flow!);
  assert.equal(report.valid, true);
  assert.ok(report.linkedCount >= 1);
});

test("patches: style, move, shape, image, table, chart, background", () => {
  const { spec } = linkedProject();
  const style = applyEditorChangeToDesignSpec(spec, {
    kind: "text_style",
    projectId: "p",
    pageId: "page-1",
    editorElementId: "headline",
    linkedDesignSpecElementId: "headline",
    timestamp: "t",
    source: "user",
    patch: { fontSize: 28, color: "#222222" },
  });
  assert.equal(style.applied, true);
  assert.equal(style.state.status, "in_sync");
  const text = style.spec.pages[0].elements.find((el) => el.id === "headline");
  assert.equal(text && text.type === "text" && text.fontSize, 28);

  const moved = applyEditorChangeToDesignSpec(spec, {
    kind: "element_moved",
    projectId: "p",
    editorElementId: "card",
    timestamp: "t",
    source: "user",
    x: 90,
    y: 110,
  });
  const shape = moved.spec.pages[0].elements.find((el) => el.id === "card");
  assert.equal(shape?.x, 90);

  const colored = applyEditorChangeToDesignSpec(spec, {
    kind: "shape_style",
    projectId: "p",
    editorElementId: "card",
    timestamp: "t",
    source: "user",
    fill: "#112233",
  });
  const card = colored.spec.pages[0].elements.find((el) => el.id === "card");
  assert.equal(card && card.type === "shape" && card.fill?.color, "#112233");

  const focal = applyEditorChangeToDesignSpec(spec, {
    kind: "image_focal",
    projectId: "p",
    editorElementId: "photo",
    timestamp: "t",
    source: "user",
    focalPoint: { x: 0.2, y: 0.8 },
  });
  const image = focal.spec.pages[0].elements.find((el) => el.id === "photo");
  assert.equal(image && image.type === "image" && image.focalPoint?.x, 0.2);

  const cell = applyEditorChangeToDesignSpec(spec, {
    kind: "table_cell",
    projectId: "p",
    editorElementId: "grid",
    timestamp: "t",
    source: "user",
    row: 1,
    column: 1,
    nextText: "99",
  });
  const table = cell.spec.pages[0].elements.find((el) => el.id === "grid");
  assert.equal(table && table.type === "table" && table.rows[1][1].text, "99");

  const chart = applyEditorChangeToDesignSpec(spec, {
    kind: "chart_data",
    projectId: "p",
    editorElementId: "bars",
    timestamp: "t",
    source: "user",
    data: [3, 6],
  });
  const bars = chart.spec.pages[0].elements.find((el) => el.id === "bars");
  assert.deepEqual(bars && bars.type === "chart" ? bars.data : [], [3, 6]);

  const bg = applyEditorChangeToDesignSpec(spec, {
    kind: "page_background",
    projectId: "p",
    pageId: "page-1",
    timestamp: "t",
    source: "user",
    color: "#ffffff",
  });
  assert.equal(bg.spec.pages[0].background?.color, "#ffffff");
});

test("copy: source text warns, style and position do not", () => {
  const { spec } = linkedProject();
  const content = applyEditorChangeToDesignSpec(spec, {
    kind: "text_content",
    projectId: "p",
    editorElementId: "headline",
    timestamp: "t",
    source: "user",
    nextText: "Changed title",
    sourceLocked: true,
  });
  assert.equal(content.state.copyChanged, true);
  assert.ok(
    content.issues.some((issue) => issue.code === "copy_changed_after_edit"),
  );

  const style = applyEditorChangeToDesignSpec(spec, {
    kind: "text_style",
    projectId: "p",
    editorElementId: "headline",
    timestamp: "t",
    source: "user",
    patch: { fontSize: 24 },
  });
  assert.equal(style.state.copyChanged, undefined);
  assert.equal(style.state.status, "in_sync");

  const moved = applyEditorChangeToDesignSpec(spec, {
    kind: "element_moved",
    projectId: "p",
    editorElementId: "headline",
    timestamp: "t",
    source: "user",
    x: 60,
    y: 40,
  });
  assert.equal(moved.state.copyChanged, undefined);

  const note = applyEditorChangeToDesignSpec(spec, {
    kind: "text_content",
    projectId: "p",
    editorElementId: "headline",
    timestamp: "t",
    source: "user",
    nextText: "Quarterly Review",
    sourceLocked: false,
  });
  assert.equal(note.state.copyChanged, undefined);

  const table = applyEditorChangeToDesignSpec(spec, {
    kind: "table_cell",
    projectId: "p",
    editorElementId: "grid",
    timestamp: "t",
    source: "user",
    row: 0,
    column: 0,
    nextText: "Area",
    sourceLocked: true,
  });
  assert.equal(table.state.copyChanged, true);
});

test("live edit sync writes DesignSpec and stale blocks native export", async () => {
  const { project } = linkedProject();
  const styled = editFlow(project, (next) => {
    const frame = next.flow!.pages[0].elements[0];
    if (frame.type === "text") frame.fontSize = 30;
  });
  const syncedSpec = getStoredDesignSpec(styled);
  const headline = syncedSpec?.pages[0].elements.find(
    (el) => el.id === "headline",
  );
  assert.equal(headline && headline.type === "text" && headline.fontSize, 30);
  assert.equal(getStoredSyncState(styled)?.status, "in_sync");

  const stale = editFlow(project, (next) => {
    next.flow!.pages[0].decorations = [
      ...(next.flow!.pages[0].decorations || []),
      {
        id: "loose-shape",
        type: "shape",
        shape: "rectangle",
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        fill: "#000",
      },
    ];
  });
  const report = runExportPreflight(
    getStoredDesignSpec(stale)!,
    { spec: getStoredDesignSpec(stale), project: stale },
    normalizePdfOptions(),
  );
  assert.equal(report.status, "blocked");
  assert.ok(
    report.blockers.some((item) => item.code === "designspec_unsupported_edit"),
  );

  const resynced = resyncLinkedDesignSpec(stale);
  assert.equal(resynced.applied, true);
  const after = await runNativePdfExport({
    spec: resynced.spec,
    project: resynced.project,
  });
  assert.equal(after.status, "completed");

  const old = createProject();
  old.family = "document";
  old.flow = project.flow;
  const missing = runExportPreflight(
    makeSpec(),
    { spec: makeSpec(), project: old },
    normalizePdfOptions(),
  );
  assert.ok(
    missing.blockers.some((item) => item.code === "designspec_missing"),
  );
  assert.equal(nativeExportAllowed(inspectProjectSync(old)), "unavailable");
});

test("save metadata keeps synced spec and stale state; old projects stay untouched", () => {
  const { project } = linkedProject();
  const next = editFlow(project, (item) => {
    item.flow!.pages[0].background = "#112233";
  });
  assert.ok(getStoredDesignSpec(next));
  assert.equal(
    getStoredDesignSpec(next)?.pages[0].background?.color,
    "#112233",
  );
  const guest = createProject();
  const saved = syncProjectAfterEdit(guest, { ...guest, name: "Plain" });
  assert.equal(saved.family, guest.family);
  assert.equal(getStoredDesignSpec(saved), undefined);
});

test("rebuild adapter preserves ids and export user copy is plain", () => {
  const { spec, project } = linkedProject();
  const rebuilt = fromFlowDocumentToDesignSpec(project, spec);
  assert.equal(rebuilt.spec.id, spec.id);
  assert.ok(rebuilt.spec.pages[0].elements.some((el) => el.id === "headline"));
  const ops = diffFlowDocuments(project.flow, project.flow, spec, project.id);
  assert.equal(ops.length, 0);
  assert.equal(
    describeSyncForUser(createInSyncState(spec.id, project.id)),
    "Selectable PDF matches your latest edits.",
  );
});
