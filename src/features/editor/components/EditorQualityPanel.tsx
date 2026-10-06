import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Project } from "../../../domain/design/model.js";
import { fromFlowDocument } from "../../../domain/design-spec/adapters/fromFlowDocument.js";
import { evaluateDocumentQuality } from "../../../domain/design-quality/documentQuality.js";
import { measureTextElement } from "../../../domain/layout-fit/measure.js";
import { evaluateDocumentFit } from "../../../domain/layout-fit/engine.js";
import { contentGraphFromManuscript } from "../../../domain/content/contentGraph.js";
import { validateDesignSpecCopyCoverage } from "../../../domain/design-spec/copyCoverage.js";
import { projectDesignSpecToFlowDocument } from "../../../domain/design-spec/adapters/toFlowDocument.js";
import { assessDeliverableQuality } from "../../../domain/design-quality/trustGate.js";
import { FORMA_EDITORIAL_REPORT } from "../../../domain/template-family/builtin/editorialReport.js";

interface Props {
  project: Project;
  onApply: (project: Project) => void;
}

const issueTitles: Record<string, string> = {
  small_body_text: "Some text is too small",
  excessive_line_length: "Some text lines are too long",
  weak_hierarchy: "Headings need more emphasis",
  insufficient_whitespace: "Some elements are too close",
  orphaned_element: "An element may feel disconnected",
  brand_color_misuse: "A color differs from the template",
  off_brand_typography: "A font differs from the template",
  short_last_line: "A paragraph ends with a short line",
};

