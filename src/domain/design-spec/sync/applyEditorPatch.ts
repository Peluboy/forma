import { validateDesignSpec } from "../validation.js";
import type {
  ChartElement,
  DesignElement,
  DesignPage,
  DesignSpec,
  ImageElement,
  ShapeElement,
  TableElement,
  TextElement,
} from "../types.js";
import { findDesignElement } from "./links.js";
import { emptySyncState } from "./state.js";
import type {
  DesignSpecSyncIssue,
  DesignSpecSyncResult,
  DesignSpecSyncState,
  EditorChangeOperation,
} from "./types.js";

export function applyEditorChangeToDesignSpec(
  spec: DesignSpec,
  change: EditorChangeOperation,
): DesignSpecSyncResult {
  const issues: DesignSpecSyncIssue[] = [];
  const state = emptySyncState(change.projectId, "in_sync", {
    designSpecId: spec.id,
    lastEditorChangeAt: change.timestamp,
    lastSyncedAt: change.timestamp,
  });

  if (change.kind === "unsupported") {
    return unsupported(spec, state, change.reason, change, issues);
  }

  if (change.kind === "page_added") {
    const pageId = change.pageId || `page-${change.timestamp}`;
    if (spec.pages.some((page) => page.id === pageId)) {
      return finish(spec, state, issues, true);
    }
    const page: DesignPage = {
      id: pageId,
      width: change.width || spec.documentSize.width,
      height: change.height || spec.documentSize.height,
      background: { color: "#ffffff" },
      elementIds: [],
      elements: [],
    };
    return finish(
      { ...spec, pages: [...spec.pages, page] },
      { ...state, supportedEditCount: 1 },
      issues,
      true,
    );
  }

  if (change.kind === "page_deleted") {
    const pageId = change.designSpecPageId || change.pageId;
    if (!pageId || !spec.pages.some((page) => page.id === pageId)) {
      return stale(spec, state, "Linked page is missing.", change, issues);
    }
    return finish(
      { ...spec, pages: spec.pages.filter((page) => page.id !== pageId) },
      { ...state, supportedEditCount: 1 },
      issues,
      true,
    );
  }

  if (change.kind === "page_background" || change.kind === "page_hidden") {
    const pageId = change.designSpecPageId || change.pageId;
    const page = spec.pages.find((item) => item.id === pageId);
    if (!page) {
      return stale(spec, state, "Linked page is missing.", change, issues);
    }
    const nextPage: DesignPage =
      change.kind === "page_background"
        ? { ...page, background: { color: change.color } }
        : {
            ...page,
            metadata: { ...(page.metadata || {}), hidden: change.hidden },
          };
    return finish(
      replacePage(spec, nextPage),
      { ...state, supportedEditCount: 1 },
      issues,
      true,
    );
  }

  if (change.kind === "element_added") {
    return unsupported(
      spec,
      state,
      "An added element is not linked to the design.",
      change,
      issues,
    );
  }

  const located = findDesignElement(
    spec,
    change.linkedDesignSpecElementId || change.editorElementId,
    change.designSpecPageId || change.pageId,
  );
  if (!located) {
    return stale(
      spec,
      state,
      "A linked design element is missing.",
      change,
      issues,
    );
  }

  if (change.kind === "element_deleted") {
    const page = spec.pages.find((item) => item.id === located.pageId)!;
    const nextPage: DesignPage = {
      ...page,
      elements: page.elements.filter((item) => item.id !== located.element.id),
      elementIds: page.elementIds.filter((id) => id !== located.element.id),
    };
    return finish(
      replacePage(spec, nextPage),
      { ...state, supportedEditCount: 1 },
      issues,
      true,
    );
  }

  let nextElement: DesignElement = located.element;
  if (change.kind === "text_content") {
    if (located.element.type !== "text") {
      return stale(
        spec,
        state,
        "Text edit targeted a non-text element.",
        change,
        issues,
      );
    }
    nextElement = applyTextContent(located.element, change, issues, state);
  } else if (change.kind === "text_style") {
    if (located.element.type !== "text") {
      return stale(
        spec,
        state,
        "Style edit targeted a non-text element.",
        change,
        issues,
      );
    }
    nextElement = { ...located.element, ...change.patch };
  } else if (change.kind === "element_moved") {
    nextElement = { ...located.element, x: change.x, y: change.y };
  } else if (change.kind === "element_resized") {
    nextElement = {
      ...located.element,
      width: change.width,
      height: change.height,
      x: change.x ?? located.element.x,
      y: change.y ?? located.element.y,
    };
  } else if (change.kind === "shape_style") {
    if (located.element.type !== "shape") {
      return stale(
        spec,
        state,
        "Shape edit targeted a non-shape element.",
        change,
        issues,
      );
    }
    nextElement = applyShape(located.element, change);
  } else if (change.kind === "image_fit" || change.kind === "image_focal") {
    if (located.element.type !== "image" && located.element.type !== "frame") {
      return stale(
        spec,
        state,
        "Image edit targeted a non-image element.",
        change,
        issues,
      );
    }
    nextElement = applyImage(located.element as ImageElement, change);
  } else if (change.kind === "table_cell") {
    if (located.element.type !== "table") {
      return stale(
        spec,
        state,
        "Table edit targeted a non-table element.",
        change,
        issues,
      );
    }
    nextElement = applyTable(located.element, change, issues, state);
  } else if (change.kind === "chart_data") {
    if (located.element.type !== "chart") {
      return stale(
        spec,
        state,
        "Chart edit targeted a non-chart element.",
        change,
        issues,
      );
    }
    nextElement = applyChart(located.element, change, issues, state);
  }

  const page = spec.pages.find((item) => item.id === located.pageId)!;
  const nextSpec = replacePage(spec, {
    ...page,
    elements: page.elements.map((item) =>
      item.id === nextElement.id ? nextElement : item,
    ),
  });
  const before = validateDesignSpec(spec);
  const validation = validateDesignSpec(nextSpec);
  if (!validation.valid) {
    const prior = new Set(
      before.issues.map(
        (issue) => `${issue.type}:${issue.elementId}:${issue.message}`,
      ),
    );
    const added = validation.issues.filter(
      (issue) =>
        !prior.has(`${issue.type}:${issue.elementId}:${issue.message}`),
    );
    if (added.length) {
      return stale(
        spec,
        state,
        added[0]?.message || "Design update failed validation.",
        change,
        issues,
      );
    }
  }
  return finish(
    nextSpec,
    {
      ...state,
      supportedEditCount: 1,
      status:
        state.copyChanged || issues.length
          ? "sync_with_approximations"
          : "in_sync",
    },
    issues,
    true,
  );
}

