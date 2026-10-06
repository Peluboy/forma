import { createProject, parseManuscriptBlocks, type Project } from "./model.js";

/** Widescreen slide size in design points (16:9). */
export const SLIDE_SIZE = { width: 960, height: 540 } as const;

export type SlideLayout =
  "title" | "section" | "content" | "two-column" | "chart";

export type SlideChart = {
  id: string;
  title: string;
  categories: string[];
  series: { name: string; values: number[] }[];
};

export type Slide = {
  id: string;
  hidden?: boolean;
  layout: SlideLayout;
  title: string;
  body: string;
  bullets: string[];
  secondary: string;
  notes: string;
  chart?: SlideChart;
  table?: string[][];
};

export type PresentationDeck = {
  pageSize: { width: number; height: number };
  slides: Slide[];
  activeSlideId: string;
  theme: { background: string; accent: string; text: string };
};

export type ExportAdapterId = "forma-pptx" | "forma-presentation-pdf";

export type ExportAdapter = {
  id: ExportAdapterId;
  name: string;
  format: "pptx" | "pdf";
  verified: true;
  fidelityLimits: string[];
};

export const PRESENTATION_ADAPTERS: ExportAdapter[] = [
  {
    id: "forma-pptx",
    name: "Editable PowerPoint (PPTX)",
    format: "pptx",
    verified: true,
    fidelityLimits: [
      "Text, bullets, tables and bar charts export as native PPTX shapes/tables.",
      "Custom fonts fall back to Arial / Calibri; exact kerning is not preserved.",
      "Speaker notes export; animations, transitions and master themes do not.",
      "Charts are categorical bar charts from numeric table columns only.",
      "Open in Microsoft PowerPoint, LibreOffice Impress or Google Slides for editing.",
    ],
  },
  {
    id: "forma-presentation-pdf",
    name: "Presentation PDF",
    format: "pdf",
    verified: true,
    fidelityLimits: [
      "Flattened visual pages; text is not reflowable in the PDF.",
      "Speaker notes are omitted from PDF output.",
      "Charts render as SVG bars matching the canvas.",
    ],
  },
];

export function getAdapter(id: ExportAdapterId): ExportAdapter {
  const adapter = PRESENTATION_ADAPTERS.find((a) => a.id === id);
  if (!adapter) throw new Error(`Unknown export adapter: ${id}`);
  return adapter;
}

export function isPresentationDeck(value: unknown): value is PresentationDeck {
  if (!value || typeof value !== "object") return false;
  const d = value as PresentationDeck;
  return (
    !!d.pageSize &&
    Number.isFinite(d.pageSize.width) &&
    Number.isFinite(d.pageSize.height) &&
    Array.isArray(d.slides) &&
    d.slides.length >= 1 &&
    d.slides.length <= 100 &&
    typeof d.activeSlideId === "string" &&
    !!d.theme
  );
}

function parseTable(lines: string[]): string[][] {
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim().startsWith("|")) break;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (!cells.every((c) => /^:?-{3,}:?$/.test(c))) rows.push(cells);
  }
  return rows;
}

function chartFromTable(
  rows: string[][],
  title: string,
): SlideChart | undefined {
  if (rows.length < 2 || rows[0].length < 2) return undefined;
  const header = rows[0];
  const categories = rows.slice(1).map((r) => r[0] || "");
  const series: SlideChart["series"] = [];
  for (let c = 1; c < header.length; c++) {
    const values = rows.slice(1).map((r) => {
      const raw = (r[c] || "").replace(/,/g, "");
      const n = Number(raw);
      return Number.isFinite(n) ? n : NaN;
    });
    if (values.every((v) => Number.isFinite(v)))
      series.push({ name: header[c] || `Series ${c}`, values });
  }
  if (!series.length) return undefined;
  return {
    id: `chart-${Math.random().toString(36).slice(2, 8)}`,
    title,
    categories,
    series,
  };
}

function emptySlide(partial: Partial<Slide> & { id: string }): Slide {
  return {
    id: partial.id,
    layout: partial.layout || "content",
    title: partial.title || "",
    body: partial.body || "",
    bullets: partial.bullets || [],
    secondary: partial.secondary || "",
    notes: partial.notes || "",
    chart: partial.chart,
    table: partial.table,
  };
}

