import { MoreHorizontal } from "lucide-react";
import { formatLabels, type Project } from "../../../domain/design/model";
import { canvasDisplayWidth } from "./EditorArtboard";

export function EditorPageTopline({
  project,
  zoom,
  guideOpen,
  pixelSize,
  onPageActions,
}: {
  project: Project;
  zoom: number;
  guideOpen: boolean;
  pixelSize: { width: number; height: number };
  onPageActions: (x: number, y: number) => void;
}) {
  const flow = project.flow;
  const deck = project.presentation;
  const page = flow?.pages.find((item) => item.id === flow.activePageId);
  const slide = deck?.slides.find((item) => item.id === deck.activeSlideId);
  const title =
    project.family === "document" && flow
      ? `Page ${Math.max(1, flow.pages.findIndex((item) => item.id === flow.activePageId) + 1)} of ${flow.pages.length}${page?.hidden ? " · hidden from export" : ""}`
      : project.family === "presentation" && deck
        ? `Slide ${Math.max(1, deck.slides.findIndex((item) => item.id === deck.activeSlideId) + 1)} of ${deck.slides.length}${slide?.hidden ? " · hidden from export" : ""}`
        : project.designMode === "reference"
          ? "Reference design"
          : formatLabels[project.format];
  const dimensions =
    project.family === "document" && flow
      ? `${flow.pageSize.width} × ${flow.pageSize.height} pt`
      : project.family === "presentation" && deck
        ? `${deck.pageSize.width} × ${deck.pageSize.height} pt`
        : `${pixelSize.width} × ${pixelSize.height} px`;
  return (
    <div
      className="canvas-topline"
      style={{ width: canvasDisplayWidth(project, zoom, guideOpen) }}
    >
      <span className="page-title">{title}</span>
      <span className="dimension-pill">{dimensions}</span>
      <button
        type="button"
        className="icon-button"
        aria-label="Page actions"
        title="Page actions"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onPageActions(box.left, box.bottom + 5);
        }}
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}
