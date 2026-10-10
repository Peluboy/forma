import { jsPDF } from "jspdf";
import { computeLineWraps } from "../layout-fit/measure.js";
import type {
  DesignElement,
  DesignPage,
  DesignSpec,
  ImageElement,
  ShapeElement,
  TableElement,
  TextElement,
} from "../design-spec/types.js";
import { prepareChart } from "./chartExport.js";
import { mapFontForPdf, pdfFontDisplayName } from "./fontMapping.js";
import { resolveExportImage } from "./imageExport.js";
import { metadataForPdfProperties } from "./metadata.js";
import { pageSizePt, orderedElements } from "./preflight.js";
import { prepareTable } from "./tableExport.js";
import { selectPages } from "./options.js";
import { fidelityItem } from "./fidelity.js";
import type {
  ExportFidelityItem,
  ExportMetadata,
  ExportWarning,
  PdfExportOptions,
} from "./types.js";

export interface PdfRenderResult {
  bytes: Uint8Array;
  preservedText: string[];
  items: ExportFidelityItem[];
  warnings: ExportWarning[];
  rasterized: boolean;
  selectableText: boolean;
  chartData: NonNullable<
    import("./types.js").ExportFidelityReport["chartData"]
  >;
}

function parseColor(input?: string): { r: number; g: number; b: number } {
  if (!input) return { r: 17, g: 17, b: 17 };
  const hex = input.trim();
  if (hex.startsWith("#")) {
    const raw = hex.slice(1);
    if (raw.length === 3) {
      return {
        r: parseInt(raw[0] + raw[0], 16),
        g: parseInt(raw[1] + raw[1], 16),
        b: parseInt(raw[2] + raw[2], 16),
      };
    }
    if (raw.length >= 6) {
      return {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16),
      };
    }
  }
  const rgb = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  return { r: 17, g: 17, b: 17 };
}

function applyFill(pdf: jsPDF, color?: string) {
  const { r, g, b } = parseColor(color);
  pdf.setFillColor(r, g, b);
}

function applyStroke(pdf: jsPDF, color?: string, width?: number) {
  const { r, g, b } = parseColor(color || "#111111");
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(width || 1);
}

function applyTextColor(pdf: jsPDF, color?: string) {
  const { r, g, b } = parseColor(color);
  pdf.setTextColor(r, g, b);
}

function applyOpacity(pdf: jsPDF, opacity?: number): boolean {
  if (opacity === undefined || opacity >= 1) return true;
  try {
    const GState = (
      pdf as unknown as { GState: new (state: { opacity: number }) => unknown }
    ).GState;
    if (!GState) return false;
    (pdf as unknown as { setGState: (state: unknown) => void }).setGState(
      new GState({ opacity }),
    );
    return true;
  } catch {
    return false;
  }
}

export function renderDesignSpecPdf(
  spec: DesignSpec,
  options: PdfExportOptions,
  metadata?: ExportMetadata,
): PdfRenderResult {
  const pages = selectPages(
    spec.pages.filter((page) => page.metadata?.hidden !== true),
    options.pageRange,
  );
  if (!pages.length) {
    throw new Error("There are no pages to export.");
  }
  const first = pageSizePt(spec, pages[0]);
  const pdf = new jsPDF({
    orientation: first.height >= first.width ? "portrait" : "landscape",
    unit: "pt",
    format: [first.width, first.height],
    compress: options.quality === "draft",
  });
  if (options.includeMetadata && metadata) {
    const props = metadataForPdfProperties(metadata);
    pdf.setProperties({
      title: spec.name,
      subject: props.subject,
      creator: props.creator,
      keywords: props.keywords,
    });
  }

  const preservedText: string[] = [];
  const items: ExportFidelityItem[] = [];
  const warnings: ExportWarning[] = [];
  const chartData: PdfRenderResult["chartData"] = [];
  let rasterized = false;
  let selectableText = false;

  pages.forEach((page, index) => {
    const size = pageSizePt(spec, page);
    if (index > 0) pdf.addPage([size.width, size.height]);
    drawPageBackground(pdf, page, size);
    items.push(
      fidelityItem({
        kind: "page",
        pageId: page.id,
        property: "background",
        status: "preserved",
      }),
    );
    for (const element of orderedElements(page)) {
      const drawn = drawElement(pdf, spec, page, element, options);
      preservedText.push(...drawn.text);
      items.push(...drawn.items);
      warnings.push(...drawn.warnings);
      if (drawn.rasterized) rasterized = true;
      if (drawn.selectable) selectableText = true;
      if (drawn.chart) chartData.push(drawn.chart);
    }
  });

  const arrayBuffer = pdf.output("arraybuffer");
  return {
    bytes: new Uint8Array(arrayBuffer),
    preservedText,
    items,
    warnings,
    rasterized,
    selectableText: options.preserveSelectableText !== false && selectableText,
    chartData,
  };
}

