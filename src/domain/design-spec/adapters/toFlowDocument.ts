import { createProject, type Project } from "../../design/model.js";
import type {
  DocContentBlock,
  FlowChartElement,
  FlowDecorationElement,
  FlowDocument,
  FlowImageElement,
  FlowPage,
  FlowShapeElement,
  FlowTableElement,
  FlowTextFrame,
  PageRole,
} from "../../design/flowDocument.js";
import type {
  ChartElement,
  DesignElement,
  DesignPage,
  DesignSpec,
  GroupElement,
  ImageElement,
  ShapeElement,
  TableElement,
  TextElement,
} from "../types.js";
import {
  buildFidelityReport,
  makeFidelityItem,
  type EditorProjectionFidelityReport,
  type FidelityBlocker,
  type FidelityItem,
  type FidelityWarning,
  type ProjectionOutcome,
} from "../fidelity/index.js";
import { makeDesignLink } from "../sync/links.js";

/**
 * Fonts the document editor and exporter can render reliably. DesignSpec fonts
 * outside this set are approximated to Arial and reported as a transformation.
 */
const EDITOR_FONTS = new Set([
  "Inter",
  "Playfair Display",
  "DM Sans",
  "Lora",
  "Manrope",
  "Plus Jakarta Sans",
  "Roboto",
  "Space Grotesk",
  "Georgia",
  "Arial",
  "system-ui",
]);

const PAGE_ROLE_MAP: Record<string, PageRole> = {
  cover: "cover",
  section: "section",
  content: "content",
  table: "table",
  chart: "chart",
};

function readContinuation(
  metadata: Record<string, unknown> | undefined,
): import("../../design/flowDocument.js").FlowContinuation | undefined {
  const value = metadata?.continuation;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (
    typeof record.continuationIndex !== "number" ||
    typeof record.totalContinuations !== "number"
  )
    return undefined;
  return {
    continuationIndex: record.continuationIndex,
    totalContinuations: record.totalContinuations,
    continuesFrom:
      typeof record.continuesFrom === "string"
        ? record.continuesFrom
        : undefined,
    continuesTo:
      typeof record.continuesTo === "string" ? record.continuesTo : undefined,
  };
}

interface ProjectionContext {
  spec: DesignSpec;
  contentBlocks: DocContentBlock[];
  blockCounter: { value: number };
  frameCounter: { value: number };
}

export interface ProjectionResult {
  project: Project;
  fidelity: EditorProjectionFidelityReport;
}

function emptyOutcome(): ProjectionOutcome<null> {
  return { projected: null, fidelityItems: [], warnings: [], blockers: [] };
}

function preserved(
  kind: FidelityItem["kind"],
  pageId: string,
  elementId: string,
  property: string,
  userImpact: string,
  originalValue?: unknown,
  projectedValue?: unknown,
): FidelityItem {
  return makeFidelityItem({
    kind,
    pageId,
    elementId,
    property,
    originalValue,
    projectedValue,
    impact: "preserved",
    userImpact,
  });
}

// ─── TEXT ────────────────────────────────────────────────────────────────────

