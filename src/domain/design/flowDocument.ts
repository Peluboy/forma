import { createProject, parseManuscriptBlocks, type Project } from "./model.js";
import { inspectDocumentVisibility } from "./documentVisibility.js";
import {
  createSourceSpans,
  sourceSpanIdsForText,
  stableTextHash,
} from "../content/sourceSpans.js";

export const DOC_PAGE = { width: 612, height: 792 } as const; // US Letter points
export const DOC_MARGIN = 54;
export const DOC_CONTENT_WIDTH = DOC_PAGE.width - DOC_MARGIN * 2;
export const DOC_CONTENT_TOP = 72;
export const DOC_CONTENT_BOTTOM = 72;
export const DOC_CONTENT_HEIGHT =
  DOC_PAGE.height - DOC_CONTENT_TOP - DOC_CONTENT_BOTTOM;

export type DocContentBlock = {
  id: string;
  kind: "heading" | "paragraph" | "citation" | "table";
  label: string;
  text: string;
  rows?: string[][];
  sourceSpanIds?: string[];
};

/** Stable link from a projected editor node back to its DesignSpec source. */
export type DesignSpecLink = {
  designSpecId: string;
  designSpecPageId: string;
  designSpecElementId?: string;
  sourceSpanIds?: string[];
  projectionId?: string;
  projectionVersion?: string;
};

/** Continuation metadata shared by text frames and tables split across pages. */
export type FlowContinuation = {
  continuationIndex: number;
  totalContinuations: number;
  continuesFrom?: string;
  continuesTo?: string;
};

export type FlowTextFrame = {
  id: string;
  type: "text";
  contentIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  overflow: boolean;
  nextFrameId?: string | null;
  /** Optional typography projection from DesignSpec. Absent on legacy frames. */
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  paragraphSpacing?: number;
  /** Provenance carried through the projection so editor output stays traceable. */
  sourceSpanIds?: string[];
  styleRef?: string;
  continuation?: FlowContinuation;
  /** True when this frame intentionally repeats content on a continuation. */
  continuedLabel?: string;
  designLink?: DesignSpecLink;
};

export type FlowTableElement = {
  id: string;
  type: "table";
  contentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  headerRow: boolean;
  rows: string[][];
  overflow: boolean;
  citation?: string;
  /** Per-column proportional widths, when projected from DesignSpec. */
  columnWidths?: number[];
  align?: "left" | "center" | "right";
  sourceSpanIds?: string[];
  /** Per-cell manuscript provenance, aligned with `rows` (row → cell → span ids). */
  cellSourceSpanIds?: string[][][];
  continuation?: FlowContinuation;
  designLink?: DesignSpecLink;
};

/**
 * Visual, non-copy elements projected beneath the flowing text layer. The
 * current editor renders these but does not allow arbitrary vector editing;
 * they exist so generated report pages keep their design language.
 */
export type FlowShapeElement = {
  id: string;
  type: "shape";
  shape: "rectangle" | "rounded" | "ellipse" | "triangle" | "line" | "polygon";
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  locked?: boolean;
  hidden?: boolean;
  designLink?: DesignSpecLink;
};

export type FlowImageElement = {
  id: string;
  type: "image";
  assetRef: string;
  /** Inline legacy data URI where the projected asset had no owned storage. */
  src?: string;
  fit: "fill" | "fit" | "crop";
  focalPoint?: { x: number; y: number };
  altText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  locked?: boolean;
  hidden?: boolean;
  designLink?: DesignSpecLink;
};

export type FlowChartElement = {
  id: string;
  type: "chart";
  chartType: "bar" | "line" | "pie";
  labels: string[];
  data: number[];
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  hidden?: boolean;
  designLink?: DesignSpecLink;
};

export type FlowDecorationElement =
  FlowShapeElement | FlowImageElement | FlowChartElement;

export type PageRole =
  "cover" | "content" | "section" | "table" | "chart" | "other";

