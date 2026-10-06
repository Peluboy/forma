import type { DesignerPipelineResult } from "../../domain/pipeline/designerPipeline.js";
import { summarizeFidelity } from "../../domain/design-spec/fidelity/index.js";
import { DocumentPageView } from "../editor/canvas/DocumentCanvas";

/**
 * Development-lab view that puts the scored DesignSpec next to the editable
 * FlowDocument the user actually receives, alongside the measured projection
 * fidelity, export consistency, continuation, and trust-gate verdict.
 */
export function ProjectionFidelityPanel({
  result,
}: {
  result: DesignerPipelineResult;
}) {
  const fidelity = result.projectionFidelity;
  const deliverable = result.deliverableQuality;
  const continuation = result.continuation;
  const flow = result.project.flow;
  const pages = result.finalSpec.pages;
  const overallColor =
    fidelity.overall === "high"
      ? "text-emerald-400"
      : fidelity.overall === "medium"
        ? "text-amber-300"
        : fidelity.overall === "low"
          ? "text-orange-400"
          : "text-red-400";

  return (
    <div className="space-y-6">
      <div
        className={`rounded border p-4 ${
          deliverable.trusted
            ? "border-emerald-800 bg-emerald-950/40"
            : "border-red-800 bg-red-950/40"
        }`}
      >
        <div className="text-sm font-semibold text-white">
          {deliverable.label}
        </div>
        <div className="mt-1 text-xs text-slate-300">
          {deliverable.reasons.join(" ")}
        </div>
        {deliverable.blockers.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-xs text-red-300">
            {deliverable.blockers.map((blocker, index) => (
              <li key={index}>{blocker}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="DesignSpec quality"
          value={`${result.quality.final.overallScore}/100`}
        >
          <span className="text-xs text-slate-400">
            Initial {result.quality.report.initialScore} · Final{" "}
            {result.quality.report.finalScore}
          </span>
        </Stat>
        <Stat label="Projection fidelity" value={`${fidelity.score}/100`}>
          <span className={`text-xs ${overallColor}`}>{fidelity.overall}</span>
        </Stat>
        <Stat
          label="Copy across continuations"
          value={result.copyCoverage.valid ? "100% exact" : "copy mismatch"}
        >
          <span className="text-xs text-slate-400">
            {result.copyCoverage.valid
              ? "All source spans intact"
              : `${result.copyCoverage.issues.length} span issues`}
          </span>
        </Stat>
        <Stat
          label="Continuation pages"
          value={String(continuation.continuationPageCount)}
        >
          <span className="text-xs text-slate-400">
            {continuation.applied ? "applied" : "not required"} ·{" "}
            {continuation.unresolvedCount} unresolved
          </span>
        </Stat>
        <Stat
          label="Export consistency"
          value={result.exportConsistency.valid ? "pass" : "blocked"}
        >
          <span className="text-xs text-slate-400">
            {result.exportConsistency.missingText.length} text ·{" "}
            {result.exportConsistency.missingTableCells.length} cell ·{" "}
            {result.exportConsistency.missingDecorations.length} visual missing
          </span>
        </Stat>
        <Stat
          label="Preserved / transformed"
          value={`${fidelity.counts.preserved} / ${fidelity.counts.transformed}`}
        >
          <span className="text-xs text-slate-400">
            {fidelity.counts.unsupported} unsupported · {fidelity.counts.lost}{" "}
            lost
          </span>
        </Stat>
      </div>

      <p className="text-xs text-slate-400">
        {summarizeFidelity(fidelity)}. The DesignSpec score describes the ideal
        artifact; the editor projection is what the user edits and exports.
      </p>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className="flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">
              <span className="font-semibold text-slate-300">
                Page {index + 1}
              </span>
              <span className="font-mono text-[11px] text-blue-400">
                {(page.metadata?.layoutId as string) ?? page.role}
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-800">
              <div className="flex flex-col">
                <span className="px-2 pt-1 text-[10px] uppercase tracking-wider text-slate-500">
                  DesignSpec
                </span>
                <div
                  className="flex items-center justify-center overflow-hidden bg-white p-1"
                  style={{ aspectRatio: "612/792" }}
                  dangerouslySetInnerHTML={{
                    __html: result.pageSvgs[index] || "",
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="px-2 pt-1 text-[10px] uppercase tracking-wider text-slate-500">
                  Editor
                </span>
                <div className="flex items-center justify-center overflow-hidden bg-white p-1">
                  {flow?.pages[index] ? (
                    <DocumentPageView
                      flow={flow}
                      page={flow.pages[index]}
                      pageNumber={index + 1}
                      total={flow.pages.length}
                    />
                  ) : (
                    <span className="p-2 text-xs text-slate-400">
                      No projected page.
                    </span>
                  )}
                </div>
              </div>
            </div>
            {flow?.pages[index]?.designMetadata?.continuationIndex !==
              undefined && (
              <div className="border-t border-slate-800 px-3 py-1 text-[10px] text-amber-300">
                Continued page{" "}
                {String(flow.pages[index].designMetadata?.continuationIndex)}
              </div>
            )}
          </div>
        ))}
      </div>

      <FidelityList
        title="Blockers"
        items={fidelity.blockers.map((b) => b.message)}
        tone="red"
      />
      <FidelityList
        title="Lost"
        items={fidelity.lost.map((item) => `${item.kind} · ${item.userImpact}`)}
        tone="red"
      />
      <FidelityList
        title="Unsupported"
        items={fidelity.unsupported.map(
          (item) => `${item.kind} · ${item.userImpact}`,
        )}
        tone="amber"
      />
      <FidelityList
        title="Warnings"
        items={fidelity.warnings.map((warning) => warning.message)}
        tone="amber"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Critic Review Signal */}
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            AI Visual Critic Integration
          </div>
          <div className="text-sm font-medium text-slate-200">
            {result.aiCritic.enabled
              ? `Opt-in enabled · Signal: ${result.aiCritic.source}`
              : "Disabled (Deterministic metrics authoritative)"}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {result.aiCritic.accepted} issues accepted into controlled taxonomy
            · {result.aiCritic.rejected} issues rejected.
          </p>
        </div>

        {/* Human Calibration Metadata */}
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Human Review Calibration Status
          </div>
          <div className="text-sm font-medium text-slate-200">
            Heuristic Score: {result.quality.final.overallScore}/100 · Gate:{" "}
            {deliverable.trusted ? "Trusted" : "Unverified"}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Human calibration packages can be generated with{" "}
            <code className="text-blue-300">--write-review-package</code> and
            summarized with{" "}
            <code className="text-blue-300">npm run review:summary</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
      {children}
    </div>
  );
}

function FidelityList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "red" | "amber";
}) {
  if (!items.length) return null;
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-200">
        {title} ({items.length})
      </h4>
      <ul
        className={`list-disc space-y-1 pl-5 text-xs ${
          tone === "red" ? "text-red-300" : "text-amber-200"
        }`}
      >
        {items.slice(0, 20).map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