function drawPageBackground(
  pdf: jsPDF,
  page: DesignPage,
  size: { width: number; height: number },
) {
  applyFill(pdf, page.background?.color || "#ffffff");
  pdf.rect(0, 0, size.width, size.height, "F");
}

function drawElement(
  pdf: jsPDF,
  spec: DesignSpec,
  page: DesignPage,
  element: DesignElement,
  options: PdfExportOptions,
): {
  text: string[];
  items: ExportFidelityItem[];
  warnings: ExportWarning[];
  rasterized: boolean;
  selectable: boolean;
  chart?: NonNullable<PdfRenderResult["chartData"]>[number];
} {
  if (element.type === "text") return drawText(pdf, element, page.id, options);
  if (element.type === "shape")
    return drawShape(pdf, element, page.id, options);
  if (element.type === "image" || element.type === "frame")
    return drawImage(pdf, spec, element as ImageElement, page.id, options);
  if (element.type === "table") return drawTable(pdf, spec, element, page.id);
  if (element.type === "chart") return drawChart(pdf, element, page.id);
  if (element.type === "group") {
    return {
      text: [],
      items: [
        fidelityItem({
          kind: "group",
          pageId: page.id,
          elementId: element.id,
          property: "hierarchy",
          status: "approximated",
          detail: "flattened",
        }),
      ],
      warnings: [],
      rasterized: false,
      selectable: false,
    };
  }
  return {
    text: [],
    items: [],
    warnings: [],
    rasterized: false,
    selectable: false,
  };
}

function drawText(
  pdf: jsPDF,
  element: TextElement,
  pageId: string,
  options: PdfExportOptions,
): ReturnType<typeof drawElement> {
  const mapped = mapFontForPdf(
    element.fontFamily,
    element.fontWeight,
    Boolean(element.metadata?.italic),
    { pageId, elementId: element.id },
  );
  const items: ExportFidelityItem[] = [];
  const warnings: ExportWarning[] = [];
  if (mapped.substituted && mapped.warning) {
    warnings.push(mapped.warning);
    items.push(
      fidelityItem({
        kind: "font",
        pageId,
        elementId: element.id,
        property: mapped.requested,
        status: "substituted",
        detail: pdfFontDisplayName(mapped.family),
      }),
    );
  }
  pdf.setFont(mapped.family, mapped.style);
  pdf.setFontSize(element.fontSize || 12);
  applyTextColor(pdf, element.color);
  applyOpacity(pdf, element.opacity);
  const lines = computeLineWraps(
    element.text,
    element.width,
    element.fontFamily || "Inter",
    element.fontSize || 12,
  );
  const lineHeight = (element.fontSize || 12) * (element.lineHeight || 1.35);
  const blockHeight = lines.length * lineHeight;
  let y = element.y;
  if (element.verticalAlign === "middle")
    y += Math.max(0, (element.height - blockHeight) / 2);
  if (element.verticalAlign === "bottom")
    y += Math.max(0, element.height - blockHeight);
  const align = element.align === "justify" ? "left" : element.align || "left";
  if (element.align === "justify") {
    items.push(
      fidelityItem({
        kind: "text",
        pageId,
        elementId: element.id,
        property: "align",
        status: "approximated",
        detail: "justify drawn as left",
      }),
    );
  }
  let x = element.x;
  if (align === "center") x = element.x + element.width / 2;
  if (align === "right") x = element.x + element.width;
  if (options.preserveSelectableText !== false) {
    pdf.text(lines, x, y, {
      align,
      baseline: "top",
      lineHeightFactor: element.lineHeight || 1.35,
    });
  }
  items.push(
    fidelityItem({
      kind: "text",
      pageId,
      elementId: element.id,
      property: "text",
      status: "preserved",
      detail: element.text,
    }),
  );
  return {
    text: [element.text],
    items,
    warnings,
    rasterized: false,
    selectable: options.preserveSelectableText !== false,
  };
}

