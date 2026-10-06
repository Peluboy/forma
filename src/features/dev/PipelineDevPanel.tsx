import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  ExternalLink,
  Code2,
  Eye,
  Layers,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import {
  runAiDesignerPipeline,
  type DesignerPipelineResult,
} from "../../domain/pipeline/designerPipeline.js";
import { FORMA_EDITORIAL_REPORT } from "../../domain/template-family/builtin/editorialReport.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "../../../tests/fixtures/corporateReportManuscript.js";
import { START_KEY } from "../../shared/navigation.js";
import { post, useAccount } from "../../shared/api/api.js";
import { ProjectionFidelityPanel } from "./ProjectionFidelityPanel";

type VisionReview = {
  available: boolean;
  overall?: number;
  issues: Array<{
    type: string;
    severity: string;
    pageId: string;
    message: string;
  }>;
  priorities: string[];
  model?: string;
  tokenCount?: number;
};

async function svgToPng(svg: string): Promise<string> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 612;
    canvas.height = 792;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, 0, 0, 612, 792);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PipelineDevPanel() {
  const { session } = useAccount();
  const [manuscript, setManuscript] = useState(CORPORATE_REPORT_MANUSCRIPT);
  const [busy, setBusy] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [result, setResult] = useState<DesignerPipelineResult | null>(null);
  const [visionReview, setVisionReview] = useState<VisionReview | null>(null);
  const [visionBusy, setVisionBusy] = useState(false);
  const [visionError, setVisionError] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "previews"
    | "fidelity"
    | "plan"
    | "spec"
    | "fit"
    | "copy"
    | "critic"
    | "provenance"
  >("previews");

  const handleRun = async () => {
    setBusy(true);
    setProgressMsg("Starting AI Designer Pipeline...");
    setProgressPercent(5);
    try {
      const res = await runAiDesignerPipeline(manuscript, {
        family: FORMA_EDITORIAL_REPORT,
        onProgress: (u) => {
          setProgressMsg(u.message);
          setProgressPercent(u.progressPercent);
        },
      });
      setResult(res);
      setVisionReview(null);
      setVisionError("");
    } catch (e: any) {
      alert(`Pipeline error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleVisionReview = async () => {
    if (!result) return;
    setVisionBusy(true);
    setVisionError("");
    try {
      const indices = [
        ...new Set([
          0,
          Math.floor((result.pageSvgs.length - 1) / 3),
          Math.floor(((result.pageSvgs.length - 1) * 2) / 3),
          result.pageSvgs.length - 1,
        ]),
      ];
      const pages = await Promise.all(
        indices.map(async (index) => ({
          pageId: result.finalSpec.pages[index].id,
          image: await svgToPng(result.pageSvgs[index]),
          role: result.finalSpec.pages[index].role,
          layoutId: result.finalSpec.pages[index].metadata?.layoutId,
          score: result.quality.final.pageScores[index]?.score.overall,
        })),
      );
      setVisionReview(
        await post<VisionReview>("/design-quality/critique", {
          pages,
          rhythmScore: result.quality.final.rhythmReport.score,
        }),
      );
    } catch (error) {
      setVisionError(
        error instanceof Error ? error.message : "Visual review unavailable.",
      );
    } finally {
      setVisionBusy(false);
    }
  };

  const handleOpenInEditor = () => {
    if (!result) return;
    const owner = session?.user?.id || "guest";
    sessionStorage.setItem(
      START_KEY,
      JSON.stringify({
        start: "generated",
        owner,
        project: result.project,
      }),
    );
    window.location.href = "/editor";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/create"
            className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </a>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white tracking-wide">
              Forma AI Designer Lab
            </span>
            <span className="text-xs bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
              Phase 1B Dev
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {result && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenInEditor}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
            >
              <ExternalLink className="w-4 h-4" /> Open in Editor
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setManuscript(CORPORATE_REPORT_MANUSCRIPT)}
            className="text-xs"
          >
            Reset Fixture
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={handleRun}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Play className="w-4 h-4 fill-current" />
            {busy ? "Running..." : "Run Pipeline"}
          </Button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Input Manuscript */}
        <div className="w-96 border-r border-slate-800 bg-slate-950/50 flex flex-col p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Approved Manuscript
            </span>
            <span className="text-xs text-slate-500">
              {manuscript.length} chars
            </span>
          </div>
          <textarea
            value={manuscript}
            onChange={(e) => setManuscript(e.target.value)}
            disabled={busy}
            className="flex-1 bg-slate-900 border border-slate-800 rounded p-3 text-xs font-mono text-slate-200 resize-none focus:outline-none focus:border-blue-500 leading-relaxed"
            placeholder="Paste report manuscript..."
          />
        </div>

        {/* Right: Results & Inspection Panel */}
        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
          {busy && (
            <div className="p-8 flex flex-col items-center justify-center my-auto">
              <div className="w-72 bg-slate-800 rounded-full h-2 overflow-hidden mb-4">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-sm font-medium text-slate-200">
                {progressMsg}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {progressPercent}% complete
              </p>
            </div>
          )}

          {!busy && !result && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Code2 className="w-12 h-12 stroke-1 mb-3 text-slate-600" />
              <p className="text-base font-medium text-slate-300">
                Ready to Generate Report
              </p>
              <p className="text-xs max-w-sm text-center mt-1 text-slate-500">
                Click &quot;Run Pipeline&quot; to execute ContentGraph parsing,
                AI DesignPlan synthesis, layout instantiation, copy QA, and
                visual critique.
              </p>
            </div>
          )}

          {!busy && result && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Status Banner */}
              <div className="border-b border-slate-800 bg-slate-950/60 px-6 py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Pipeline Succeeded
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-200 font-medium">
                      {result.finalSpec.pages.length}
                    </span>{" "}
                    Pages
                  </div>
                  <div className="text-slate-400">
                    Quality Score:{" "}
                    <span className="text-emerald-400 font-bold">
                      {result.quality.final.overallScore}/100
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Exact Copy:{" "}
                    <span className="text-emerald-400 font-medium">
                      {result.copyCoverage.valid
                        ? "100% Conforming"
                        : "Issues Found"}
                    </span>
                  </div>
                </div>

                <div className="text-slate-500 font-mono text-[11px]">
                  Family: {result.family.name}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-slate-800 bg-slate-950 px-6 flex items-center gap-2">
                {[
                  { id: "previews", label: "Rendered Previews", icon: Eye },
                  { id: "fidelity", label: "Editor Fidelity", icon: Layers },
                  { id: "plan", label: "DesignPlan v1", icon: Sliders },
                  { id: "spec", label: "DesignSpec v1", icon: FileText },
                  { id: "fit", label: "Fit Report", icon: AlertTriangle },
                  { id: "copy", label: "Copy Report", icon: CheckCircle2 },
                  { id: "critic", label: "Visual Critic", icon: Sparkles },
                  { id: "provenance", label: "Provenance", icon: Code2 },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                      activeTab === t.id
                        ? "border-blue-500 text-white"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "previews" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {result.finalSpec.pages.map((p, idx) => (
                      <div
                        key={p.id}
                        className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col shadow-lg"
                      >
                        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs bg-slate-900/50">
                          <span className="font-semibold text-slate-300">
                            Page {idx + 1}
                          </span>
                          <span className="text-[11px] text-blue-400 font-mono">
                            {p.metadata?.layoutId as string}
                          </span>
                        </div>
                        <div
                          className="p-2 bg-white flex items-center justify-center overflow-hidden"
                          style={{ aspectRatio: "612/792" }}
                          dangerouslySetInnerHTML={{
                            __html: result.pageSvgs[idx] || "",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "fidelity" && (
                  <ProjectionFidelityPanel result={result} />
                )}

                {activeTab === "plan" && (
                  <pre className="bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    {JSON.stringify(result.plan, null, 2)}
                  </pre>
                )}

                {activeTab === "spec" && (
                  <pre className="bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    {JSON.stringify(result.finalSpec, null, 2)}
                  </pre>
                )}

                {activeTab === "fit" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 border border-slate-800 rounded p-4">
                      <h4 className="font-semibold text-sm text-slate-200 mb-2">
                        Fit Overview
                      </h4>
                      <p className="text-xs text-slate-400">
                        Total Overflows: {result.fitReport.totalOverflows} |
                        Repairs Applied: {result.fitReport.repairedCount} |
                        Unresolved: {result.fitReport.unresolvedCount}
                      </p>
                    </div>
                    <pre className="bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(result.fitReport, null, 2)}
                    </pre>
                  </div>
                )}

                {activeTab === "copy" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 border border-slate-800 rounded p-4">
                      <h4 className="font-semibold text-sm text-slate-200 mb-1">
                        Exact Copy Conformance
                      </h4>
                      <p className="text-xs text-slate-400">
                        {result.copyCoverage.valid
                          ? "All approved manuscript content spans mapped with 100% exact text equality."
                          : `${result.copyCoverage.issues.length} copy issues detected.`}
                      </p>
                    </div>
                    <pre className="bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(result.copyCoverage, null, 2)}
                    </pre>
                  </div>
                )}

                {activeTab === "critic" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-950 border border-slate-800 rounded p-4">
                        <span className="text-xs text-slate-500 uppercase font-semibold">
                          Final Quality
                        </span>
                        <div className="text-2xl font-bold text-emerald-400 mt-1">
                          {result.quality.final.overallScore}/100
                        </div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded p-4">
                        <span className="text-xs text-slate-500 uppercase font-semibold">
                          Critic Iterations
                        </span>
                        <div className="text-2xl font-bold text-blue-400 mt-1">
                          {result.quality.report.totalIterations}
                        </div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded p-4">
                        <span className="text-xs text-slate-500 uppercase font-semibold">
                          Corrections Applied
                        </span>
                        <div className="text-2xl font-bold text-purple-400 mt-1">
                          {result.provenance.correctionsAppliedCount}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      AI visual influence:{" "}
                      {result.aiCritic.enabled
                        ? `enabled · ${result.aiCritic.accepted} accepted, ${result.aiCritic.rejected} rejected`
                        : "disabled (deterministic review is authoritative)"}
                      . Signal source: {result.aiCritic.source}.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={visionBusy}
                        onClick={handleVisionReview}
                      >
                        {visionBusy
                          ? "Reviewing…"
                          : "Review page visuals with AI"}
                      </Button>
                      {visionError && (
                        <span className="text-xs text-amber-300">
                          {visionError}
                        </span>
                      )}
                      {visionReview && !visionReview.available && (
                        <span className="text-xs text-slate-400">
                          AI review unavailable. Deterministic checks remain
                          active.
                        </span>
                      )}
                    </div>
                    {visionReview?.available && (
                      <pre className="bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                        {JSON.stringify(visionReview, null, 2)}
                      </pre>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded border border-slate-800 p-3 text-sm">
                        Before {result.quality.report.initialScore}/100
                      </div>
                      <div className="rounded border border-slate-800 p-3 text-sm">
                        After {result.quality.report.finalScore}/100
                      </div>
                    </div>
                    <pre className="bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(
                        {
                          rhythm: result.quality.final.rhythmReport,
                          pages: result.quality.final.pageScores,
                          iterations: result.quality.report.steps,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}

                {activeTab === "provenance" && (
                  <pre className="bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(result.provenance, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
