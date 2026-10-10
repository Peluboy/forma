import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { projectDesignSpecToFlowDocument } from "../src/domain/design-spec/adapters/toFlowDocument.js";
import type { DesignSpec } from "../src/domain/design-spec/types.js";
import {
  applyEditorChangeToDesignSpec,
  createInSyncState,
  getStoredDesignSpec,
  inspectProjectSync,
  nativeExportAllowed,
  resyncLinkedDesignSpec,
  syncProjectAfterEdit,
} from "../src/domain/design-spec/sync/index.js";
import {
  normalizePdfOptions,
  runExportPreflight,
  runNativePdfExport,
} from "../src/domain/export/index.js";
import { createProject, type Project } from "../src/domain/design/model.js";

const flags = new Set(
  process.argv.slice(2).filter((arg) => arg.startsWith("--")),
);
const outputDirectory = flags.has("--artifacts")
  ? resolve("test-results/designspec-sync-benchmark")
  : null;
if (outputDirectory) await mkdir(outputDirectory, { recursive: true });

function spec(): DesignSpec {
  return {
    version: "1.0",
    id: "bench-sync",
    name: "Sync bench",
    family: "document",
    copyPolicy: "light_edit",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        background: { color: "#ffffff" },
        elementIds: ["title", "photo", "box", "grid", "chart"],
        elements: [
          {
            id: "title",
            type: "text",
            text: "Headline",
            x: 48,
            y: 40,
            width: 400,
            height: 40,
            fontFamily: "Helvetica",
            fontSize: 22,
            sourceSpanIds: ["s1"],
          },
          {
            id: "photo",
            type: "image",
            x: 48,
            y: 100,
            width: 160,
            height: 90,
            assetRef: "a1",
            fit: "crop",
            focalPoint: { x: 0.5, y: 0.5 },
          },
          {
            id: "box",
            type: "shape",
            shape: "rectangle",
            x: 230,
            y: 100,
            width: 200,
            height: 80,
            fill: { color: "#dddddd" },
          },
          {
            id: "grid",
            type: "table",
            x: 48,
            y: 220,
            width: 400,
            height: 70,
            columns: 2,
            rows: [[{ text: "A", sourceSpanIds: ["c1"] }, { text: "1" }]],
          },
          {
            id: "chart",
            type: "chart",
            chartType: "bar",
            x: 48,
            y: 320,
            width: 400,
            height: 120,
            labels: ["A"],
            data: [4],
          },
        ],
      },
    ],
    assets: [
      {
        id: "a1",
        kind: "image",
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mimeType: "image/png",
      },
    ],
  };
}

function linked(): Project {
  const source = spec();
  const { project } = projectDesignSpecToFlowDocument(source, "Headline");
  project.metadata = {
    designSpec: source,
    designSpecSync: createInSyncState(source.id, project.id),
  };
  return project;
}

type CaseResult = {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
};

const cases: CaseResult[] = [];
function record(result: CaseResult) {
  cases.push(result);
}

function mutate(project: Project, fn: (next: Project) => void) {
  const next = structuredClone(project);
  fn(next);
  return syncProjectAfterEdit(project, next);
}

const start = linked();

record(
  (() => {
    const next = mutate(start, (project) => {
      const frame = project.flow!.pages[0].elements[0];
      if (frame.type === "text") frame.color = "#333333";
    });
    const el = getStoredDesignSpec(next)?.pages[0].elements[0];
    const passed = Boolean(el && el.type === "text" && el.color === "#333333");
    return {
      id: "1",
      name: "text style edit syncs",
      passed,
      detail: el && el.type === "text" ? String(el.color) : "missing",
    };
  })(),
);

record(
  (() => {
    const result = applyEditorChangeToDesignSpec(spec(), {
      kind: "text_content",
      projectId: "b",
      editorElementId: "title",
      timestamp: "t",
      source: "user",
      nextText: "New title",
      sourceLocked: true,
    });
    return {
      id: "2",
      name: "text content edit marks copy changed",
      passed: Boolean(result.state.copyChanged),
      detail: result.state.copyChanged ? "copy_changed" : "no-warning",
    };
  })(),
);

record(
  (() => {
    const next = mutate(start, (project) => {
      const frame = project.flow!.pages[0].elements[0];
      frame.x = 72;
    });
    const el = getStoredDesignSpec(next)?.pages[0].elements[0];
    return {
      id: "3",
      name: "text move syncs",
      passed: el?.x === 72,
      detail: String(el?.x),
    };
  })(),
);

