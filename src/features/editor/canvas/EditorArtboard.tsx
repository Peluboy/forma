import Poster from "../components/Poster";
import type { MouseEvent } from "react";
import { DocumentPageView } from "./DocumentCanvas";
import { SlideView } from "./PresentationCanvas";
import type { DesignBox } from "../lib/canvasInteract";
import type { FlowDecorationElement } from "../../../domain/design/flowDocument";
import {
  resolvePageSize,
  type FieldId,
  type Project,
} from "../../../domain/design/model";

/** At 100% the page fills the usable editor height, capped at its native size. */
export function canvasDisplayWidth(
  project: Project,
  zoom: number,
  guideOpen = false,
): string {
  const page =
    project.family === "document" && project.flow
      ? project.flow.pageSize
      : project.family === "presentation" && project.presentation
        ? project.presentation.pageSize
        : resolvePageSize(project);
  const height = Math.max(380, window.innerHeight - (guideOpen ? 310 : 255));
  const width = Math.min(page.width, (height * page.width) / page.height);
  return `min(${Math.round((width * zoom) / 100)}px, calc(100% - 24px))`;
}

export function EditorArtboard({
  project,
  compare,
  zoom,
  selected,
  selectedLayer,
  drawing,
  onSelectLayer,
  onMoveLayer,
  onLayerBox,
  onSelectField,
  onRegion,
  onFieldBox,
  onEditField,
  onEditLayer,
  onUpdateFlowDecoration,
  onContextMenu,
  guides,
  guideOpen,
}: {
  project: Project;
  compare: boolean;
  zoom: number;
  selected: FieldId | null;
  selectedLayer: string | null;
  drawing: FieldId | null;
  onSelectLayer: (id: string | null) => void;
  onMoveLayer: (id: string, dx: number, dy: number) => void;
  onLayerBox: (id: string, box: DesignBox) => void;
  onSelectField: (id: FieldId) => void;
  onRegion: (id: FieldId, box: DesignBox) => void;
  onFieldBox: (id: FieldId, box: DesignBox) => void;
  onEditField: (id: FieldId, text: string) => void;
  onEditLayer: (id: string, text: string) => void;
  onUpdateFlowDecoration?: (
    pageId: string,
    decorationId: string,
    patch: Partial<FlowDecorationElement>,
  ) => void;
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
  guides: boolean;
  guideOpen: boolean;
}) {
  return (
    <div
      className={`canvas-stage ${compare && project.reference ? "comparing" : ""}`}
    >
      {compare && project.reference && (
        <div className="comparison-original">
          <span className="comparison-label">Reference</span>
          <img
            src={project.reference}
            alt="Original reference for comparison"
          />
        </div>
      )}
      <div
        className="artboard-wrap"
        style={{ width: canvasDisplayWidth(project, zoom, guideOpen) }}
      >
        {compare && project.reference && (
          <span className="comparison-label">Your design</span>
        )}
        <div
          className="artboard"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={onContextMenu}
        >
          {project.family === "document" && project.flow ? (
            <DocumentPageView
              flow={project.flow}
              page={
                project.flow.pages.find(
                  (page) => page.id === project.flow!.activePageId,
                ) || project.flow.pages[0]
              }
              pageNumber={Math.max(
                1,
                project.flow.pages.findIndex(
                  (page) => page.id === project.flow!.activePageId,
                ) + 1,
              )}
              total={project.flow.pages.length}
              selectedLayer={selectedLayer}
              onSelectLayer={onSelectLayer}
              onUpdateDecoration={onUpdateFlowDecoration}
            />
          ) : project.family === "presentation" && project.presentation ? (
            <SlideView
              deck={project.presentation}
              slide={
                project.presentation.slides.find(
                  (slide) => slide.id === project.presentation!.activeSlideId,
                ) || project.presentation.slides[0]
              }
            />
          ) : (
            <Poster
              project={project}
              selectedLayer={selectedLayer}
              onSelectLayer={onSelectLayer}
              onMoveLayer={onMoveLayer}
              onLayerBox={onLayerBox}
              selected={selected}
              drawing={drawing}
              onRegion={onRegion}
              onSelect={onSelectField}
              onFieldBox={onFieldBox}
              onEditField={onEditField}
              onEditLayer={onEditLayer}
              guides={guides}
              onMove={(id, dx, dy) => {
                if (
                  project.designMode === "reference" ||
                  Math.abs(dx) + Math.abs(dy) < 3
                )
                  return;
                const layout = project.layouts[id];
                onFieldBox(id, {
                  x: Math.max(0, Math.min(720 - layout.width, layout.x + dx)),
                  y: Math.max(0, Math.min(900 - layout.height, layout.y + dy)),
                  width: layout.width,
                  height: layout.height,
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
