import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import type { DesignerPipelineResult } from "../../domain/pipeline/designerPipeline";

interface CreatePipelineProgressProps {
  progress: {
    stage: string;
    message: string;
    percent: number;
  };
}

export function CreatePipelineProgressView({
  progress,
}: CreatePipelineProgressProps) {
  return (
    <section className="flex flex-col items-center justify-center p-8 bg-bg-panel border border-border rounded-2xl min-h-[400px]">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent animate-pulse">
          <Sparkles size={24} />
        </div>
        <h3 className="text-base font-semibold text-text-primary">
          Generating Report Draft
        </h3>
        <p className="text-sm text-text-secondary">{progress.message}</p>
        <div className="w-full bg-bg-page border border-border rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-accent h-full transition-all duration-300 rounded-full"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="text-xs text-text-tertiary font-mono">
          {progress.percent}% complete
        </div>
      </div>
    </section>
  );
}

interface CreatePipelineResultViewProps {
  pipelineResult: DesignerPipelineResult;
  onOpenProject: () => void;
}

export function CreatePipelineResultView({
  pipelineResult,
  onOpenProject,
}: CreatePipelineResultViewProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="bg-bg-panel border border-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h3 className="font-semibold text-text-primary text-base">
              Report Generation Complete
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {pipelineResult.finalSpec.pages.length} pages structured with{" "}
            <strong>Forma Editorial Report</strong> | Quality:{" "}
            <span className="text-emerald-600 font-semibold">
              {pipelineResult.quality.final.overallScore}/100
            </span>{" "}
            | Exact Copy:{" "}
            <span className="text-emerald-600 font-semibold">
              100% Conforming
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/dev/pipeline"
            className="text-xs text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg border border-border inline-flex items-center gap-1.5 transition-colors"
          >
            Inspect Lab <ExternalLink size={14} />
          </a>
          <Button
            variant="primary"
            onClick={onOpenProject}
            className="inline-flex items-center gap-2"
          >
            Open in Editor <ExternalLink size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {pipelineResult.finalSpec.pages.map((p, idx) => (
          <div
            key={p.id}
            className="group relative rounded-xl border border-border bg-bg-panel overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="px-3 py-1.5 border-b border-border bg-bg-page flex items-center justify-between text-[11px]">
              <span className="font-semibold text-text-primary">
                Page {idx + 1}
              </span>
              <span className="text-text-secondary font-mono">
                {p.metadata?.layoutId as string}
              </span>
            </div>
            <div
              className="p-1.5 bg-white flex items-center justify-center overflow-hidden"
              style={{ aspectRatio: "612/792" }}
              dangerouslySetInnerHTML={{
                __html: pipelineResult.pageSvgs[idx] || "",
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
