import { validateDesignSpecCopyCoverage } from "../design-spec/copyCoverage.js";
import type { Project } from "../design/schema.js";
import type {
  DesignElement,
  DesignPage,
  DesignSpec,
  ImageElement,
  TableElement,
  TextElement,
} from "../design-spec/types.js";
import { validateDesignSpec } from "../design-spec/validation.js";
import { measureTextElement } from "../layout-fit/measure.js";
import { canExportProject } from "./permissions.js";
import { isDecorativeImage, resolveExportImage } from "./imageExport.js";
import { mapFontForPdf } from "./fontMapping.js";
import { prepareTable } from "./tableExport.js";
import { prepareChart } from "./chartExport.js";
import { selectPages } from "./options.js";
import {
  getStoredDesignSpec,
  inspectProjectSync,
  nativeExportAllowed,
} from "../design-spec/sync/index.js";
import type {
  ExportBlocker,
  ExportPreflightReport,
  ExportWarning,
  NativeExportInput,
  PdfExportOptions,
} from "./types.js";

const MAX_PAGE_PT = 14400;
const SUPPORTED_TYPES = new Set([
  "text",
  "image",
  "shape",
  "frame",
  "table",
  "chart",
  "group",
]);

function pageUnitScale(unit: DesignSpec["documentSize"]["unit"]): number {
  if (unit === "in") return 72;
  if (unit === "mm") return 72 / 25.4;
  if (unit === "px") return 0.75;
  return 1;
}

export function pageSizePt(
  spec: DesignSpec,
  page: DesignPage,
): { width: number; height: number } {
  const scale = pageUnitScale(spec.documentSize.unit);
  return { width: page.width * scale, height: page.height * scale };
}

export function runExportPreflight(
  spec: DesignSpec,
  input: NativeExportInput,
  options: PdfExportOptions,
): ExportPreflightReport {
  const warnings: ExportWarning[] = [];
  const blockers: ExportBlocker[] = [];
  const addWarning = (warning: ExportWarning) => warnings.push(warning);
  const addBlocker = (blocker: ExportBlocker) => blockers.push(blocker);

  const permission = canExportProject(
    input.user,
    permissionProject(spec, input),
    input.workspace,
    input.client,
  );
  if (!permission.allowed) {
    addBlocker({
      code: "export_unauthorized",
      message: permission.reason || "You cannot export this project.",
    });
  } else if (permission.archived) {
    addWarning({
      code: "archived_context",
      message: "This client or project is archived. Export is still allowed.",
    });
  }

  if (input.project?.family === "document") {
    const sync = inspectProjectSync(input.project);
    const gate = nativeExportAllowed(sync);
    if (gate === "unavailable" || !getStoredDesignSpec(input.project)) {
      addBlocker({
        code: "designspec_missing",
        message: "Selectable PDF is unavailable for this project.",
      });
    } else if (gate === "block") {
      addBlocker({
        code:
          sync.status === "unsupported_edit_detected"
            ? "designspec_unsupported_edit"
            : "designspec_stale",
        message: "Selectable PDF may not match your latest edits.",
      });
    } else if (gate === "warn") {
      addWarning({
        code: "designspec_approximated",
        message: "Selectable PDF has minor limits.",
      });
    }
    if (sync.copyChanged) {
      addWarning({
        code: "copy_changed_after_edit",
        message: "Copy changed after generation.",
      });
    }
  }

  const validation = validateDesignSpec(spec);
  if (!validation.valid) {
    for (const issue of validation.issues) {
      if (
        issue.type === "invalid_asset_ref" &&
        isDecorativeAssetIssue(spec, issue.elementId)
      ) {
        addWarning({
          code: "missing_decorative_image",
          message: issue.message,
          pageId: issue.pageId,
          elementId: issue.elementId,
        });
        continue;
      }
      addBlocker({
        code: `designspec_${issue.type}`,
        message: issue.message,
        pageId: issue.pageId,
        elementId: issue.elementId,
      });
    }
  }

  const pages = selectPages(
    spec.pages.filter((page) => page.metadata?.hidden !== true),
    options.pageRange,
  );
  if (!pages.length) {
    addBlocker({
      code: "no_visible_pages",
      message: "There are no pages to export.",
    });
  }

  for (const page of pages) {
    const size = pageSizePt(spec, page);
    if (
      !Number.isFinite(size.width) ||
      !Number.isFinite(size.height) ||
      size.width <= 0 ||
      size.height <= 0 ||
      size.width > MAX_PAGE_PT ||
      size.height > MAX_PAGE_PT
    ) {
      addBlocker({
        code: "invalid_page_size",
        message: "Page size is invalid.",
        pageId: page.id,
      });
    }

    for (const element of orderedElements(page)) {
      if (!SUPPORTED_TYPES.has(element.type)) {
        addBlocker({
          code: "unsupported_element_type",
          message: `Unsupported element type: ${element.type}.`,
          pageId: page.id,
          elementId: element.id,
        });
        continue;
      }
      if (outsidePage(element, page)) {
        addWarning({
          code: "element_outside_page",
          message: "An element sits outside the page.",
          pageId: page.id,
          elementId: element.id,
        });
      }
      if (element.type === "text") {
        inspectText(element, page.id, input, addWarning, addBlocker);
      } else if (element.type === "image" || element.type === "frame") {
        const image = element as ImageElement;
        if (element.type === "frame" && !image.assetRef) continue;
        const resolved = resolveExportImage(
          {
            ...image,
            type: "image",
            assetRef: image.assetRef || "",
            fit: image.fit || "crop",
          },
          spec.assets,
          page.id,
        );
        resolved.warnings.forEach(addWarning);
        resolved.blockers.forEach(addBlocker);
      } else if (element.type === "table") {
        prepareTable(
          element as TableElement,
          page.id,
          spec.styles?.textStyles,
        ).warnings.forEach(addWarning);
      } else if (element.type === "chart") {
        prepareChart(element, page.id).warnings.forEach(addWarning);
      } else if (element.type === "shape") {
        if (element.shape === "polygon") {
          addWarning({
            code: "shape_approximated",
            message: "A polygon will be drawn as a rectangle.",
            pageId: page.id,
            elementId: element.id,
          });
        }
        if (element.metadata?.effects || element.metadata?.shadow) {
          addWarning({
            code: "unsupported_effect",
            message: options.rasterizeUnsupportedEffects
              ? "An effect will be flattened."
              : "A visual effect is not included in this PDF.",
            pageId: page.id,
            elementId: element.id,
          });
        }
      } else if (element.type === "group") {
        addWarning({
          code: "group_flattened",
          message: "Group hierarchy is flattened in the PDF.",
          pageId: page.id,
          elementId: element.id,
        });
      }
    }
  }

  if (input.graph && spec.copyPolicy === "exact") {
    const copy = validateDesignSpecCopyCoverage(input.graph, spec);
    if (!copy.valid) {
      addBlocker({
        code: "copy_failure",
        message: "Fix copy issues before export.",
      });
    }
  } else if (
    input.project?.metadata?.copyCheckStatus === "fail" ||
    spec.metadata?.copyCheckStatus === "fail"
  ) {
    addBlocker({
      code: "copy_failure",
      message: "Fix copy issues before export.",
    });
  }

  if (input.fitReport && !input.fitReport.valid) {
    addWarning({
      code: "unresolved_fit",
      message: "Some text is tight on the page.",
    });
  } else {
    for (const page of pages) {
      for (const element of page.elements) {
        if (element.type !== "text" || element.hidden) continue;
        const measured = measureTextElement(element);
        if (measured.overflow) {
          addWarning({
            code: "unresolved_fit",
            message: "Some text is tight on the page.",
            pageId: page.id,
            elementId: element.id,
          });
        }
      }
    }
  }

  if (options.includeBleed || options.includeCropMarks) {
    addWarning({
      code: "experimental_print_marks",
      message: "Bleed and crop marks are experimental and not drawn.",
    });
  }

  return {
    status: blockers.length
      ? "blocked"
      : warnings.length
        ? "pass_with_warnings"
        : "pass",
    warnings,
    blockers,
  };
}

