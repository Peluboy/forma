import type { ContentGraph } from "../content/types.js";
import type {
  DesignPage,
  DesignSpec,
  TableElement,
  TextElement,
} from "../design-spec/types.js";
import type { TemplateFamily } from "../template-family/types.js";
import { measureTextElement } from "./measure.js";

export interface ContinuationSplit {
  pageId: string;
  elementId: string;
  kind: "text" | "table";
  continuationPages: number;
  spansMoved: number;
  unresolved: boolean;
}

export interface ContinuationReport {
  applied: boolean;
  splits: ContinuationSplit[];
  continuationPageCount: number;
  unresolvedCount: number;
}

export interface ContinuationOptions {
  maxContinuationPages?: number;
  measureRowHeight?: number;
}

interface ContinuationResult {
  page: DesignPage;
  continuations: DesignPage[];
  split?: ContinuationSplit;
}

const DEFAULT_MAX_CONTINUATIONS = 12;
const DEFAULT_ROW_HEIGHT = 22;

function spanText(graph: ContentGraph): Map<string, string> {
  return new Map(graph.spans.map((span) => [span.id, span.text]));
}

function joinSpans(ids: string[], lookup: Map<string, string>): string {
  return ids
    .map((id) => lookup.get(id) ?? "")
    .filter((text) => text.length > 0)
    .join(" ");
}

function textFits(
  text: string,
  geometry: { x: number; y: number; width: number; height: number },
  typography: { fontFamily: string; fontSize: number; lineHeight?: number },
): boolean {
  const candidate: TextElement = {
    id: "measure",
    type: "text",
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    lineHeight: typography.lineHeight,
    text,
  };
  return !measureTextElement(candidate).overflow;
}

