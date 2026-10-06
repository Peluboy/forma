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
    const doc = new DOMParser().parseFromString(html, "image/svg+xml");
    doc.documentElement.setAttribute("width", String(width));
    doc.documentElement.setAttribute("height", String(height));
    const svg = new XMLSerializer().serializeToString(doc);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Document page render failed."));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * 2);
      canvas.height = Math.round(height * 2);
      canvas
        .getContext("2d")!
        .drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PDF page failed."))),
          "image/png",
        ),
      );
      pdf.addImage(
        new Uint8Array(await png.arrayBuffer()),
        "PNG",
        0,
        0,
        width,
        height,
      );
    } finally {
      URL.revokeObjectURL(url);
    }
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
    const doc = new DOMParser().parseFromString(html, "image/svg+xml");
    doc.documentElement.setAttribute("width", String(width));
    doc.documentElement.setAttribute("height", String(height));
    const svg = new XMLSerializer().serializeToString(doc);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Slide render failed."));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * 2);
      canvas.height = Math.round(height * 2);
      canvas
        .getContext("2d")!
        .drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PDF slide failed."))),
          "image/png",
        ),
      );
      pdf.addImage(
        new Uint8Array(await png.arrayBuffer()),
        "PNG",
        0,
        0,
        width,
        height,
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return pdf;
}

export async function svgBlob(project: Project) {
  if (project.family === "document")
    throw new Error("Use PDF export for multi-page documents.");
  if (project.family === "presentation")
    throw new Error("Use PDF or PPTX export for presentations.");
  await document.fonts.ready;
  validateExport(project);
  const html = renderToStaticMarkup(createElement(Poster, { project }));
  const doc = new DOMParser().parseFromString(html, "image/svg+xml");
  const { embedProjectFonts } = await import("./fontAssets");
  await embedProjectFonts(doc, project);
  const width = Math.round(canvasWidth(project) * 1.5);
  const height = Math.round(canvasHeight(project) * 1.5);
  doc.documentElement.setAttribute("width", String(width));
  doc.documentElement.setAttribute("height", String(height));
  doc.documentElement.removeAttribute("class");
  return new Blob([new XMLSerializer().serializeToString(doc)], {
    type: "image/svg+xml;charset=utf-8",
  });
}
export async function pngBlob(project: Project) {
  if (project.family === "document")
    throw new Error("Use PDF export for multi-page documents.");
  if (project.family === "presentation")
    throw new Error("Use PDF or PPTX export for presentations.");
  const blob = await svgBlob(project);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image export failed."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(canvasWidth(project) * 1.5);
    canvas.height = Math.round(canvasHeight(project) * 1.5);
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Image export failed.")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
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
    if (format === "svg" || format === "png" || format === "zip")
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
  if (format === "pdf") {
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
      new Uint8Array(await (await pngBlob(project)).arrayBuffer()),
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
      zip.file("design.png", await pngBlob(project));
      zip.file(
        "page-size.txt",
        `${canvasWidth(project)} × ${canvasHeight(project)} design units\n`,
      );
    } else {
      for (const format of ["portrait", "square", "story"] as const) {
        const variant = { ...project, format, pageSize: undefined };
        validateExport(variant);
        zip.file(`${format}.png`, await pngBlob(variant));
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
