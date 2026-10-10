import type { ChartElement } from "../design-spec/types.js";
import type { ExportWarning } from "./types.js";

export interface ChartDrawing {
  title?: string;
  labels: string[];
  values: number[];
  chartType: ChartElement["chartType"];
  approximated: boolean;
  warnings: ExportWarning[];
  bars?: Array<{ x: number; y: number; width: number; height: number }>;
  linePoints?: Array<{ x: number; y: number }>;
  slices?: Array<{ start: number; end: number }>;
  legend: Array<{ label: string; value: number }>;
}

export function prepareChart(
  element: ChartElement,
  pageId: string,
): ChartDrawing {
  const labels = element.labels || [];
  const values = element.data || [];
  const warnings: ExportWarning[] = [];
  if (labels.length !== values.length) {
    warnings.push({
      code: "chart_data_mismatch",
      message: "Chart labels and values are different lengths.",
      pageId,
      elementId: element.id,
    });
  }
  const count = Math.min(labels.length, values.length);
  const safeLabels = labels.slice(0, count);
  const safeValues = values.slice(0, count);
  if (!count) {
    warnings.push({
      code: "chart_empty",
      message: "Chart has no plottable values.",
      pageId,
      elementId: element.id,
    });
  }

  const pad = 16;
  const titleH = element.title ? 16 : 0;
  const plotX = element.x + pad;
  const plotY = element.y + pad + titleH;
  const plotW = Math.max(8, element.width - pad * 2);
  const plotH = Math.max(8, element.height - pad * 2 - titleH - 18);
  const max = Math.max(1, ...safeValues.map((value) => Math.abs(value)));
  const drawing: ChartDrawing = {
    title: element.title,
    labels: safeLabels,
    values: safeValues,
    chartType: element.chartType,
    approximated: true,
    warnings: [
      ...warnings,
      {
        code: "chart_style_approximated",
        message: "Chart style is drawn as a simple vector from the data.",
        pageId,
        elementId: element.id,
      },
    ],
    legend: safeLabels.map((label, i) => ({
      label,
      value: safeValues[i],
    })),
  };

  if (element.chartType === "bar") {
    const gap = 6;
    const barW = count ? (plotW - gap * (count - 1)) / count : plotW;
    drawing.bars = safeValues.map((value, i) => {
      const height = (Math.abs(value) / max) * plotH;
      return {
        x: plotX + i * (barW + gap),
        y: plotY + plotH - height,
        width: barW,
        height,
      };
    });
  } else if (element.chartType === "line") {
    drawing.linePoints = safeValues.map((value, i) => ({
      x: plotX + (count <= 1 ? plotW / 2 : (i / (count - 1)) * plotW),
      y: plotY + plotH - (Math.abs(value) / max) * plotH,
    }));
  } else {
    const total =
      safeValues.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
    let cursor = -Math.PI / 2;
    drawing.slices = safeValues.map((value) => {
      const sweep = (Math.abs(value) / total) * Math.PI * 2;
      const slice = { start: cursor, end: cursor + sweep };
      cursor += sweep;
      return slice;
    });
  }
  return drawing;
}