export function orderedElements(page: DesignPage): DesignElement[] {
  const byId = new Map(page.elements.map((element) => [element.id, element]));
  const seen = new Set<string>();
  const ordered: DesignElement[] = [];
  const visit = (id: string) => {
    if (seen.has(id)) return;
    const element = byId.get(id);
    if (!element || element.hidden) return;
    seen.add(id);
    if (element.type === "group") {
      ordered.push(element);
      for (const childId of element.childIds) visit(childId);
      return;
    }
    ordered.push(element);
  };
  for (const id of page.elementIds) visit(id);
  for (const element of page.elements) visit(element.id);
  return ordered;
}

function outsidePage(element: DesignElement, page: DesignPage): boolean {
  return (
    element.x + element.width < 0 ||
    element.y + element.height < 0 ||
    element.x > page.width ||
    element.y > page.height
  );
}

function isDecorativeAssetIssue(spec: DesignSpec, elementId?: string): boolean {
  if (!elementId) return false;
  for (const page of spec.pages) {
    const element = page.elements.find((item) => item.id === elementId);
    if (element && (element.type === "image" || element.type === "frame")) {
      return isDecorativeImage(element as ImageElement);
    }
  }
  return false;
}

function permissionProject(
  spec: DesignSpec,
  input: NativeExportInput,
): Project {
  if (input.project) return input.project;
  return {
    id: spec.id,
    name: spec.name,
    workspaceId:
      input.workspace?.id ||
      (typeof spec.metadata?.workspaceId === "string"
        ? spec.metadata.workspaceId
        : undefined),
    clientId:
      input.client?.id ||
      (typeof spec.metadata?.clientId === "string"
        ? spec.metadata.clientId
        : undefined),
    metadata: spec.metadata,
  } as Project;
}

function inspectText(
  element: TextElement,
  pageId: string,
  input: NativeExportInput,
  addWarning: (warning: ExportWarning) => void,
  addBlocker: (blocker: ExportBlocker) => void,
) {
  const mapped = mapFontForPdf(
    element.fontFamily,
    element.fontWeight,
    Boolean(element.metadata?.italic),
    { pageId, elementId: element.id },
  );
  if (mapped.warning) addWarning(mapped.warning);
  if (
    element.hidden &&
    element.sourceSpanIds?.length &&
    input.graph?.copyPolicy === "exact"
  ) {
    addBlocker({
      code: "hidden_required_copy",
      message: "Required copy is hidden.",
      pageId,
      elementId: element.id,
    });
  }
}
