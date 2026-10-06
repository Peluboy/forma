import {
  AlertCircle,
  CheckCircle2,
  Columns2,
  Layers3,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Undo2,
} from "lucide-react";
import type { Project } from "../../../domain/design/model";
import { IconButton } from "../../../shared/components/ui";

export function EditorCanvasToolbar({
  project,
  canUndo,
  canRedo,
  showLayers,
  compare,
  issues,
  showRight,
  onUndo,
  onRedo,
  onToggleLayers,
  onToggleCompare,
  onIssues,
  onToggleContent,
}: {
  project: Project;
  canUndo: boolean;
  canRedo: boolean;
  showLayers: boolean;
  compare: boolean;
  issues: number;
  showRight: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleLayers: () => void;
  onToggleCompare: () => void;
  onIssues: () => void;
  onToggleContent: () => void;
}) {
  return (
    <div className="editor-toolbar">
      <IconButton label="Undo" onClick={onUndo} disabled={!canUndo}>
        <Undo2 size={17} strokeWidth={1.75} />
      </IconButton>
      <IconButton label="Redo" onClick={onRedo} disabled={!canRedo}>
        <Redo2 size={17} strokeWidth={1.75} />
      </IconButton>
      <div className="toolbar-spacer" />
      {project.family !== "document" && project.family !== "presentation" && (
        <IconButton
          label={showLayers ? "Hide layers" : "Show layers"}
          onClick={onToggleLayers}
        >
          <Layers3 size={17} strokeWidth={1.75} />
        </IconButton>
      )}
      {project.reference && (
        <button
          className={`toolbar-button ${compare ? "active" : ""}`}
          aria-pressed={compare}
          onClick={onToggleCompare}
        >
          <Columns2 size={15} strokeWidth={1.75} />
          <span>Compare</span>
        </button>
      )}
      <button
        type="button"
        className={`toolbar-button ${issues ? "has-issues" : ""}`}
        onClick={onIssues}
      >
        {issues ? (
          <AlertCircle size={15} strokeWidth={1.75} />
        ) : (
          <CheckCircle2 size={15} strokeWidth={1.75} />
        )}
        <span>
          {issues ? `${issues} issue${issues === 1 ? "" : "s"}` : "Checks"}
        </span>
      </button>
      <IconButton
        label={showRight ? "Hide content panel" : "Show content panel"}
        onClick={onToggleContent}
      >
        {showRight ? (
          <PanelRightClose size={17} strokeWidth={1.75} />
        ) : (
          <PanelRightOpen size={17} strokeWidth={1.75} />
        )}
      </IconButton>
    </div>
  );
}
