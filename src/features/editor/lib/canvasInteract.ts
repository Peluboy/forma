import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../../../domain/design/model";

export type DesignBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

const MIN_SIZE = 24;

export function clampBox(
  box: DesignBox,
  bounds = { width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
  minSize = MIN_SIZE,
): DesignBox {
  const width = Math.max(minSize, Math.min(box.width, bounds.width));
  const height = Math.max(minSize, Math.min(box.height, bounds.height));
  const x = Math.max(0, Math.min(box.x, bounds.width - width));
  const y = Math.max(0, Math.min(box.y, bounds.height - height));
  return { x, y, width, height };
}

export function moveBox(
  box: DesignBox,
  dx: number,
  dy: number,
  bounds = { width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
): DesignBox {
  return clampBox(
    { ...box, x: box.x + dx, y: box.y + dy },
    bounds,
    Math.min(box.width, box.height, MIN_SIZE),
  );
}

export function resizeBox(
  box: DesignBox,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  bounds = { width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
  minSize = MIN_SIZE,
): DesignBox {
  let { x, y, width, height } = box;
  if (handle.includes("e")) width = box.width + dx;
  if (handle.includes("s")) height = box.height + dy;
  if (handle.includes("w")) {
    width = box.width - dx;
    x = box.x + dx;
  }
  if (handle.includes("n")) {
    height = box.height - dy;
    y = box.y + dy;
  }
  if (width < minSize) {
    if (handle.includes("w")) x = box.x + box.width - minSize;
    width = minSize;
  }
  if (height < minSize) {
    if (handle.includes("n")) y = box.y + box.height - minSize;
    height = minSize;
  }
  return clampBox({ x, y, width, height }, bounds, minSize);
}

export function handlePositions(
  x: number,
  y: number,
  w: number,
  h: number,
): { handle: ResizeHandle; cx: number; cy: number }[] {
  return [
    { handle: "nw", cx: x, cy: y },
    { handle: "n", cx: x + w / 2, cy: y },
    { handle: "ne", cx: x + w, cy: y },
    { handle: "e", cx: x + w, cy: y + h / 2 },
    { handle: "se", cx: x + w, cy: y + h },
    { handle: "s", cx: x + w / 2, cy: y + h },
    { handle: "sw", cx: x, cy: y + h },
    { handle: "w", cx: x, cy: y + h / 2 },
  ];
}
