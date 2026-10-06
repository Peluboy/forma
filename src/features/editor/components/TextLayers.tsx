import { useState } from "react";
import { StackControls } from "./StackControls";
import { orderedLayerIds } from "../../../domain/design/layers";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  designScale,
  effectiveFontWeight,
  fitText,
  fontFamilies,
  type FontFamily,
  type Project,
  type TextLayer,
} from "../../../domain/design/model";
import SelectionChrome, { beginLiveMove } from "./SelectionChrome";
import { InlineTextEditor } from "./InlineTextEditor";
import { moveBox, type DesignBox } from "../lib/canvasInteract";
import { Button } from "../../../shared/components/ui/Button";

export function layerFits(project: Project) {
  const context =
    typeof document === "undefined"
      ? null
      : document.createElement("canvas").getContext("2d");
  const scale = designScale(project);
  return (project.textLayers || []).map((layer) => {
    const b = layer.layout;
    const fit = fitText(
      layer.text,
      {
        ...b,
        width: b.width * scale.x,
        height: b.height * scale.y,
      },
      (text, size) => {
        if (!context) return text.length * size * 0.55;
        context.font = `${b.italic ? "italic " : ""}${effectiveFontWeight(b)} ${size}px "${b.fontFamily || "Arial"}"`;
        return (
          context.measureText(text).width +
          Math.max(0, text.length - 1) * (b.letterSpacing || 0)
        );
      },
    );
    if (
      layer.text &&
      (b.x + b.width > DESIGN_WIDTH || b.y + b.height > DESIGN_HEIGHT)
    )
      fit.overflow = true;
    return { layer, fit };
  });
}