function drawShape(
  pdf: jsPDF,
  element: ShapeElement,
  pageId: string,
  _options: PdfExportOptions,
): ReturnType<typeof drawElement> {
  applyFill(pdf, element.fill?.color || "#e8e8e8");
  applyStroke(pdf, element.stroke?.color, element.strokeWidth);
  applyOpacity(pdf, element.opacity);
  const style = element.fill ? (element.stroke ? "FD" : "F") : "S";
  let status: ExportFidelityItem["status"] = "preserved";
  let detail: string = element.shape;
  if (element.shape === "ellipse") {
    pdf.ellipse(
      element.x + element.width / 2,
      element.y + element.height / 2,
      element.width / 2,
      element.height / 2,
      style,
    );
  } else if (element.shape === "line") {
    pdf.line(
      element.x,
      element.y,
      element.x + element.width,
      element.y + element.height,
    );
  } else if (element.shape === "rounded") {
    pdf.roundedRect(
      element.x,
      element.y,
      element.width,
      element.height,
      8,
      8,
      style,
    );
  } else if (element.shape === "triangle") {
    pdf.triangle(
      element.x + element.width / 2,
      element.y,
      element.x + element.width,
      element.y + element.height,
      element.x,
      element.y + element.height,
      style,
    );
  } else {
    pdf.rect(element.x, element.y, element.width, element.height, style);
    if (element.shape === "polygon") {
      status = "approximated";
      detail = "polygon as rectangle";
    }
  }
  return {
    text: [],
    items: [
      fidelityItem({
        kind: "shape",
        pageId,
        elementId: element.id,
        property: "shape",
        status,
        detail,
      }),
    ],
    warnings: [],
    rasterized: false,
    selectable: false,
  };
}