export function wrapSlideText(value: string, maxChars: number): string[] {
  return value.split("\n").flatMap((raw) => {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if (line && `${line} ${word}`.length > maxChars) {
        lines.push(line);
        line = "";
      }
      if (word.length > maxChars) {
        if (line) lines.push(line);
        for (let i = 0; i < word.length; i += maxChars)
          lines.push(word.slice(i, i + maxChars));
        line = "";
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
  });
}

export function contentSlideLines(slide: Slide): {
  title: string[];
  copy: string[];
} {
  return {
    title: wrapSlideText(slide.title, 48),
    copy: [
      ...wrapSlideText(slide.body, 88),
      ...slide.bullets.flatMap((bullet) => wrapSlideText(`• ${bullet}`, 86)),
      ...(slide.table || []).flatMap((row) =>
        wrapSlideText(row.join("  ·  "), 88),
      ),
    ],
  };
}

/** Split manuscript on `---` into slides. Supports Layout:, Title:, Notes:, bullets, tables. */
export function parsePresentationManuscript(raw: string): Slide[] {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (!/\n---\n/.test(text) && /^Headline:\s?/im.test(text)) {
    const blocks = parseManuscriptBlocks(text);
    const headline = blocks.find((block) => block.fieldId === "title");
    if (headline) {
      return [
        emptySlide({
          id: "slide-1",
          layout: "content",
          title: headline.text,
          body: blocks
            .filter((block) => block !== headline)
            .map((block) => `${block.label}: ${block.text}`)
            .join("\n"),
        }),
      ];
    }
  }
  const chunks = text
    ? text
        .split(/\n---\n/)
        .map((c) => c.trim())
        .filter(Boolean)
    : ["Title: Untitled deck\n\nAdd slide copy."];
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n");
    let layout: SlideLayout = "content";
    let title = "";
    let notes = "";
    let secondary = "";
    const bodyLines: string[] = [];
    const bullets: string[] = [];
    let table: string[][] | undefined;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const layoutMatch = line.match(
        /^Layout:\s*(title|section|content|two-column|chart)\s*$/i,
      );
      if (layoutMatch) {
        layout = layoutMatch[1].toLowerCase() as SlideLayout;
        i++;
        continue;
      }
      const titleMatch = line.match(/^(Title|Heading):\s?(.*)$/i);
      if (titleMatch && !title) {
        title = titleMatch[2].trim();
        i++;
        continue;
      }
      const notesMatch = line.match(/^Notes:\s?(.*)$/i);
      if (notesMatch) {
        notes = notesMatch[1];
        i++;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^(Layout|Title|Heading|Notes|Column):\s?/i.test(lines[i])
        ) {
          notes += (notes ? "\n" : "") + lines[i];
          i++;
        }
        continue;
      }
      const colMatch = line.match(/^Column:\s?(.*)$/i);
      if (colMatch) {
        secondary = colMatch[1];
        i++;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^(Layout|Title|Heading|Notes|Column):\s?/i.test(lines[i]) &&
          !lines[i].trim().startsWith("|") &&
          !lines[i].trim().startsWith("- ")
        ) {
          secondary += (secondary ? "\n" : "") + lines[i];
          i++;
        }
        continue;
      }
      if (line.trim().startsWith("|")) {
        const start = i;
        while (i < lines.length && lines[i].trim().startsWith("|")) i++;
        table = parseTable(lines.slice(start, i));
        continue;
      }
      if (line.trim().startsWith("- ")) {
        bullets.push(line.trim().slice(2));
        i++;
        continue;
      }
      if (line.trim()) bodyLines.push(line);
      i++;
    }
    if (!title && bodyLines.length) title = bodyLines.shift() || "";
    const body = bodyLines.join("\n").trim();
    const chart =
      layout === "chart" && table
        ? chartFromTable(table, title || "Chart")
        : undefined;
    return emptySlide({
      id: `slide-${index + 1}`,
      layout,
      title,
      body,
      bullets,
      secondary,
      notes,
      table,
      chart,
    });
  });
}

export function buildPresentation(
  manuscript: string,
  theme?: Partial<PresentationDeck["theme"]>,
): PresentationDeck {
  const slides = parsePresentationManuscript(manuscript);
  return {
    pageSize: { ...SLIDE_SIZE },
    slides,
    activeSlideId: slides[0].id,
    theme: {
      background: theme?.background || "#f7f4ef",
      accent: theme?.accent || "#1f4b3a",
      text: theme?.text || "#1a1a1a",
    },
  };
}

