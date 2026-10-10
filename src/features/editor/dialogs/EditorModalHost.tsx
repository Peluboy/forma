import { Check, Download, Trash2 } from "lucide-react";
import { Modal, ResizeDialog } from "../../../shared/components/ui";
import { Button } from "../../../shared/components/ui/Button";
import type { Config, User } from "../../../shared/api/api";
import type {
  ContentBlock,
  PageSize,
  Project,
} from "../../../domain/design/model";
import type { IssueTarget } from "../lib/editorNav";
import Account from "../../account/Account";
import Billing from "../../billing/Billing";
import AnalysisReview, { type Analysis } from "./AnalysisReview";
import { BrandSettings, ShareReview, VersionHistory } from "./WorkspaceDialogs";
import { resyncLinkedDesignSpec } from "../../../domain/design-spec/sync";
import EditorExportDialog from "./EditorExportDialog";

export type EditorDialog =
  | "export"
  | "resize"
  | "help"
  | "revision"
  | "account"
  | "billing"
  | "analysis"
  | "versions"
  | "share"
  | "brand"
  | null;

type ExportState = {
  format: string;
  pixels: PageSize;
  draftChanged: boolean;
  issueTargets: IssueTarget[];
  issueCount: number;
  exporting: boolean;
};

type RevisionState = {
  changes: ContentBlock[];
  current: ContentBlock[];
};