function drawImage(
  pdf: jsPDF,
  spec: DesignSpec,
  element: ImageElement,
  pageId: string,
  options: PdfExportOptions,
): ReturnType<typeof drawElement> {
  const resolved = resolveExportImage(
    {
      ...element,
      type: "image",
      assetRef: element.assetRef || "",
      fit: element.fit || "crop",
    },
    spec.assets,
    pageId,
  );
  if (!options.embedImages || resolved.missing || !resolved.dataUri) {
    applyFill(pdf, "#f3f1ec");
    applyStroke(pdf, "#c9c4b8");
    pdf.rect(element.x, element.y, element.width, element.height, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    applyTextColor(pdf, "#6b675e");
    pdf.text("Image unavailable", element.x + 8, element.y + 16, {
      baseline: "top",
    });
    return {
      text: ["Image unavailable"],
      items: [
        fidelityItem({
          kind: "image",
          pageId,
          elementId: element.id,
          property: "source",
          status: resolved.decorative ? "approximated" : "omitted",
          detail: "placeholder",
        }),
      ],
      warnings: resolved.warnings,
      rasterized: false,
      selectable: true,
    };
  }
  const format = (resolved.mimeType || "").includes("jpeg") ? "JPEG" : "PNG";
  try {
    pdf.addImage(
      resolved.dataUri,
      format,
      resolved.dest.x,
      resolved.dest.y,
      resolved.dest.width,
      resolved.dest.height,
    );
  } catch {
    return {
      text: [],
      items: [
        fidelityItem({
          kind: "image",
          pageId,
          elementId: element.id,
          property: "source",
          status: "omitted",
          detail: "embed failed",
        }),
      ],
      warnings: [
        {
          code: "image_embed_failed",
          message: "An image could not be embedded.",
          pageId,
          elementId: element.id,
        },
      ],
      rasterized: false,
      selectable: false,
    };
  }
  const changed = Boolean(element.crop || element.focalPoint);
  return {
    text: [],
    items: [
      fidelityItem({
        kind: "image",
        pageId,
        elementId: element.id,
        property: "image",
        status: changed ? "approximated" : "preserved",
        detail: resolved.fit,
      }),
    ],
    warnings: resolved.warnings,
    rasterized: false,
    selectable: false,
  };
}

function drawTable(
  pdf: jsPDF,
  spec: DesignSpec,
  element: TableElement,
  pageId: string,
): ReturnType<typeof drawElement> {
  const prepared = prepareTable(element, pageId, spec.styles?.textStyles);
  const text: string[] = [];
  for (const cell of prepared.cells) {
    applyFill(pdf, cell.header ? "#eef6f2" : "#ffffff");
    applyStroke(pdf, "#c9c4b8", 0.6);
    pdf.rect(cell.x, cell.y, cell.width, cell.height, "FD");
    pdf.setFont("helvetica", cell.header ? "bold" : "normal");
    pdf.setFontSize(10);
    applyTextColor(pdf, "#222222");
    let x = cell.x + 4;
    if (cell.align === "center") x = cell.x + cell.width / 2;
    if (cell.align === "right") x = cell.x + cell.width - 4;
    pdf.text(cell.lines, x, cell.y + 4, {
      align: cell.align === "justify" ? "left" : cell.align,
      baseline: "top",
    });
    if (cell.text) text.push(cell.text);
  }
  return {
    text,
    items: [
      fidelityItem({
        kind: "table",
        pageId,
        elementId: element.id,
        property: "table",
        status: prepared.overflow ? "approximated" : "preserved",
        detail: prepared.overflow ? "cell overflow" : "structured",
      }),
    ],
    warnings: prepared.warnings,
    rasterized: false,
    selectable: true,
  };
}

function drawChart(
  pdf: jsPDF,
  element: import("../design-spec/types.js").ChartElement,
  pageId: string,
): ReturnType<typeof drawElement> {
  const drawing = prepareChart(element, pageId);
  applyFill(pdf, "#ffffff");
  applyStroke(pdf, "#d5d0c6", 0.8);
  pdf.rect(element.x, element.y, element.width, element.height, "FD");
  const palette = ["#0c7e61", "#2a6f97", "#c46b2d", "#6b5b95", "#b23a48"];
  if (drawing.title) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    applyTextColor(pdf, "#222222");
    pdf.text(drawing.title, element.x + 12, element.y + 10, {
      baseline: "top",
    });
  }
  if (drawing.bars) {
    drawing.bars.forEach((bar, i) => {
      applyFill(pdf, palette[i % palette.length]);
      pdf.rect(bar.x, bar.y, bar.width, bar.height, "F");
    });
  } else if (drawing.linePoints?.length) {
    applyStroke(pdf, palette[0], 1.5);
    const pts = drawing.linePoints;
    for (let i = 1; i < pts.length; i++) {
      pdf.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    }
  } else if (drawing.slices) {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2 + 8;
    const radius = Math.min(element.width, element.height) / 3.6;
    drawing.slices.forEach((slice, i) => {
      applyFill(pdf, palette[i % palette.length]);
      drawSlice(pdf, cx, cy, radius, slice.start, slice.end);
    });
  }
  const labelY = element.y + element.height - 14;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  applyTextColor(pdf, "#333333");
  drawing.legend.forEach((entry, i) => {
    pdf.text(`${entry.label} ${entry.value}`, element.x + 10 + i * 90, labelY, {
      baseline: "top",
    });
  });
  const text = [
    drawing.title || "",
    ...drawing.labels,
    ...drawing.values.map(String),
  ].filter(Boolean);
  return {
    text,
    items: [
      fidelityItem({
        kind: "chart",
        pageId,
        elementId: element.id,
        property: "chart",
        status: "approximated",
        detail: drawing.chartType,
      }),
    ],
    warnings: drawing.warnings,
    rasterized: false,
    selectable: true,
    chart: {
      elementId: element.id,
      chartType: drawing.chartType,
      labels: drawing.labels,
      data: drawing.values,
      title: drawing.title,
    },
  };
}

function drawSlice(
  pdf: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
) {
  const steps = Math.max(6, Math.ceil(((end - start) / (Math.PI * 2)) * 32));
  const points: Array<[number, number]> = [[0, 0]];
  for (let i = 0; i <= steps; i++) {
    const angle = start + ((end - start) * i) / steps;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  pdf.triangle(
    cx,
    cy,
    cx + points[1][0],
    cy + points[1][1],
    cx + points[points.length - 1][0],
    cy + points[points.length - 1][1],
    "F",
  );
  for (let i = 1; i < points.length - 1; i++) {
    pdf.triangle(
      cx,
      cy,
      cx + points[i][0],
      cy + points[i][1],
      cx + points[i + 1][0],
      cy + points[i + 1][1],
      "F",
    );
  }
}