export function EditorQualityPanel({ project, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [fixMessage, setFixMessage] = useState("");
  const [showUnsupported, setShowUnsupported] = useState(false);
  const report = useMemo(() => {
    if (project.family !== "document" || !project.flow) return null;
    const { spec } = fromFlowDocument(project);
    const quality = evaluateDocumentQuality(spec, FORMA_EDITORIAL_REPORT);
    // Re-project the derived spec so the panel can report projection fidelity
    // and avoid presenting a DesignSpec score as delivered quality.
    const { fidelity } = projectDesignSpecToFlowDocument(
      spec,
      project.manuscript,
    );
    return {
      ...quality,
      copyValid: validateDesignSpecCopyCoverage(
        contentGraphFromManuscript(project.manuscript),
        spec,
      ).valid,
      fitValid: evaluateDocumentFit(spec, FORMA_EDITORIAL_REPORT).valid,
      fidelity,
      deliverable: assessDeliverableQuality(quality.overallScore, fidelity),
    };
  }, [project]);
  if (!report || !project.flow) return null;

  const raiseSmallText = (elementId: string) => {
    if (!project.flow) return;
    const { spec } = fromFlowDocument(project);
    const source = spec.pages
      .flatMap((page) => page.elements)
      .find((element) => element.id === elementId);
    if (!source || source.type !== "text") return;
    const candidate = { ...source, fontSize: Math.max(source.fontSize, 10) };
    if (measureTextElement(candidate).overflow) {
      setFixMessage(
        "A larger size will not fit this frame. Adjust the layout first.",
      );
      return;
    }
    const parts = elementId.split(":");
    const pageId = parts[1];
    const frameId = parts.slice(2).join(":");
    const next = structuredClone(project);
    const page = next.flow?.pages.find((item) => item.id === pageId);
    const frame = page?.elements.find((item) => item.id === frameId);
    if (!frame || frame.type !== "text") return;
    frame.fontSize = candidate.fontSize;
    onApply(next);
    setFixMessage("Text size updated. Your words are unchanged.");
  };

  const unsupportedOrLostCount =
    report.fidelity.counts.unsupported + report.fidelity.counts.lost;

  const statusTone = report.deliverable.trusted
    ? report.deliverable.status === "quality_approximated"
      ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
      : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";

  return (
    <div className="absolute bottom-5 right-5 z-40 max-w-[340px] rounded-xl border border-slate-300 bg-white p-3.5 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${statusTone}`}
        >
          {!report.deliverable.trusted ? (
            <span>⚠️ Quality · Unverified ({report.overallScore}/100)</span>
          ) : report.deliverable.status === "quality_approximated" ? (
            <span>Quality · Approximated ({report.overallScore}/100)</span>
          ) : (
            <span>Quality · {report.overallScore}/100</span>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <strong className="text-sm font-semibold">
                Quality & Fidelity Review
              </strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                DesignSpec vs. Editable Editor Document
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close quality review"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Current Deliverable Quality Status */}
          <div className={`rounded-lg border p-2.5 text-xs ${statusTone}`}>
            <div className="font-semibold">{report.deliverable.label}</div>
            <div className="mt-1 text-[11px] leading-relaxed opacity-90">
              {report.deliverable.reasons.join(" ")}
            </div>
            {report.deliverable.blockers.length > 0 && (
              <ul className="mt-1.5 list-disc pl-4 text-[11px] text-rose-600 dark:text-rose-400 space-y-0.5">
                {report.deliverable.blockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Quality & Fidelity Score Distinction */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-2">
              <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400 block">
                DesignSpec Quality
              </span>
              <div className="text-lg font-bold mt-0.5">
                {report.overallScore}
                <span className="text-xs font-normal text-slate-500">/100</span>
              </div>
              <span className="text-[10px] text-slate-500">
                Idealized layout
              </span>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-2">
              <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400 block">
                Projection Fidelity
              </span>
              <div className="text-lg font-bold mt-0.5">
                {report.fidelity.score}
                <span className="text-xs font-normal text-slate-500">/100</span>
              </div>
              <span
                className={`text-[10px] font-medium capitalize ${
                  report.fidelity.overall === "high"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : report.fidelity.overall === "medium"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {report.fidelity.overall} fidelity
              </span>
            </div>
          </div>

          {/* System Gates: Copy & Fit Integrity */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span
                className={
                  report.copyValid ? "text-emerald-500" : "text-rose-500"
                }
              >
                {report.copyValid ? "✓" : "✗"}
              </span>
              <span>Copy: {report.copyValid ? "Exact (100%)" : "Altered"}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span
                className={
                  report.fitValid ? "text-emerald-500" : "text-amber-500"
                }
              >
                {report.fitValid ? "✓" : "⚠"}
              </span>
              <span>Fit: {report.fitValid ? "Fits bounds" : "Overflow"}</span>
            </div>
          </div>

          {/* Unsupported & Lost Visual Features */}
          {unsupportedOrLostCount > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-700 dark:text-amber-300 text-[11px]">
                  Unsupported Features ({unsupportedOrLostCount})
                </span>
                <button
                  type="button"
                  onClick={() => setShowUnsupported(!showUnsupported)}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {showUnsupported ? "Hide" : "Show"}
                </button>
              </div>
              {showUnsupported && (
                <div className="mt-1.5 space-y-1 max-h-28 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-400">
                  {report.fidelity.unsupported.map((item, idx) => (
                    <div
                      key={`unsup-${idx}`}
                      className="text-amber-600 dark:text-amber-400"
                    >
                      • {item.kind}: {item.userImpact}
                    </div>
                  ))}
                  {report.fidelity.lost.map((item, idx) => (
                    <div
                      key={`lost-${idx}`}
                      className="text-rose-600 dark:text-rose-400"
                    >
                      • {item.kind}: {item.userImpact}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Page & Rhythm Details */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between">
            <span>
              Current page:{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {report.pageScores.find(
                  (page) =>
                    page.pageId ===
                    `${project.id}:${project.flow?.activePageId}`,
                )?.score.overall ?? report.overallScore}
                /100
              </strong>
            </span>
            <span>Rhythm: {report.rhythmReport.score}/100</span>
          </div>

          {fixMessage && (
            <p
              role="status"
              className="text-xs text-blue-600 dark:text-blue-400"
            >
              {fixMessage}
            </p>
          )}

          {/* Heuristic Issues & Guided Actions */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-medium text-slate-500 block">
              Suggested Improvements
            </span>
            <div className="max-h-36 space-y-1.5 overflow-auto">
              {report.aggregateIssues.slice(0, 5).map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800"
                >
                  <span className="font-medium">
                    {issueTitles[issue.type] ?? issue.type.replaceAll("_", " ")}
                  </span>
                  {issue.type === "small_body_text" &&
                    report.copyValid &&
                    report.fitValid &&
                    issue.elementIds?.[0] && (
                      <button
                        type="button"
                        className="mt-1 block font-semibold text-blue-600 dark:text-blue-400"
                        onClick={() => raiseSmallText(issue.elementIds![0])}
                      >
                        Increase safely
                      </button>
                    )}
                </div>
              ))}
              {!report.aggregateIssues.length && (
                <p className="text-xs text-slate-500">
                  No issues detected by the current checks.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