export function createPresentationProject(
  manuscript: string,
  name = "Untitled presentation",
): Project {
  const deck = buildPresentation(manuscript);
  const project = createProject();
  project.name = name;
  project.manuscript = manuscript;
  project.family = "presentation";
  project.presentation = deck;
  project.format = "custom";
  project.pageSize = { width: SLIDE_SIZE.width, height: SLIDE_SIZE.height };
  return project;
}

export function presentationIssues(project: Project): string[] {
  const deck = project.presentation;
  if (!deck) return ["Presentation layout is missing."];
  const issues: string[] = [];
  for (const slide of deck.slides) {
    if (!slide.title.trim() && !slide.body.trim() && !slide.bullets.length)
      issues.push(`Empty slide: ${slide.id}`);
    if (slide.layout === "chart" && !slide.chart)
      issues.push(`Chart slide ${slide.id} has no numeric data table.`);
    if (slide.layout === "content") {
      const lines = contentSlideLines(slide);
      const start = 100 + Math.max(0, lines.title.length - 1) * 34;
      if (lines.title.length > 3 || start + lines.copy.length * 20 > 505)
        issues.push(
          `Slide ${slide.id} needs more room. Split the manuscript into slides with --- on its own line.`,
        );
    }
    if (
      slide.layout === "title" &&
      (wrapSlideText(slide.title, 36).length > 3 ||
        wrapSlideText(slide.body, 80).length > 7)
    )
      issues.push(
        `Slide ${slide.id} needs more room. Split long text across slides.`,
      );
    if (
      slide.layout === "section" &&
      (wrapSlideText(slide.title, 48).length > 3 ||
        wrapSlideText(slide.body, 80).length > 7)
    )
      issues.push(
        `Slide ${slide.id} needs more room. Split long text across slides.`,
      );
    if (
      slide.layout === "two-column" &&
      (wrapSlideText(slide.title, 48).length > 1 ||
        wrapSlideText(
          slide.body || slide.bullets.map((b) => `• ${b}`).join("\n"),
          43,
        ).length > 17 ||
        wrapSlideText(slide.secondary, 43).length > 17)
    )
      issues.push(
        `Slide ${slide.id} needs more room. Shorten each column or split it into slides.`,
      );
  }
  return issues;
}

export function addSlide(deck: PresentationDeck): PresentationDeck {
  if (deck.slides.length >= 100) throw new Error("Slide limit reached.");
  const id = `slide-${deck.slides.length + 1}-${crypto.randomUUID().slice(0, 4)}`;
  const slide = emptySlide({
    id,
    layout: "content",
    title: "",
    body: "",
  });
  return {
    ...deck,
    slides: [...deck.slides, slide],
    activeSlideId: id,
  };
}

export function removeSlide(
  deck: PresentationDeck,
  slideId: string,
): PresentationDeck {
  if (deck.slides.length <= 1)
    throw new Error("A presentation needs at least one slide.");
  const slides = deck.slides.filter((s) => s.id !== slideId);
  return {
    ...deck,
    slides,
    activeSlideId:
      deck.activeSlideId === slideId ? slides[0].id : deck.activeSlideId,
  };
}

export function repaginatePresentation(
  manuscript: string,
  theme?: PresentationDeck["theme"],
): PresentationDeck {
  return buildPresentation(manuscript, theme);
}

