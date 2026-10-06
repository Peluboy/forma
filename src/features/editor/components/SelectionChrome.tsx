import type { PointerEvent as ReactPointerEvent } from "react";
import {
  HANDLE_CURSORS,
  handlePositions,
  resizeBox,
  type DesignBox,
  type ResizeHandle,
} from "../lib/canvasInteract";

const SIZE = 8;

function viewDelta(
  svg: SVGSVGElement,
  bounds: DOMRect,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
) {
  const viewW = svg.viewBox.baseVal.width || bounds.width;
  const viewH = svg.viewBox.baseVal.height || bounds.height;
  return {
    viewDx: ((clientX - startX) * viewW) / bounds.width,
    viewDy: ((clientY - startY) * viewH) / bounds.height,
  };
}

/**
 * Selection outline + eight resize handles in SVG viewBox coordinates.
 * Pointer deltas convert to design-space via scaleX/scaleY.
 */
export default function SelectionChrome({
  x,
  y,
  width,
  height,
  designBox,
  scaleX,
  scaleY,
  locked,
  onPreview,
  onCommit,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  designBox: DesignBox;
  scaleX: number;
  scaleY: number;
  locked?: boolean;
  onPreview: (box: DesignBox) => void;
  onCommit: (box: DesignBox) => void;
}) {
  function beginResize(handle: ResizeHandle, e: ReactPointerEvent) {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as SVGElement;
    const svg = target.ownerSVGElement;
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    const origin = { ...designBox };
    const startX = e.clientX;
    const startY = e.clientY;
    let latest = origin;

    const move = (ev: PointerEvent) => {
      const { viewDx, viewDy } = viewDelta(
        svg,
        bounds,
        startX,
        startY,
        ev.clientX,
        ev.clientY,
      );
      latest = resizeBox(origin, handle, viewDx / scaleX, viewDy / scaleY);
      onPreview(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onCommit(latest);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <g aria-hidden="true">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke="var(--selection-canvas)"
        strokeWidth={2}
        strokeDasharray={locked ? "6 4" : undefined}
        pointerEvents="none"
      />
      {!locked &&
        handlePositions(x, y, width, height).map(({ handle, cx, cy }) => (
          <rect
            key={handle}
            x={cx - SIZE / 2}
            y={cy - SIZE / 2}
            width={SIZE}
            height={SIZE}
            fill="#ffffff"
            stroke="var(--selection-canvas)"
            strokeWidth={2}
            style={{ cursor: HANDLE_CURSORS[handle], touchAction: "none" }}
            onPointerDown={(e) => beginResize(handle, e)}
          />
        ))}
    </g>
  );
}

export function beginLiveMove(options: {
  event: ReactPointerEvent;
  designBox: DesignBox;
  scaleX: number;
  scaleY: number;
  locked?: boolean;
  onPreview: (box: DesignBox) => void;
  onCommit: (box: DesignBox) => void;
  moveBox: (box: DesignBox, dx: number, dy: number) => DesignBox;
}) {
  const {
    event,
    designBox,
    scaleX,
    scaleY,
    locked,
    onPreview,
    onCommit,
    moveBox,
  } = options;
  if (locked) return;
  const target = event.currentTarget as SVGElement;
  const svg = target.ownerSVGElement;
  if (!svg) return;
  const bounds = svg.getBoundingClientRect();
  const origin = { ...designBox };
  const startX = event.clientX;
  const startY = event.clientY;
  let latest = origin;
  let moved = false;

  const move = (ev: PointerEvent) => {
    const { viewDx, viewDy } = viewDelta(
      svg,
      bounds,
      startX,
      startY,
      ev.clientX,
      ev.clientY,
    );
    if (Math.abs(viewDx) + Math.abs(viewDy) > 2) moved = true;
    latest = moveBox(origin, viewDx / scaleX, viewDy / scaleY);
    onPreview(latest);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    if (moved) onCommit(latest);
    else onPreview(origin);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
