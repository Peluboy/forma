import { useMemo, useState } from "react";
import { AppShell, Button, Notice, PageHeader, TextArea } from "../../ui";
import {
  previewNativeExport,
  runNativePdfExport,
  type ExportJob,
} from "../../domain/export";
import { contentGraphFromManuscript } from "../../domain/content";
import { planDesignDeterministically } from "../../domain/design-plan";
import { instantiateDesignSpec } from "../../domain/template-family";
import { FORMA_EDITORIAL_REPORT } from "../../domain/template-family/builtin/editorialReport.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "../../../tests/fixtures/corporateReportManuscript.js";

export default function ExportDevPanel() {
  const [source, setSource] = useState(CORPORATE_REPORT_MANUSCRIPT);
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<ExportJob | null>(null);
  const [error, setError] = useState("");

  const spec = useMemo(() => {
    if (json.trim()) {
      try {
        return JSON.parse(json);
      } catch {
        return null;
      }
    }
    const graph = contentGraphFromManuscript(source);
    const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
    return instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph, {
      skipValidation: true,
    });
  }, [json, source]);

  const preview = useMemo(() => {
    if (!spec) return null;
    try {
      return previewNativeExport({ spec });
    } catch (cause) {
      return {
        error: cause instanceof Error ? cause.message : "Preview failed.",
      };
    }
  }, [spec]);

  async function runExport() {
    if (!spec) return;
    setBusy(true);
    setError("");
    try {
      const result = await runNativePdfExport({ spec });
      setJob(result);
      if (result.output?.blob) {
        const url = URL.createObjectURL(result.output.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.output.filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      activeNavId="dev-export"
      currentScope={{
        type: "personal",
        name: "Developer",
        subName: "Export lab",
      }}
    >
      <PageHeader
        title="Native PDF export lab"
        subtitle="Inspect preflight, fidelity, and generated PDF bytes from a design."
        breadcrumbs={[
          { label: "Developer", href: "/dev/export" },
          { label: "Export", current: true },
        ]}
        actions={
          <Button
            variant="primary"
            disabled={busy || !spec}
            onClick={() => void runExport()}
          >
            {busy ? "Exporting…" : "Download PDF"}
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2 px-6 pb-12">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Manuscript or JSON</h2>
          <TextArea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={10}
          />
          <TextArea
            value={json}
            onChange={(event) => setJson(event.target.value)}
            rows={8}
            placeholder="Optional Design JSON"
          />
          {error && <Notice variant="danger">{error}</Notice>}
        </section>
        <section className="space-y-3 text-xs leading-relaxed">
          <h2 className="text-sm font-semibold">Reports</h2>
          {preview && "error" in preview && (
            <Notice variant="danger">{preview.error}</Notice>
          )}
          {preview && "job" in preview && (
            <pre className="bg-bg-subtle border border-border rounded-lg p-3 overflow-auto max-h-64">
              {JSON.stringify(preview.job.preflight, null, 2)}
            </pre>
          )}
          {job && (
            <>
              <p>
                Status: {job.status}. Fidelity: {job.fidelity?.status || "none"}
                . Size: {job.output?.sizeBytes ?? 0} bytes.
              </p>
              <pre className="bg-bg-subtle border border-border rounded-lg p-3 overflow-auto max-h-80">
                {JSON.stringify(
                  {
                    metadata: job.metadata,
                    fidelity: job.fidelity,
                    output: job.output
                      ? {
                          filename: job.output.filename,
                          mimeType: job.output.mimeType,
                          sizeBytes: job.output.sizeBytes,
                        }
                      : null,
                    error: job.error,
                  },
                  null,
                  2,
                )}
              </pre>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
