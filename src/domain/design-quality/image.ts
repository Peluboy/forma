// ============================================================
// Image Quality Checks — Phase 2 Part M
// ============================================================

import type { DesignPage, ImageElement } from "../design-spec/types.js";
import type {
  DesignQualityIssue,
  DesignQualityDimensions,
} from "./qualityTypes.js";

export interface ImageQualityMetrics {
  imageCount: number;
  issues: DesignQualityIssue[];
  score: number;
}

export function analyzeImageQuality(page: DesignPage): ImageQualityMetrics {
  const issues: DesignQualityIssue[] = [];
  let score = 100;

  const imageEls = page.elements.filter(
    (el): el is ImageElement => el.type === "image" && !el.hidden,
  );

  const pageW = page.width ?? 612;
  const pageH = page.height ?? 792;

  for (const img of imageEls) {
    // Actual page clipping is measurable; subject placement is not without vision.
    if (
      img.x < 0 ||
      img.y < 0 ||
      img.x + img.width > pageW ||
      img.y + img.height > pageH
    ) {
      score -= 8;
      issues.push({
        id: `${page.id}-img-edge-${img.id}`,
        type: "image_subject_cutoff",
        severity: "medium",
        pageId: page.id,
        elementIds: [img.id],
        message: `Image '${img.id}' extends outside the page and will be clipped.`,
        evidence: `Position: (${Math.round(img.x)}, ${Math.round(img.y)}), size: ${Math.round(img.width)}×${Math.round(img.height)}`,
        recommendedActions: [],
      });
    }

    const naturalWidth = img.metadata?.naturalWidth;
    const naturalHeight = img.metadata?.naturalHeight;
    const hasNaturalSize =
      typeof naturalWidth === "number" &&
      typeof naturalHeight === "number" &&
      naturalWidth > 0 &&
      naturalHeight > 0;
    const naturalRatio = hasNaturalSize ? naturalWidth / naturalHeight : 0;
    const frameRatio = img.width / img.height;
    if (
      hasNaturalSize &&
      img.fit === "fill" &&
      Math.abs(Math.log(frameRatio / naturalRatio)) > 0.12
    ) {
      score -= 6;
      issues.push({
        id: `${page.id}-img-ratio-${img.id}`,
        type: "image_crop_issue",
        severity: "low",
        pageId: page.id,
        elementIds: [img.id],
        message: `Image '${img.id}' is stretched relative to its source aspect ratio.`,
        evidence: `sourceRatio: ${naturalRatio.toFixed(2)}, frameRatio: ${frameRatio.toFixed(2)}`,
        recommendedActions: [
          {
            type: "change_image_fit",
            pageId: page.id,
            elementId: img.id,
            params: { imageFit: "fit" },
            rationale: "Use fit mode to prevent distortion.",
            expectedImprovements: ["imagery"] as Array<
              keyof DesignQualityDimensions
            >,
            confidence: "medium",
          },
        ],
      });
    }
    if (
      hasNaturalSize &&
      Math.min(naturalWidth / img.width, naturalHeight / img.height) < 1.5
    ) {
      score -= 8;
      issues.push({
        id: `${page.id}-img-resolution-${img.id}`,
        type: "image_crop_issue",
        severity: "medium",
        pageId: page.id,
        elementIds: [img.id],
        message: "Image resolution may be too low for print export.",
        evidence: `source: ${naturalWidth}×${naturalHeight}, frame: ${img.width}×${img.height}`,
        recommendedActions: [],
      });
    }

    // Very small image (likely a thumbnail accidentally placed)
    if (img.width < 60 || img.height < 40) {
      score -= 10;
      issues.push({
        id: `${page.id}-img-tiny-${img.id}`,
        type: "image_crop_issue",
        severity: "medium",
        pageId: page.id,
        elementIds: [img.id],
        message: `Image '${img.id}' is very small (${Math.round(img.width)}×${Math.round(img.height)}pt). May be a thumbnail.`,
        evidence: `size: ${Math.round(img.width)}×${Math.round(img.height)}`,
        recommendedActions: [],
      });
    }
  }

  return {
    imageCount: imageEls.length,
    issues,
    score: Math.max(20, Math.min(100, imageEls.length === 0 ? 100 : score)),
  };
}