export type FlowPage = {
  id: string;
  hidden?: boolean;
  elements: (FlowTextFrame | FlowTableElement)[];
  /** Background shapes/images/charts rendered beneath `elements`. */
  decorations?: FlowDecorationElement[];
  background?: string;
  role?: PageRole;
  designMetadata?: Record<string, unknown>;
  designLink?: DesignSpecLink;
};

export type FlowMaster = {
  header: string;
  footer: string;
  showPageNumbers: boolean;
};

export type FlowDocument = {
  pageSize: { width: number; height: number };
  pages: FlowPage[];
  master: FlowMaster;
  activePageId: string;
  content: DocContentBlock[];
};

export function isFlowDocument(value: unknown): value is FlowDocument {
  if (!value || typeof value !== "object") return false;
  const d = value as FlowDocument;
  return (
    !!d.pageSize &&
    Array.isArray(d.pages) &&
    d.pages.length >= 1 &&
    d.pages.length <= 200 &&
    Array.isArray(d.content) &&
    typeof d.activePageId === "string" &&
    !!d.master
  );
}

/** Parse manuscript into document blocks. Tables use lines starting with `|`. Citations use `[^n]:`. */
export function parseDocumentManuscript(raw: string): DocContentBlock[] {
  const blocks: DocContentBlock[] = [];
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  let para = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const cite = line.match(/^\[\^([^\]]+)\]:\s?(.*)$/);
    if (cite) {
      blocks.push({
        id: `doc-cite-${cite[1]}`.slice(0, 80),
        kind: "citation",
        label: `Citation ${cite[1]}`,
        text: cite[2],
      });
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-{3,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length)
        blocks.push({
          id: `doc-table-${blocks.length}`,
          kind: "table",
          label: "Table",
          text: rows.map((r) => r.join(" | ")).join("\n"),
          rows,
        });
      continue;
    }
    const labeled = line.match(/^([^:]+):\s?(.*)$/);
    if (labeled && /^(title|headline|heading|h1|chapter)$/i.test(labeled[1])) {
      let text = labeled[2];
      i++;
      while (i < lines.length && lines[i].trim() && !lines[i].includes(":")) {
        text += (text ? "\n" : "") + lines[i];
        i++;
      }
      blocks.push({
        id: `doc-heading-${para++}`,
        kind: "heading",
        label: labeled[1].trim(),
        text: text.trim(),
      });
      continue;
    }
    // Paragraph: consume until blank
    let text = line;
    i++;
    while (i < lines.length && lines[i].trim()) {
      if (
        lines[i].trim().startsWith("|") ||
        /^\[\^[^\]]+\]:/.test(lines[i]) ||
        /^([^:]+):\s?/.test(lines[i])
      )
        break;
      text += "\n" + lines[i];
      i++;
    }
    blocks.push({
      id: `doc-para-${para++}`,
      kind: "paragraph",
      label: "Body",
      text: text.trim(),
    });
  }
  // Also fold labeled manuscript fields for compatibility
  if (!blocks.length) {
    const legacy = parseManuscriptBlocks(raw);
    for (const b of legacy) {
      blocks.push({
        id: b.id.replace(/^block-/, "doc-"),
        kind: b.fieldId === "title" ? "heading" : "paragraph",
        label: b.label,
        text: b.text,
      });
    }
  }
  const spans = createSourceSpans(raw, `source-${stableTextHash(raw)}`);
  return blocks.map((block) => {
    const ids =
      block.kind === "table" && block.rows
        ? block.rows.flatMap((row) =>
            row.flatMap((cell) => sourceSpanIdsForText(spans, cell)),
          )
        : sourceSpanIdsForText(spans, block.text);
    return ids.length ? { ...block, sourceSpanIds: [...new Set(ids)] } : block;
  });
}

