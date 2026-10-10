import type { ExportFidelityReport, ExportPreflightReport } from "./types.js";

export function describePreflightForUser(
  preflight?: ExportPreflightReport,
): string[] {
  if (!preflight) return [];
  if (preflight.status === "blocked") {
    const copy = preflight.blockers.find(
      (item) => item.code === "copy_failure",
    );
    if (copy) return ["Fix copy issues before export", "Export blocked"];
    const auth = preflight.blockers.find(
      (item) => item.code === "export_unauthorized",
    );
    if (auth) return [auth.message, "Export blocked"];
    return [
      preflight.blockers[0]?.message || "Export blocked",
      "Export blocked",
    ];
  }
  const messages: string[] = [];
  if (preflight.status === "pass") messages.push("Ready to export");
  const fontWarns = preflight.warnings.filter(
    (item) => item.code === "font_substitution",
  );
  if (fontWarns.length === 1) messages.push("Some fonts will be replaced");
  if (fontWarns.length > 1) messages.push("Some fonts will be replaced");
  const soft = preflight.warnings.filter(
    (item) => item.code === "low_resolution_image",
  );
  if (soft.length === 1) messages.push("One image may look soft");
  if (soft.length > 1) messages.push("Some images may look soft");
  if (preflight.warnings.some((item) => item.code === "unresolved_fit"))
    messages.push("Some text is tight on the page");
  for (const warning of preflight.warnings) {
    if (
      warning.code === "font_substitution" ||
      warning.code === "low_resolution_image" ||
      warning.code === "unresolved_fit"
    )
      continue;
    if (warning.message) messages.push(warning.message);
  }
  if (!messages.length) messages.push("Ready to export");
  return [...new Set(messages)];
}

export function describeFidelityForUser(
  fidelity?: ExportFidelityReport,
): string {
  if (!fidelity) return "";
  if (fidelity.status === "export_blocked") return "Export blocked";
  if (fidelity.status === "export_trusted") return "Ready to export";
  if (fidelity.status === "export_unverified") return "Export needs review";
  if (fidelity.fontSubstitutions.length) return "Some fonts will be replaced";
  if (fidelity.imageChanges) return "One image may look soft";
  return "Export completed with approximations";
}

export function canProceedWithExport(
  preflight?: ExportPreflightReport,
): boolean {
  return Boolean(preflight && preflight.status !== "blocked");
}
