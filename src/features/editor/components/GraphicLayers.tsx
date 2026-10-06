import { StackControls } from "./StackControls";
import { useEffect, useRef, useState } from "react";
import { designScale, type Project } from "../../../domain/design/model";
import {
  orderedLayerIds,
  validGraphics,
  type GraphicLayer,
} from "../../../domain/design/layers";
import { TextLayerArtwork } from "./TextLayers";
import SelectionChrome, { beginLiveMove } from "./SelectionChrome";
import { moveBox, type DesignBox } from "../lib/canvasInteract";
import { Button } from "../../../shared/components/ui/Button";

export function AddedLayerArtwork({
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
  return (
    <g>
      {orderedLayerIds(project).map((id) => {
        const layer = project.graphicLayers?.find((l) => l.id === id);
        if (
          layer?.layout.hidden ||
          project.textLayers?.find((l) => l.id === id)?.layout.hidden
        )
          return null;
        if (!layer)
          return (
            <TextLayerArtwork
              key={id}
              project={{
                ...project,
                textLayers: project.textLayers?.filter((l) => l.id === id),
              }}
              selected={selected}
              onSelect={onSelect}
              onMove={onMove}
              onBox={onBox}
              onEditText={onEditText}
            />
          );
        const base = layer.layout;
        const b = preview?.id === id ? { ...base, ...preview.box } : base;
        const x = b.x * scale.x;
        const y = b.y * scale.y;
        const w = b.width * scale.x;
        const h = b.height * scale.y;
        const clipId = `frame-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
        const designBox: DesignBox = {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
        };
        const commit = (next: DesignBox) => {
          setPreview(null);
          if (onBox) onBox(id, next);
          else if (onMove) onMove(id, next.x - base.x, next.y - base.y);
        };
        return (
          <g
            key={id}
            data-layer-id={id}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? `Select ${layer.name}` : undefined}
            style={{ touchAction: "none" }}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(id);
                    }
                    const d: Record<string, [number, number]> = {
                      ArrowLeft: [-1, 0],
                      ArrowRight: [1, 0],
                      ArrowUp: [0, -1],
                      ArrowDown: [0, 1],
                    };
                    if (d[e.key] && !b.locked && onMove) {
                      e.preventDefault();
                      onMove(
                        id,
                        d[e.key][0] * (e.shiftKey ? 10 : 1),
                        d[e.key][1] * (e.shiftKey ? 10 : 1),
                      );
                    }
                  }
                : undefined
            }
            onPointerDown={
              onSelect
                ? (e) => {
                    e.stopPropagation();
                    onSelect(id);
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
                      onPreview: (next) => setPreview({ id, box: next }),
                      onCommit: commit,
                      moveBox,
                    });
                  }
                : undefined
            }
          >
            {layer.type === "image" || layer.type === "frame" ? (
              <>
                {layer.type === "frame" && (
                  <defs>
                    <clipPath id={clipId}>
                      {layer.shape === "ellipse" ? (
                        <ellipse
                          cx={x + w / 2}
                          cy={y + h / 2}
                          rx={w / 2}
                          ry={h / 2}
                        />
                      ) : (
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          rx={
                            layer.shape === "rounded"
                              ? Math.min(w, h) * 0.16
                              : 0
                          }
                        />
                      )}
                    </clipPath>
                  </defs>
                )}
                {layer.src ? (
                  <image
                    href={layer.src}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={
                      layer.type === "frame" ? `url(#${clipId})` : undefined
                    }
                  />
                ) : (
                  <g clipPath={`url(#${clipId})`}>
                    <rect x={x} y={y} width={w} height={h} fill="#e8e9ee" />
                    <path
                      d={`M${x} ${y + h}L${x + w * 0.38} ${y + h * 0.55}L${x + w * 0.57} ${y + h * 0.72}L${x + w * 0.79} ${y + h * 0.42}L${x + w} ${y + h}`}
                      fill="#c2c6d2"
                    />
                    <circle
                      cx={x + w * 0.7}
                      cy={y + h * 0.27}
                      r={Math.min(w, h) * 0.08}
                      fill="#c2c6d2"
                    />
                  </g>
                )}
              </>
            ) : layer.shape === "ellipse" ? (
              <ellipse
                cx={x + w / 2}
                cy={y + h / 2}
                rx={w / 2}
                ry={h / 2}
                fill={layer.color}
              />
            ) : layer.shape === "triangle" ? (
              <polygon
                points={`${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`}
                fill={layer.color}
              />
            ) : (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={
                  layer.shape === "rounded" ? Math.min(w, h) * 0.16 : undefined
                }
                fill={layer.color}
              />
            )}
            {onSelect && selected === id && (
              <SelectionChrome
                x={x}
                y={y}
                width={w}
                height={h}
                designBox={designBox}
                scaleX={scale.x}
                scaleY={scale.y}
                locked={b.locked}
                onPreview={(next) => setPreview({ id, box: next })}
                onCommit={commit}
              />
            )}
            {onSelect && selected !== id && (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
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

export async function prepareImage(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a PNG, JPEG or WebP image under 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 16000000)
      throw new Error("Choose an image smaller than 16 megapixels.");
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/webp", 0.82);
    if (data.length > 220000)
      throw new Error(
        "This image is too detailed to embed. Try a smaller version.",
      );
    return data;
  } finally {
    bitmap.close();
  }
}

export default function GraphicLayers({
  project,
  selected,
  select,
  update,
  listOnly = false,
  addFilter = "all",
  search = "",
}: {
  project: Project;
  selected: string | null;
  select: (id: string | null) => void;
  update: (patch: Partial<Project>) => void;
  listOnly?: boolean;
  addFilter?: "all" | "shapes" | "images";
  search?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const latestUpdate = useRef(update);
  latestUpdate.current = update;
  const latest = useRef(project);
  latest.current = project;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const layers = project.graphicLayers || [],
    current = layers.find((l) => l.id === selected);
  function add(layer: GraphicLayer) {
    const p = latest.current;
    const next = [...(p.graphicLayers || []), layer];
    if (!validGraphics(next)) {
      setError(
        "This design has reached its image or element limit. Remove an unused image or element first.",
      );
      return;
    }
    latestUpdate.current({
      graphicLayers: next,
      layerOrder: [...orderedLayerIds(p), layer.id],
    });
    select(layer.id);
    setError("");
  }
  function patch(layer: GraphicLayer) {
    const next = layers.map((l) => (l.id === layer.id ? layer : l));
    if (validGraphics(next)) {
      update({ graphicLayers: next });
      setError("");
    } else
      setError(
        "Keep this element inside the page. Reduce its size or move it inward.",
      );
  }
  return (
    <section
      className="extra-text-layers panel-stack"
      aria-label="Images and shapes"
    >
      {!listOnly && (
        <>
          <h2>Elements</h2>
          <p className="panel-description">Images and shapes on the canvas.</p>
        </>
      )}
      <div className="layer-add-controls">
        {addFilter !== "shapes" && (
          <Button
            variant="secondary"
            disabled={busy || layers.length >= 30}
            onClick={() => input.current?.click()}
          >
            {busy ? "Adding image…" : "Upload image"}
          </Button>
        )}
        {addFilter !== "images" &&
          (["rectangle", "rounded", "ellipse", "triangle"] as const)
            .filter((shape) =>
              (shape === "rounded" ? "rounded rectangle" : shape).includes(
                search.toLowerCase(),
              ),
            )
            .map((shape) => (
              <button
                type="button"
                className="shape-choice"
                key={shape}
                aria-label={`Add ${shape === "rounded" ? "rounded rectangle" : shape}`}
                disabled={busy || layers.length >= 30}
                onClick={() =>
                  add({
                    id: `graphic-${crypto.randomUUID()}`,
                    name: {
                      rectangle: "Rectangle",
                      rounded: "Rounded rectangle",
                      ellipse: "Ellipse",
                      triangle: "Triangle",
                    }[shape],
                    type: "shape",
                    shape,
                    color: "#0f766e",
                    layout: {
                      x: 220,
                      y: 340,
                      width: 240,
                      height: 160,
                      locked: false,
                    },
                  })
                }
              >
                <span className={`shape-preview ${shape}`} aria-hidden="true" />
                <span>
                  {shape === "rounded"
                    ? "Rounded"
                    : shape.charAt(0).toUpperCase() + shape.slice(1)}
                </span>
              </button>
            ))}
        {addFilter !== "shapes" &&
          ("photo frame".includes(search.toLowerCase()) ||
            "frame".includes(search.toLowerCase())) &&
          (["rectangle", "rounded", "ellipse"] as const).map((shape) => (
            <button
              key={`frame-${shape}`}
              type="button"
              className="shape-choice"
              aria-label={`Add ${shape} photo frame`}
              disabled={busy || layers.length >= 30}
              onClick={() =>
                add({
                  id: `graphic-${crypto.randomUUID()}`,
                  name: `${shape.charAt(0).toUpperCase() + shape.slice(1)} photo frame`,
                  type: "frame",
                  shape,
                  layout: {
                    x: 220,
                    y: 340,
                    width: 240,
                    height: 180,
                    locked: false,
                  },
                })
              }
            >
              <span
                className={`shape-preview frame-preview ${shape}`}
                aria-hidden="true"
              />
              <span>
                {shape === "rectangle" ? "Photo frame" : `${shape} frame`}
              </span>
            </button>
          ))}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Upload layer image"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || busy) return;
          setBusy(true);
          setError("");
          try {
            const src = await prepareImage(file);
            if (alive.current)
              add({
                id: `graphic-${crypto.randomUUID()}`,
                name: file.name.slice(0, 100),
                type: "image",
                src,
                layout: {
                  x: 180,
                  y: 320,
                  width: 360,
                  height: 240,
                  locked: false,
                },
              });
          } catch (e) {
            if (alive.current)
              setError(
                e instanceof Error
                  ? e.message
                  : "This image could not be opened.",
              );
          } finally {
            if (alive.current) setBusy(false);
          }
        }}
      />
      <p className="quiet-note">
        Images are optimized for this canvas. Your original file is unchanged.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="content-field-list" role="list">
        {layers
          .filter((layer) =>
            layer.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((l) => (
            <button
              key={l.id}
              type="button"
              role="listitem"
              className={`button full-width ${selected === l.id ? "selected" : ""}`}
              aria-pressed={selected === l.id}
              onClick={() => select(l.id)}
            >
              {l.name}
            </button>
          ))}
      </div>
      {!listOnly && current && (
        <div className="field-editor">
          <label>
            Element name
            <input
              aria-label="Element name"
              maxLength={100}
              value={current.name}
              disabled={current.layout.locked}
              onChange={(e) => patch({ ...current, name: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={current.layout.locked}
              onChange={(e) =>
                patch({
                  ...current,
                  layout: { ...current.layout, locked: e.target.checked },
                })
              }
            />{" "}
            Lock this element
          </label>
          <fieldset disabled={current.layout.locked}>
            {current.type === "shape" && (
              <label>
                Shape color
                <input
                  type="color"
                  value={current.color}
                  onChange={(e) => patch({ ...current, color: e.target.value })}
                />
              </label>
            )}
            <StackControls project={project} id={current.id} update={update} />
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
                      aria-label={`Element ${k}`}
                      type="number"
                      min={k === "width" || k === "height" ? 1 : 0}
                      max={k === "x" || k === "width" ? 720 : 900}
                      value={Math.round(current.layout[k])}
                      onChange={(e) =>
                        patch({
                          ...current,
                          layout: {
                            ...current.layout,
                            [k]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
            <button
              className="button"
              onClick={() => {
                update({
                  graphicLayers: layers.filter((l) => l.id !== current.id),
                  layerOrder: orderedLayerIds(project).filter(
                    (id) => id !== current.id,
                  ),
                });
                select(null);
              }}
            >
              Remove element
            </button>
          </fieldset>
          <small>
            Drag on the canvas or use arrow keys. Stacking applies to added
            elements; original artwork stays underneath.
          </small>
        </div>
      )}
    </section>
  );
}