record(
  (() => {
    const result = applyEditorChangeToDesignSpec(spec(), {
      kind: "image_focal",
      projectId: "b",
      editorElementId: "photo",
      timestamp: "t",
      source: "user",
      focalPoint: { x: 0.1, y: 0.9 },
    });
    const image = result.spec.pages[0].elements.find(
      (item) => item.id === "photo",
    );
    return {
      id: "4",
      name: "image focal point edit syncs",
      passed: Boolean(
        image && image.type === "image" && image.focalPoint?.x === 0.1,
      ),
      detail: "focal",
    };
  })(),
);

record(
  (() => {
    const result = applyEditorChangeToDesignSpec(spec(), {
      kind: "chart_data",
      projectId: "b",
      editorElementId: "chart",
      timestamp: "t",
      source: "user",
      data: [9],
      sourceLocked: true,
    });
    return {
      id: "5",
      name: "chart data edit marks source warning",
      passed: Boolean(
        result.state.copyChanged &&
        result.spec.pages[0].elements.some(
          (el) => el.type === "chart" && el.data[0] === 9,
        ),
      ),
      detail: result.state.copyChanged ? "warned" : "missed",
    };
  })(),
);

record(
  (() => {
    const result = applyEditorChangeToDesignSpec(spec(), {
      kind: "table_cell",
      projectId: "b",
      editorElementId: "grid",
      timestamp: "t",
      source: "user",
      row: 0,
      column: 0,
      nextText: "B",
      sourceLocked: true,
    });
    return {
      id: "6",
      name: "table cell edit marks source warning",
      passed: Boolean(result.state.copyChanged),
      detail: result.state.copyChanged ? "warned" : "missed",
    };
  })(),
);

record(
  (() => {
    const result = applyEditorChangeToDesignSpec(spec(), {
      kind: "shape_style",
      projectId: "b",
      editorElementId: "box",
      timestamp: "t",
      source: "user",
      fill: "#aa0000",
    });
    const shape = result.spec.pages[0].elements.find(
      (item) => item.id === "box",
    );
    return {
      id: "7",
      name: "shape color edit syncs",
      passed: Boolean(
        shape && shape.type === "shape" && shape.fill?.color === "#aa0000",
      ),
      detail: "shape",
    };
  })(),
);

const stale = mutate(start, (project) => {
  project.flow!.pages[0].elements.push({
    id: "extra",
    type: "text",
    contentIds: [],
    x: 8,
    y: 8,
    width: 40,
    height: 16,
    fontSize: 10,
    fontFamily: "Arial",
    color: "#000",
    overflow: false,
  });
});
record({
  id: "8",
  name: "unsupported element add marks stale",
  passed: inspectProjectSync(stale).status === "unsupported_edit_detected",
  detail: inspectProjectSync(stale).status,
});

record(
  (() => {
    const result = applyEditorChangeToDesignSpec(spec(), {
      kind: "text_style",
      projectId: "b",
      editorElementId: "missing-el",
      timestamp: "t",
      source: "user",
      patch: { fontSize: 12 },
    });
    return {
      id: "9",
      name: "linked element missing marks stale",
      passed: result.state.status === "stale",
      detail: result.state.status,
    };
  })(),
);

const blocked = runExportPreflight(
  getStoredDesignSpec(stale)!,
  { spec: getStoredDesignSpec(stale), project: stale },
  normalizePdfOptions(),
);
record({
  id: "10",
  name: "native export blocked when stale",
  passed: blocked.status === "blocked",
  detail: blocked.status,
});

const synced = resyncLinkedDesignSpec(stale);
const exported = await runNativePdfExport({
  spec: synced.spec,
  project: synced.project,
});
record({
  id: "11",
  name: "native export works after sync",
  passed: exported.status === "completed",
  detail: exported.status,
});

const old = createProject();
old.family = "document";
record({
  id: "12",
  name: "old project without DesignSpec falls back safely",
  passed: nativeExportAllowed(inspectProjectSync(old)) === "unavailable",
  detail: inspectProjectSync(old).status,
});

const passed = cases.filter((item) => item.passed).length;
const summary = {
  passed,
  total: cases.length,
  syncSuccessRate: `${Math.round((passed / cases.length) * 100)}%`,
  staleDetections: cases.filter(
    (item) => /stale|unsupported/.test(item.name) && item.passed,
  ).length,
  unsupportedDetections: cases.filter((item) => item.id === "8" && item.passed)
    .length,
  copyWarnings: cases.filter(
    (item) => /copy|source warning/.test(item.name) && item.passed,
  ).length,
  exportBlockedCount: cases.filter((item) => item.id === "10" && item.passed)
    .length,
  resyncSuccessCount: cases.filter((item) => item.id === "11" && item.passed)
    .length,
  nativeExportMatchStatus: exported.status,
  cases,
};
console.log(JSON.stringify(summary, null, 2));
if (outputDirectory) {
  await writeFile(
    resolve(outputDirectory, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
}
if (cases.some((item) => !item.passed)) process.exitCode = 1;