export function projectTextElement(
  el: TextElement,
  pageId: string,
  ctx: ProjectionContext,
): { frame: FlowTextFrame; outcome: ProjectionOutcome<FlowTextFrame> } {
  const items: FidelityItem[] = [];
  const warnings: FidelityWarning[] = [];
  const blockers: FidelityBlocker[] = [];

  const isHeading =
    (el.fontSize || 12) >= 18 ||
    el.id.includes("heading") ||
    el.id.includes("title");

  const blockId = `block-${ctx.blockCounter.value++}`;
  const sourceSpanIds = el.sourceSpanIds || [];
  const block: DocContentBlock = {
    id: blockId,
    kind: isHeading ? "heading" : "paragraph",
    label: isHeading ? "Heading" : "Paragraph",
    text: el.text,
    sourceSpanIds: sourceSpanIds.length ? sourceSpanIds : undefined,
  };
  ctx.contentBlocks.push(block);

  // Font mapping: preserve known editor fonts, approximate the rest.
  let fontFamily = el.fontFamily || "Arial";
  if (fontFamily && !EDITOR_FONTS.has(fontFamily)) {
    items.push(
      makeFidelityItem({
        kind: "typography",
        pageId,
        elementId: el.id,
        property: "fontFamily",
        originalValue: fontFamily,
        projectedValue: "Arial",
        impact: "acceptable_approximation",
        severity: "low",
        userImpact: `Font "${fontFamily}" is not bundled; text renders in Arial.`,
        recommendedFix: "Use a bundled font in the template family.",
      }),
    );
    fontFamily = "Arial";
  } else {
    items.push(
      preserved(
        "typography",
        pageId,
        el.id,
        "fontFamily",
        `Font "${fontFamily}" preserved.`,
        fontFamily,
        fontFamily,
      ),
    );
  }

  items.push(
    preserved(
      "text",
      pageId,
      el.id,
      "text",
      "Approved text preserved.",
      el.text,
      el.text,
    ),
  );
  if (sourceSpanIds.length) {
    items.push(
      preserved(
        "text",
        pageId,
        el.id,
        "sourceSpanIds",
        "Manuscript source provenance preserved.",
        sourceSpanIds.length,
        sourceSpanIds.length,
      ),
    );
  } else if (el.text.trim()) {
    items.push(
      makeFidelityItem({
        kind: "text",
        pageId,
        elementId: el.id,
        property: "sourceSpanIds",
        impact: "copy_affecting",
        userImpact:
          "Visible text has no manuscript source spans after projection.",
        recommendedFix:
          "Regenerate from a validated DesignSpec with explicit spans.",
      }),
    );
  }

  for (const property of [
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "color",
    "align",
  ] as const) {
    const value = (el as unknown as Record<string, unknown>)[property];
    if (value === undefined) continue;
    items.push(
      preserved(
        "typography",
        pageId,
        el.id,
        property,
        `${property} preserved.`,
        value,
        value,
      ),
    );
  }

  if (el.verticalAlign && el.verticalAlign !== "top") {
    items.push(
      makeFidelityItem({
        kind: "typography",
        pageId,
        elementId: el.id,
        property: "verticalAlign",
        originalValue: el.verticalAlign,
        projectedValue: "top",
        impact: "acceptable_approximation",
        userImpact: "Vertical alignment is stored but rendered top-aligned.",
        recommendedFix: "Adjust the element box if vertical placement matters.",
      }),
    );
  }
  if (el.paragraphSpacing !== undefined) {
    items.push(
      makeFidelityItem({
        kind: "typography",
        pageId,
        elementId: el.id,
        property: "paragraphSpacing",
        originalValue: el.paragraphSpacing,
        projectedValue: el.paragraphSpacing,
        impact: "acceptable_approximation",
        severity: "low",
        userImpact:
          "Paragraph spacing stored as metadata; renderer uses default leading.",
      }),
    );
  }
  if (el.runs && el.runs.length > 1) {
    items.push(
      makeFidelityItem({
        kind: "typography",
        pageId,
        elementId: el.id,
        property: "runs",
        impact: "editability_affecting",
        userImpact: "Rich-text runs are flattened to a single styled frame.",
        recommendedFix: "Use one style per frame until run editing exists.",
      }),
    );
  }
  if (el.constraints) {
    items.push(
      makeFidelityItem({
        kind: "typography",
        pageId,
        elementId: el.id,
        property: "constraints",
        impact: "acceptable_approximation",
        severity: "low",
        userImpact:
          "Resize/font constraints stored as metadata, not enforced in the editor.",
      }),
    );
  }
  if (el.rotation) {
    items.push(
      makeFidelityItem({
        kind: "text",
        pageId,
        elementId: el.id,
        property: "rotation",
        originalValue: el.rotation,
        impact: "editability_affecting",
        userImpact: "Rotation is not supported by the document editor.",
      }),
    );
    warnings.push({
      code: "rotation_unsupported",
      pageId,
      elementId: el.id,
      severity: "medium",
      message: `Text element ${el.id} rotation (${el.rotation}) is not editable.`,
    });
  }

  const continuation = readContinuation(el.metadata);
  const frame: FlowTextFrame = {
    id: el.id,
    type: "text",
    contentIds: [blockId],
    continuation,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    fontSize: el.fontSize || (isHeading ? 22 : 11),
    fontFamily,
    color: el.color || "#0f172a",
    overflow: el.overflow === "clip",
    fontWeight: el.fontWeight,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    align: el.align,
    verticalAlign: el.verticalAlign,
    paragraphSpacing: el.paragraphSpacing,
    sourceSpanIds: sourceSpanIds.length ? sourceSpanIds : undefined,
    styleRef: el.styleRef,
  };

  return {
    frame,
    outcome: { projected: frame, fidelityItems: items, warnings, blockers },
  };
}

