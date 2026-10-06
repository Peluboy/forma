import { useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  LockKeyhole,
  Strikethrough,
  Trash2,
  Underline,
  Unlock,
} from "lucide-react";
import type {
  FieldId,
  Project,
  TextLayer,
  FontFamily,
} from "../../../domain/design/model";
import {
  effectiveFontWeight,
  fontCatalog,
  fontWeights,
  nearestFontWeight,
  labels,
  templates,
} from "../../../domain/design/model";
import type { GraphicLayer } from "../../../domain/design/layers";
import { StackControls } from "./StackControls";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { Button } from "../../../shared/components/ui/Button";

type LayoutPatch = Partial<{
  size: number;
  color: string;
  align: "left" | "center" | "right";
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: FontFamily;
  fontWeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
}>;

type Props = {
  project: Project;
  fieldId: FieldId | null;
  textLayer: TextLayer | null;
  graphic: GraphicLayer | null;
  themeText: string;
  update: (patch: Partial<Project>) => void;
  onPatchField: (patch: LayoutPatch) => void;
  onPatchText: (patch: LayoutPatch & { text?: string }) => void;
  onPatchGraphic: (
    patch: LayoutPatch & {
      color?: string;
      name?: string;
      shape?: "rectangle" | "ellipse" | "rounded" | "triangle";
    },
  ) => void;
  onRemove: () => void;
  onReplaceImage?: (file: File) => Promise<void>;
  onCover?: (color: string) => void;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="inspector-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Contextual properties for the current canvas selection. */
export default function SelectionInspector({
  project,
  fieldId,
  textLayer,
  graphic,
  themeText,
  update,
  onPatchField,
  onPatchText,
  onPatchGraphic,
  onRemove,
  onReplaceImage,
  onCover,
}: Props) {
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);
  const [replaceError, setReplaceError] = useState("");
  if (!fieldId && !textLayer && !graphic) {
    return (
      <div className="selection-inspector empty">
        <h2>Canvas</h2>
        <ul className="inspector-hints">
          <li>Select text or an element to edit it.</li>
          <li>Drag to move. Handles resize.</li>
          <li>Arrow keys nudge. Shift moves farther.</li>
        </ul>
      </div>
    );
  }

  const locked = fieldId
    ? !!project.layouts[fieldId].locked
    : !!(textLayer?.layout.locked || graphic?.layout.locked);
  const title = fieldId
    ? labels[fieldId]
    : textLayer
      ? textLayer.text.trim().slice(0, 40) || "Added text"
      : graphic?.name || "Element";
  const box = fieldId
    ? project.layouts[fieldId]
    : textLayer
      ? textLayer.layout
      : graphic!.layout;
  const textLayout = fieldId
    ? project.layouts[fieldId]
    : textLayer
      ? textLayer.layout
      : null;

  function patchLayout(patch: LayoutPatch) {
    if (fieldId) onPatchField(patch);
    else if (textLayer) onPatchText(patch);
    else onPatchGraphic(patch);
  }

  return (
    <div className="selection-inspector">
      <div className="panel-heading">
        <h2>{title}</h2>
        <IconButton
          label={locked ? "Unlock" : "Lock"}
          active={locked}
          onClick={() => patchLayout({ locked: !locked })}
        >
          {locked ? (
            <LockKeyhole size={16} strokeWidth={1.75} />
          ) : (
            <Unlock size={16} strokeWidth={1.75} />
          )}
        </IconButton>
      </div>
      <p className="panel-description">
        {fieldId
          ? "From your applied content."
          : textLayer
            ? "Added text, separate from Content."
            : graphic?.type === "image" || graphic?.type === "frame"
              ? "Image on the design."
              : "Shape on the design."}
      </p>

      {textLayer && (
        <Row label="Text">
          <textarea
            aria-label="Text"
            rows={3}
            disabled={locked}
            value={textLayer.text}
            onChange={(e) => onPatchText({ text: e.target.value })}
          />
        </Row>
      )}

      {textLayout && (
        <>
          <Row label="Font">
            <select
              aria-label="Font"
              disabled={locked}
              value={
                textLayout.fontFamily ||
                (fieldId === "title"
                  ? templates.find(
                      (template) => template.id === project.template,
                    )?.font || "Georgia"
                  : "Arial")
              }
              onChange={(e) => {
                const fontFamily = e.target.value as FontFamily;
                const fontWeight = nearestFontWeight(
                  fontFamily,
                  effectiveFontWeight(
                    textLayout,
                    fieldId === "title" ? 400 : fieldId ? 500 : 400,
                  ),
                );
                patchLayout({
                  fontFamily,
                  fontWeight,
                  bold: fontWeight >= 700,
                });
              }}
            >
              {["Sans", "Serif", "Display", "System"].map((category) => (
                <optgroup key={category} label={category}>
                  {fontCatalog
                    .filter((font) => font.category === category)
                    .map((font) => (
                      <option key={font.family} value={font.family}>
                        {font.family}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Row>
          <Row label="Weight">
            <select
              aria-label="Font weight"
              disabled={locked}
              value={effectiveFontWeight(
                textLayout,
                fieldId === "title" ? 400 : fieldId ? 500 : 400,
              )}
              onChange={(event) => {
                const fontWeight = Number(event.target.value);
                patchLayout({ fontWeight, bold: fontWeight >= 700 });
              }}
            >
              {fontWeights(
                (textLayout.fontFamily ||
                  (fieldId === "title" ? "Georgia" : "Arial")) as FontFamily,
              ).map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Size">
            <input
              type="number"
              aria-label="Font size"
              min={11}
              max={180}
              disabled={locked}
              value={textLayout.size}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 11 && n <= 180) patchLayout({ size: n });
              }}
            />
          </Row>
          <Row label="Color">
            <input
              type="color"
              aria-label="Text color"
              disabled={locked}
              value={textLayout.color || (fieldId ? themeText : "#252920")}
              onChange={(e) => patchLayout({ color: e.target.value })}
            />
          </Row>
          <div className="inspector-align" role="group" aria-label="Text style">
            <IconButton
              label="Bold"
              active={effectiveFontWeight(textLayout) >= 700}
              onClick={() => {
                const bold = effectiveFontWeight(textLayout) < 700;
                patchLayout({ bold, fontWeight: bold ? 700 : 400 });
              }}
            >
              <strong>B</strong>
            </IconButton>
            <IconButton
              label="Italic"
              active={!!textLayout.italic}
              onClick={() => patchLayout({ italic: !textLayout.italic })}
            >
              <em>I</em>
            </IconButton>
            <IconButton
              label="Underline"
              active={!!textLayout.underline}
              onClick={() => patchLayout({ underline: !textLayout.underline })}
            >
              <Underline size={16} />
            </IconButton>
            <IconButton
              label="Strikethrough"
              active={!!textLayout.strikeThrough}
              onClick={() =>
                patchLayout({ strikeThrough: !textLayout.strikeThrough })
              }
            >
              <Strikethrough size={16} />
            </IconButton>
          </div>
          <div className="inspector-spacing">
            <Row label="Letter spacing">
              <input
                type="number"
                aria-label="Letter spacing"
                min={-2}
                max={20}
                step={0.5}
                disabled={locked}
                value={textLayout.letterSpacing ?? 0}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value >= -2 && value <= 20)
                    patchLayout({ letterSpacing: value });
                }}
              />
            </Row>
            <Row label="Line height">
              <input
                type="number"
                aria-label="Line height"
                min={0.8}
                max={2}
                step={0.05}
                disabled={locked}
                value={textLayout.lineHeight ?? 1.18}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value >= 0.8 && value <= 2)
                    patchLayout({ lineHeight: value });
                }}
              />
            </Row>
          </div>
          <Row label="Opacity">
            <input
              type="range"
              aria-label="Text opacity"
              min={0}
              max={100}
              step={1}
              disabled={locked}
              value={Math.round((textLayout.opacity ?? 1) * 100)}
              onChange={(event) =>
                patchLayout({ opacity: Number(event.target.value) / 100 })
              }
            />
          </Row>
          <div className="inspector-align" role="group" aria-label="Alignment">
            {(
              [
                { value: "left" as const, Icon: AlignLeft },
                { value: "center" as const, Icon: AlignCenter },
                { value: "right" as const, Icon: AlignRight },
              ] as const
            ).map(({ value, Icon }) => (
              <IconButton
                key={value}
                label={`Align ${value}`}
                active={(textLayout.align || "left") === value}
                onClick={() => patchLayout({ align: value })}
              >
                <Icon size={15} strokeWidth={1.75} />
              </IconButton>
            ))}
          </div>
          {fieldId && project.designMode === "reference" && onCover && (
            <Row label="Cover color">
              <input
                type="color"
                aria-label="Cover color"
                value={project.covers?.[fieldId] || "#ffffff"}
                onChange={(e) => onCover(e.target.value)}
              />
            </Row>
          )}
        </>
      )}

      {graphic?.type === "shape" && (
        <Row label="Shape">
          <select
            aria-label="Shape"
            disabled={locked}
            value={graphic.shape}
            onChange={(e) =>
              onPatchGraphic({ shape: e.target.value as typeof graphic.shape })
            }
          >
            <option value="rectangle">Rectangle</option>
            <option value="rounded">Rounded</option>
            <option value="ellipse">Ellipse</option>
            <option value="triangle">Triangle</option>
          </select>
        </Row>
      )}

      {graphic?.type === "shape" && (
        <Row label="Color">
          <input
            type="color"
            aria-label="Shape color"
            disabled={locked}
            value={graphic.color}
            onChange={(e) => onPatchGraphic({ color: e.target.value })}
          />
        </Row>
      )}

      {graphic && (
        <Row label="Name">
          <input
            aria-label="Element name"
            disabled={locked}
            value={graphic.name}
            onChange={(e) => onPatchGraphic({ name: e.target.value })}
          />
        </Row>
      )}

      {(graphic?.type === "image" || graphic?.type === "frame") &&
        onReplaceImage && (
          <div className="panel-section">
            <Button
              variant="secondary"
              fullWidth
              disabled={locked || replacing}
              onClick={() => replaceInput.current?.click()}
            >
              {replacing ? "Replacing image…" : "Replace image"}
            </Button>
            <input
              ref={replaceInput}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Replacement image"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setReplacing(true);
                setReplaceError("");
                try {
                  await onReplaceImage(file);
                } catch (error) {
                  setReplaceError(
                    error instanceof Error
                      ? error.message
                      : "This image could not be opened.",
                  );
                } finally {
                  setReplacing(false);
                }
              }}
            />
            {replaceError && (
              <p
                role="alert"
                className="text-[11px] leading-[1.65] text-danger bg-danger-muted rounded-[7px] p-[11px] my-3"
              >
                {replaceError}
              </p>
            )}
          </div>
        )}

      {(textLayer || graphic) && !locked && (
        <StackControls
          project={project}
          id={(textLayer || graphic)!.id}
          update={update}
        />
      )}

      <details className="inspector-advanced">
        <summary>Position and size</summary>
        <div className="geometry-grid">
          {(["x", "y", "width", "height"] as const).map((k) => (
            <label key={k}>
              {k}
              <input
                type="number"
                aria-label={k}
                disabled={locked}
                value={Math.round(box[k])}
                onChange={(e) =>
                  patchLayout({ [k]: Number(e.target.value) || 0 })
                }
              />
            </label>
          ))}
        </div>
      </details>

      {(textLayer || graphic) && (
        <Button
          variant="secondary"
          fullWidth
          disabled={locked}
          onClick={onRemove}
        >
          <Trash2 size={15} strokeWidth={1.75} />
          Remove
        </Button>
      )}
    </div>
  );
}