/** Greedy span chunking. Never splits a span (word/paragraph unit). */
function chunkSpans(
  ids: string[],
  lookup: Map<string, string>,
  geometry: { x: number; y: number; width: number; height: number },
  typography: { fontFamily: string; fontSize: number; lineHeight?: number },
): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const id of ids) {
    if (!current.length) {
      current = [id];
      continue;
    }
    const candidate = [...current, id];
    if (textFits(joinSpans(candidate, lookup), geometry, typography))
      current = candidate;
    else {
      chunks.push(current);
      current = [id];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function splitPage(
  page: DesignPage,
  family: TemplateFamily,
  lookup: Map<string, string>,
  maxContinuations: number,
  rowHeight: number,
): ContinuationResult {
  const textLayout = family.layouts.find((l) => l.id === "text-continuation");
  const tableLayout = family.layouts.find((l) => l.id === "table-continuation");
  const textGeometry = textLayout?.baseElements.find((e) => e.type === "text");
  const tableGeometry = tableLayout?.baseElements.find(
    (e) => e.type === "table",
  );

  const index = page.elements.findIndex((element) => {
    if (element.hidden) return false;
    if (element.type === "text") {
      if (!element.sourceSpanIds || element.sourceSpanIds.length < 2)
        return false;
      return measureTextElement(element).overflow;
    }
    if (element.type !== "table") return false;
    const available =
      Math.floor(element.height / rowHeight) - element.headerRows;
    return element.rows.length - element.headerRows > available;
  });
  if (index < 0) return { page, continuations: [] };

  const target = page.elements[index];
  const trailing = page.elements.slice(index + 1);
  const before = page.elements.slice(0, index);

  if (target.type === "text") {
    const typography = {
      fontFamily: target.fontFamily,
      fontSize: target.fontSize,
      lineHeight: target.lineHeight,
    };
    const geometry = {
      x: target.x,
      y: textGeometry?.y ?? target.y,
      width: target.width,
      height: textGeometry?.height ?? target.height,
    };
    const allChunks = chunkSpans(
      target.sourceSpanIds!,
      lookup,
      geometry,
      typography,
    );
    if (allChunks.length <= 1)
      return {
        page,
        continuations: [],
        split: {
          pageId: page.id,
          elementId: target.id,
          kind: "text",
          continuationPages: 0,
          spansMoved: 0,
          unresolved: true,
        },
      };

    let chunks = allChunks;
    let capped = false;
    if (allChunks.length - 1 > maxContinuations) {
      const kept = allChunks.slice(0, maxContinuations + 1);
      const rest = allChunks.slice(maxContinuations + 1).flat();
      kept[kept.length - 1] = [...kept[kept.length - 1], ...rest];
      chunks = kept;
      capped = true;
    }
    const total = chunks.length - 1;
    const first = chunks[0];
    const reduced: TextElement = {
      ...target,
      sourceSpanIds: first,
      text: joinSpans(first, lookup),
      metadata: {
        ...target.metadata,
        continuation: {
          continuationIndex: 0,
          totalContinuations: total,
          continuesTo: `${target.id}-cont-1`,
        },
      },
    };
    const nextPage: DesignPage = {
      ...page,
      elements: [...before, reduced],
      elementIds: [...before.map((e) => e.id), reduced.id],
    };
    const continuations: DesignPage[] = [];
    for (let k = 1; k <= total; k++) {
      const ids = chunks[k];
      const isLast = k === total;
      const continuation: TextElement = {
        ...target,
        id: `${target.id}-cont-${k}`,
        text: joinSpans(ids, lookup),
        sourceSpanIds: ids,
        x: target.x,
        y: geometry.y,
        width: target.width,
        height: geometry.height,
        metadata: {
          ...target.metadata,
          continuation: {
            continuationIndex: k,
            totalContinuations: total,
            continuesFrom: k === 1 ? target.id : `${target.id}-cont-${k - 1}`,
            continuesTo: isLast ? undefined : `${target.id}-cont-${k + 1}`,
          },
        },
        provenance: { origin: "system", sourceSpanIds: ids },
      };
      const continuationPage: DesignPage = {
        id: `${page.id}-cont-${k}`,
        name: `${page.name ?? "Page"} (continued)`,
        role: page.role,
        width: page.width,
        height: page.height,
        background: page.background,
        elementIds: isLast
          ? [continuation.id, ...trailing.map((e) => e.id)]
          : [continuation.id],
        elements: isLast ? [continuation, ...trailing] : [continuation],
        metadata: {
          layoutId: "text-continuation",
          continuationOf: page.id,
          continuationIndex: k,
          totalContinuations: total,
          continuedLabel: "Continued",
        },
      };
      continuations.push(continuationPage);
    }
    return {
      page: nextPage,
      continuations,
      split: {
        pageId: page.id,
        elementId: target.id,
        kind: "text",
        continuationPages: total,
        spansMoved: target.sourceSpanIds!.length - first.length,
        unresolved: capped,
      },
    };
  }

  // ── Table continuation ─────────────────────────────────────────────────────
  const table = target as TableElement;
  const headerRows = table.headerRows;
  const header = table.rows.slice(0, headerRows);
  const headerSpans = (table.cellSourceSpanIds ?? []).slice(0, headerRows);
  const body = table.rows.slice(headerRows);
  const bodySpans = (table.cellSourceSpanIds ?? []).slice(headerRows);
  const height = tableGeometry?.height ?? table.height;
  const maxRows = Math.max(1, Math.floor(height / rowHeight));
  const repeatHeader = header.every((row) =>
    row.every((cell) => !cell.sourceSpanIds?.length),
  );
  const availableBody = Math.max(1, maxRows - (repeatHeader ? headerRows : 0));
  if (body.length <= availableBody) return { page, continuations: [] };

  const chunks: { rows: TableElement["rows"]; spans: string[][][] }[] = [];
  for (let start = 0; start < body.length; start += availableBody) {
    chunks.push({
      rows: body.slice(start, start + availableBody),
      spans: bodySpans.slice(start, start + availableBody),
    });
  }
  let capped = false;
  if (chunks.length - 1 > maxContinuations) {
    const kept = chunks.slice(0, maxContinuations + 1);
    const rest = chunks.slice(maxContinuations + 1);
    const last = kept[kept.length - 1];
    last.rows = [...last.rows, ...rest.flatMap((c) => c.rows)];
    last.spans = [...last.spans, ...rest.flatMap((c) => c.spans)];
    chunks.length = 0;
    chunks.push(...kept);
    capped = true;
  }
  const total = chunks.length - 1;

  const firstChunk = chunks[0];
  const reducedRows = [...header, ...firstChunk.rows];
  const reducedSpans = [...headerSpans, ...firstChunk.spans];
  const reduced: TableElement = {
    ...table,
    rows: reducedRows,
    columns: Math.max(1, ...reducedRows.map((r) => r.length)),
    cellSourceSpanIds: reducedSpans,
    metadata: {
      ...table.metadata,
      continuation: {
        continuationIndex: 0,
        totalContinuations: total,
        continuesTo: `${table.id}-cont-1`,
      },
    },
  };
  const nextPage: DesignPage = {
    ...page,
    elements: [...before, reduced],
    elementIds: [...before.map((e) => e.id), reduced.id],
  };

  const continuations: DesignPage[] = [];
  for (let k = 1; k <= total; k++) {
    const isLast = k === total;
    const chunk = chunks[k];
    const rows = repeatHeader ? [...header, ...chunk.rows] : chunk.rows;
    const spans = repeatHeader ? [...headerSpans, ...chunk.spans] : chunk.spans;
    const continuation: TableElement = {
      ...table,
      id: `${table.id}-cont-${k}`,
      rows,
      columns: Math.max(1, ...rows.map((r) => r.length)),
      headerRows: repeatHeader ? headerRows : 0,
      cellSourceSpanIds: spans,
      metadata: {
        ...table.metadata,
        continuation: {
          continuationIndex: k,
          totalContinuations: total,
          continuesFrom: k === 1 ? table.id : `${table.id}-cont-${k - 1}`,
          continuesTo: isLast ? undefined : `${table.id}-cont-${k + 1}`,
        },
      },
      provenance: { origin: "system" },
    };
    const continuationPage: DesignPage = {
      id: `${page.id}-cont-${k}`,
      name: `${page.name ?? "Page"} (continued)`,
      role: page.role,
      width: page.width,
      height: page.height,
      background: page.background,
      elementIds: isLast
        ? [continuation.id, ...trailing.map((e) => e.id)]
        : [continuation.id],
      elements: isLast ? [continuation, ...trailing] : [continuation],
      metadata: {
        layoutId: "table-continuation",
        continuationOf: page.id,
        continuationIndex: k,
        totalContinuations: total,
        continuedLabel: "Continued",
      },
    };
    continuations.push(continuationPage);
  }
  return {
    page: nextPage,
    continuations,
    split: {
      pageId: page.id,
      elementId: table.id,
      kind: "table",
      continuationPages: total,
      spansMoved: bodySpans.flat().length - firstChunk.spans.flat().length,
      unresolved: capped,
    },
  };
}

export function applyContinuationPagination(
  spec: DesignSpec,
  family: TemplateFamily,
  graph: ContentGraph,
  options: ContinuationOptions = {},
): { spec: DesignSpec; report: ContinuationReport } {
  const maxContinuations =
    options.maxContinuationPages ?? DEFAULT_MAX_CONTINUATIONS;
  const rowHeight = options.measureRowHeight ?? DEFAULT_ROW_HEIGHT;
  const lookup = spanText(graph);
  const pages: DesignPage[] = [];
  const splits: ContinuationSplit[] = [];
  let continuationPageCount = 0;
  let unresolvedCount = 0;

  for (const page of spec.pages) {
    const result = splitPage(page, family, lookup, maxContinuations, rowHeight);
    pages.push(result.page, ...result.continuations);
    if (result.split) {
      splits.push(result.split);
      continuationPageCount += result.split.continuationPages;
      if (result.split.unresolved) unresolvedCount += 1;
    }
  }

  return {
    spec: { ...spec, pages },
    report: {
      applied: splits.some((split) => split.continuationPages > 0),
      splits,
      continuationPageCount,
      unresolvedCount,
    },
  };
}
