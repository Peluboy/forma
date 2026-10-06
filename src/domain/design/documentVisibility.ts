import type { FlowDocument, FlowTextFrame } from "./flowDocument.js";

export type DocumentVisibilityIssue = {
  type:
    | "missing_content"
    | "hidden_content"
    | "duplicate_content"
    | "text_overflow"
    | "table_overflow"
    | "page_bounds";
  pageId: string;
  pageNumber: number;
  elementId: string;
  reason: string;
  suggestedAction: string;
};

// Conservative width estimate, shared by document preview and export preflight.
// Rendering never slices text; an uncertain/oversized layout blocks visual export.
export function documentTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const character of text) {
    if (character === "\t") units += 2;
    else if (character === " ") units += 0.38;
    else if (/[ilI.,'!|:;]/.test(character)) units += 0.45;
    else if (/[MW@#%&]/.test(character)) units += 1.05;
    else units += 0.82;
  }
  return units * fontSize;
}

export function wrapDocumentText(
  text: string,
  width: number,
  fontSize: number,
): string[] {
  const lines: string[] = [];
  for (const sourceLine of text.split("\n")) {
    if (!sourceLine) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const char of sourceLine) {
      if (current && documentTextWidth(current + char, fontSize) > width) {
        lines.push(current);
        current = "";
      }
      current += char;
    }
    lines.push(current);
  }
  return lines;
}

export function flowFrameText(
  flow: FlowDocument,
  frame: FlowTextFrame,
): string | null {
  const values: string[] = [];
  for (const id of frame.contentIds) {
    const block = flow.content.find((item) => item.id === id);
    if (!block) return null;
    values.push(block.text);
  }
  return values.join("\n\n");
}

export function inspectDocumentVisibility(
  flow: FlowDocument,
): DocumentVisibilityIssue[] {
  const issues: DocumentVisibilityIssue[] = [];
  const visibleReferences = new Map<
    string,
    { pageId: string; pageNumber: number; elementId: string }[]
  >();
  const allReferences = new Set<string>();
  const add = (
    type: DocumentVisibilityIssue["type"],
    pageId: string,
    pageNumber: number,
    elementId: string,
    reason: string,
    suggestedAction: string,
  ) =>
    issues.push({
      type,
      pageId,
      pageNumber,
      elementId,
      reason,
      suggestedAction,
    });

  if (!flow.pages.some((page) => !page.hidden))
    add(
      "hidden_content",
      flow.pages[0]?.id || "",
      1,
      "document",
      "No document page is visible.",
      "Show at least one page before exporting.",
    );

  flow.pages.forEach((page, index) => {
    const pageNumber = index + 1;
    for (const decoration of page.decorations || []) {
      if (page.hidden || decoration.hidden) continue;
      if (
        ![
          decoration.x,
          decoration.y,
          decoration.width,
          decoration.height,
        ].every(Number.isFinite) ||
        decoration.width <= 0 ||
        decoration.height <= 0 ||
        decoration.x < 0 ||
        decoration.y < 0 ||
        decoration.x + decoration.width > flow.pageSize.width ||
        decoration.y + decoration.height > flow.pageSize.height
      )
        add(
          "page_bounds",
          page.id,
          pageNumber,
          decoration.id,
          "A projected visual element extends outside the page.",
          "Adjust the template geometry so the element stays inside the page.",
        );
    }
    if (!page.hidden) {
      if (
        flow.master.header &&
        documentTextWidth(flow.master.header, 10) > flow.pageSize.width - 108
      )
        add(
          "text_overflow",
          page.id,
          pageNumber,
          "master-header",
          "The header text exceeds the page header area.",
          "Shorten the header or use a wider page.",
        );
      const footer = [
        flow.master.footer,
        flow.master.showPageNumbers
          ? `${pageNumber} / ${flow.pages.length}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ");
      if (footer && documentTextWidth(footer, 10) > flow.pageSize.width - 108)
        add(
          "text_overflow",
          page.id,
          pageNumber,
          "master-footer",
          "The footer text exceeds the page footer area.",
          "Shorten the footer or use a wider page.",
        );
    }
    for (const element of page.elements) {
      const ids =
        element.type === "text" ? element.contentIds : [element.contentId];
      ids.forEach((id) => {
        allReferences.add(id);
        if (!page.hidden) {
          const refs = visibleReferences.get(id) || [];
          refs.push({ pageId: page.id, pageNumber, elementId: element.id });
          visibleReferences.set(id, refs);
        }
      });
      if (page.hidden) continue;
      if (
        ![element.x, element.y, element.width, element.height].every(
          Number.isFinite,
        ) ||
        element.x < 0 ||
        element.y < 0 ||
        element.width <= 0 ||
        element.height <= 0 ||
        element.x + element.width > flow.pageSize.width ||
        element.y + element.height > flow.pageSize.height
      ) {
        add(
          "page_bounds",
          page.id,
          pageNumber,
          element.id,
          "The element extends outside the page.",
          "Move or resize it inside the page.",
        );
      }
      if (element.type === "text") {
        const text = flowFrameText(flow, element);
        if (text === null) {
          add(
            "missing_content",
            page.id,
            pageNumber,
            element.id,
            "The frame points to missing manuscript content.",
            "Restore or remap the content block.",
          );
          continue;
        }
        if (!Number.isFinite(element.fontSize) || element.fontSize <= 0) {
          add(
            "text_overflow",
            page.id,
            pageNumber,
            element.id,
            "The frame has no valid readable font size.",
            "Set a positive font size before exporting.",
          );
          continue;
        }
        const lines = wrapDocumentText(text, element.width, element.fontSize);
        const heightNeeded = lines.length * element.fontSize * 1.35;
        if (
          element.overflow ||
          !Number.isFinite(heightNeeded) ||
          heightNeeded > element.height ||
          lines.some(
            (line) => documentTextWidth(line, element.fontSize) > element.width,
          )
        ) {
          add(
            "text_overflow",
            page.id,
            pageNumber,
            element.id,
            `Text needs more room (${lines.length} visible lines require about ${Math.ceil(heightNeeded)} pt; frame has ${Math.round(element.height)} pt).`,
            "Resize the frame, shorten the copy with approval, or move content to another page.",
          );
        }
      } else {
        const columns = Math.max(
          1,
          ...element.rows.map((row) => (Array.isArray(row) ? row.length : 0)),
        );
        const cellWidth = element.width / columns - 12;
        const rowHeight = element.height / Math.max(1, element.rows.length);
        if (
          element.overflow ||
          !element.rows.length ||
          cellWidth <= 0 ||
          rowHeight < 18 ||
          element.rows.some(
            (row) =>
              !Array.isArray(row) ||
              row.length !== columns ||
              row.some(
                (cell) =>
                  typeof cell !== "string" ||
                  documentTextWidth(cell, 10) > cellWidth,
              ),
          )
        ) {
          add(
            "table_overflow",
            page.id,
            pageNumber,
            element.id,
            "One or more table cells do not fit their columns or rows.",
            "Widen the table, adjust columns, or split it across pages.",
          );
        }
      }
    }
  });
  for (const block of flow.content) {
    if (!block.text && !block.rows?.length) continue;
    const refs = visibleReferences.get(block.id) || [];
    if (!refs.length) {
      add(
        allReferences.has(block.id) ? "hidden_content" : "missing_content",
        flow.pages[0]?.id || "",
        1,
        block.id,
        allReferences.has(block.id)
          ? `Content "${block.label}" is only on a hidden page.`
          : `Content "${block.label}" is not placed on any page.`,
        "Show its page or place the content in a visible frame.",
      );
    } else if (block.kind !== "table" && refs.length > 1) {
      const ref = refs[1];
      add(
        "duplicate_content",
        ref.pageId,
        ref.pageNumber,
        ref.elementId,
        `Content "${block.label}" appears in multiple full-text frames.`,
        "Split the content into distinct blocks or remove the duplicate frame.",
      );
    }
  }
  return issues;
}