/** Escape XML text for OOXML parts. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function aRuns(text: string, sizePt = 18, bold = false): string {
  const lines = text.split("\n");
  return lines
    .map((line, i) => {
      const br = i < lines.length - 1 ? `<a:br/>` : "";
      return `<a:r><a:rPr lang="en-US" sz="${sizePt * 100}"${bold ? ' b="1"' : ""} dirty="0"/><a:t>${xmlEscape(line || " ")}</a:t></a:r>${br}`;
    })
    .join("");
}

function textShape(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  sizePt: number,
  bold = false,
): string {
  // EMUs: 914400 per inch; slide is 960x540 at 96dpi → 10" x 5.625"
  const sx = (v: number) => Math.round((v / 96) * 914400);
  return `<p:sp>
  <p:nvSpPr><p:cNvPr id="${Math.floor(Math.random() * 100000) + 10}" name="${xmlEscape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="${sx(x)}" y="${sx(y)}"/><a:ext cx="${sx(w)}" cy="${sx(h)}"/></a:xfrm>
  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
  <p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
  <a:p>${aRuns(text, sizePt, bold)}</a:p></p:txBody></p:sp>`;
}

function bulletShapes(slide: Slide, x: number, y: number, w: number): string {
  if (!slide.bullets.length) return "";
  const text = slide.bullets.map((b) => `• ${b}`).join("\n");
  return textShape("Bullets", x, y, w, 220, text, 16);
}

function tableXml(rows: string[][]): string {
  if (!rows.length) return "";
  const colCount = Math.max(...rows.map((r) => r.length));
  const colW = Math.floor(8000000 / colCount);
  const grid = Array.from(
    { length: colCount },
    () => `<a:gridCol w="${colW}"/>`,
  ).join("");
  const rowXml = rows
    .map((row, ri) => {
      const cells = Array.from({ length: colCount }, (_, ci) => {
        const text = row[ci] || "";
        return `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1200"/><a:t>${xmlEscape(text)}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>`;
      }).join("");
      return `<a:tr h="${ri === 0 ? 400000 : 350000}">${cells}</a:tr>`;
    })
    .join("");
  return `<p:graphicFrame>
  <p:nvGraphicFramePr><p:cNvPr id="40" name="Table"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>
  <p:xfrm><a:off x="685800" y="2286000"/><a:ext cx="8001000" cy="${Math.min(rows.length, 8) * 400000}"/></p:xfrm>
  <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
  <a:tbl><a:tblPr/><a:tblGrid>${grid}</a:tblGrid>${rowXml}</a:tbl>
  </a:graphicData></a:graphic></p:graphicFrame>`;
}

function chartAsTable(slide: Slide): string {
  if (!slide.chart) return "";
  const header = ["Category", ...slide.chart.series.map((s) => s.name)];
  const rows = [
    header,
    ...slide.chart.categories.map((cat, i) => [
      cat,
      ...slide.chart!.series.map((s) => String(s.values[i] ?? "")),
    ]),
  ];
  return tableXml(rows);
}

function slideXml(slide: Slide): string {
  const shapes: string[] = [];
  if (slide.layout === "title") {
    shapes.push(
      textShape(
        "Title",
        80,
        180,
        800,
        90,
        wrapSlideText(slide.title, 36).join("\n"),
        36,
        true,
      ),
    );
    if (slide.body)
      shapes.push(
        textShape(
          "Subtitle",
          80,
          280,
          800,
          180,
          wrapSlideText(slide.body, 80).join("\n"),
          18,
        ),
      );
  } else if (slide.layout === "section") {
    shapes.push(
      textShape(
        "Section",
        80,
        190,
        800,
        110,
        wrapSlideText(slide.title, 48).join("\n"),
        32,
        true,
      ),
    );
    if (slide.body)
      shapes.push(
        textShape(
          "Body",
          80,
          315,
          800,
          160,
          wrapSlideText(slide.body, 80).join("\n"),
          18,
        ),
      );
  } else if (slide.layout === "two-column") {
    shapes.push(textShape("Title", 48, 36, 860, 48, slide.title, 24, true));
    shapes.push(
      textShape(
        "Left",
        48,
        100,
        420,
        360,
        slide.body || slide.bullets.map((b) => `• ${b}`).join("\n"),
        16,
      ),
    );
    shapes.push(textShape("Right", 500, 100, 420, 360, slide.secondary, 16));
  } else if (slide.layout === "chart") {
    shapes.push(textShape("Title", 48, 36, 860, 48, slide.title, 24, true));
    shapes.push(chartAsTable(slide));
  } else {
    shapes.push(
      textShape(
        "Title",
        48,
        36,
        860,
        90,
        contentSlideLines(slide).title.join("\n"),
        24,
        true,
      ),
    );
    if (slide.body)
      shapes.push(
        textShape(
          "Body",
          48,
          100 + Math.max(0, contentSlideLines(slide).title.length - 1) * 34,
          860,
          360,
          wrapSlideText(slide.body, 88).join("\n"),
          16,
        ),
      );
    shapes.push(
      bulletShapes(
        slide,
        48,
        100 +
          Math.max(0, contentSlideLines(slide).title.length - 1) * 34 +
          wrapSlideText(slide.body, 88).length * 20,
        860,
      ),
    );
    if (slide.table?.length) shapes.push(tableXml(slide.table));
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    ${shapes.join("\n")}
  </p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function notesXml(notes: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2" name="Notes"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr/>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${xmlEscape(notes || " ")}</a:t></a:r></a:p></p:txBody>
    </p:sp>
  </p:spTree></p:cSld>
</p:notes>`;
}

/** Build an editable PPTX blob (OOXML). Verified adapter: forma-pptx. */
export async function buildPptxBlob(project: Project): Promise<Blob> {
  if (!project.presentation) throw new Error("Presentation layout is missing.");
  const deck = {
    ...project.presentation,
    slides: project.presentation.slides.filter((slide) => !slide.hidden),
  };
  if (!deck.slides.length)
    throw new Error("Show at least one slide before exporting.");
  getAdapter("forma-pptx");
  const issues = presentationIssues(project).filter((i) =>
    /Chart slide/.test(i),
  );
  if (issues.length) throw new Error(issues[0]);

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const slideCount = deck.slides.length;

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${deck.slides
    .map(
      (_, i) =>
        `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
    )
    .join("\n  ")}
  ${deck.slides
    .map(
      (_, i) =>
        `<Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`,
    )
    .join("\n  ")}
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
  );

  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${deck.slides
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
    )
    .join("\n  ")}
  <Relationship Id="rId${slideCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId${slideCount + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`,
  );

  // EMUs for 16:9 — 12192000 x 6858000 (13.33" x 7.5" is 16:9 standard; use 10x5.625 = 9144000 x 5143500)
  const sldCx = 9144000;
  const sldCy = 5143500;
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
 saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId${slideCount + 1}"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${deck.slides
      .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`)
      .join("\n    ")}
  </p:sldIdLst>
  <p:sldSz cx="${sldCx}" cy="${sldCy}"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
  );

  zip.file(
    "ppt/theme/theme1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Forma">
  <a:themeElements>
    <a:clrScheme name="Forma"><a:dk1><a:srgbClr val="1A1A1A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
    <a:dk2><a:srgbClr val="1F4B3A"/></a:dk2><a:lt2><a:srgbClr val="F7F4EF"/></a:lt2>
    <a:accent1><a:srgbClr val="1F4B3A"/></a:accent1><a:accent2><a:srgbClr val="C45C26"/></a:accent2>
    <a:accent3><a:srgbClr val="2F6FED"/></a:accent3><a:accent4><a:srgbClr val="70AD47"/></a:accent4>
    <a:accent5><a:srgbClr val="FFC000"/></a:accent5><a:accent6><a:srgbClr val="7030A0"/></a:accent6>
    <a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="Forma"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
    <a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Forma"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
    <a:lnStyleLst><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
    <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
    <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`,
  );

  zip.file(
    "ppt/slideMasters/slideMaster1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>
  <p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`,
  );
  zip.file(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,
  );
  zip.file(
    "ppt/slideLayouts/slideLayout1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
  </p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`,
  );
  zip.file(
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,
  );

  deck.slides.forEach((slide, i) => {
    const n = i + 1;
    zip.file(`ppt/slides/slide${n}.xml`, slideXml(slide));
    zip.file(
      `ppt/slides/_rels/slide${n}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/>
</Relationships>`,
    );
    zip.file(`ppt/notesSlides/notesSlide${n}.xml`, notesXml(slide.notes));
    zip.file(
      `ppt/notesSlides/_rels/notesSlide${n}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${n}.xml"/>
</Relationships>`,
    );
  });

  return zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

export function fixturePitchDeck(): Project {
  return createPresentationProject(
    `Layout: title
Title: Forma Q4 pitch
Notes: Open with the product promise.

---
Layout: content
Title: Why teams switch
- Exact manuscript wording
- Reusable brand systems
- Review with signed-in approvals
Notes: Keep bullets short.

---
Layout: chart
Title: Pilot outcomes
| Month | Designs | Approvals |
| --- | --- | --- |
| July | 12 | 9 |
| August | 18 | 15 |
| September | 24 | 21 |
Notes: Numbers from the pilot log only.

---
Layout: two-column
Title: Next steps
Ship Stage 5 exports
Column: Collect viewer feedback on PPTX fidelity
Notes: Dual-track PDF + PPTX.`,
    "Pitch deck fixture",
  );
}
