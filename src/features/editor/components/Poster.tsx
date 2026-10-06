import { useId, useState } from "react";
import { AddedLayerArtwork } from "./GraphicLayers";
import SelectionChrome, { beginLiveMove } from "./SelectionChrome";
import { InlineTextEditor } from "./InlineTextEditor";
import { moveBox, type DesignBox } from "../lib/canvasInteract";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  canvasHeight,
  canvasWidth,
  designScale,
  effectiveFontWeight,
  fieldIds,
  fitText,
  templates,
  type FieldId,
  type Project,
  type TextFit,
} from "../../../domain/design/model";
let measureContext: CanvasRenderingContext2D | null = null;
export function getFits(project: Project): Record<FieldId, TextFit> {
  if (!measureContext)
    measureContext = document.createElement("canvas").getContext("2d");
  const template = templates.find((t) => t.id === project.template)!;
  const scale = designScale(project);
  const result = Object.fromEntries(
    fieldIds.map((id) => [
      id,
      fitText(
        project.copy[id],
        {
          ...project.layouts[id],
          width: project.layouts[id].width * scale.x,
          height: project.layouts[id].height * scale.y,
        },
        (text, size) => {
          if (!measureContext) return text.length * size * 0.55;
          measureContext.font = `${project.layouts[id].italic ? "italic " : ""}${effectiveFontWeight(project.layouts[id], id === "title" ? 400 : 500)} ${size}px "${project.layouts[id].fontFamily || (id === "title" ? template.font : "Arial")}"`;
          return (
            measureContext.measureText(text).width +
            Math.max(0, text.length - 1) *
              (project.layouts[id].letterSpacing || 0)
          );
        },
      ),
    ]),
  ) as Record<FieldId, TextFit>;
  for (const id of fieldIds) {
    const b = project.layouts[id];
    if (
      project.copy[id] &&
      (b.x + b.width > DESIGN_WIDTH || b.y + b.height > DESIGN_HEIGHT)
    )
      result[id].overflow = true;
  }
  return result;
}
export function Artwork({ variant, uid }: { variant: string; uid: string }) {
  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-orb`} cx="30%" cy="24%" r="80%">
          <stop
            offset="0"
            stopColor={
              variant === "midnight"
                ? "#e2eafd"
                : variant === "botanical"
                  ? "#becb98"
                  : variant === "editorial"
                    ? "#e1a3b4"
                    : variant === "electric"
                      ? "#a494fc"
                      : variant === "atelier"
                        ? "#dfcdb7"
                        : "#ffc899"
            }
          />
          <stop
            offset="0.52"
            stopColor={
              variant === "midnight"
                ? "#98aedf"
                : variant === "botanical"
                  ? "#859657"
                  : variant === "editorial"
                    ? "#ba617b"
                    : variant === "electric"
                      ? "#7362da"
                      : variant === "atelier"
                        ? "#b4967a"
                        : "#ef894c"
            }
          />
          <stop
            offset="1"
            stopColor={
              variant === "midnight"
                ? "#425482"
                : variant === "botanical"
                  ? "#3d5131"
                  : variant === "editorial"
                    ? "#782b4f"
                    : variant === "electric"
                      ? "#3c2c91"
                      : variant === "atelier"
                        ? "#71523f"
                        : "#b94c25"
            }
          />
        </radialGradient>
        <linearGradient id={`${uid}-base`} x1="0" x2="1">
          <stop stopColor="#8e5437" />
          <stop offset="0.4" stopColor="#e9ad80" />
          <stop offset="1" stopColor="#b7744e" />
        </linearGradient>
        <filter
          id={`${uid}-shadow`}
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      <ellipse
        cx="512"
        cy="667"
        rx="112"
        ry="12"
        fill="#352417"
        opacity=".18"
        filter={`url(#${uid}-shadow)`}
      />
      {variant === "botanical" ? (
        <g transform="translate(490 565)">
          <path
            d="M0 102Q-15 8 32-133"
            stroke="#49633b"
            strokeWidth="5"
            fill="none"
          />
          {[-75, -15, 45].map((y, i) => (
            <g key={y} transform={`translate(${i * -7} ${y})`}>
              <ellipse
                cx="-40"
                cy="-20"
                rx="56"
                ry="24"
                transform="rotate(35)"
                fill={`url(#${uid}-orb)`}
              />
              <ellipse
                cx="42"
                cy="-48"
                rx="61"
                ry="26"
                transform="rotate(-45)"
                fill={`url(#${uid}-orb)`}
              />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <path d="M397 600h226v53H397z" fill={`url(#${uid}-base)`} />
          <ellipse
            cx="510"
            cy="600"
            rx="113"
            ry="30"
            fill={variant === "midnight" ? "#a4afd0" : "#e8b18e"}
          />
          <ellipse
            cx="510"
            cy="653"
            rx="113"
            ry="25"
            fill={variant === "midnight" ? "#7384b0" : "#ba805e"}
          />
          <path
            d="M397 600v53c0 34 226 34 226 0v-53c0 40-226 40-226 0"
            fill={`url(#${uid}-base)`}
          />
          <circle cx="510" cy="479" r="108" fill={`url(#${uid}-orb)`} />
          <ellipse
            cx="511"
            cy="602"
            rx="62"
            ry="8"
            fill="#67391d"
            opacity=".20"
            filter={`url(#${uid}-shadow)`}
          />
          <path
            d="M411 378l15-30m-2 44 31-8m-57-8-10-17"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            opacity=".5"
          />
        </g>
      )}
    </g>
  );
}
type Props = {
  selectedLayer?: string | null;
  onSelectLayer?: (id: string) => void;
  onMoveLayer?: (id: string, dx: number, dy: number) => void;
  onLayerBox?: (id: string, box: DesignBox) => void;
  onEditField?: (id: FieldId, text: string) => void;
  onEditLayer?: (id: string, text: string) => void;
  guides?: boolean;
  project: Project;
  selected?: FieldId | null;
  onSelect?: (id: FieldId) => void;
  onMove?: (id: FieldId, dx: number, dy: number) => void;
  onFieldBox?: (id: FieldId, box: DesignBox) => void;
  miniature?: boolean;
  original?: boolean;
  exportId?: string;
  drawing?: FieldId | null;
  onRegion?: (
    id: FieldId,
    box: { x: number; y: number; width: number; height: number },
  ) => void;
};
export default function Poster({
  selectedLayer,
  onSelectLayer,
  onMoveLayer,
  onLayerBox,
  onEditField,
  onEditLayer,
  guides,
  project,
  selected,
  onSelect,
  onMove,
  onFieldBox,
  miniature,
  exportId,
  drawing,
  onRegion,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const theme = templates.find((t) => t.id === project.template)!;
  const fits = getFits(project);
  const width = canvasWidth(project);
  const height = canvasHeight(project);
  const [region, setRegion] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [fieldPreview, setFieldPreview] = useState<{
    id: FieldId;
    box: DesignBox;
  } | null>(null);
  const [editingField, setEditingField] = useState<FieldId | null>(null);
  const isReference = project.designMode === "reference" && project.reference;
  const visibleFields = isReference
    ? fieldIds.filter((id) => project.mappedFields?.includes(id))
    : fieldIds;
  const { x: scaleX, y: scaleY } = designScale(project);
  return (
    <svg
      id={exportId}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${project.name} design preview`}
      className="poster-svg"
      style={{ color: theme.text, cursor: drawing ? "crosshair" : undefined }}
      onPointerDown={
        drawing
          ? (e) => {
              const bounds = e.currentTarget.getBoundingClientRect();
              const x = Math.max(
                0,
                Math.min(
                  DESIGN_WIDTH,
                  ((e.clientX - bounds.left) * DESIGN_WIDTH) / bounds.width,
                ),
              );
              const y = Math.max(
                0,
                Math.min(
                  DESIGN_HEIGHT,
                  ((e.clientY - bounds.top) * DESIGN_HEIGHT) / bounds.height,
                ),
              );
              setOrigin({ x, y });
              setRegion({ x, y, width: 0, height: 0 });
              e.currentTarget.setPointerCapture(e.pointerId);
              e.preventDefault();
            }
          : undefined
      }
      onPointerMove={
        drawing && origin
          ? (e) => {
              const bounds = e.currentTarget.getBoundingClientRect();
              const x = Math.max(
                0,
                Math.min(
                  DESIGN_WIDTH,
                  ((e.clientX - bounds.left) * DESIGN_WIDTH) / bounds.width,
                ),
              );
              const y = Math.max(
                0,
                Math.min(
                  DESIGN_HEIGHT,
                  ((e.clientY - bounds.top) * DESIGN_HEIGHT) / bounds.height,
                ),
              );
              setRegion({
                x: Math.min(x, origin.x),
                y: Math.min(y, origin.y),
                width: Math.abs(x - origin.x),
                height: Math.abs(y - origin.y),
              });
            }
          : undefined
      }
      onPointerUp={
        drawing
          ? () => {
              if (region && region.width > 15 && region.height > 12 && onRegion)
                onRegion(drawing, region);
              setOrigin(null);
              setRegion(null);
            }
          : undefined
      }
    >
      <rect
        width={width}
        height={height}
        fill={project.backgroundColor || theme.color}
      />
      {isReference ? (
        <image
          href={project.reference!}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="none"
        />
      ) : (
        <g transform={`scale(${scaleX} ${scaleY})`}>
          <Artwork variant={project.template} uid={uid} />
          <path
            d="M56 710H664M56 818H664"
            stroke={theme.text}
            strokeWidth="1"
            opacity=".25"
          />
          <path
            d="M646 43v25m-12-13h25m-21-9 17 18m0-18-17 18"
            stroke={theme.text}
            strokeWidth="1.8"
          />
        </g>
      )}
      {isReference &&
        visibleFields
          .filter((id) => !project.layouts[id].hidden)
          .map((id) => {
            const b = project.layouts[id];
            return (
              <rect
                key={`cover-${id}`}
                x={b.x * scaleX}
                y={b.y * scaleY}
                width={b.width * scaleX}
                height={b.height * scaleY}
                fill={project.covers?.[id] || "#ffffff"}
              />
            );
          })}
      {visibleFields.map((id) => {
        const base = project.layouts[id];
        if (base.hidden) return null;
        const box =
          fieldPreview?.id === id ? { ...base, ...fieldPreview.box } : base;
        const fit = fits[id];
        const isTitle = id === "title";
        const x = box.x * scaleX;
        const y = box.y * scaleY;
        const w = box.width * scaleX;
        const h = box.height * scaleY;
        const designBox: DesignBox = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        };
        const commitBox = (next: DesignBox) => {
          setFieldPreview(null);
          if (onFieldBox) onFieldBox(id, next);
          else if (onMove) {
            onMove(id, next.x - base.x, next.y - base.y);
          }
        };
        return (
          <g
            key={id}
            data-field-id={id}
            onDoubleClick={
              onEditField
                ? (event) => {
                    event.stopPropagation();
                    onSelect?.(id);
                    setEditingField(id);
                  }
                : undefined
            }
            style={{
              pointerEvents: drawing ? "none" : undefined,
              cursor: onSelect ? (box.locked ? "pointer" : "move") : undefined,
              touchAction: "none",
            }}
            onPointerDown={
              onSelect && !drawing
                ? (e) => {
                    e.stopPropagation();
                    onSelect(id);
                    if (box.locked) return;
                    beginLiveMove({
                      event: e,
                      designBox,
                      scaleX,
                      scaleY,
                      locked: box.locked,
                      onPreview: (next) => setFieldPreview({ id, box: next }),
                      onCommit: commitBox,
                      moveBox,
                    });
                  }
                : undefined
            }
          >
            {editingField !== id && (
              <text
                aria-label={project.copy[id]}
                x={
                  box.align === "center"
                    ? x + w / 2
                    : box.align === "right"
                      ? x + w
                      : x
                }
                y={y}
                fill={box.color || theme.text}
                fontFamily={
                  box.fontFamily || (isTitle ? theme.font : "Arial, sans-serif")
                }
                fontWeight={effectiveFontWeight(box, isTitle ? 400 : 500)}
                fontStyle={box.italic ? "italic" : "normal"}
                textDecoration={
                  `${box.underline ? "underline" : ""} ${box.strikeThrough ? "line-through" : ""}`.trim() ||
                  undefined
                }
                letterSpacing={box.letterSpacing || undefined}
                opacity={box.opacity ?? 1}
                fontSize={fit.size}
                dominantBaseline="hanging"
                textAnchor={
                  box.align === "center"
                    ? "middle"
                    : box.align === "right"
                      ? "end"
                      : "start"
                }
              >
                {fit.lines.map((line, i) => (
                  <tspan
                    key={i}
                    x={
                      box.align === "center"
                        ? x + w / 2
                        : box.align === "right"
                          ? x + w
                          : x
                    }
                    dy={i ? fit.size * (box.lineHeight ?? 1.18) : 0}
                  >
                    {line || "\u00a0"}
                  </tspan>
                ))}
              </text>
            )}
            {editingField === id && onEditField && (
              <InlineTextEditor
                x={x}
                y={y}
                width={w}
                height={h}
                value={project.copy[id]}
                onCommit={(value) => onEditField(id, value)}
                onClose={() => setEditingField(null)}
              />
            )}
            {!miniature && selected === id && onSelect && (
              <SelectionChrome
                x={x - 5}
                y={y - 5}
                width={w + 10}
                height={h + 10}
                designBox={designBox}
                scaleX={scaleX}
                scaleY={scaleY}
                locked={box.locked}
                onPreview={(next) => setFieldPreview({ id, box: next })}
                onCommit={commitBox}
              />
            )}
            {!miniature && onSelect && selected !== id && (
              <rect
                x={x - 5}
                y={y - 5}
                width={w + 10}
                height={h + 10}
                fill="transparent"
                stroke="transparent"
                strokeWidth="2"
              />
            )}
          </g>
        );
      })}
      <AddedLayerArtwork
        project={project}
        selected={selectedLayer}
        onSelect={drawing ? undefined : onSelectLayer}
        onMove={onMoveLayer}
        onBox={onLayerBox}
        onEditText={onEditLayer}
      />
      {guides && onSelect && !miniature && (
        <g
          pointerEvents="none"
          stroke="var(--selection-canvas)"
          strokeWidth="1"
          strokeDasharray="6 5"
          opacity=".7"
        >
          <path d={`M${width / 2} 0V${height}M0 ${height / 2}H${width}`} />
          <rect
            x={width * 0.06}
            y={height * 0.06}
            width={width * 0.88}
            height={height * 0.88}
            fill="none"
          />
        </g>
      )}
      {drawing && region && (
        <rect
          x={region.x * scaleX}
          y={region.y * scaleY}
          width={region.width * scaleX}
          height={region.height * scaleY}
          fill="var(--selection-canvas)"
          fillOpacity={0.16}
          stroke="var(--selection-canvas)"
          strokeWidth="2"
          strokeDasharray="7 4"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
