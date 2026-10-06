import type { TextElement } from "../design-spec/types.js";
import type { TextFitMeasurement } from "./types.js";

// Font metrics table (character width ratio relative to 1em)
const FONT_METRIC_RATIOS: Record<string, number> = {
  "Playfair Display": 0.52,
  Inter: 0.51,
  Manrope: 0.52,
  Roboto: 0.5,
  Georgia: 0.53,
  "Space Grotesk": 0.55,
  "Plus Jakarta Sans": 0.52,
  Arial: 0.52,
};

function getCharWidth(
  char: string,
  fontFamily: string,
  fontSize: number,
): number {
  const baseRatio = FONT_METRIC_RATIOS[fontFamily] || 0.52;
  // Specific character adjustments for realistic typography wrapping
  if (char === " " || char === "\t") return fontSize * 0.28;
  if ("ijl|.,:;'!I".includes(char)) return fontSize * 0.26;
  if ("wmWM#%@&".includes(char)) return fontSize * 0.85;
  if (char >= "A" && char <= "Z") return fontSize * baseRatio * 1.25;
  if (char >= "0" && char <= "9") return fontSize * baseRatio * 1.05;
  return fontSize * baseRatio;
}

export function measureStringWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
): number {
  if (typeof (globalThis as any).document !== "undefined") {
    try {
      const canvas =
        (globalThis as any).__fitCanvas || document.createElement("canvas");
      (globalThis as any).__fitCanvas = canvas;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = `${fontSize}px ${fontFamily}, sans-serif`;
        return ctx.measureText(text).width;
      }
    } catch {
      // Fallback to deterministic metrics
    }
  }

  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += getCharWidth(text[i], fontFamily, fontSize);
  }
  return width;
}

export function computeLineWraps(
  text: string,
  availableWidth: number,
  fontFamily: string,
  fontSize: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }

    const words = para.split(" ");
    let currentLine = "";
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = measureStringWidth(word, fontFamily, fontSize);
      const spaceWidth = getCharWidth(" ", fontFamily, fontSize);

      if (!currentLine) {
        currentLine = word;
        currentWidth = wordWidth;
      } else if (currentWidth + spaceWidth + wordWidth <= availableWidth) {
        currentLine += " " + word;
        currentWidth += spaceWidth + wordWidth;
      } else {
        // Line wraps
        lines.push(currentLine);
        currentLine = word;
        currentWidth = wordWidth;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export function measureTextElement(
  element: TextElement,
  slotId?: string,
): TextFitMeasurement {
  const fontSize = element.fontSize || 12;
  const fontFamily = element.fontFamily || "Inter";
  const lineHeightMultiplier = element.lineHeight || 1.4;
  const linePx = fontSize * lineHeightMultiplier;
  const minFontSize =
    element.constraints?.minFontSize || Math.max(8, fontSize * 0.75);
  const maxFontSize = element.constraints?.maxFontSize || fontSize * 1.25;

  const lines = computeLineWraps(
    element.text,
    element.width,
    fontFamily,
    fontSize,
  );
  const lineCount = Math.max(1, lines.length);
  const measuredHeight = lineCount * linePx;
  const availableHeight = element.height;
  const overflow = measuredHeight > availableHeight + 2; // small 2pt margin
  const overflowAmount = overflow ? measuredHeight - availableHeight : 0;

  return {
    elementId: element.id,
    slotId,
    fontSize,
    minFontSize,
    maxFontSize,
    availableWidth: element.width,
    availableHeight,
    lineCount,
    lineHeight: linePx,
    measuredHeight,
    overflow,
    overflowAmount,
  };
}