function estimateLines(text: string, width: number, fontSize: number): number {
  const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.5)));
  return text.split("\n").reduce((sum, para) => {
    if (!para) return sum + 1;
    return sum + Math.max(1, Math.ceil(para.length / charsPerLine));
  }, 0);
}

function blockHeight(block: DocContentBlock, width: number): number {
  if (block.kind === "table" && block.rows) {
    const rowH = 22;
    return Math.max(rowH, block.rows.length * rowH + 8);
  }
  const size = block.kind === "heading" ? 22 : 12;
  const lines = estimateLines(block.text, width, size);
  const leading = size * (block.kind === "heading" ? 1.3 : 1.35);
  return lines * leading + (block.kind === "heading" ? 10 : 8);
}

/** Paginate content into linked frames; tables may split with repeated headers. */
export function paginateDocument(
  content: DocContentBlock[],
  master: FlowMaster = {
    header: "",
    footer: "",
    showPageNumbers: true,
  },
  pageSize: { width: number; height: number } = { width: 612, height: 792 },
): FlowDocument {
  const pages: FlowPage[] = [];
  const width = DOC_CONTENT_WIDTH;
  let pageIndex = 0;
  let y = DOC_CONTENT_TOP;
  let current: FlowPage = { id: `page-${pageIndex + 1}`, elements: [] };
  let frameCounter = 0;

  function newPage() {
    pages.push(current);
    pageIndex++;
    current = { id: `page-${pageIndex + 1}`, elements: [] };
    y = DOC_CONTENT_TOP;
  }

  function remaining() {
    return DOC_PAGE.height - DOC_CONTENT_BOTTOM - y;
  }

  for (const block of content) {
    if (block.kind === "table" && block.rows?.length) {
      let start = 0;
      const header = block.rows[0];
      const body = block.rows.slice(1);
      while (start <= body.length) {
        const avail = remaining();
        const rowH = 22;
        if (avail < rowH * 2) {
          newPage();
          continue;
        }
        const canFit = Math.max(1, Math.floor(avail / rowH) - 1);
        const slice = body.slice(start, start + canFit);
        const rows = start === 0 ? [header, ...slice] : [header, ...slice];
        const height = rows.length * rowH + 8;
        current.elements.push({
          id: `table-${frameCounter++}`,
          type: "table",
          contentId: block.id,
          x: DOC_MARGIN,
          y,
          width,
          height,
          headerRow: true,
          rows,
          overflow: false,
          citation: block.label === "Table" ? undefined : block.label,
        });
        y += height + 12;
        start += canFit;
        if (start >= body.length) break;
        newPage();
      }
      continue;
    }

    const size =
      block.kind === "heading" ? 22 : block.kind === "citation" ? 10 : 12;
    const height = blockHeight(block, width);
    if (height > remaining() && current.elements.length > 0) newPage();

    // If still too tall for an empty page, mark overflow on a max-height frame
    const fitHeight = Math.min(height, DOC_CONTENT_HEIGHT);
    const overflow = height > DOC_CONTENT_HEIGHT;
    current.elements.push({
      id: `frame-${frameCounter++}`,
      type: "text",
      contentIds: [block.id],
      x: DOC_MARGIN,
      y,
      width,
      height: fitHeight,
      fontSize: size,
      fontFamily: block.kind === "heading" ? "Georgia" : "Arial",
      color: "#252920",
      overflow,
      nextFrameId: null,
    });
    y += fitHeight + (block.kind === "heading" ? 14 : 10);

    // Overflow remainder on following pages (simple continuation)
    if (overflow) {
      let left = height - fitHeight;
      let prev = current.elements[current.elements.length - 1] as FlowTextFrame;
      while (left > 0) {
        newPage();
        const chunk = Math.min(left, DOC_CONTENT_HEIGHT);
        const next: FlowTextFrame = {
          id: `frame-${frameCounter++}`,
          type: "text",
          contentIds: [block.id],
          x: DOC_MARGIN,
          y: DOC_CONTENT_TOP,
          width,
          height: chunk,
          fontSize: size,
          fontFamily: prev.fontFamily,
          color: prev.color,
          overflow: left > DOC_CONTENT_HEIGHT,
          nextFrameId: null,
        };
        prev.nextFrameId = next.id;
        current.elements.push(next);
        prev = next;
        y = DOC_CONTENT_TOP + chunk + 10;
        left -= chunk;
      }
    }
  }

  if (!pages.includes(current)) pages.push(current);
  if (!pages.length) pages.push({ id: "page-1", elements: [] });

  return {
    pageSize,
    pages,
    master,
    activePageId: pages[0].id,
    content,
  };
}