function applyTextContent(
  element: TextElement,
  change: Extract<EditorChangeOperation, { kind: "text_content" }>,
  issues: DesignSpecSyncIssue[],
  state: DesignSpecSyncState,
): TextElement {
  const sourceLocked = Boolean(
    change.sourceLocked || element.sourceSpanIds?.length,
  );
  if (sourceLocked && change.nextText !== element.text) {
    state.copyChanged = true;
    issues.push({
      code: "copy_changed_after_edit",
      message: "Copy changed after generation.",
      pageId: change.pageId,
      elementId: element.id,
      severity: "warning",
    });
  }
  return { ...element, text: change.nextText };
}

function applyShape(
  element: ShapeElement,
  change: Extract<EditorChangeOperation, { kind: "shape_style" }>,
): ShapeElement {
  return {
    ...element,
    fill: change.fill !== undefined ? { color: change.fill } : element.fill,
    stroke:
      change.stroke !== undefined ? { color: change.stroke } : element.stroke,
    strokeWidth: change.strokeWidth ?? element.strokeWidth,
    opacity: change.opacity ?? element.opacity,
  };
}

function applyImage(
  element: ImageElement,
  change: Extract<EditorChangeOperation, { kind: "image_fit" | "image_focal" }>,
): ImageElement {
  if (change.kind === "image_fit") return { ...element, fit: change.fit };
  return {
    ...element,
    focalPoint: change.focalPoint,
    altText: change.altText ?? element.altText,
  };
}

