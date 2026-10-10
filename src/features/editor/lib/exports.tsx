import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Poster, { getFits } from "../components/Poster";
import { DocumentPageView } from "../canvas/DocumentCanvas";
import { SlideView } from "../canvas/PresentationCanvas";
import { serializeDesignFile } from "../../../domain/design/document";
import { inspectDocumentVisibility } from "../../../domain/design/documentVisibility";
import {
  buildPptxBlob,
  getAdapter,
  presentationIssues,
} from "../../../domain/design/presentation";
import { layerFits } from "../components/TextLayers";
import {
  EXPORT_RASTER_SCALE,
  canvasHeight,
  canvasWidth,
  fieldIds,
  unmappedFields,
  type Project,
} from "../../../domain/design/model";
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function validateExport(project: Project) {
  if (project.family === "document") {
    if (!project.flow) throw new Error("Document layout is missing.");
    const issues = inspectDocumentVisibility(project.flow);
    if (issues.length) {
      const issue = issues[0];
      throw new Error(
        `Page ${issue.pageNumber}, ${issue.elementId}: ${issue.reason} ${issue.suggestedAction}`,
      );
    }
    return;
  }
  if (project.family === "presentation") {
    const blocking = presentationIssues(project).filter((i) =>
      /Chart slide|missing|needs more room|Empty slide/i.test(i),
    );
    if (blocking.length) throw new Error(blocking[0]);
    return;
  }
  const fits = getFits(project);
  const missing = unmappedFields(project);
  if (
    missing.length ||
    fieldIds.some((id) => fits[id].overflow) ||
    layerFits(project).some(({ fit }) => fit.overflow)
  )
    throw new Error("Resolve unmapped or overflowing text before exporting.");
}

async function rasterizeSvgMarkup(
  markup: string,
  designWidth: number,
  designHeight: number,
  scale = EXPORT_RASTER_SCALE,
  extras?: {
    mimeType?: "image/png" | "image/jpeg";
    quality?: number;
    background?: string;
  },
): Promise<Blob> {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = doc.documentElement;
  if (!root.getAttribute("viewBox"))
    root.setAttribute("viewBox", `0 0 ${designWidth} ${designHeight}`);
  const pixelWidth = Math.round(designWidth * scale);
  const pixelHeight = Math.round(designHeight * scale);
  root.setAttribute("width", String(pixelWidth));
  root.setAttribute("height", String(pixelHeight));
  const blob = new Blob([new XMLSerializer().serializeToString(doc)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image export failed."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image export failed.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    if (extras?.background) {
      context.fillStyle = extras.background;
      context.fillRect(0, 0, pixelWidth, pixelHeight);
    }
    context.drawImage(img, 0, 0, pixelWidth, pixelHeight);
    const mimeType = extras?.mimeType || "image/png";
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (next) =>
          next ? resolve(next) : reject(new Error("Image export failed.")),
        mimeType,
        extras?.quality,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function documentPdf(project: Project) {
  if (!project.flow) throw new Error("Document layout is missing.");
  validateExport(project);
  const { jsPDF } = await import("jspdf");
  const flow = project.flow;
  const pages = flow.pages.filter((page) => !page.hidden);
  if (!pages.length)
    throw new Error("Show at least one page before exporting.");
  const width = flow.pageSize.width;
  const height = flow.pageSize.height;
  const pdf = new jsPDF({
    orientation: height >= width ? "portrait" : "landscape",
    unit: "pt",
    format: [width, height],
    compress: true,
  });
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage([width, height]);
    const html = renderToStaticMarkup(
      createElement(DocumentPageView, {
        flow,
        page: pages[i],
        pageNumber: i + 1,
        total: pages.length,
      }),
    );
    const png = await rasterizeSvgMarkup(html, width, height);
    pdf.addImage(
      new Uint8Array(await png.arrayBuffer()),
      "PNG",
      0,
      0,
      width,
      height,
    );
  }
  return pdf;
}

async function presentationPdf(project: Project) {
  if (!project.presentation) throw new Error("Presentation layout is missing.");
  validateExport(project);
  getAdapter("forma-presentation-pdf");
  const { jsPDF } = await import("jspdf");
  const deck = project.presentation;
  const slides = deck.slides.filter((slide) => !slide.hidden);
  if (!slides.length)
    throw new Error("Show at least one slide before exporting.");
  const width = deck.pageSize.width;
  const height = deck.pageSize.height;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [width, height],
    compress: true,
  });
  for (let i = 0; i < slides.length; i++) {
    if (i > 0) pdf.addPage([width, height], "landscape");
    const html = renderToStaticMarkup(
      createElement(SlideView, {
        deck,
        slide: slides[i],
      }),
    );
    const png = await rasterizeSvgMarkup(html, width, height);
    pdf.addImage(
      new Uint8Array(await png.arrayBuffer()),
      "PNG",
      0,
      0,
      width,
      height,
    );
  }
  return pdf;
}

