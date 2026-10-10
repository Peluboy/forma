import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Upload,
  X,
} from "lucide-react";
import { Button } from "../../../shared/components/ui/Button";
import {
  fieldIds,
  fieldText,
  labels,
  setFieldText,
  type FieldId,
} from "../../../domain/design/model";
import type { IssueTarget, EditorPanel } from "../lib/editorNav";

export function EditorContentPanel({
  tab,
  draft,
  draftChanged,
  wordCount,
  changeCount,
  issueCount,
  issueTargets,
  onClose,
  onOpenPanel,
  onChooseFile,
  onUploadFile,
  onDraftChange,
  onApply,
  onReview,
  onFocusIssue,
}: {
  tab: "manuscript" | "checks";
  draft: string;
  draftChanged: boolean;
  wordCount: number;
  changeCount: number;
  issueCount: number;
  issueTargets: IssueTarget[];
  onClose: () => void;
  onOpenPanel: (panel: EditorPanel) => void;
  onChooseFile: () => void;
  onUploadFile: (file: File) => void;
  onDraftChange: (value: string) => void;
  onApply: () => void;
  onReview: () => void;
  onFocusIssue: (issue: IssueTarget) => void;
}) {
  return (
    <aside className="manuscript-panel">
      <div className="right-panel-heading">
        <button
          className="mobile-panel-close"
          aria-label="Close content panel"
          onClick={onClose}
        >
          <X size={17} />
        </button>
        <div>
          <h2>Content</h2>
        </div>
      </div>
      <div className="right-tabs">
        <button
          className={tab === "manuscript" ? "selected" : ""}
          onClick={() => onOpenPanel("content")}
        >
          Content
        </button>
        <button
          className={tab === "checks" ? "selected" : ""}
          onClick={() => onOpenPanel("issues")}
        >
          Issues{" "}
          <span className={issueCount ? "count-badge warning" : "count-badge"}>
            {issueCount || <Check size={10} />}
          </span>
        </button>
      </div>
      {tab === "manuscript" ? (
        <div className="manuscript-body">
          <button
            className="document-upload"
            onClick={onChooseFile}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) onUploadFile(file);
            }}
          >
            <Upload size={18} strokeWidth={1.75} />
            <span>
              Upload a file<small>DOCX, PDF, TXT, or Markdown</small>
            </span>
          </button>
          <div className="content-fields">
            {fieldIds.map((id: FieldId) => {
              const multiline = id === "title" || id === "description";
              const value = fieldText(draft, id);
              const update = (next: string) =>
                onDraftChange(setFieldText(draft, id, next));
              return (
                <label className="content-field" key={id}>
                  <span>{labels[id]}</span>
                  {multiline ? (
                    <textarea
                      rows={id === "title" ? 2 : 3}
                      spellCheck={false}
                      value={value}
                      onChange={(event) => update(event.target.value)}
                    />
                  ) : (
                    <input
                      spellCheck={false}
                      value={value}
                      onChange={(event) => update(event.target.value)}
                    />
                  )}
                </label>
              );
            })}
          </div>
          <details className="content-advanced">
            <summary>Full manuscript</summary>
            <textarea
              className="content-textarea"
              aria-label="Content"
              spellCheck={false}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Headline: Your exact headline&#10;&#10;Body copy: Your approved words…"
            />
          </details>
          <div className="content-meta">
            <span>{wordCount} words</span>
            <span>{draftChanged ? "Unapplied changes" : "Up to date"}</span>
          </div>
          <div className="manuscript-actions">
            <Button
              variant="primary"
              className="apply-button"
              onClick={onApply}
            >
              Apply changes
            </Button>
            {changeCount > 0 && (
              <Button variant="secondary" fullWidth onClick={onReview}>
                Review changes ({changeCount})
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="checks-body">
          {draftChanged && (
            <button
              type="button"
              className="issue-card amber"
              onClick={() => onOpenPanel("content")}
            >
              <AlertCircle size={16} strokeWidth={1.75} />
              <span>
                <strong>Unapplied content</strong>
                <small>Open Content and apply changes.</small>
              </span>
            </button>
          )}
          {!issueTargets.length && !draftChanged ? (
            <div className="issue-empty">
              <CheckCircle2 size={22} strokeWidth={1.75} />
              <p>No issues. Ready to export.</p>
            </div>
          ) : (
            issueTargets.map((issue) => (
              <button
                key={issue.id}
                type="button"
                className="issue-card"
                onClick={() => onFocusIssue(issue)}
              >
                <AlertCircle size={16} strokeWidth={1.75} />
                <span>
                  <strong>{issue.label}</strong>
                  <small>{issue.reason}</small>
                </span>
                <ChevronRight size={14} />
              </button>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