// ─── TABLE ───────────────────────────────────────────────────────────────────

export function projectTableElement(
  el: TableElement,
  pageId: string,
  ctx: ProjectionContext,
): { frame: FlowTableElement; outcome: ProjectionOutcome<FlowTableElement> } {
  const items: FidelityItem[] = [];
  const warnings: FidelityWarning[] = [];
  const blockers: FidelityBlocker[] = [];

  const blockId = `block-table-${ctx.blockCounter.value++}`;
  const rawRows = el.rows.map((row) => row.map((cell) => cell.text));
  const cellSourceSpanIds = el.rows.map((row) =>
    row.map((cell) => (cell.sourceSpanIds?.length ? cell.sourceSpanIds : [])),
  );

  const block: DocContentBlock = {
    id: blockId,
    kind: "table",
    label: "Table",
    text: rawRows.map((r) => r.join(" | ")).join("\n"),
    rows: rawRows,
    sourceSpanIds: el.sourceSpanIds?.length ? el.sourceSpanIds : undefined,
  };
  ctx.contentBlocks.push(block);

  items.push(
    preserved(
      "table",
      pageId,
      el.id,
      "rows",
      `${el.rows.length} row(s) preserved as an editable table.`,
      el.rows.length,
      el.rows.length,
    ),
  );

  let cellsWithoutSpans = 0;
  let totalCells = 0;
  for (const row of el.rows) {
    for (const cell of row) {
      if (!cell.text.trim()) continue;
      totalCells += 1;
      if (!cell.sourceSpanIds?.length) cellsWithoutSpans += 1;
      if (cell.styleRef) {
        items.push(
          makeFidelityItem({
            kind: "table",
            pageId,
            elementId: el.id,
            property: "cell.styleRef",
            originalValue: cell.styleRef,
            impact: "quality_affecting",
            severity: "low",
            userImpact:
              "Cell text style is not projected; table uses the default style.",
          }),
        );
      }
    }
  }
  if (cellsWithoutSpans > 0) {
    items.push(
      makeFidelityItem({
        kind: "table",
        pageId,
        elementId: el.id,
        property: "cellSourceSpanIds",
        originalValue: totalCells,
        projectedValue: totalCells - cellsWithoutSpans,
        impact: "acceptable_approximation",
        severity: "low",
        userImpact: `${cellsWithoutSpans} table cell(s) lack manuscript provenance.`,
      }),
    );
  } else if (totalCells > 0) {
    items.push(
      preserved(
        "table",
        pageId,
        el.id,
        "cellSourceSpanIds",
        "Table cell provenance preserved.",
        totalCells,
        totalCells,
      ),
    );
  }

  if (el.headerRows > 0) {
    items.push(
      preserved(
        "table",
        pageId,
        el.id,
        "headerRows",
        "Header rows preserved.",
        el.headerRows,
        el.headerRows,
      ),
    );
  }

  const frame: FlowTableElement = {
    id: el.id,
    type: "table",
    contentId: blockId,
    continuation: readContinuation(el.metadata),
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    headerRow: el.headerRows > 0,
    rows: rawRows,
    overflow: false,
    cellSourceSpanIds,
    sourceSpanIds: el.sourceSpanIds,
  };

  return {
    frame,
    outcome: { projected: frame, fidelityItems: items, warnings, blockers },
  };
}

// ─── SHAPE ───────────────────────────────────────────────────────────────────

