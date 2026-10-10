import { useMemo } from "react";
import { AlertCircle, ChevronRight, Download } from "lucide-react";
import { Modal } from "../../../shared/components/ui";
import { Button } from "../../../shared/components/ui/Button";
import {
  wordCount,
  type PageSize,
  type Project,
} from "../../../domain/design/model";
import {
  LocalStorageClientStore,
  LocalStorageWorkspaceStore,
  type WorkspaceActor,
} from "../../../domain/workspace";
import {
  describePreflightForUser,
  previewNativeExport,
} from "../../../domain/export";
import {
  describeSyncForUser,
  inspectProjectSync,
  nativeExportAllowed,
} from "../../../domain/design-spec/sync";
import type { User } from "../../../shared/api/api";
import type { IssueTarget } from "../lib/editorNav";

function isSelectablePdf(format: string) {
  return format === "pdf" || format === "pdf-native";
}

export default function EditorExportDialog({
  project,
  format,
  setFormat,
  pixels,
  draftChanged,
  issueTargets,
  issueCount,
  exporting,
  user,
  onFocusIssue,
  onExport,
  onResync,
  onClose,
}: {
  project: Project;
  format: string;
  setFormat: (format: string) => void;
  pixels: PageSize;
  draftChanged: boolean;
  issueTargets: IssueTarget[];
  issueCount: number;
  exporting: boolean;
  user?: User | null;
  onFocusIssue: (issue: IssueTarget) => void;
  onExport: () => void;
  onResync?: () => void;
  onClose: () => void;
}) {
  const nativePreview = useMemo(() => {
    if (!isSelectablePdf(format)) return null;
    try {
      const actor: WorkspaceActor | null = user
        ? { userId: user.id, email: user.email, name: user.name }
        : null;
      const workspace = project.workspaceId
        ? new LocalStorageWorkspaceStore().get(project.workspaceId)
        : null;
      const client = project.clientId
        ? new LocalStorageClientStore().get(project.clientId)
        : null;
      return previewNativeExport({
        project,
        user: actor,
        workspace,
        client,
        clientName: client?.name,
        projectName: project.name,
      });
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Export preview failed.",
      };
    }
  }, [format, project, user]);
  const nativeMessages =
    nativePreview && "job" in nativePreview
      ? describePreflightForUser(nativePreview.job.preflight)
      : nativePreview && "error" in nativePreview
        ? [nativePreview.error]
        : [];
  const nativeBlocked =
    nativePreview &&
    "job" in nativePreview &&
    nativePreview.job.preflight?.status === "blocked";
  const visualBlocked =
    format !== "json" &&
    format !== "pdf-image" &&
    !isSelectablePdf(format) &&
    issueCount > 0;
  const syncState =
    project.family === "document" ? inspectProjectSync(project) : undefined;
  const syncGate = syncState ? nativeExportAllowed(syncState) : "allow";
  return (
    <Modal title="Export" onClose={onClose}>
      <p className="text-xs leading-[1.8] text-text-tertiary mt-3 mb-5">
        Download your design. Editable Forma file keeps everything editable.
      </p>

      {/* File type */}
      <label className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary mb-4">
        File type
        <select
          className="px-3 py-2 border border-border rounded-sm bg-bg-panel text-text-primary text-sm"
          value={format === "pdf-native" ? "pdf" : format}
          onChange={(event) => setFormat(event.target.value)}
        >
          {project.family === "document" ? (
            <>
              <option value="pdf">PDF — selectable text</option>
              <option value="pdf-image">PDF — flattened pages</option>
              <option value="json">Editable Forma file (.json)</option>
            </>
          ) : project.family === "presentation" ? (
            <>
              <option value="pdf">PDF — selectable text</option>
              <option value="pptx">PPTX — PowerPoint</option>
              <option value="json">Editable Forma file (.json)</option>
            </>
          ) : (
            <>
              <option value="png">PNG — no background</option>
              <option value="jpg">JPG</option>
              <option value="pdf">PDF — selectable text</option>
              <option value="zip" disabled={project.designMode === "reference"}>
                {project.format === "custom"
                  ? "Campaign ZIP — custom page export"
                  : "Campaign ZIP — portrait, square, story"}
              </option>
              <option value="svg">SVG — scalable design</option>
              <option value="json">Editable Forma file (.json)</option>
            </>
          )}
        </select>
      </label>

      {/* Metadata rows */}
      <div className="flex justify-between text-[11px] mt-5 text-text-tertiary">
        <span>Dimensions</span>
        <strong className="font-medium text-text-secondary">
          {project.family === "document" && project.flow
            ? `${project.flow.pageSize.width} × ${project.flow.pageSize.height} pt · ${project.flow.pages.length} pages`
            : project.family === "presentation" && project.presentation
              ? `${project.presentation.pageSize.width} × ${project.presentation.pageSize.height} pt · ${project.presentation.slides.length} slides`
              : `${pixels.width} × ${pixels.height} px`}
        </strong>
      </div>
      <div className="flex justify-between text-[11px] mt-2 text-text-tertiary">
        <span>Text content</span>
        <strong className="font-medium text-text-secondary">
          {wordCount(project.copy)} words · preserved
        </strong>
      </div>

      {/* Draft warning */}
      {draftChanged && (
        <div className="flex items-start gap-2 text-[11px] leading-[1.6] text-warning bg-warning-muted border border-warning/20 p-3 mt-4 rounded-[7px]">
          <AlertCircle size={16} className="shrink-0 mt-px" />
          Content has unapplied changes. Export uses the current canvas.
        </div>
      )}

      {project.family === "document" && syncState && (
        <p className="text-[11px] leading-[1.6] text-text-secondary mt-4 mb-0">
          {describeSyncForUser(syncState)}
        </p>
      )}

      {isSelectablePdf(format) && nativeMessages.length > 0 && (
        <div
          className={`text-[11px] leading-[1.6] p-3 mt-4 rounded-[7px] border ${
            nativeBlocked
              ? "text-danger bg-danger-muted border-danger/20"
              : "text-text-secondary bg-bg-subtle border-border"
          }`}
        >
          {nativeMessages.map((message) => (
            <p key={message} className="m-0 mb-1 last:mb-0">
              {message}
            </p>
          ))}
        </div>
      )}

      {/* Issue list */}
      {issueTargets.length > 0 &&
        format !== "json" &&
        !isSelectablePdf(format) && (
          <div
            className="export-issues"
            role="group"
            aria-label="Fix before export"
          >
            <p>
              Fix these before exporting a visual file. Editable Forma file
              still works.
            </p>
            {issueTargets.map((issue) => (
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
            ))}
          </div>
        )}

      {/* CTA */}
      {project.family === "document" &&
        onResync &&
        (syncGate === "block" || syncGate === "warn") && (
          <Button
            variant="secondary"
            fullWidth
            className="mt-4"
            disabled={exporting}
            onClick={onResync}
          >
            Sync latest edits
          </Button>
        )}

      <Button
        variant="primary"
        fullWidth
        className="mt-6"
        disabled={
          exporting ||
          visualBlocked ||
          (isSelectablePdf(format) && Boolean(nativeBlocked))
        }
        onClick={onExport}
      >
        <Download size={17} />
        {exporting ? "Preparing your file…" : "Download design"}
      </Button>

      <p className="text-[10px] text-center text-text-tertiary mt-3 mb-0">
        Saved directly to your device. No watermark.
      </p>
    </Modal>
  );
}
