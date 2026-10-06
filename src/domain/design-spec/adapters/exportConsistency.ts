import type { Project } from "../../design/model.js";
import type { DesignSpec, TableElement, TextElement } from "../types.js";
import type { FidelityBlocker, FidelityWarning } from "../fidelity/index.js";

export interface ExportConsistencyReport {
  valid: boolean;
  checkedTextElements: number;
  checkedTableCells: number;
  checkedDecorations: number;
  missingText: string[];
  missingTableCells: string[];
  missingDecorations: string[];
  warnings: FidelityWarning[];
  blockers: FidelityBlocker[];
}

/**
 * Verify the projected FlowDocument structurally contains everything the
 * DesignSpec intended. The document PDF is rasterized today, so this is a
 * structural check rather than a native PDF fidelity claim.
 */
export function checkEditorExportConsistency(
  spec: DesignSpec,
  project: Project,
): ExportConsistencyReport {
  const flow = project.flow;
  const missingText: string[] = [];
  const missingTableCells: string[] = [];
  const missingDecorations: string[] = [];
  let checkedTextElements = 0;
  let checkedTableCells = 0;
  let checkedDecorations = 0;

  if (!flow)
    return {
      valid: false,
      checkedTextElements: 0,
      checkedTableCells: 0,
      checkedDecorations: 0,
      missingText: [],
      missingTableCells: [],
      missingDecorations: [],
      warnings: [],
      blockers: [
        {
          code: "missing_flow",
          impact: "export_affecting",
          message: "Projected document has no flow layout.",
        },
      ],
    };

  const allBlocks = flow.content;
  const blockText = new Set(
    allBlocks.flatMap((block) => [block.text, ...(block.rows || []).flat()]),
  );
  const allDecorations = flow.pages.flatMap((page) => page.decorations || []);

  for (const page of spec.pages) {
    if (page.metadata?.hidden === true) continue;
    for (const element of page.elements) {
      if (element.hidden) continue;
      if (element.type === "text") {
        const textEl = element as TextElement;
        if (!textEl.text) continue;
        checkedTextElements += 1;
        if (!blockText.has(textEl.text))
          missingText.push(`${page.id}:${element.id}`);
      } else if (element.type === "table") {
        const tableEl = element as TableElement;
        for (const row of tableEl.rows) {
          for (const cell of row) {
            if (!cell.text) continue;
            checkedTableCells += 1;
            if (!blockText.has(cell.text))
              missingTableCells.push(`${element.id}:${cell.text.slice(0, 24)}`);
          }
        }
      } else if (
        element.type === "shape" ||
        element.type === "image" ||
        element.type === "chart"
      ) {
        checkedDecorations += 1;
        if (!allDecorations.some((decoration) => decoration.id === element.id))
          missingDecorations.push(`${page.id}:${element.id}`);
      }
    }
  }

  const warnings: FidelityWarning[] = [];
  const blockers: FidelityBlocker[] = [];
  if (missingText.length)
    blockers.push({
      code: "export_text_missing",
      impact: "export_affecting",
      message: `${missingText.length} text element(s) are absent from the projected document.`,
    });
  if (missingTableCells.length)
    blockers.push({
      code: "export_table_cells_missing",
      impact: "export_affecting",
      message: `${missingTableCells.length} table cell(s) are absent from the projected document.`,
    });
  if (missingDecorations.length)
    warnings.push({
      code: "export_decorations_missing",
      severity: "medium",
      message: `${missingDecorations.length} projected visual element(s) are absent from the document.`,
    });

  return {
    valid: blockers.length === 0,
    checkedTextElements,
    checkedTableCells,
    checkedDecorations,
    missingText,
    missingTableCells,
    missingDecorations,
    warnings,
    blockers,
  };
}
