import type { Dispatch, SetStateAction } from "react";
import {
  canvasHeight,
  labels,
  type FieldId,
  type Project,
} from "../../../domain/design/model";
import { setAddedLayerBox, validGraphics } from "../../../domain/design/layers";
import type { DesignBox } from "./canvasInteract";
import { prepareImage } from "../components/GraphicLayers";

/** Canvas selection edits and mapping. The caller owns selection state and save history. */
export function createEditorSelectionActions({
  project,
  selected,
  selectedLayer,
  setSelected,
  setSelectedLayer,
  setDrawing,
  update,
  onMessage,
}: {
  project: Project;
  selected: FieldId | null;
  selectedLayer: string | null;
  setSelected: Dispatch<SetStateAction<FieldId | null>>;
  setSelectedLayer: Dispatch<SetStateAction<string | null>>;
  setDrawing: Dispatch<SetStateAction<FieldId | null>>;
  update: (patch: Partial<Project>) => void;
  onMessage: (message: string) => void;
}) {
  async function mapRegion(
    id: FieldId,
    box: { x: number; y: number; width: number; height: number },
  ) {
    if (!project.reference) return;
    let cover = "#ffffff";
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = project.reference!;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = Math.round(canvasHeight(project));
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const x = Math.min(719, Math.max(0, Math.round(box.x + 2)));
      const y = Math.min(
        canvas.height - 1,
        Math.max(0, Math.round(((box.y + 2) * canvas.height) / 900)),
      );
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      cover =
        "#" +
        [pixel[0], pixel[1], pixel[2]]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
    } catch {
      /* The user can choose a cover color if sampling fails. */
    }
    update({
      layouts: {
        ...project.layouts,
        [id]: {
          ...project.layouts[id],
          ...box,
          locked: false,
          color: "#252525",
        },
      },
      mappedFields: [...new Set([...(project.mappedFields || []), id])],
      covers: { ...project.covers, [id]: cover },
    });
    setDrawing(null);
    setSelected(id);
    onMessage(
      `${labels[id]} mapped. Adjust its font size and cover color in the toolbar.`,
    );
  }
  const patchLayout = (patch: Partial<Project["layouts"][FieldId]>) => {
    if (selected)
      update({
        layouts: {
          ...project.layouts,
          [selected]: { ...project.layouts[selected], ...patch },
        },
      });
  };
  const selectedTextLayer = project.textLayers?.find(
    (l) => l.id === selectedLayer,
  );
  const selectedGraphic = project.graphicLayers?.find(
    (l) => l.id === selectedLayer,
  );
  const patchTextLayer = (
    patch: Partial<
      (typeof project.textLayers extends (infer T)[] | undefined
        ? T
        : never)["layout"]
    > & {
      text?: string;
    },
  ) => {
    if (!selectedTextLayer) return;
    const { text, ...layout } = patch;
    update({
      textLayers: project.textLayers!.map((l) =>
        l.id === selectedTextLayer.id
          ? {
              ...l,
              text: text !== undefined ? text : l.text,
              layout: { ...l.layout, ...layout },
            }
          : l,
      ),
    });
  };
  const patchGraphicLayer = (patch: {
    color?: string;
    shape?: "rectangle" | "ellipse" | "rounded" | "triangle";
    locked?: boolean;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }) => {
    if (!selectedGraphic) return;
    update({
      graphicLayers: project.graphicLayers!.map((l) => {
        if (l.id !== selectedGraphic.id) return l;
        const { color, shape, name, locked, x, y, width, height } = patch;
        const common = {
          ...l,
          ...(name !== undefined ? { name } : null),
          layout: {
            ...l.layout,
            ...(locked !== undefined ? { locked } : null),
            ...(x !== undefined ? { x } : null),
            ...(y !== undefined ? { y } : null),
            ...(width !== undefined ? { width } : null),
            ...(height !== undefined ? { height } : null),
          },
        };
        return l.type === "shape"
          ? {
              ...common,
              type: "shape" as const,
              color: color ?? l.color,
              shape: shape ?? l.shape,
            }
          : common;
      }),
    });
  };
  async function replaceSelectedImage(file: File) {
    if (
      !selectedGraphic ||
      (selectedGraphic.type !== "image" && selectedGraphic.type !== "frame") ||
      selectedGraphic.layout.locked
    )
      return;
    const id = selectedGraphic.id;
    const src = await prepareImage(file);
    update({
      graphicLayers: project.graphicLayers!.map((layer) =>
        layer.id === id && (layer.type === "image" || layer.type === "frame")
          ? { ...layer, name: file.name.slice(0, 100), src }
          : layer,
      ),
    });
    onMessage("Image replaced.");
  }
  function removeSelectedLayer() {
    if (!selectedLayer) return;
    if (
      project.textLayers?.find((layer) => layer.id === selectedLayer)?.layout
        .locked ||
      project.graphicLayers?.find((layer) => layer.id === selectedLayer)?.layout
        .locked
    )
      return;
    update({
      textLayers: (project.textLayers || []).filter(
        (l) => l.id !== selectedLayer,
      ),
      graphicLayers: (project.graphicLayers || []).filter(
        (l) => l.id !== selectedLayer,
      ),
      layerOrder: (project.layerOrder || []).filter(
        (id) => id !== selectedLayer,
      ),
    });
    setSelectedLayer(null);
    onMessage("Removed.");
  }
  function applyFieldBox(id: FieldId, box: DesignBox) {
    if (project.designMode === "reference") return;
    const l = project.layouts[id];
    update({
      layouts: {
        ...project.layouts,
        [id]: {
          ...l,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
      },
    });
  }
  function applyLayerBox(id: string, box: DesignBox) {
    const moving = project.graphicLayers?.find((layer) => layer.id === id);
    if (moving?.type === "image") {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const frame = project.graphicLayers?.find(
        (layer) =>
          layer.type === "frame" &&
          !layer.layout.locked &&
          centerX >= layer.layout.x &&
          centerX <= layer.layout.x + layer.layout.width &&
          centerY >= layer.layout.y &&
          centerY <= layer.layout.y + layer.layout.height,
      );
      if (frame && frame.type === "frame") {
        const next = project
          .graphicLayers!.filter((layer) => layer.id !== id)
          .map((layer) =>
            layer.id === frame.id && layer.type === "frame"
              ? { ...layer, src: moving.src }
              : layer,
          );
        if (validGraphics(next)) {
          update({
            graphicLayers: next,
            layerOrder: project.layerOrder?.filter((layerId) => layerId !== id),
          });
          setSelectedLayer(frame.id);
          onMessage(
            "Photo placed in frame. Resize the frame to adjust the crop.",
          );
          return;
        }
      }
    }
    const patch = setAddedLayerBox(project, id, box);
    if (Object.keys(patch).length) update(patch);
  }
  return {
    mapRegion,
    patchLayout,
    selectedTextLayer,
    selectedGraphic,
    patchTextLayer,
    patchGraphicLayer,
    replaceSelectedImage,
    removeSelectedLayer,
    applyFieldBox,
    applyLayerBox,
  };
}