export function createDocumentProject(
  manuscript: string,
  name = "Untitled document",
): Project {
  const content = parseDocumentManuscript(manuscript);
  const flow = paginateDocument(content, {
    header: name,
    footer: "",
    showPageNumbers: true,
  });
  const base = createProject();
  return {
    ...base,
    id: crypto.randomUUID(),
    name,
    manuscript,
    family: "document",
    flow,
    designMode: "template",
    updatedAt: new Date().toISOString(),
  };
}

export function documentIssues(project: Project): string[] {
  const flow = project.flow;
  if (!flow) return ["Document layout is missing."];
  const issues = inspectDocumentVisibility(flow).map(
    (issue) =>
      `Page ${issue.pageNumber}, ${issue.elementId}: ${issue.reason} ${issue.suggestedAction}`,
  );
  for (const page of flow.pages)
    for (const element of page.elements)
      if (element.type === "text" && element.fontSize < 11)
        issues.push(
          `Page ${flow.pages.indexOf(page) + 1}, ${element.id}: Font below 11 pt. Increase its size.`,
        );
  return issues;
}

export function addDocumentPage(flow: FlowDocument): FlowDocument {
  if (flow.pages.length >= 200) throw new Error("Document page limit reached.");
  const id = `page-${flow.pages.length + 1}-${crypto.randomUUID().slice(0, 4)}`;
  return {
    ...flow,
    pages: [...flow.pages, { id, elements: [] }],
    activePageId: id,
  };
}

export function removeDocumentPage(
  flow: FlowDocument,
  pageId: string,
): FlowDocument {
  if (flow.pages.length <= 1)
    throw new Error("A document needs at least one page.");
  const pages = flow.pages.filter((p) => p.id !== pageId);
  return {
    ...flow,
    pages,
    activePageId:
      flow.activePageId === pageId ? pages[0].id : flow.activePageId,
  };
}

/** Fixtures for Stage 3 acceptance. */
export function fixtureOnePager(): Project {
  return createDocumentProject(
    `Heading: Quarterly note\n\nA short one-page brief for stakeholders.\n\n| Metric | Value |\n| --- | --- |\n| Reach | 12,400 |\n| Signups | 860 |\n\n[^1]: Internal analytics, September 2026.`,
    "One-pager fixture",
  );
}

export function fixtureReport(pages: number, name: string): Project {
  const chapters: string[] = [
    "Heading: Executive summary\n\nThis report preserves every supplied paragraph and table cell.\n",
  ];
  for (let i = 1; i <= Math.max(1, pages - 1); i++) {
    chapters.push(
      `Heading: Section ${i}\n\n` +
        `${"Detailed findings for this section. ".repeat(18)}\n\n` +
        `| Item | Status | Notes |\n| --- | --- | --- |\n| Checkpoint A | Pass | Stable |\n| Checkpoint B | Watch | Review |\n| Checkpoint C | Pass | OK |\n\n` +
        `[^${i}]: Source note ${i} for section ${i}.\n`,
    );
  }
  return createDocumentProject(chapters.join("\n"), name);
}

export function fixtureTenPageReport(): Project {
  return fixtureReport(10, "10-page report fixture");
}

export function fixtureTwentyPageWhitepaper(): Project {
  return fixtureReport(20, "20-page whitepaper fixture");
}
