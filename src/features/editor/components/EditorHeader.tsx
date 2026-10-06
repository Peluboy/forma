import {
  ArrowDownToLine,
  ArrowLeft,
  ChevronDown,
  CircleHelp,
  Download,
  FolderOpen,
  History,
  LogIn,
  Maximize,
  Palette,
  Plus,
  Share2,
} from "lucide-react";
import { ThemeToggle } from "../../../shared/components/ThemeToggle";
import type { Project } from "../../../domain/design/model";

export function EditorHeader({
  project,
  saved,
  userName,
  fileMenu,
  issueCount,
  onBack,
  onRename,
  onRetrySave,
  onToggleFileMenu,
  onNew,
  onOpenFile,
  onSaveEditable,
  onResize,
  onVersions,
  onBrand,
  onHelp,
  onSignIn,
  onShare,
  onAccount,
  onExport,
}: {
  project: Project;
  saved: string;
  userName: string | null;
  fileMenu: boolean;
  issueCount: number;
  onBack: () => void;
  onRename: (name: string) => void;
  onRetrySave: () => void;
  onToggleFileMenu: () => void;
  onNew: () => void;
  onOpenFile: () => void;
  onSaveEditable: () => void;
  onResize: () => void;
  onVersions: () => void;
  onBrand: () => void;
  onHelp: () => void;
  onSignIn: () => void;
  onShare: () => void;
  onAccount: () => void;
  onExport: () => void;
}) {
  return (
    <header className="app-header">
      <button className="editor-brand" onClick={onBack} aria-label="Forma home">
        <span className="editor-brand-mark" aria-hidden="true">
          f
        </span>
        <span className="editor-brand-name">
          forma<span>.</span>
        </span>
      </button>
      <div className="header-divider" />
      <button
        className="back-projects"
        onClick={onBack}
        aria-label="Back to projects"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        <span className="back-label">Projects</span>
      </button>
      <div className="project-title">
        <input
          aria-label="Project name"
          maxLength={200}
          value={project.name}
          onChange={(event) => onRename(event.target.value)}
        />
      </div>
      <span
        className={`save-state ${saved.startsWith("Not") ? "save-error" : ""}`}
      >
        {saved}
      </span>
      {saved.startsWith("Not") && (
        <button className="text-button" onClick={onRetrySave}>
          Try again
        </button>
      )}
      <div className="file-menu-wrap">
        <button
          className="plain-button file-button"
          aria-expanded={fileMenu}
          onClick={onToggleFileMenu}
        >
          File <ChevronDown size={13} />
        </button>
        {fileMenu && (
          <div className="dropdown">
            <button onClick={onNew}>
              <Plus size={16} strokeWidth={1.75} />
              New design
            </button>
            <button onClick={onOpenFile}>
              <FolderOpen size={16} strokeWidth={1.75} />
              Open editable file
            </button>
            <button onClick={onSaveEditable}>
              <Download size={16} strokeWidth={1.75} />
              Save editable file
            </button>
            <button onClick={onResize}>
              <Maximize size={16} strokeWidth={1.75} />
              Page size
            </button>
            <button onClick={onVersions}>
              <History size={16} strokeWidth={1.75} />
              Version history
            </button>
            <button onClick={onBrand}>
              <Palette size={16} strokeWidth={1.75} />
              Brand
            </button>
            <button onClick={onHelp}>
              <CircleHelp size={16} strokeWidth={1.75} />
              Help
            </button>
          </div>
        )}
      </div>
      <div className="header-actions">
        <ThemeToggle compact />
        {!userName && (
          <button className="button secondary signin-button" onClick={onSignIn}>
            <LogIn size={15} strokeWidth={1.75} />
            Sign in
          </button>
        )}
        <button className="button secondary share-button" onClick={onShare}>
          <Share2 size={15} strokeWidth={1.75} />
          Share
        </button>
        <button
          className="avatar"
          title={userName || "Sign in to save your work"}
          aria-label="Account"
          onClick={onAccount}
        >
          {userName?.[0]?.toUpperCase() || "Y"}
        </button>
        <button
          className="button primary"
          onClick={onExport}
          aria-description={
            issueCount
              ? `${issueCount} issues to review before some exports`
              : undefined
          }
        >
          <ArrowDownToLine size={16} strokeWidth={1.75} />
          Export
        </button>
      </div>
    </header>
  );
}
