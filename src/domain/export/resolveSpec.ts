import { fromFlowDocument } from "../design-spec/adapters/fromFlowDocument.js";
import { fromLegacyGraphicProject } from "../design-spec/adapters/fromLegacyGraphicProject.js";
import type {
  DesignElement,
  DesignPage,
  DesignSpec,
  TableCell,
} from "../design-spec/types.js";
import type { Project } from "../design/schema.js";
import type { PresentationDeck, Slide } from "../design/presentation.js";

export function isDesignSpec(value: unknown): value is DesignSpec {
  if (!value || typeof value !== "object") return false;
  const spec = value as DesignSpec;
  return (
    spec.version === "1.0" &&
    typeof spec.id === "string" &&
    Array.isArray(spec.pages)
  );
}

export function resolveDesignSpecFromProject(project: Project): {
  spec: DesignSpec;
  warnings: string[];
  source: "metadata" | "flow" | "graphic" | "presentation";
} {
  if (project.family === "document" && project.flow) {
    const adapted = fromFlowDocument(project);
    return { spec: adapted.spec, warnings: adapted.warnings, source: "flow" };
  }
  if (project.family === "presentation" && project.presentation) {
    return fromPresentationProject(project);
  }
  if (project.family !== "document" && project.family !== "presentation") {
    const adapted = fromLegacyGraphicProject(project);
    return {
      spec: adapted.spec,
      warnings: adapted.warnings,
      source: "graphic",
    };
  }
  if (isDesignSpec(project.metadata?.designSpec)) {
    return {
      spec: project.metadata.designSpec,
      warnings: [],
      source: "metadata",
    };
  }
  const adapted = fromLegacyGraphicProject(project);
  return { spec: adapted.spec, warnings: adapted.warnings, source: "graphic" };
}

function fromPresentationProject(project: Project): {
  spec: DesignSpec;
  warnings: string[];
  source: "presentation";
} {
  const deck = project.presentation as PresentationDeck;
  const pages = deck.slides.map((slide, index) =>
    slideToPage(slide, deck, index),
  );
  return {
    spec: {
      version: "1.0",
      id: `${project.id}-spec`,
      name: project.name,
      family: "presentation",
      copyPolicy: project.copyPolicy || "exact",
      documentSize: {
        width: deck.pageSize.width,
        height: deck.pageSize.height,
        unit: "pt",
      },
      pages,
      metadata: {
        ...(project.metadata || {}),
        workspaceId: project.workspaceId,
        clientId: project.clientId,
      },
    },
    warnings: [
      "Presentation exported from slide slots, not a stored DesignSpec.",
    ],
    source: "presentation",
  };
}

function slideToPage(
  slide: Slide,
  deck: PresentationDeck,
  index: number,
): DesignPage {
  const { width, height } = deck.pageSize;
  const elements: DesignElement[] = [];
  const addText = (
    id: string,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    size: number,
    weight?: number,
  ) => {
    if (!text) return;
    elements.push({
      id,
      type: "text",
      text,
      x,
      y,
      width: w,
      height: h,
      fontFamily: "Inter",
      fontSize: size,
      fontWeight: weight,
      color: deck.theme.text,
      align: "left",
    });
  };
  addText(`${slide.id}-title`, slide.title, 48, 36, width - 96, 48, 28, 700);
  const body = [slide.body, ...slide.bullets].filter(Boolean).join("\n");
  addText(`${slide.id}-body`, body, 48, 100, width - 96, 200, 16);
  if (slide.table?.length) {
    const rows: TableCell[][] = slide.table.map((row) =>
      row.map((text) => ({ text })),
    );
    elements.push({
      id: `${slide.id}-table`,
      type: "table",
      x: 48,
      y: 320,
      width: width - 96,
      height: 160,
      columns: slide.table[0]?.length || 1,
      rows,
      headerRows: 1,
    });
  }
  if (slide.chart) {
    elements.push({
      id: slide.chart.id,
      type: "chart",
      chartType: "bar",
      labels: slide.chart.categories,
      data: slide.chart.series[0]?.values || [],
      title: slide.chart.title,
      x: 48,
      y: 300,
      width: width - 96,
      height: 200,
    });
  }
  return {
    id: slide.id || `slide-${index + 1}`,
    name: slide.title || `Slide ${index + 1}`,
    role: "content",
    width,
    height,
    background: { color: deck.theme.background },
    elementIds: elements.map((element) => element.id),
    elements,
    metadata: slide.hidden ? { hidden: true } : undefined,
  };
}
