import { CheckCircle2 } from "lucide-react";
import { Button, Progress, TrustStatus } from "../../ui";
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
    <section className="flex min-h-[400px] flex-col items-center justify-center rounded-[28px] border border-border bg-bg-panel p-8">
      <div className="w-full max-w-md space-y-4 text-center">
        <h3 className="forma-display m-0 text-[22px] font-semibold">
          Creating your pages
        </h3>
        <p className="m-0 text-sm text-text-secondary">{progress.message}</p>
        <Progress value={progress.percent} showPercent />
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
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-border bg-bg-panel p-5">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success" />
            <h3 className="m-0 text-base font-semibold">Design ready</h3>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">
              {pipelineResult.finalSpec.pages.length} pages
            </span>
            <TrustStatus score={pipelineResult.quality.final.overallScore} />
          </div>
        </div>
        <Button variant="primary" onClick={onOpenProject}>
          Open in editor
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {pipelineResult.finalSpec.pages.map((p, idx) => (
          <div
            key={p.id}
            className="overflow-hidden rounded-2xl border border-border bg-bg-panel"
          >
            <div className="border-b border-border px-3 py-1.5 text-[11px] font-semibold">
              Page {idx + 1}
            </div>
            <div
              className="flex items-center justify-center overflow-hidden bg-white p-1.5"
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