async function prepareGraphicSvg(
  project: Project,
  options?: { hidePageFill?: boolean },
) {
  if (project.family === "document")
    throw new Error("Use PDF export for multi-page documents.");
  if (project.family === "presentation")
    throw new Error("Use PDF or PPTX export for presentations.");
  await document.fonts.ready;
  validateExport(project);
  const html = renderToStaticMarkup(
    createElement(Poster, {
      project,
      hidePageFill: options?.hidePageFill,
    }),
  );
  const doc = new DOMParser().parseFromString(html, "image/svg+xml");
  const { embedProjectFonts } = await import("./fontAssets");
  await embedProjectFonts(doc, project);
  const width = canvasWidth(project);
  const height = canvasHeight(project);
  doc.documentElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
  doc.documentElement.removeAttribute("class");
  return doc;
}

export async function svgBlob(project: Project) {
  const doc = await prepareGraphicSvg(project);
  const width = canvasWidth(project);
  const height = canvasHeight(project);
  doc.documentElement.setAttribute("width", String(width));
  doc.documentElement.setAttribute("height", String(height));
  return new Blob([new XMLSerializer().serializeToString(doc)], {
    type: "image/svg+xml;charset=utf-8",
  });
}
export async function pngBlob(
  project: Project,
  options?: { hidePageFill?: boolean },
) {
  const doc = await prepareGraphicSvg(project, {
    hidePageFill: options?.hidePageFill ?? true,
  });
  return rasterizeSvgMarkup(
    new XMLSerializer().serializeToString(doc),
    canvasWidth(project),
    canvasHeight(project),
  );
}
export async function jpgBlob(project: Project) {
  const doc = await prepareGraphicSvg(project);
  return rasterizeSvgMarkup(
    new XMLSerializer().serializeToString(doc),
    canvasWidth(project),
    canvasHeight(project),
    EXPORT_RASTER_SCALE,
    {
      mimeType: "image/jpeg",
      quality: 0.92,
      background: project.backgroundColor || "#ffffff",
    },
  );
}
export async function exportProject(project: Project, format: string) {
  const name =
    project.name.replace(/[^a-z0-9 -]/gi, "").trim() || "forma-design";
  if (format === "json") {
    downloadFile(
      new Blob([serializeDesignFile(project)], {
        type: "application/json",
      }),
      `${name}.forma.json`,
    );
    return;
  }
  if (project.family === "document") {
    if (format === "pdf") {
      const pdf = await documentPdf(project);
      pdf.save(`${name}.pdf`);
      return;
    }
    if (
      format === "svg" ||
      format === "png" ||
      format === "jpg" ||
      format === "jpeg" ||
      format === "zip" ||
      format === "pptx"
    )
      throw new Error(
        "Multi-page documents export as PDF or editable Forma JSON.",
      );
  }
  if (project.family === "presentation") {
    if (format === "pdf") {
      const pdf = await presentationPdf(project);
      pdf.save(`${name}.pdf`);
      return;
    }
    if (format === "pptx") {
      downloadFile(await buildPptxBlob(project), `${name}.pptx`);
      return;
    }
    if (
      format === "svg" ||
      format === "png" ||
      format === "jpg" ||
      format === "jpeg" ||
      format === "zip"
    )
      throw new Error(
        "Presentations export as PDF, editable PPTX, or Forma JSON.",
      );
  }
  if (format === "pptx")
    throw new Error("PPTX export is available for presentation projects.");
  if (format === "svg") {
    downloadFile(await svgBlob(project), `${name}.svg`);
    return;
  }
  if (format === "png") {
    downloadFile(await pngBlob(project), `${name}.png`);
    return;
  }
  if (format === "jpg" || format === "jpeg") {
    downloadFile(await jpgBlob(project), `${name}.jpg`);
    return;
  }
  if (format === "pdf-image") {
    const { jsPDF } = await import("jspdf");
    const width = canvasWidth(project);
    const height = canvasHeight(project);
    const pdf = new jsPDF({
      orientation: height >= width ? "portrait" : "landscape",
      unit: "pt",
      format: [width, height],
      compress: true,
    });
    pdf.addImage(
      new Uint8Array(
        await (await pngBlob(project, { hidePageFill: false })).arrayBuffer(),
      ),
      "PNG",
      0,
      0,
      width,
      height,
    );
    pdf.save(`${name}.pdf`);
    return;
  }
  if (format === "zip") {
    if (project.designMode === "reference")
      throw new Error(
        "Campaign packs require a template so the reference is not cropped or distorted.",
      );
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    if (project.format === "custom") {
      validateExport(project);
      zip.file("design.png", await pngBlob(project, { hidePageFill: false }));
      zip.file(
        "page-size.txt",
        `${canvasWidth(project)} × ${canvasHeight(project)} design units\n`,
      );
    } else {
      for (const format of ["portrait", "square", "story"] as const) {
        const variant = { ...project, format, pageSize: undefined };
        validateExport(variant);
        zip.file(
          `${format}.png`,
          await pngBlob(variant, { hidePageFill: false }),
        );
      }
    }
    zip.file("approved-copy.txt", project.manuscript);
    if (project.textLayers?.length)
      zip.file(
        "additional-text.txt",
        project.textLayers.map((l) => l.text).join("\n\n"),
      );
    zip.file("editable.forma.json", serializeDesignFile(project));
    downloadFile(
      await zip.generateAsync({ type: "blob" }),
      `${name}-campaign.zip`,
    );
    return;
  }
  throw new Error("Unsupported export format.");
}