export function projectShapeElement(
  el: ShapeElement,
  pageId: string,
): {
  decoration: FlowShapeElement;
  outcome: ProjectionOutcome<FlowShapeElement>;
} {
  const items: FidelityItem[] = [];
  const warnings: FidelityWarning[] = [];
  const blockers: FidelityBlocker[] = [];

  let shape = el.shape;
  if (shape === "polygon") {
    items.push(
      makeFidelityItem({
        kind: "shape",
        pageId,
        elementId: el.id,
        property: "shape",
        originalValue: "polygon",
        projectedValue: "rectangle",
        impact: "acceptable_approximation",
        severity: "low",
        userImpact: "Arbitrary polygon rendered as a rectangle.",
      }),
    );
    shape = "rectangle";
  } else {
    items.push(
      preserved(
        "shape",
        pageId,
        el.id,
        "shape",
        `${shape} shape preserved.`,
        shape,
        shape,
      ),
    );
  }
  if (el.fill?.color) {
    items.push(
      preserved(
        "shape",
        pageId,
        el.id,
        "fill",
        "Fill color preserved.",
        el.fill.color,
        el.fill.color,
      ),
    );
  }
  if (el.stroke?.color) {
    items.push(
      preserved(
        "shape",
        pageId,
        el.id,
        "stroke",
        "Stroke preserved.",
        el.stroke.color,
        el.stroke.color,
      ),
    );
  }

  const decoration: FlowShapeElement = {
    id: el.id,
    type: "shape",
    shape: shape as FlowShapeElement["shape"],
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    fill: el.fill?.color,
    stroke: el.stroke?.color,
    strokeWidth: el.strokeWidth,
    opacity: el.opacity,
    locked: el.locked,
    hidden: el.hidden,
  };

  return {
    decoration,
    outcome: {
      projected: decoration,
      fidelityItems: items,
      warnings,
      blockers,
    },
  };
}

// ─── IMAGE ───────────────────────────────────────────────────────────────────

export function projectImageElement(
  el: ImageElement,
  pageId: string,
  spec: DesignSpec,
): {
  decoration: FlowImageElement;
  outcome: ProjectionOutcome<FlowImageElement>;
} {
  const items: FidelityItem[] = [];
  const warnings: FidelityWarning[] = [];
  const blockers: FidelityBlocker[] = [];

  const asset = spec.assets?.find((item) => item.id === el.assetRef);
  const src = asset?.uri;

  items.push(
    preserved(
      "image",
      pageId,
      el.id,
      "assetRef",
      "Image element preserved.",
      el.assetRef,
      el.assetRef,
    ),
  );
  items.push(
    preserved(
      "image",
      pageId,
      el.id,
      "fit",
      `Image fit "${el.fit}" preserved.`,
      el.fit,
      el.fit,
    ),
  );
  if (el.altText) {
    items.push(
      preserved(
        "image",
        pageId,
        el.id,
        "altText",
        "Alt text preserved.",
        el.altText,
        el.altText,
      ),
    );
  }
  if (!src) {
    items.push(
      makeFidelityItem({
        kind: "asset",
        pageId,
        elementId: el.id,
        property: "assetRef",
        originalValue: el.assetRef,
        impact: "quality_affecting",
        userImpact:
          "Image asset has no inline data; a placeholder is rendered.",
        recommendedFix:
          "Attach the asset before generating the editable document.",
      }),
    );
    warnings.push({
      code: "image_asset_missing",
      pageId,
      elementId: el.id,
      severity: "medium",
      message: `Image ${el.id} has no resolvable asset data; showing a placeholder.`,
    });
  } else if (asset?.legacyInline) {
    warnings.push({
      code: "image_inline_legacy",
      pageId,
      elementId: el.id,
      severity: "low",
      message: `Image ${el.id} uses inline legacy data; move it to owned storage.`,
    });
  }
  if (el.crop || (el.fit === "crop" && el.focalPoint)) {
    items.push(
      makeFidelityItem({
        kind: "image",
        pageId,
        elementId: el.id,
        property: el.crop ? "crop" : "focalPoint",
        originalValue: el.crop ?? el.focalPoint,
        impact: "acceptable_approximation",
        severity: "low",
        userImpact:
          "Crop/focal point is stored but the editor centers the image.",
        recommendedFix:
          "Fine image crop controls are not yet available in the document editor.",
      }),
    );
  }
  if (el.frameId) {
    items.push(
      makeFidelityItem({
        kind: "image",
        pageId,
        elementId: el.id,
        property: "frameId",
        originalValue: el.frameId,
        impact: "quality_affecting",
        severity: "low",
        userImpact:
          "Frame/mask relationship is not projected; image renders unmasked.",
      }),
    );
  }

  const decoration: FlowImageElement = {
    id: el.id,
    type: "image",
    assetRef: el.assetRef,
    src,
    fit: el.fit,
    focalPoint: el.focalPoint,
    altText: el.altText,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    opacity: el.opacity,
    locked: el.locked,
    hidden: el.hidden,
  };

  return {
    decoration,
    outcome: {
      projected: decoration,
      fidelityItems: items,
      warnings,
      blockers,
    },
  };
}

