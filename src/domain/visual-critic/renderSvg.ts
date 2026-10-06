import type {
  DesignAssetRef,
  DesignPage,
  TextElement,
} from "../design-spec/types.js";
import { computeLineWraps } from "../layout-fit/measure.js";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paint(value: string | undefined, fallback: string): string {
  return value && /^#[\da-f]{3,8}$/i.test(value) ? value : fallback;
}

export function renderPageToSvg(
  page: DesignPage,
  assets: DesignAssetRef[] = [],
): string {
  const width = page.width || 612;
  const height = page.height || 792;
  const bg = paint(page.background?.color, "#ffffff");

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: ${bg}; font-family: Inter, sans-serif;">`,
  );
  parts.push(`<rect width="${width}" height="${height}" fill="${bg}" />`);

  const orderedElements = new Map(page.elements.map((el) => [el.id, el]));

  for (const id of page.elementIds) {
    const el = orderedElements.get(id);
    if (!el || el.hidden) continue;

    if (el.type === "shape") {
      const fill = paint(el.fill?.color, "none");
      const stroke = paint(el.stroke?.color, "none");
      const sw = el.strokeWidth || 1;
      const rx = el.shape === "rounded" ? 6 : 0;

      if (el.shape === "line") {
        parts.push(
          `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" stroke="${stroke}" stroke-width="${sw}" />`,
        );
      } else if (el.shape === "ellipse") {
        parts.push(
          `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`,
        );
      } else if (el.shape === "triangle") {
        parts.push(
          `<polygon points="${el.x + el.width / 2},${el.y} ${el.x + el.width},${el.y + el.height} ${el.x},${el.y + el.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`,
        );
      } else {
        parts.push(
          `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${stroke !== "none" ? sw : 0}" />`,
        );
      }
    } else if (el.type === "image") {
      const uri = assets.find((asset) => asset.id === el.assetRef)?.uri;
      if (
        uri &&
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(uri)
      ) {
        parts.push(
          `<svg x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" viewBox="0 0 ${el.width} ${el.height}" overflow="hidden"><image href="${uri}" width="${el.width}" height="${el.height}" preserveAspectRatio="${el.fit === "fill" ? "none" : el.fit === "fit" ? "xMidYMid meet" : "xMidYMid slice"}" /></svg>`,
        );
        continue;
      }
      parts.push(
        `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />`,
      );
      parts.push(
        `<text x="${el.x + el.width / 2}" y="${el.y + el.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#94a3b8">[Image: ${escapeXml(el.assetRef)}]</text>`,
      );
    } else if (el.type === "chart") {
      parts.push(
        `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />`,
      );
      if (el.title) {
        parts.push(
          `<text x="${el.x + 16}" y="${el.y + 24}" font-size="12" font-weight="600" fill="#0f172a">${escapeXml(el.title)}</text>`,
        );
      }
      const data = el.data || [40, 65, 85, 95];
      const labels = el.labels || ["Q1", "Q2", "Q3", "Q4"];
      const maxVal = Math.max(10, ...data);
      const barAreaHeight = el.height - 70;
      const barWidth = Math.min(48, (el.width - 60) / data.length - 16);
      const startX = el.x + 30;

      data.forEach((val, idx) => {
        const barH = (val / maxVal) * barAreaHeight;
        const bx = startX + idx * ((el.width - 60) / data.length);
        const by = el.y + el.height - 35 - barH;
        parts.push(
          `<rect x="${bx}" y="${by}" width="${barWidth}" height="${barH}" rx="3" fill="#2563eb" />`,
        );
        parts.push(
          `<text x="${bx + barWidth / 2}" y="${el.y + el.height - 18}" text-anchor="middle" font-size="10" fill="#64748b">${escapeXml(labels[idx] || "")}</text>`,
        );
      });
    } else if (el.type === "table") {
      parts.push(
        `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="4" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />`,
      );
      const rowCount = el.rows?.length || 1;
      const colCount = Math.max(1, el.columns || 1);
      const cellHeight = Math.min(28, (el.height - 10) / rowCount);
      const cellWidth = el.width / colCount;

      el.rows?.forEach((row, ri) => {
        const ry = el.y + ri * cellHeight;
        const isHeader = ri < (el.headerRows || 1);
        if (isHeader) {
          parts.push(
            `<rect x="${el.x}" y="${ry}" width="${el.width}" height="${cellHeight}" fill="#f1f5f9" />`,
          );
        }
        parts.push(
          `<line x1="${el.x}" y1="${ry + cellHeight}" x2="${el.x + el.width}" y2="${ry + cellHeight}" stroke="#e2e8f0" stroke-width="1" />`,
        );

        row.forEach((cell, ci) => {
          const cx = el.x + ci * cellWidth + 10;
          const cy = ry + cellHeight / 2 + 4;
          parts.push(
            `<text x="${cx}" y="${cy}" font-size="${isHeader ? 10 : 9.5}" font-weight="${isHeader ? 600 : 400}" fill="${isHeader ? "#0f172a" : "#334155"}">${escapeXml(cell.text || "")}</text>`,
          );
        });
      });
    } else if (el.type === "text") {
      const textEl = el as TextElement;
      const fontSize = textEl.fontSize || 12;
      const fontFamily = textEl.fontFamily || "Inter";
      const fontWeight = textEl.fontWeight || 400;
      const color = paint(textEl.color, "#0f172a");
      const lineHeightPx = fontSize * (textEl.lineHeight || 1.4);
      const lines = computeLineWraps(
        textEl.text,
        textEl.width,
        fontFamily,
        fontSize,
      );

      parts.push(
        `<g font-family="${escapeXml(fontFamily)}, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">`,
      );

      lines.forEach((line, li) => {
        const ly =
          textEl.y + (li + 1) * lineHeightPx - (lineHeightPx - fontSize) / 2;
        const anchor =
          textEl.align === "center"
            ? "middle"
            : textEl.align === "right"
              ? "end"
              : "start";
        const x =
          textEl.x +
          (textEl.align === "center"
            ? textEl.width / 2
            : textEl.align === "right"
              ? textEl.width
              : 0);
        parts.push(
          `<text x="${x}" y="${ly}" text-anchor="${anchor}" letter-spacing="${textEl.letterSpacing ?? 0}">${escapeXml(line)}</text>`,
        );
      });

      parts.push(`</g>`);
    }
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}
