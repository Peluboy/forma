import { LayoutGrid, Maximize, Minus, Plus } from "lucide-react";
import { IconButton } from "../../../shared/components/ui";
import type { Project } from "../../../domain/design/model";

export function EditorCanvasFooter({
  project,
  zoom,
  onZoom,
}: {
  project: Project;
  zoom: number;
  onZoom: (zoom: number) => void;
}) {
  const pageLabel =
    project.family === "document" && project.flow
      ? `Page ${Math.max(1, project.flow.pages.findIndex((page) => page.id === project.flow!.activePageId) + 1)} of ${project.flow.pages.length}`
      : project.family === "presentation" && project.presentation
        ? `Slide ${Math.max(1, project.presentation.slides.findIndex((slide) => slide.id === project.presentation!.activeSlideId) + 1)} of ${project.presentation.slides.length}`
        : "Page 1 of 1";
  return (
    <footer className="canvas-footer">
      <span className="page-count">
        <LayoutGrid size={14} />
        {pageLabel}
      </span>
      <div className="zoom-controls">
        <IconButton
          label="Zoom out"
          disabled={zoom <= 50}
          onClick={() => onZoom(Math.max(50, zoom - 10))}
        >
          <Minus size={15} />
        </IconButton>
        <input
          type="range"
          min="50"
          max="140"
          step="10"
          aria-label="Canvas zoom"
          value={zoom}
          onChange={(event) => onZoom(Number(event.target.value))}
        />
        <IconButton
          label="Zoom in"
          disabled={zoom >= 140}
          onClick={() => onZoom(Math.min(140, zoom + 10))}
        >
          <Plus size={15} />
        </IconButton>
        <button
          className="zoom-percent"
          onClick={() => onZoom(100)}
          title="Reset zoom"
        >
          {zoom}%
        </button>
        <div className="toolbar-separator" />
        <IconButton label="Fit canvas" onClick={() => onZoom(100)}>
          <Maximize size={15} />
        </IconButton>
      </div>
    </footer>
  );
}