// ─── CHART ───────────────────────────────────────────────────────────────────

export function projectChartElement(
  el: ChartElement,
  pageId: string,
): {
  decoration: FlowChartElement;
  outcome: ProjectionOutcome<FlowChartElement>;
} {
  const items: FidelityItem[] = [
    preserved(
      "chart",
      pageId,
      el.id,
      "data",
      `Chart preserved as structured ${el.chartType} data (${el.data?.length ?? 0} points).`,
      el.data,
      el.data,
    ),
    preserved(
      "chart",
      pageId,
      el.id,
      "labels",
      "Chart labels preserved.",
      el.labels,
      el.labels,
    ),
  ];
  if (el.title) {
    items.push(
      preserved(
        "chart",
        pageId,
        el.id,
        "title",
        "Chart title preserved.",
        el.title,
        el.title,
      ),
    );
  }
  items.push(
    makeFidelityItem({
      kind: "chart",
      pageId,
      elementId: el.id,
      property: "editability",
      impact: "acceptable_approximation",
      severity: "low",
      userImpact:
        "Chart is projected as a structured visual block, not a full chart editor.",
      recommendedFix:
        "Chart data editing is planned; data remains intact for re-projection.",
    }),
  );

  const decoration: FlowChartElement = {
    id: el.id,
    type: "chart",
    chartType: el.chartType,
    labels: el.labels,
    data: el.data,
    title: el.title,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    opacity: el.opacity,
    hidden: el.hidden,
  };

  return {
    decoration,
    outcome: {
      projected: decoration,
      fidelityItems: items,
      warnings: [
        {
          code: "chart_editability_limited",
          pageId,
          elementId: el.id,
          severity: "low",
          message: `Chart ${el.id} is projected as a structured visual block; visual editing is limited.`,
        },
      ],
      blockers: [],
    },
  };
}

// ─── ELEMENT DISPATCH ────────────────────────────────────────────────────────

type ElementProjection =
  | {
      kind: "flow";
      element: FlowTextFrame | FlowTableElement;
      outcome: ProjectionOutcome<unknown>;
    }
  | {
      kind: "decoration";
      element: FlowDecorationElement;
      outcome: ProjectionOutcome<unknown>;
    }
  | { kind: "none"; outcome: ProjectionOutcome<null> };

