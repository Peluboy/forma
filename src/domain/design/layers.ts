import type { Layout, Project } from "./model.js";

export type GraphicLayer = {
  id: string;
  name: string;
  layout: Pick<Layout, "x" | "y" | "width" | "height" | "locked" | "hidden">;
} & (
  | {
      type: "shape";
      shape: "rectangle" | "ellipse" | "rounded" | "triangle";
      color: string;
    }
  | { type: "image"; src: string }
  | { type: "frame"; shape: "rectangle" | "rounded" | "ellipse"; src?: string }
);

export function validGraphics(value: unknown): value is GraphicLayer[] {
  if (!Array.isArray(value) || value.length > 30) return false;
  const ids = new Set();
  let bytes = 0;
  return value.every((l) => {
    if (
      !l ||
      typeof l !== "object" ||
      typeof l.id !== "string" ||
      !/^graphic-[a-zA-Z0-9-]{1,80}$/.test(l.id) ||
      ids.has(l.id) ||
      typeof l.name !== "string" ||
      l.name.length > 100
    )
      return false;
    ids.add(l.id);
    const b = l.layout;
    if (
      !b ||
      ![b.x, b.y, b.width, b.height].every(Number.isFinite) ||
      b.x < 0 ||
      b.y < 0 ||
      b.width <= 0 ||
      b.height <= 0 ||
      b.x + b.width > 720 ||
      b.y + b.height > 900 ||
      typeof b.locked !== "boolean"
    )
      return false;
    if (b.hidden !== undefined && typeof b.hidden !== "boolean") return false;
    if (l.type === "shape")
      return (
        ["rectangle", "ellipse", "rounded", "triangle"].includes(l.shape) &&
        typeof l.color === "string" &&
        /^#[0-9a-f]{6}$/i.test(l.color)
      );
    if (
      l.type === "frame" &&
      !["rectangle", "rounded", "ellipse"].includes(l.shape)
    )
      return false;
    if (l.type === "frame" && l.src === undefined) return true;
    if (
      (l.type !== "image" && l.type !== "frame") ||
      typeof l.src !== "string" ||
      l.src.length > 220000 ||
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(l.src)
    )
      return false;
    bytes += l.src.length;
    return bytes <= 500000;
  });
}

/** Added layers are above original artwork. Omitted order retains legacy text order. */
export function orderedLayerIds(project: Project): string[] {
  const ids = [
    ...(project.textLayers || []).map((l) => l.id),
    ...(project.graphicLayers || []).map((l) => l.id),
  ];
  const known = new Set(ids);
  return [
    ...(project.layerOrder || []).filter((id) => known.has(id)),
    ...ids.filter((id) => !project.layerOrder?.includes(id)),
  ];
}

export function reorderLayer(
  project: Project,
  id: string,
  direction: "forward" | "backward",
): Partial<Project> {
  const layer = [
    ...(project.textLayers || []),
    ...(project.graphicLayers || []),
  ].find((l) => l.id === id);
  if (!layer || layer.layout.locked) return {};
  const order = orderedLayerIds(project),
    index = order.indexOf(id);
  const target = index + (direction === "forward" ? 1 : -1);
  if (index < 0 || target < 0 || target >= order.length) return {};
  [order[index], order[target]] = [order[target], order[index]];
  return { layerOrder: order };
}

export function moveAddedLayer(
  project: Project,
  id: string,
  dx: number,
  dy: number,
): Partial<Project> {
  function move<T extends { id: string; layout: GraphicLayer["layout"] }>(
    l: T,
  ): T {
    return l.id !== id || l.layout.locked
      ? l
      : {
          ...l,
          layout: {
            ...l.layout,
            x: Math.max(0, Math.min(720 - l.layout.width, l.layout.x + dx)),
            y: Math.max(0, Math.min(900 - l.layout.height, l.layout.y + dy)),
          },
        };
  }
  return {
    textLayers: project.textLayers?.map(move),
    graphicLayers: project.graphicLayers?.map(move),
  };
}

export function setAddedLayerBox(
  project: Project,
  id: string,
  box: { x: number; y: number; width: number; height: number },
): Partial<Project> {
  const next = {
    x: Math.max(0, Math.min(720 - 24, box.x)),
    y: Math.max(0, Math.min(900 - 24, box.y)),
    width: Math.max(24, Math.min(720, box.width)),
    height: Math.max(24, Math.min(900, box.height)),
  };
  next.x = Math.min(next.x, 720 - next.width);
  next.y = Math.min(next.y, 900 - next.height);
  function apply<T extends { id: string; layout: GraphicLayer["layout"] }>(
    l: T,
  ): T {
    return l.id !== id || l.layout.locked
      ? l
      : { ...l, layout: { ...l.layout, ...next } };
  }
  const textLayers = project.textLayers?.map(apply);
  const graphicLayers = project.graphicLayers?.map(apply);
  if (
    textLayers &&
    !validTextLike(textLayers) &&
    project.textLayers?.some((l) => l.id === id)
  )
    return {};
  if (
    graphicLayers &&
    !validGraphics(graphicLayers) &&
    project.graphicLayers?.some((l) => l.id === id)
  )
    return {};
  return { textLayers, graphicLayers };
}

function validTextLike(
  layers: { id: string; layout: GraphicLayer["layout"] }[],
) {
  return layers.every(
    (l) =>
      l.layout.x >= 0 &&
      l.layout.y >= 0 &&
      l.layout.width > 0 &&
      l.layout.height > 0 &&
      l.layout.x + l.layout.width <= 720 &&
      l.layout.y + l.layout.height <= 900,
  );
}

export function duplicateAddedLayer(
  project: Project,
  id: string,
): Partial<Project> | null {
  const text = project.textLayers?.find((l) => l.id === id);
  if (text) {
    const copy = {
      ...text,
      id: `layer-${crypto.randomUUID()}`,
      layout: {
        ...text.layout,
        x: Math.min(720 - text.layout.width, text.layout.x + 16),
        y: Math.min(900 - text.layout.height, text.layout.y + 16),
        locked: false,
      },
    };
    const textLayers = [...(project.textLayers || []), copy];
    return {
      textLayers,
      layerOrder: [...orderedLayerIds(project), copy.id],
    };
  }
  const graphic = project.graphicLayers?.find((l) => l.id === id);
  if (!graphic) return null;
  const copy: GraphicLayer = {
    ...graphic,
    id: `graphic-${crypto.randomUUID()}`,
    name: `${graphic.name} copy`,
    layout: {
      ...graphic.layout,
      x: Math.min(720 - graphic.layout.width, graphic.layout.x + 16),
      y: Math.min(900 - graphic.layout.height, graphic.layout.y + 16),
      locked: false,
    },
  };
  const graphicLayers = [...(project.graphicLayers || []), copy];
  if (!validGraphics(graphicLayers)) return null;
  return {
    graphicLayers,
    layerOrder: [...orderedLayerIds(project), copy.id],
  };
}
