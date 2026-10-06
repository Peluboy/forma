import type { RefObject } from "react";
import {
  duplicateAddedLayer,
  orderedLayerIds,
  reorderLayer,
  validGraphics,
  type GraphicLayer,
} from "../../../domain/design/layers";
import { addSlide } from "../../../domain/design/presentation";
import {
  validTextLayers,
  type FieldId,
  type Layout,
  type Project,
  type TextLayer,
} from "../../../domain/design/model";
import type { ContextAction } from "../components/EditorContextMenu";

export type CanvasTarget = { kind: "field" | "layer"; id: string } | null;
export type CanvasClipboard =
  | { kind: "text"; layer: TextLayer }
  | { kind: "graphic"; layer: GraphicLayer }
  | { kind: "text-style"; style: Partial<Layout> }
  | { kind: "shape-style"; color: string }
  | {
      kind: "page-style";
      family: Project["family"];
      template: Project["template"];
      backgroundColor?: string;
      theme?: NonNullable<Project["presentation"]>["theme"];
      master?: NonNullable<Project["flow"]>["master"];
    };

const TEXT_STYLE_KEYS = [
  "fontFamily",
  "fontWeight",
  "size",
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "letterSpacing",
  "lineHeight",
  "opacity",
  "color",
  "align",
] as const;
function textStyle(layout: Layout): Partial<Layout> {
  return Object.fromEntries(
    TEXT_STYLE_KEYS.map((key) => [key, layout[key]]).filter(
      ([, value]) => value !== undefined,
    ),
  ) as Partial<Layout>;
}

type CanvasActionDeps = {
  project: Project;
  contextTarget: CanvasTarget;
  showGuides: boolean;
  setShowGuides: (value: boolean) => void;
  setShowLayers: (value: boolean) => void;
  setDialog: (value: "resize") => void;
  update: (patch: Partial<Project>) => void;
  canvasClipboard: RefObject<CanvasClipboard | null>;
  setToast: (value: string) => void;
  setSelectedLayer: (value: string) => void;
  setSelected: (value: null) => void;
};