export function projectElement(
  el: DesignElement,
  pageId: string,
  ctx: ProjectionContext,
): ElementProjection {
  switch (el.type) {
    case "text": {
      const { frame, outcome } = projectTextElement(el, pageId, ctx);
      return { kind: "flow", element: frame, outcome };
    }
    case "table": {
      const { frame, outcome } = projectTableElement(el, pageId, ctx);
      return { kind: "flow", element: frame, outcome };
    }
    case "shape": {
      const { decoration, outcome } = projectShapeElement(el, pageId);
      return { kind: "decoration", element: decoration, outcome };
    }
    case "image": {
      const { decoration, outcome } = projectImageElement(el, pageId, ctx.spec);
      return { kind: "decoration", element: decoration, outcome };
    }
    case "chart": {
      const { decoration, outcome } = projectChartElement(el, pageId);
      return { kind: "decoration", element: decoration, outcome };
    }
    case "frame": {
      const items: FidelityItem[] = [
        makeFidelityItem({
          kind: "image",
          pageId,
          elementId: el.id,
          property: "frame",
          impact: "unsupported",
          severity: "low",
          userImpact:
            "Frame/mask element is not editable in the document editor.",
        }),
      ];
      return {
        kind: "none",
        outcome: {
          projected: null,
          fidelityItems: items,
          warnings: [
            {
              code: "frame_unsupported",
              pageId,
              elementId: el.id,
              severity: "low",
              message: `Frame ${el.id} has no editable representation.`,
            },
          ],
          blockers: [],
        },
      };
    }
    case "group": {
      const group = el as GroupElement;
      return {
        kind: "none",
        outcome: {
          projected: null,
          fidelityItems: [
            makeFidelityItem({
              kind: "group",
              pageId,
              elementId: group.id,
              property: "childIds",
              impact: "unsupported",
              severity: "low",
              userImpact: `Group ${group.id} has no grouping model; children remain individually editable.`,
            }),
          ],
          warnings: [
            {
              code: "group_unsupported",
              pageId,
              elementId: group.id,
              severity: "low",
              message: `Group ${group.id} is flattened; children project individually.`,
            },
          ],
          blockers: [],
        },
      };
    }
    default:
      return {
        kind: "none",
        outcome: emptyOutcome() as ProjectionOutcome<null>,
      };
  }
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export function projectPage(
  page: DesignPage,
  ctx: ProjectionContext,
): { page: FlowPage; outcome: ProjectionOutcome<FlowPage> } {
  const items: FidelityItem[] = [];
  const warnings: FidelityWarning[] = [];
  const blockers: FidelityBlocker[] = [];
  const elements: (FlowTextFrame | FlowTableElement)[] = [];
  const decorations: FlowDecorationElement[] = [];

  const ordered = new Map(
    page.elements.map((element) => [element.id, element]),
  );
  for (const id of page.elementIds) {
    const el = ordered.get(id);
    if (!el || el.hidden) continue;
    const projection = projectElement(el, page.id, ctx);
    items.push(...projection.outcome.fidelityItems);
    warnings.push(...projection.outcome.warnings);
    blockers.push(...projection.outcome.blockers);
    const link = makeDesignLink(ctx.spec.id, page.id, el.id, el.sourceSpanIds);
    if (projection.kind === "flow")
      elements.push({ ...projection.element, designLink: link });
    else if (projection.kind === "decoration")
      decorations.push({ ...projection.element, designLink: link });
  }

  const flowPage: FlowPage = {
    id: page.id,
    elements,
    decorations: decorations.length ? decorations : undefined,
    background: page.background?.color,
    role: page.role ? (PAGE_ROLE_MAP[page.role] ?? "other") : undefined,
    designLink: makeDesignLink(ctx.spec.id, page.id),
    designMetadata: {
      ...(page.metadata || {}),
      designSpecName: page.name,
    },
  };

  if (
    page.width !== ctx.spec.documentSize.width ||
    page.height !== ctx.spec.documentSize.height
  ) {
    items.push(
      makeFidelityItem({
        kind: "page",
        pageId: page.id,
        property: "size",
        originalValue: { width: page.width, height: page.height },
        projectedValue: {
          width: ctx.spec.documentSize.width,
          height: ctx.spec.documentSize.height,
        },
        impact: "acceptable_approximation",
        severity: "low",
        userImpact:
          "Per-page size differs from the document size; the document size is used.",
      }),
    );
  }

  return {
    page: flowPage,
    outcome: { projected: flowPage, fidelityItems: items, warnings, blockers },
  };
}

// ─── TOP LEVEL ───────────────────────────────────────────────────────────────

export function projectDesignSpecToFlowDocument(
  spec: DesignSpec,
  manuscript: string,
): ProjectionResult {
  const project = createProject();
  project.name = spec.name || "Forma Report Draft";
  project.family = "document";
  project.manuscript = manuscript;
  project.copyPolicy = spec.copyPolicy;

  const ctx: ProjectionContext = {
    spec,
    contentBlocks: [],
    blockCounter: { value: 1 },
    frameCounter: { value: 1 },
  };

  const pageResults = spec.pages.map((page) => projectPage(page, ctx));
  const flowPages: FlowPage[] = pageResults.map((result) => result.page);

  const flow: FlowDocument = {
    pageSize: {
      width: spec.documentSize.width || 612,
      height: spec.documentSize.height || 792,
    },
    master: {
      header: spec.name,
      footer: "Forma Editorial Report",
      showPageNumbers: true,
    },
    activePageId: flowPages[0]?.id || "page-1",
    pages: flowPages.length > 0 ? flowPages : [{ id: "page-1", elements: [] }],
    content: ctx.contentBlocks,
  };
  project.flow = flow;

  const outcomes = pageResults.map((result) => result.outcome);
  const items = outcomes.flatMap((outcome) => outcome.fidelityItems);
  const warnings = outcomes.flatMap((outcome) => outcome.warnings);
  const blockers = outcomes.flatMap((outcome) => outcome.blockers);

  const fidelity = buildFidelityReport({
    sourceSpecId: spec.id,
    projectedProjectId: project.id,
    items,
    warnings,
    blockers,
  });

  return { project, fidelity };
}

/** Backward-compatible entry point: returns only the editable project. */
export function toFlowDocumentProject(
  spec: DesignSpec,
  manuscript: string,
): Project {
  return projectDesignSpecToFlowDocument(spec, manuscript).project;
}
