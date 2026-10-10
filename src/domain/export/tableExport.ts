import type {
  TableCell,
  TableElement,
  TextStyle,
} from "../design-spec/types.js";
import { computeLineWraps } from "../layout-fit/measure.js";
import type { ExportWarning } from "./types.js";

export interface PreparedTableCell {
  text: string;
  sourceSpanIds?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  header: boolean;
  overflow: boolean;
  align: NonNullable<TextStyle["align"]>;
}

export interface PreparedTable {
  element: TableElement;
  cells: PreparedTableCell[];
  overflow: boolean;
  warnings: ExportWarning[];
  headerRows: number;
}

export function prepareTable(
  element: TableElement,
  pageId: string,
  styles?: Record<string, TextStyle>,
): PreparedTable {
  const columns = Math.max(1, element.columns || element.rows[0]?.length || 1);
  const rowCount = element.rows.length;
  const colWidth = element.width / columns;
  const rowHeight = rowCount ? element.height / rowCount : element.height;
  const cells: PreparedTableCell[] = [];
  let overflow = false;
  const warnings: ExportWarning[] = [];

  element.rows.forEach((row, ri) => {
    for (let ci = 0; ci < columns; ci++) {
      const cell: TableCell = row[ci] || { text: "" };
      const style = cell.styleRef ? styles?.[cell.styleRef] : undefined;
      const fontFamily = style?.fontFamily || "Inter";
      const fontSize = style?.fontSize || 10;
      const padding = 4;
      const innerWidth = Math.max(8, colWidth - padding * 2);
      const lines = computeLineWraps(
        cell.text || "",
        innerWidth,
        fontFamily,
        fontSize,
      );
      const lineHeight = fontSize * (style?.lineHeight || 1.3);
      const needed = Math.max(lineHeight, lines.length * lineHeight + padding);
      const cellOverflow = needed > rowHeight + 1;
      if (cellOverflow) overflow = true;
      cells.push({
        text: cell.text || "",
        sourceSpanIds: cell.sourceSpanIds,
        x: element.x + ci * colWidth,
        y: element.y + ri * rowHeight,
        width: colWidth,
        height: rowHeight,
        lines,
        header: ri < (element.headerRows || 0),
        overflow: cellOverflow,
        align: style?.align || "left",
      });
    }
  });

  if (overflow) {
    warnings.push({
      code: "table_overflow",
      message: "Table text is tight and may clip inside its cells.",
      pageId,
      elementId: element.id,
    });
  }

  return {
    element,
    cells,
    overflow,
    warnings,
    headerRows: element.headerRows || 0,
  };
}
