import type {
  ExportBlocker,
  ExportFidelityItem,
  ExportFidelityReport,
  ExportFidelityStatus,
  ExportPreflightReport,
  ExportWarning,
} from "./types.js";

export function emptyFidelity(
  status: ExportFidelityStatus,
  extras?: Partial<ExportFidelityReport>,
): ExportFidelityReport {
  return {
    status,
    score: status === "export_trusted" ? 100 : 0,
    preservedText: [],
    selectableText: false,
    items: [],
    fontSubstitutions: [],
    approximatedShapes: 0,
    rasterizedEffects: 0,
    imageChanges: 0,
    chartApproximations: 0,
    tableChanges: 0,
    unsupportedProperties: [],
    warnings: [],
    blockedItems: [],
    ...extras,
  };
}

export function buildExportFidelity(input: {
  preflight: ExportPreflightReport;
  preservedText: string[];
  items: ExportFidelityItem[];
  warnings: ExportWarning[];
  rasterized: boolean;
  selectableText: boolean;
}): ExportFidelityReport {
  if (input.preflight.status === "blocked") {
    return emptyFidelity("export_blocked", {
      warnings: input.preflight.warnings,
      blockedItems: input.preflight.blockers,
    });
  }

  const fontSubstitutions = input.items
    .filter((item) => item.kind === "font" && item.status === "substituted")
    .map((item) => ({
      requested: item.property,
      used: item.detail,
      pageId: item.pageId,
      elementId: item.elementId,
    }));
  const approximatedShapes = input.items.filter(
    (item) => item.kind === "shape" && item.status === "approximated",
  ).length;
  const rasterizedEffects = input.items.filter(
    (item) => item.status === "rasterized",
  ).length;
  const imageChanges = input.items.filter(
    (item) => item.kind === "image" && item.status !== "preserved",
  ).length;
  const chartApproximations = input.items.filter(
    (item) => item.kind === "chart" && item.status === "approximated",
  ).length;
  const tableChanges = input.items.filter(
    (item) => item.kind === "table" && item.status !== "preserved",
  ).length;
  const omitted = input.items.filter((item) => item.status === "omitted");
  const unsupportedProperties = [
    ...new Set(
      input.items
        .filter(
          (item) => item.status === "approximated" || item.status === "omitted",
        )
        .map((item) => item.property),
    ),
  ];

  const material =
    rasterizedEffects > 0 ||
    omitted.length > 0 ||
    fontSubstitutions.length > 0 ||
    imageChanges > 0 ||
    approximatedShapes > 0;
  const hasText = input.items.some((item) => item.kind === "text");
  const unverified = hasText && !input.selectableText;

  let status: ExportFidelityStatus = "export_trusted";
  if (unverified) status = "export_unverified";
  else if (material || input.rasterized || chartApproximations > 0)
    status = "export_with_approximations";

  const deductions =
    fontSubstitutions.length * 4 +
    rasterizedEffects * 15 +
    omitted.length * 20 +
    imageChanges * 6 +
    approximatedShapes * 3 +
    chartApproximations * 2 +
    tableChanges * 3;
  const score = Math.max(0, Math.min(100, 100 - deductions));

  const blockedItems: ExportBlocker[] = [];
  return {
    status,
    score,
    preservedText: input.preservedText,
    selectableText: input.selectableText,
    items: input.items,
    fontSubstitutions,
    approximatedShapes,
    rasterizedEffects,
    imageChanges,
    chartApproximations,
    tableChanges,
    unsupportedProperties,
    warnings: [...input.preflight.warnings, ...input.warnings],
    blockedItems,
  };
}

export function fidelityItem(
  partial: Omit<ExportFidelityItem, "detail"> & { detail?: string },
): ExportFidelityItem {
  return {
    detail: partial.detail || partial.status,
    ...partial,
  };
}