export function EditorModalHost({
  dialog,
  project,
  user,
  config,
  analysis,
  deleteTarget,
  exportState,
  revision,
  saveNow,
  onClose,
  onMessage,
  onChangeDialog,
  onSettings,
  onExportFormat,
  onFocusIssue,
  onExport,
  onUpdateProject,
  onResize,
  onApplyContent,
  onApplyAnalysis,
  onRestore,
  onApplyBrand,
  onDelete,
  onCloseDelete,
}: {
  dialog: EditorDialog;
  project: Project;
  user: User | null;
  config: Config;
  analysis: Analysis | null;
  deleteTarget: Project | null;
  exportState: ExportState;
  revision: RevisionState;
  saveNow: () => Promise<unknown>;
  onClose: () => void;
  onMessage: (message: string) => void;
  onChangeDialog: (dialog: "account" | "billing") => void;
  onSettings: () => void;
  onExportFormat: (format: string) => void;
  onFocusIssue: (issue: IssueTarget) => void;
  onExport: () => void;
  onUpdateProject: (patch: Partial<Project>) => void;
  onResize: (patch: Partial<Project>) => void;
  onApplyContent: () => void;
  onApplyAnalysis: (patch: Partial<Project>) => void;
  onRestore: (project: Project) => void;
  onApplyBrand: (patch: Partial<Project>) => void;
  onDelete: (project: Project) => Promise<void>;
  onCloseDelete: () => void;
}) {
  return (
    <>
      {dialog === "export" && (
        <EditorExportDialog
          project={project}
          format={exportState.format}
          setFormat={onExportFormat}
          pixels={exportState.pixels}
          draftChanged={exportState.draftChanged}
          issueTargets={exportState.issueTargets}
          issueCount={exportState.issueCount}
          exporting={exportState.exporting}
          user={user}
          onFocusIssue={onFocusIssue}
          onExport={onExport}
          onResync={() => {
            const result = resyncLinkedDesignSpec(project);
            onUpdateProject({
              metadata: result.project.metadata,
              flow: result.project.flow,
            });
            onMessage(
              result.applied
                ? "Latest edits are synced."
                : "Could not sync those edits. Flattened PDF is still available.",
            );
          }}
          onClose={onClose}
        />
      )}
      {dialog === "resize" && (
        <ResizeDialog project={project} onClose={onClose} onApply={onResize} />
      )}
      {dialog === "revision" && (
        <Modal title="Small changes. Full control." onClose={onClose}>
          <p className="text-xs leading-[1.8] text-text-tertiary mt-3 mb-5">
            Only these manuscript sections will change. Your artwork and text
            styling stay in place. Extra labeled sections become editable text
            layers.
          </p>
          {/* Revision diff list */}
          <div className="max-h-[400px] overflow-auto flex flex-col gap-[17px]">
            {revision.changes.map((block) => (
              <div key={block.id}>
                <strong className="block text-xs mb-[9px] text-text-secondary">
                  {block.label}
                  {!block.fieldId ? " · extra section" : ""}
                </strong>
                {/* Before */}
                <div className="whitespace-pre-wrap text-[11px] leading-[1.7] p-3 rounded-[5px] mb-[6px] bg-[#fcf0f1] text-[#b7828b]">
                  <span className="block text-[8px] tracking-[1px] mb-[5px]">
                    BEFORE
                  </span>
                  {revision.current.find((item) => item.id === block.id)
                    ?.text || "(empty)"}
                </div>
                {/* After */}
                <div className="whitespace-pre-wrap text-[11px] leading-[1.7] p-3 rounded-[5px] bg-[#eef7f0] text-[#73947d]">
                  <span className="block text-[8px] tracking-[1px] mb-[5px]">
                    AFTER
                  </span>
                  {block.text || "(empty)"}
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="primary"
            fullWidth
            className="mt-6"
            onClick={onApplyContent}
          >
            <Check size={17} />
            Apply {revision.changes.length} changes
          </Button>
        </Modal>
      )}
      {dialog === "help" && (
        <Modal title="How Forma works" onClose={onClose}>
          {/* Steps */}
          <div className="my-[23px] flex flex-col gap-5">
            {[
              {
                n: 1,
                title: "Start with a design",
                body: "Choose a template, or upload a reference. On a reference, drag rectangles over old text to map each manuscript section.",
              },
              {
                n: 2,
                title: "Bring your exact words",
                body: "Upload TXT, Markdown, DOCX, or a text-based PDF. Use labels like Headline and Body copy for the six primary fields. Other labels become extra sections.",
              },
              {
                n: 3,
                title: "Fit, then download",
                body: "Apply your manuscript, adjust text on the canvas, review checks, then download PNG, SVG, or a Forma project file.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex gap-[14px]">
                <span className="bg-accent-muted text-accent w-[27px] h-[27px] rounded-lg grid place-items-center shrink-0 text-[11px] font-semibold">
                  {n}
                </span>
                <section>
                  <h3 className="text-xs font-[550] mt-[3px] mb-[6px]">
                    {title}
                  </h3>
                  <p className="text-[11px] text-text-secondary leading-[1.8] m-0">
                    {body}
                  </p>
                </section>
              </div>
            ))}
          </div>
          <a
            className="inline-flex items-center justify-center gap-2 w-full h-[var(--control-height)] px-4 rounded-sm text-sm font-[550] bg-bg-panel text-text-primary border border-border hover:bg-bg-muted transition-colors"
            href="/user-guide.md"
            download="forma-user-guide.md"
          >
            <Download size={15} strokeWidth={1.75} />
            Download the user guide
          </a>
          {/* Keyboard hints */}
          <div className="border border-border rounded-[7px] p-3 flex flex-col gap-[13px] mt-4">
            <span className="flex items-center justify-between text-[10px] text-text-secondary">
              Apply manuscript{" "}
              <kbd className="bg-bg-muted px-[6px] py-[4px] rounded-[3px] text-[9px]">
                ⌘ / Ctrl ↵
              </kbd>
            </span>
            <span className="flex items-center justify-between text-[10px] text-text-secondary">
              Undo{" "}
              <kbd className="bg-bg-muted px-[6px] py-[4px] rounded-[3px] text-[9px]">
                ⌘ / Ctrl Z
              </kbd>
            </span>
          </div>
          <p className="text-xs text-text-tertiary leading-[1.75] mt-4">
            Guest projects stay in this browser. Signed-in projects use your
            account storage. Reference analysis only runs when you request it.
          </p>
        </Modal>
      )}
      {dialog === "account" && (
        <Modal
          title={user ? "Your account" : "Make yourself at home."}
          onClose={onClose}
        >
          <Account
            user={user}
            config={config}
            onSettings={onSettings}
            onBilling={() => onChangeDialog("billing")}
            onClose={onClose}
            onMessage={onMessage}
          />
        </Modal>
      )}
      {dialog === "billing" && (
        <Modal title="Make room for more." onClose={onClose}>
          <Billing
            user={user}
            onSignIn={() => onChangeDialog("account")}
            beforeCheckout={saveNow}
          />
        </Modal>
      )}
      {dialog === "analysis" && analysis && (
        <Modal title="Your reference, understood." onClose={onClose}>
          <AnalysisReview
            analysis={analysis}
            project={project}
            onApply={onApplyAnalysis}
          />
        </Modal>
      )}
      {dialog === "versions" && (
        <Modal title="Every version has a place." onClose={onClose}>
          <VersionHistory project={project} onRestore={onRestore} />
        </Modal>
      )}
      {dialog === "share" && (
        <Modal title="Good work deserves feedback." onClose={onClose}>
          <ShareReview project={project} saveNow={saveNow} />
        </Modal>
      )}
      {dialog === "brand" && (
        <Modal title="A little more you." onClose={onClose}>
          <BrandSettings
            project={project}
            onApply={onApplyBrand}
            onMessage={onMessage}
          />
        </Modal>
      )}
      {deleteTarget && (
        <Modal title="Delete this design?" onClose={onCloseDelete}>
          <p className="text-xs leading-[1.8] text-text-tertiary mt-3 mb-5">
            "{deleteTarget.name}" and its saved revisions and review links will
            be removed. Export a project backup first if you need a copy.
          </p>
          <Button
            variant="danger"
            fullWidth
            onClick={() => void onDelete(deleteTarget)}
          >
            <Trash2 size={16} />
            Delete design
          </Button>
        </Modal>
      )}
    </>
  );
}
