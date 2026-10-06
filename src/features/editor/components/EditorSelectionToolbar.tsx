import { ImagePlus, LockKeyhole, Trash2, Type, Unlock } from "lucide-react";
import { IconButton } from "../../../shared/components/ui";
import { EditorTextToolbar } from "./EditorTextToolbar";
import { EditorColorPalette } from "./EditorColorPalette";
import type { BrandSystem } from "../../../domain/design/designSystem";
import {
  labels,
  type FieldId,
  type Layout,
  type Project,
  type TextLayer,
} from "../../../domain/design/model";
import type { GraphicLayer } from "../../../domain/design/layers";

/** Compact controls for the selected canvas object. Detailed settings live in the side inspector. */
export function EditorSelectionToolbar({
  project,
  selected,
  selectedLayer,
  selectedTextLayer,
  selectedGraphic,
  themeText,
  themeFont,
  brand,
  patchLayout,
  patchTextLayer,
  patchGraphicLayer,
  update,
  onOpenText,
  onOpenElements,
  onRemove,
  onReplaceAllColor,
  onOpenBrand,
}: {
  project: Project;
  selected: FieldId | null;
  selectedLayer: string | null;
  selectedTextLayer: TextLayer | null;
  selectedGraphic: GraphicLayer | null;
  themeText: string;
  themeFont: "Arial" | "Georgia";
  brand: BrandSystem;
  patchLayout: (patch: Partial<Layout>) => void;
  patchTextLayer: (patch: Partial<Layout>) => void;
  patchGraphicLayer: (patch: { color?: string; locked?: boolean }) => void;
  update: (patch: Partial<Project>) => void;
  onOpenText: () => void;
  onOpenElements: () => void;
  onRemove: () => void;
  onReplaceAllColor: (from: string, to: string) => void;
  onOpenBrand: () => void;
}) {
  if (!selected && !selectedTextLayer && !selectedGraphic) return null;
  return (
    <div className="floating-tools" onClick={(e) => e.stopPropagation()}>
      <span>
        {selected
          ? labels[selected]
          : selectedTextLayer
            ? selectedTextLayer.text.slice(0, 24) || "Text"
            : selectedGraphic?.name || "Element"}
      </span>
      <div className="toolbar-separator" />
      {selected && (
        <>
          <EditorTextToolbar
            layout={project.layouts[selected]}
            fallbackFont={selected === "title" ? themeFont : "Arial"}
            fallbackWeight={selected === "title" ? 400 : 500}
            colorControl={
              <EditorColorPalette
                project={project}
                brand={brand}
                color={project.layouts[selected].color || themeText}
                onApply={(color) => patchLayout({ color })}
                onReplaceAll={onReplaceAllColor}
                onOpenBrand={onOpenBrand}
                disabled={project.layouts[selected].locked}
              />
            }
            brandFonts={brand.fonts}
            onPatch={patchLayout}
          />
          {project.designMode === "reference" && (
            <label
              className="color-control cover-color"
              title="Cover color for original text"
            >
              <input
                type="color"
                aria-label="Cover color"
                value={project.covers?.[selected] || "#ffffff"}
                onChange={(event) =>
                  update({
                    covers: {
                      ...project.covers,
                      [selected]: event.target.value,
                    },
                  })
                }
              />
            </label>
          )}
          <IconButton
            label={
              project.layouts[selected].locked
                ? "Unlock position"
                : "Lock position"
            }
            onClick={() =>
              patchLayout({ locked: !project.layouts[selected].locked })
            }
          >
            {project.layouts[selected].locked ? (
              <LockKeyhole size={15} />
            ) : (
              <Unlock size={15} />
            )}
          </IconButton>
          <IconButton label="Edit selected text" onClick={onOpenText}>
            <Type size={15} />
          </IconButton>
        </>
      )}
      {selectedTextLayer && (
        <>
          <EditorTextToolbar
            layout={selectedTextLayer.layout}
            fallbackFont="Arial"
            colorControl={
              <EditorColorPalette
                project={project}
                brand={brand}
                color={selectedTextLayer.layout.color || "#252920"}
                onApply={(color) => patchTextLayer({ color })}
                onReplaceAll={onReplaceAllColor}
                onOpenBrand={onOpenBrand}
                disabled={selectedTextLayer.layout.locked}
              />
            }
            brandFonts={brand.fonts}
            onPatch={patchTextLayer}
          />
          <IconButton
            label={
              selectedTextLayer.layout.locked
                ? "Unlock position"
                : "Lock position"
            }
            onClick={() =>
              patchTextLayer({ locked: !selectedTextLayer.layout.locked })
            }
          >
            {selectedTextLayer.layout.locked ? (
              <LockKeyhole size={15} />
            ) : (
              <Unlock size={15} />
            )}
          </IconButton>
          <IconButton label="Open text panel" onClick={onOpenText}>
            <Type size={15} />
          </IconButton>
        </>
      )}
      {selectedGraphic && (
        <>
          {selectedGraphic.type === "shape" && (
            <EditorColorPalette
              project={project}
              brand={brand}
              color={selectedGraphic.color}
              onApply={(color) => patchGraphicLayer({ color })}
              onReplaceAll={onReplaceAllColor}
              onOpenBrand={onOpenBrand}
              disabled={selectedGraphic.layout.locked}
            />
          )}
          <IconButton
            label={
              selectedGraphic.layout.locked
                ? "Unlock position"
                : "Lock position"
            }
            onClick={() =>
              patchGraphicLayer({
                locked: !selectedGraphic.layout.locked,
              })
            }
          >
            {selectedGraphic.layout.locked ? (
              <LockKeyhole size={15} />
            ) : (
              <Unlock size={15} />
            )}
          </IconButton>
          <IconButton
            label="Open elements panel"
            onClick={() => {
              onOpenElements();
            }}
          >
            <ImagePlus size={15} />
          </IconButton>
        </>
      )}
      {selectedLayer && (
        <IconButton
          label="Remove"
          disabled={Boolean(
            selectedTextLayer?.layout.locked || selectedGraphic?.layout.locked,
          )}
          onClick={onRemove}
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </IconButton>
      )}
    </div>
  );
}
