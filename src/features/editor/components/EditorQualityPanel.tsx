import { useMemo, useState } from "react";
import { Layers, RotateCcw, Sparkles, X } from "lucide-react";
import type { Project } from "../../../domain/design/model.js";
import { fromFlowDocument } from "../../../domain/design-spec/adapters/fromFlowDocument.js";
import { evaluateDocumentQuality } from "../../../domain/design-quality/documentQuality.js";
import { measureTextElement } from "../../../domain/layout-fit/measure.js";
import { evaluateDocumentFit } from "../../../domain/layout-fit/engine.js";
import { contentGraphFromManuscript } from "../../../domain/content/contentGraph.js";
import { validateDesignSpecCopyCoverage } from "../../../domain/design-spec/copyCoverage.js";
import { projectDesignSpecToFlowDocument } from "../../../domain/design-spec/adapters/toFlowDocument.js";
import { assessDeliverableQuality } from "../../../domain/design-quality/trustGate.js";
import { applyQualityCorrection } from "../../../domain/design-quality/correctionExecutor.js";
import { FORMA_EDITORIAL_REPORT } from "../../../domain/template-family/builtin/editorialReport.js";
import { findCompatibleLayouts } from "../../../domain/template-family/slotRemapping.js";

interface Props {
  project: Project;
  onApply: (project: Project) => void;
}

const issueTitles: Record<string, string> = {
  small_body_text: "Some text is too small",
  excessive_line_length: "Some text lines are too long",
  weak_hierarchy: "Headings need more emphasis",
  heading_not_dominant: "Heading scale is insufficient",
  insufficient_whitespace: "Some elements are too close",
  inconsistent_spacing: "Spacing between elements is uneven",
  orphaned_element: "An element may feel disconnected",
  repeated_layout_pattern: "Repeated layout pattern detected",
  page_too_similar_to_previous: "Page layout is identical to previous",
  brand_color_misuse: "A color differs from the template",
  off_brand_typography: "A font differs from the template",
  short_last_line: "A paragraph ends with a short line",
};