export function TextLayerArtwork({
  project,
  selected,
  onSelect,
  onMove,
  onBox,
  onEditText,
}: {
  project: Project;
  selected?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (id: string, dx: number, dy: number) => void;
  onBox?: (id: string, box: DesignBox) => void;
  onEditText?: (id: string, text: string) => void;
}) {
  const [preview, setPreview] = useState<{ id: string; box: DesignBox } | null>(
    null,
  );
  const scale = designScale(project);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <g>
      {layerFits(project).map(({ layer, fit }) => {
        if (layer.layout.hidden) return null;
        const base = layer.layout;
        const b = preview?.id === layer.id ? { ...base, ...preview.box } : base;
        const x =
          b.x * scale.x +
          (b.align === "center"
            ? (b.width * scale.x) / 2
            : b.align === "right"
              ? b.width * scale.x
              : 0);
        const y = b.y * scale.y;
        const boxX = b.x * scale.x;
        const boxW = b.width * scale.x;
        const boxH = b.height * scale.y;
        const designBox: DesignBox = {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
        };
        const commit = (next: DesignBox) => {
          setPreview(null);
          if (onBox) onBox(layer.id, next);
          else if (onMove) onMove(layer.id, next.x - base.x, next.y - base.y);
        };
        return (
          <g
            key={layer.id}
            data-layer-id={layer.id}
            onDoubleClick={
              onEditText
                ? (event) => {
                    event.stopPropagation();
                    onSelect?.(layer.id);
                    setEditing(layer.id);
                  }
                : undefined
            }
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={
              onSelect
                ? `Select text: ${layer.text || "Empty text"}`
                : undefined
            }
            style={{ touchAction: "none" }}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(layer.id);
                    }
                    const delta: Record<string, [number, number]> = {
                      ArrowLeft: [-1, 0],
                      ArrowRight: [1, 0],
                      ArrowUp: [0, -1],
                      ArrowDown: [0, 1],
                    };
                    if (!b.locked && delta[e.key] && onMove) {
                      e.preventDefault();
                      const [dx, dy] = delta[e.key];
                      onMove(
                        layer.id,
                        dx * (e.shiftKey ? 10 : 1),
                        dy * (e.shiftKey ? 10 : 1),
                      );
                    }
                  }
                : undefined
            }
            onPointerDown={
              onSelect
                ? (e) => {
                    e.stopPropagation();
                    onSelect(layer.id);
                    beginLiveMove({
                      event: e,
                      designBox: {
                        x: base.x,
                        y: base.y,
                        width: base.width,
                        height: base.height,
                      },
                      scaleX: scale.x,
                      scaleY: scale.y,
                      locked: base.locked,
                      onPreview: (next) =>
                        setPreview({ id: layer.id, box: next }),
                      onCommit: commit,
                      moveBox,
                    });
                  }
                : undefined
            }
          >
            {editing !== layer.id && (
              <text
                x={x}
                y={y}
                fill={b.color || "#252920"}
                fontFamily={b.fontFamily || "Arial"}
                fontWeight={effectiveFontWeight(b)}
                fontStyle={b.italic ? "italic" : "normal"}
                textDecoration={
                  `${b.underline ? "underline" : ""} ${b.strikeThrough ? "line-through" : ""}`.trim() ||
                  undefined
                }
                letterSpacing={b.letterSpacing || undefined}
                opacity={b.opacity ?? 1}
                fontSize={fit.size}
                dominantBaseline="hanging"
                textAnchor={
                  b.align === "center"
                    ? "middle"
                    : b.align === "right"
                      ? "end"
                      : "start"
                }
              >
                {fit.lines.map((line, i) => (
                  <tspan
                    key={i}
                    x={x}
                    dy={i ? fit.size * (b.lineHeight ?? 1.18) : 0}
                  >
                    {line || "\u00a0"}
                  </tspan>
                ))}
              </text>
            )}
            {editing === layer.id && onEditText && (
              <InlineTextEditor
                x={boxX}
                y={y}
                width={boxW}
                height={boxH}
                value={layer.text}
                onCommit={(value) => onEditText(layer.id, value)}
                onClose={() => setEditing(null)}
              />
            )}
            {onSelect && selected === layer.id && (
              <SelectionChrome
                x={boxX}
                y={y}
                width={boxW}
                height={boxH}
                designBox={designBox}
                scaleX={scale.x}
                scaleY={scale.y}
                locked={b.locked}
                onPreview={(next) => setPreview({ id: layer.id, box: next })}
                onCommit={commit}
              />
            )}
            {onSelect && selected !== layer.id && (
              <rect
                x={boxX}
                y={y}
                width={boxW}
                height={boxH}
                fill="transparent"
                stroke="transparent"
                strokeWidth={2}
                style={{
                  cursor: b.locked ? "pointer" : "move",
                  touchAction: "none",
                }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

export default function TextLayers({
  project,
  selected,
  select,
  update,
  listOnly = false,
}: {
  project: Project;
  selected: string | null;
  select: (id: string | null) => void;
  update: (patch: Partial<Project>) => void;
  listOnly?: boolean;
}) {
  const layers = project.textLayers || [];
  const current = layers.find((l) => l.id === selected);
  function patch(p: Partial<TextLayer>) {
    update({
      textLayers: layers.map((l) => (l.id === selected ? { ...l, ...p } : l)),
    });
  }
  return (
    <section
      className="extra-text-layers panel-stack"
      aria-label="Additional text"
    >
      {(["text", "heading"] as const).map((preset) => (
        <Button
          key={preset}
          variant={preset === "text" ? "primary" : "secondary"}
          fullWidth
          disabled={layers.length >= 50}
          onClick={() => {
            const layer: TextLayer = {
              id: `layer-${crypto.randomUUID()}`,
              text: "",
              layout: {
                x: 60,
                y: preset === "heading" ? 180 : 300,
                width: preset === "heading" ? 600 : 420,
                height: preset === "heading" ? 130 : 90,
                size: preset === "heading" ? 64 : 32,
                locked: false,
                color: "#252920",
                fontFamily: preset === "heading" ? "Georgia" : "Arial",
              },
            };
            update({
              textLayers: [...layers, layer],
              layerOrder: [...orderedLayerIds(project), layer.id],
            });
            select(layer.id);
          }}
        >
          {preset === "heading" ? "Add heading" : "Add text"}
        </Button>
      ))}
      <p className="text-xs text-text-tertiary leading-[1.5] my-2">
        Text boxes stay when you update Content.
      </p>
      <div className="content-field-list" role="list">
        {layers.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="listitem"
            className={`button full-width ${selected === l.id ? "selected" : ""}`}
            aria-pressed={selected === l.id}
            onClick={() => select(l.id)}
          >
            {l.text.slice(0, 32) || `Text box ${i + 1}`}
          </button>
        ))}
      </div>
      {!listOnly && current && (
        <div className="field-editor">
          <label>
            Text
            <textarea
              autoFocus
              key={current.id}
              aria-label="Additional text wording"
              maxLength={10000}
              value={current.text}
              disabled={current.layout.locked}
              onChange={(e) => patch({ text: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={current.layout.locked}
              onChange={(e) =>
                patch({
                  layout: { ...current.layout, locked: e.target.checked },
                })
              }
            />{" "}
            Lock this text box
          </label>
          <fieldset disabled={current.layout.locked}>
            <StackControls project={project} id={current.id} update={update} />
            <label>
              Text size
              <input
                type="number"
                min={11}
                max={180}
                value={current.layout.size}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 11 && n <= 180)
                    patch({ layout: { ...current.layout, size: n } });
                }}
              />
            </label>
            <label>
              Text color
              <input
                type="color"
                value={current.layout.color || "#252920"}
                onChange={(e) =>
                  patch({
                    layout: { ...current.layout, color: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Font
              <select
                value={current.layout.fontFamily || "Arial"}
                onChange={(e) =>
                  patch({
                    layout: {
                      ...current.layout,
                      fontFamily: e.target.value as FontFamily,
                    },
                  })
                }
              >
                {fontFamilies.map((font) => (
                  <option key={font}>{font}</option>
                ))}
              </select>
            </label>
            <label>
              Alignment
              <select
                value={current.layout.align || "left"}
                onChange={(e) =>
                  patch({
                    layout: {
                      ...current.layout,
                      align: e.target.value as "left" | "center" | "right",
                    },
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <details>
              <summary>Position and size</summary>
              <div className="geometry-grid">
                {(["x", "y", "width", "height"] as const).map((k) => (
                  <label key={k}>
                    {
                      {
                        x: "From left",
                        y: "From top",
                        width: "Width",
                        height: "Height",
                      }[k]
                    }
                    <input
                      aria-label={`Additional text ${k}`}
                      type="number"
                      value={current.layout[k]}
                      min={k === "width" || k === "height" ? 1 : 0}
                      max={k === "x" || k === "width" ? 720 : 900}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (
                          n >= (k === "width" || k === "height" ? 1 : 0) &&
                          n <= (k === "x" || k === "width" ? 720 : 900)
                        )
                          patch({ layout: { ...current.layout, [k]: n } });
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
            <button
              className="button"
              onClick={() => {
                update({
                  textLayers: layers.filter((l) => l.id !== selected),
                  layerOrder: orderedLayerIds(project).filter(
                    (id) => id !== selected,
                  ),
                });
                select(null);
              }}
            >
              Remove text box
            </button>
          </fieldset>
          {layerFits(project).find((l) => l.layer.id === current.id)?.fit
            .overflow && (
            <p role="alert">
              This text needs more room. Increase its box size or reduce the
              text size.
            </p>
          )}
          <small>
            Drag on the canvas, or use arrow keys when the box is focused.
          </small>
        </div>
      )}
    </section>
  );
}
