import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import { readManuscriptFile } from "../editor/lib/fileImports";
import type { Project } from "../../domain/design/model";
import type { TemplateLayoutMode } from "../../domain/design/templateJob";

export type TemplateJobInput = {
  sourceId: string;
  manuscript: string;
  layoutMode: TemplateLayoutMode;
  useBrand: boolean;
};

export function TemplateJobDialog({
  template,
  brandName,
  onClose,
  onCreate,
}: {
  template: Project;
  brandName: string;
  onClose: () => void;
  onCreate: (input: TemplateJobInput) => void;
}) {
  const [manuscript, setManuscript] = useState("");
  const [mode, setMode] = useState<TemplateLayoutMode>("match");
  const [useBrand, setUseBrand] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setManuscript(await readManuscriptFile(file));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="template-job-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="template-job-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-job-title"
      >
        <header>
          <div>
            <span className="dashboard-kicker">NEW FROM YOUR TEMPLATE</span>
            <h2 id="template-job-title">
              {template.name.replace(/\s+template$/i, "")}
            </h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <p>Bring your approved words. Your template stays untouched.</p>
        <label className="template-job-label" htmlFor="template-job-copy">
          Manuscript
        </label>
        <textarea
          id="template-job-copy"
          value={manuscript}
          onChange={(event) => setManuscript(event.target.value)}
          placeholder="Paste your approved copy here"
          maxLength={30000}
          autoFocus
        />
        <label className="template-job-upload">
          <FileText size={17} />{" "}
          {busy ? "Reading file…" : "Upload TXT, DOCX, Markdown or text PDF"}
          <input
            type="file"
            accept=".txt,.md,.docx,.pdf"
            disabled={busy}
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
        <fieldset className="template-job-modes">
          <legend>How should the layout behave?</legend>
          <label>
            <input
              type="radio"
              name="template-mode"
              checked={mode === "match"}
              onChange={() => setMode("match")}
            />
            <span>
              <strong>Match closely</strong>
              <small>
                Keep the template layout. Review anything that does not fit.
              </small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="template-mode"
              checked={mode === "fit"}
              onChange={() => setMode("fit")}
            />
            <span>
              <strong>Fit the content</strong>
              <small>
                Use available space before asking you to adjust the design.
              </small>
            </span>
          </label>
        </fieldset>
        {brandName && (
          <label className="template-job-brand">
            <input
              type="checkbox"
              checked={useBrand}
              onChange={(event) => setUseBrand(event.target.checked)}
            />
            <span>Apply {brandName} text, background and fonts</span>
          </label>
        )}
        {error && (
          <p role="alert" className="template-job-error">
            {error}
          </p>
        )}
        <footer>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || !manuscript.trim()}
            onClick={() =>
              onCreate({
                sourceId: template.id,
                manuscript,
                layoutMode: mode,
                useBrand,
              })
            }
          >
            Create design
          </Button>
        </footer>
      </section>
    </div>
  );
}