export function EditorQualityPanel({ project, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [fixMessage, setFixMessage] = useState("");
  const [showUnsupported, setShowUnsupported] = useState(false);
  const [previousProject, setPreviousProject] = useState<Project | null>(null);

  const report = useMemo(() => {
    if (project.family !== "document" || !project.flow) return null;
    const { spec } = fromFlowDocument(project);
    const quality = evaluateDocumentQuality(spec, FORMA_EDITORIAL_REPORT);
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
      spec,
    };
  }, [project]);

  // Find compatible alternative layouts for the active page
  const activePageAlternatives = useMemo(() => {
    if (!report || !project.flow?.activePageId) return [];
    const activePage = report.spec.pages.find(
      (p) =>
        p.id === project.flow?.activePageId ||
        p.id === `${project.id}:${project.flow?.activePageId}`,
    );
    if (!activePage) return [];
    const currentLayoutId =
      (activePage.metadata?.layoutId as string) ||
      FORMA_EDITORIAL_REPORT.layouts.find((l) => l.role === activePage.role)
        ?.id ||
      FORMA_EDITORIAL_REPORT.layouts[0].id;
    const currentLayout =
      FORMA_EDITORIAL_REPORT.layouts.find((l) => l.id === currentLayoutId) ||
      FORMA_EDITORIAL_REPORT.layouts[0];
    return findCompatibleLayouts(currentLayout, FORMA_EDITORIAL_REPORT);
  }, [report, project]);

  if (!report || !project.flow) return null;

  const undoLastFix = () => {
    if (!previousProject) return;
    onApply(previousProject);
    setPreviousProject(null);
    setFixMessage("Reverted last change.");
  };

  const raiseSmallText = (elementId: string) => {
    if (!project.flow) return;
    const source = report.spec.pages
      .flatMap((page) => page.elements)
      .find((element) => element.id === elementId);
    if (!source || source.type !== "text") return;
    const candidate = { ...source, fontSize: Math.max(source.fontSize, 10.5) };
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
    setPreviousProject(structuredClone(project));
    frame.fontSize = candidate.fontSize;
    onApply(next);
    setFixMessage("Text size updated. Your words are unchanged.");
  };

  const strengthenHeading = (elementId: string) => {
    if (!project.flow) return;
    const source = report.spec.pages
      .flatMap((page) => page.elements)
      .find((element) => element.id === elementId);
    if (!source || source.type !== "text") return;
    const candidate = {
      ...source,
      fontSize: source.fontSize + 2,
      fontWeight: 700,
    };
    if (measureTextElement(candidate).overflow) {
      setFixMessage("Heading cannot be enlarged without overflowing frame.");
      return;
    }
    const parts = elementId.split(":");
    const pageId = parts[1];
    const frameId = parts.slice(2).join(":");
    const next = structuredClone(project);
    const page = next.flow?.pages.find((item) => item.id === pageId);
    const frame = page?.elements.find((item) => item.id === frameId);
    if (!frame || frame.type !== "text") return;
    setPreviousProject(structuredClone(project));
    frame.fontSize = candidate.fontSize;
    frame.fontWeight = candidate.fontWeight;
    onApply(next);
    setFixMessage("Heading emphasis strengthened.");
  };

  const swapLayoutVariant = (targetLayoutId: string) => {
    if (!project.flow) return;
    const activePageId = project.flow.activePageId;
    const fullPageId =
      report.spec.pages.find(
        (p) =>
          p.id === activePageId || p.id === `${project.id}:${activePageId}`,
      )?.id || report.spec.pages[0]?.id;

    const graph = contentGraphFromManuscript(project.manuscript);
    const outcome = applyQualityCorrection(
      report.spec,
      {
        type: "swap_compatible_layout",
        pageId: fullPageId,
        confidence: "high",
        rationale: "Switch to compatible layout variant",
        expectedImprovements: ["composition", "balance"],
        params: { alternateLayoutId: targetLayoutId },
      },
      FORMA_EDITORIAL_REPORT,
      graph,
    );

    if (outcome.applied) {
      const { project: projected } = projectDesignSpecToFlowDocument(
        outcome.spec,
        project.manuscript,
      );
      setPreviousProject(structuredClone(project));
      onApply({ ...project, flow: projected.flow });
      setFixMessage("Switched to compatible layout. Copy remains exact.");
    } else {
      setFixMessage(outcome.reason || "Could not switch layout variant.");
    }
  };

  const unsupportedOrLostCount =
    report.fidelity.counts.unsupported + report.fidelity.counts.lost;

  const statusTone = report.deliverable.trusted
    ? report.deliverable.status === "quality_approximated"
      ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
      : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";

  return (
    <div className="absolute bottom-5 right-5 z-40 max-w-[360px] rounded-xl border border-slate-300 bg-white p-3.5 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${statusTone}`}
        >
          {!report.deliverable.trusted ? (
            <span>Needs review</span>
          ) : report.deliverable.status === "quality_approximated" ? (
            <span>Minor limits</span>
          ) : (
            <span>Ready</span>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <strong className="text-sm font-semibold">Design quality</strong>
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
                Design Quality
              </span>
              <div className="text-lg font-bold mt-0.5">
                {report.overallScore}
                <span className="text-xs font-normal text-slate-500">/100</span>
              </div>
              <span className="text-[10px] text-slate-500">Layout score</span>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-2">
              <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400 block">
                Editable Output
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
                {report.fidelity.overall === "high" ? "Ready" : "Minor limits"}
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
              <span>
                Copy check: {report.copyValid ? "Passed" : "Needs review"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span
                className={
                  report.fitValid ? "text-emerald-500" : "text-amber-500"
                }
              >
                {report.fitValid ? "✓" : "⚠"}
              </span>
              <span>
                Fit check: {report.fitValid ? "Fits page" : "Needs review"}
              </span>
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

          {/* Smart Layout Variant Switcher */}
          {activePageAlternatives.length > 0 && (
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-indigo-900 dark:text-indigo-200 text-[11px]">
                <Layers size={13} />
                <span>Compatible Layout Alternatives</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activePageAlternatives.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => swapLayoutVariant(alt.id)}
                    className="px-2 py-1 text-[11px] font-medium rounded bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                  >
                    Switch to {alt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback & Undo Status */}
          {fixMessage && (
            <div className="flex items-center justify-between gap-2 rounded bg-blue-50 dark:bg-blue-950/30 p-2 text-xs text-blue-700 dark:text-blue-300">
              <span className="leading-snug">{fixMessage}</span>
              {previousProject && (
                <button
                  type="button"
                  onClick={undoLastFix}
                  className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                >
                  <RotateCcw size={12} />
                  Undo
                </button>
              )}
            </div>
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
                  className="rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800 flex items-center justify-between gap-2"
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
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1"
                        onClick={() => raiseSmallText(issue.elementIds![0])}
                      >
                        <Sparkles size={12} />
                        Enlarge
                      </button>
                    )}
                  {(issue.type === "weak_hierarchy" ||
                    issue.type === "heading_not_dominant") &&
                    report.copyValid &&
                    report.fitValid &&
                    issue.elementIds?.[0] && (
                      <button
                        type="button"
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1"
                        onClick={() => strengthenHeading(issue.elementIds![0])}
                      >
                        <Sparkles size={12} />
                        Emphasize
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