export function runCanvasAction(action: ContextAction, deps: CanvasActionDeps) {
  const {
    project,
    contextTarget,
    showGuides,
    setShowGuides,
    setShowLayers,
    setDialog,
    update,
    canvasClipboard,
    setToast,
    setSelectedLayer,
    setSelected,
  } = deps;
  const target = contextTarget;
  const field = target?.kind === "field" ? (target.id as FieldId) : null;
  const text =
    target?.kind === "layer"
      ? project.textLayers?.find((layer) => layer.id === target.id)
      : null;
  const graphic =
    target?.kind === "layer"
      ? project.graphicLayers?.find((layer) => layer.id === target.id)
      : null;
  const layout = field ? project.layouts[field] : text?.layout;
  if (action === "layers") {
    setShowLayers(true);
    return;
  }
  if (action === "guides") {
    setShowGuides(!showGuides);
    return;
  }
  if (action === "hide-page") {
    if (project.family === "document" && project.flow) {
      const flow = project.flow;
      const active = flow.pages.find((page) => page.id === flow.activePageId);
      if (
        active &&
        (active.hidden ||
          flow.pages.some((page) => page.id !== active.id && !page.hidden))
      )
        update({
          flow: {
            ...flow,
            pages: flow.pages.map((page) =>
              page.id === active.id ? { ...page, hidden: !page.hidden } : page,
            ),
          },
        });
    } else if (project.family === "presentation" && project.presentation) {
      const deck = project.presentation;
      const active = deck.slides.find(
        (slide) => slide.id === deck.activeSlideId,
      );
      if (
        active &&
        (active.hidden ||
          deck.slides.some((slide) => slide.id !== active.id && !slide.hidden))
      )
        update({
          presentation: {
            ...deck,
            slides: deck.slides.map((slide) =>
              slide.id === active.id
                ? { ...slide, hidden: !slide.hidden }
                : slide,
            ),
          },
        });
    }
    return;
  }
  if (action === "resize") {
    setDialog("resize");
    return;
  }
  if (action === "copy") {
    if (field)
      canvasClipboard.current = {
        kind: "text",
        layer: {
          id: `layer-${crypto.randomUUID()}`,
          text: project.copy[field],
          layout: { ...project.layouts[field] },
        },
      };
    else if (text)
      canvasClipboard.current = {
        kind: "text",
        layer: structuredClone(text),
      };
    else if (graphic)
      canvasClipboard.current = {
        kind: "graphic",
        layer: structuredClone(graphic),
      };
    setToast("Copied. Right-click the page to paste.");
    return;
  }
  if (action === "copy-style") {
    if (layout)
      canvasClipboard.current = {
        kind: "text-style",
        style: textStyle(layout),
      };
    else if (graphic?.type === "shape")
      canvasClipboard.current = { kind: "shape-style", color: graphic.color };
    setToast("Style copied.");
    return;
  }
  if (action === "copy-page-style") {
    canvasClipboard.current = {
      kind: "page-style",
      family: project.family,
      template: project.template,
      backgroundColor: project.backgroundColor,
      theme: project.presentation?.theme,
      master: project.flow?.master,
    };
    setToast("Page style copied.");
    return;
  }
  if (
    action === "paste-page-style" &&
    canvasClipboard.current?.kind === "page-style"
  ) {
    const saved = canvasClipboard.current;
    if (
      project.family === "presentation" &&
      project.presentation &&
      saved.theme
    )
      update({
        presentation: { ...project.presentation, theme: saved.theme },
      });
    else if (project.family === "document" && project.flow && saved.master)
      update({ flow: { ...project.flow, master: saved.master } });
    else if (project.family !== "document" && project.family !== "presentation")
      update({
        template: saved.template,
        backgroundColor: saved.backgroundColor,
      });
    return;
  }
  if (action === "paste-style") {
    const saved = canvasClipboard.current;
    if (saved?.kind === "text-style" && field)
      update({
        layouts: {
          ...project.layouts,
          [field]: { ...project.layouts[field], ...saved.style },
        },
      });
    else if (saved?.kind === "text-style" && text)
      update({
        textLayers: project.textLayers?.map((layer) =>
          layer.id === text.id
            ? { ...layer, layout: { ...layer.layout, ...saved.style } }
            : layer,
        ),
      });
    else if (saved?.kind === "shape-style" && graphic?.type === "shape")
      update({
        graphicLayers: project.graphicLayers?.map((layer) =>
          layer.id === graphic.id && layer.type === "shape"
            ? { ...layer, color: saved.color }
            : layer,
        ),
      });
    return;
  }
  if (action === "paste") {
    const saved = canvasClipboard.current;
    if (saved?.kind === "text") {
      const original = saved.layer;
      const copy = {
        ...original,
        id: `layer-${crypto.randomUUID()}`,
        layout: {
          ...original.layout,
          x: Math.min(720 - original.layout.width, original.layout.x + 16),
          y: Math.min(900 - original.layout.height, original.layout.y + 16),
          locked: false,
          hidden: false,
        },
      };
      const next = [...(project.textLayers || []), copy];
      if (validTextLayers(next)) {
        update({
          textLayers: next,
          layerOrder: [...orderedLayerIds(project), copy.id],
        });
        setSelectedLayer(copy.id);
        setSelected(null);
      }
    } else if (saved?.kind === "graphic") {
      const original = saved.layer;
      const copy = {
        ...original,
        id: `graphic-${crypto.randomUUID()}`,
        name: `${original.name} copy`,
        layout: {
          ...original.layout,
          x: Math.min(720 - original.layout.width, original.layout.x + 16),
          y: Math.min(900 - original.layout.height, original.layout.y + 16),
          locked: false,
          hidden: false,
        },
      };
      const next = [...(project.graphicLayers || []), copy];
      if (validGraphics(next)) {
        update({
          graphicLayers: next,
          layerOrder: [...orderedLayerIds(project), copy.id],
        });
        setSelectedLayer(copy.id);
        setSelected(null);
      }
    }
    return;
  }
  if (action === "duplicate") {
    if (field) {
      canvasClipboard.current = {
        kind: "text",
        layer: {
          id: `layer-${crypto.randomUUID()}`,
          text: project.copy[field],
          layout: { ...project.layouts[field] },
        },
      };
      runCanvasAction("paste", deps);
    } else if (target?.kind === "layer") {
      const patch = duplicateAddedLayer(project, target.id);
      if (patch) update(patch);
    }
    return;
  }
  if (action === "forward" || action === "backward") {
    if (target?.kind === "layer")
      update(reorderLayer(project, target.id, action));
    return;
  }
  if (action === "lock" || action === "hide") {
    const key = action === "lock" ? "locked" : "hidden";
    if (field)
      update({
        layouts: {
          ...project.layouts,
          [field]: {
            ...project.layouts[field],
            [key]: !project.layouts[field][key],
          },
        },
      });
    else if (target?.kind === "layer")
      update({
        textLayers: project.textLayers?.map((layer) =>
          layer.id === target.id
            ? {
                ...layer,
                layout: { ...layer.layout, [key]: !layer.layout[key] },
              }
            : layer,
        ),
        graphicLayers: project.graphicLayers?.map((layer) =>
          layer.id === target.id
            ? {
                ...layer,
                layout: { ...layer.layout, [key]: !layer.layout[key] },
              }
            : layer,
        ),
      });
    return;
  }
  if (action === "add-page" || action === "duplicate-page") {
    if (project.family === "presentation" && project.presentation) {
      const deck = project.presentation;
      if (deck.slides.length >= 100) return;
      if (action === "add-page") update({ presentation: addSlide(deck) });
      else {
        const source =
          deck.slides.find((slide) => slide.id === deck.activeSlideId) ||
          deck.slides[0];
        const copy = {
          ...structuredClone(source),
          id: `slide-${crypto.randomUUID()}`,
        };
        const index = deck.slides.indexOf(source);
        update({
          presentation: {
            ...deck,
            slides: [
              ...deck.slides.slice(0, index + 1),
              copy,
              ...deck.slides.slice(index + 1),
            ],
            activeSlideId: copy.id,
          },
        });
      }
    } else if (project.family === "document" && project.flow) {
      const flow = project.flow;
      if (flow.pages.length >= 200) return;
      const source =
        flow.pages.find((page) => page.id === flow.activePageId) ||
        flow.pages[0];
      const page =
        action === "duplicate-page"
          ? {
              ...structuredClone(source),
              id: `page-${crypto.randomUUID()}`,
              elements: source.elements.map((element) => ({
                ...structuredClone(element),
                id: `${element.id}-${crypto.randomUUID()}`,
              })),
            }
          : { id: `page-${crypto.randomUUID()}`, elements: [] };
      const index = flow.pages.indexOf(source);
      update({
        flow: {
          ...flow,
          pages: [
            ...flow.pages.slice(0, index + 1),
            page,
            ...flow.pages.slice(index + 1),
          ],
          activePageId: page.id,
        },
      });
    }
  }
}