function applyTable(
  element: TableElement,
  change: Extract<EditorChangeOperation, { kind: "table_cell" }>,
  issues: DesignSpecSyncIssue[],
  state: DesignSpecSyncState,
): TableElement {
  const rows = element.rows.map((row, rowIndex) =>
    row.map((cell, columnIndex) => {
      if (rowIndex !== change.row || columnIndex !== change.column) return cell;
      const sourceLocked = Boolean(
        change.sourceLocked || cell.sourceSpanIds?.length,
      );
      if (sourceLocked && cell.text !== change.nextText) {
        state.copyChanged = true;
        issues.push({
          code: "copy_changed_after_edit",
          message: "Copy changed after generation.",
          pageId: change.pageId,
          elementId: element.id,
          severity: "warning",
        });
      }
      return { ...cell, text: change.nextText };
    }),
  );
  return {
    ...element,
    rows,
    headerRows:
      change.headerRow === undefined
        ? element.headerRows
        : change.headerRow
          ? Math.max(1, element.headerRows || 1)
          : 0,
  };
}

function applyChart(
  element: ChartElement,
  change: Extract<EditorChangeOperation, { kind: "chart_data" }>,
  issues: DesignSpecSyncIssue[],
  state: DesignSpecSyncState,
): ChartElement {
  if (change.sourceLocked) {
    state.copyChanged = true;
    issues.push({
      code: "copy_changed_after_edit",
      message: "Copy changed after generation.",
      pageId: change.pageId,
      elementId: element.id,
      severity: "warning",
    });
  }
  return {
    ...element,
    title: change.title ?? element.title,
    labels: change.labels ?? element.labels,
    data: change.data ?? element.data,
    chartType: change.chartType ?? element.chartType,
  };
}

function replacePage(spec: DesignSpec, page: DesignPage): DesignSpec {
  return {
    ...spec,
    pages: spec.pages.map((item) => (item.id === page.id ? page : item)),
  };
}

function finish(
  spec: DesignSpec,
  state: DesignSpecSyncState,
  issues: DesignSpecSyncIssue[],
  applied: boolean,
): DesignSpecSyncResult {
  return {
    spec,
    state: {
      ...state,
      warnings: issues
        .filter((issue) => issue.severity === "warning")
        .map((issue) => ({
          code: issue.code,
          message: issue.message,
          pageId: issue.pageId,
          elementId: issue.elementId,
        })),
      blockers: issues
        .filter((issue) => issue.severity === "blocker")
        .map((issue) => ({
          code: issue.code,
          message: issue.message,
          pageId: issue.pageId,
          elementId: issue.elementId,
        })),
    },
    issues,
    applied,
  };
}

function stale(
  spec: DesignSpec,
  state: DesignSpecSyncState,
  message: string,
  change: EditorChangeOperation,
  issues: DesignSpecSyncIssue[],
): DesignSpecSyncResult {
  issues.push({
    code: "stale_link",
    message,
    pageId: change.pageId,
    elementId: change.editorElementId,
    severity: "blocker",
  });
  return finish(
    spec,
    { ...state, status: "stale", unsupportedEditCount: 1 },
    issues,
    false,
  );
}

function unsupported(
  spec: DesignSpec,
  state: DesignSpecSyncState,
  message: string,
  change: EditorChangeOperation,
  issues: DesignSpecSyncIssue[],
): DesignSpecSyncResult {
  issues.push({
    code: "unsupported_edit",
    message,
    pageId: change.pageId,
    elementId: change.editorElementId,
    severity: "blocker",
  });
  return finish(
    spec,
    { ...state, status: "unsupported_edit_detected", unsupportedEditCount: 1 },
    issues,
    false,
  );
}
