import type { DesignPage, TextElement } from "../design-spec/types.js";
import type { TemplateFamily } from "../template-family/types.js";
import { measureTextElement } from "../layout-fit/measure.js";
import type {
  VisualCriticReport,
  VisualCriticScores,
  VisualIssue,
} from "./types.js";

export function evaluatePageVisuals(
  page: DesignPage,
  family: TemplateFamily,
): VisualCriticReport {
  const issues: VisualIssue[] = [];
  const textElements = page.elements.filter(
    (el): el is TextElement => el.type === "text" && !el.hidden,
  );

  let hierarchyScore = 90;
  let balanceScore = 88;
  let spacingScore = 88;
  let typographyScore = 90;
  let brandScore = 95;

  // 1. Check Typography & Collisions
  for (const t of textElements) {
    const m = measureTextElement(t);
    if (m.overflow) {
      typographyScore -= 20;
      spacingScore -= 15;
      issues.push({
        type: "typography_collision",
        pageId: page.id,
        elementIds: [t.id],
        severity: "high",
        message: `Text element '${t.id}' overflows its container by ${Math.ceil(m.overflowAmount)}pt.`,
        recommendedAction: {
          type: "decrease_text_scale",
          pageId: page.id,
          elementId: t.id,
          amount: 1,
          rationale:
            "Reduce text scale to eliminate visual collision and fit neatly within container.",
        },
      });
    }

    // Check if body font size is too small or too large
    if (t.fontSize < 9) {
      typographyScore -= 10;
      issues.push({
        type: "weak_hierarchy",
        pageId: page.id,
        elementIds: [t.id],
        severity: "medium",
        message: `Text size ${t.fontSize}pt is below recommended editorial legibility floor (9pt).`,
        recommendedAction: {
          type: "increase_text_scale",
          pageId: page.id,
          elementId: t.id,
          amount: 1,
          rationale: "Increase font size slightly for better reading comfort.",
        },
      });
    }
  }

  // 2. Check Hierarchy (Heading vs Body distinction)
  const headings = textElements.filter(
    (t) =>
      (t.fontSize || 12) >= 18 ||
      t.id.includes("heading") ||
      t.id.includes("title"),
  );
  const bodyText = textElements.filter(
    (t) => (t.fontSize || 12) <= 14 && !t.id.includes("heading"),
  );

  if (headings.length > 0 && bodyText.length > 0) {
    const maxHeading = Math.max(...headings.map((h) => h.fontSize || 18));
    const avgBody =
      bodyText.reduce((s, b) => s + (b.fontSize || 11), 0) / bodyText.length;
    const ratio = maxHeading / avgBody;

    if (ratio < 1.35) {
      hierarchyScore -= 15;
      issues.push({
        type: "weak_hierarchy",
        pageId: page.id,
        elementIds: [headings[0].id],
        severity: "medium",
        message: `Visual hierarchy between heading (${maxHeading}pt) and body (${Math.round(avgBody)}pt) is subtle (ratio ${ratio.toFixed(2)}).`,
        recommendedAction: {
          type: "increase_text_scale",
          pageId: page.id,
          elementId: headings[0].id,
          amount: 2,
          rationale:
            "Increase heading scale to create a clearer editorial focal point.",
        },
      });
    }
  }

  // 3. Check Margins & Whitespace
  const margin = family.designTokens.grid?.margin || 54;
  for (const el of page.elements) {
    if (el.hidden) continue;
    if (el.x < margin - 4 && el.type === "text") {
      spacingScore -= 10;
      issues.push({
        type: "awkward_spacing",
        pageId: page.id,
        elementIds: [el.id],
        severity: "medium",
        message: `Element '${el.id}' bleeds into left margin (${el.x}pt < ${margin}pt).`,
        recommendedAction: {
          type: "move_within_region",
          pageId: page.id,
          elementId: el.id,
          amount: margin - el.x,
          rationale: "Align element cleanly to the standard grid margin.",
        },
      });
    }
  }

  // 4. Check Brand Token Consistency
  const allowedColors = new Set(
    Object.values(family.designTokens.colors).map((c) => c.toLowerCase()),
  );
  for (const t of textElements) {
    if (
      t.color &&
      !allowedColors.has(t.color.toLowerCase()) &&
      t.color !== "#000000" &&
      t.color !== "#ffffff"
    ) {
      brandScore -= 5;
    }
  }

  // Compute Overall Score
  const scores: VisualCriticScores = {
    overall: Math.max(
      20,
      Math.round(
        hierarchyScore * 0.25 +
          balanceScore * 0.2 +
          spacingScore * 0.2 +
          typographyScore * 0.25 +
          brandScore * 0.1,
      ),
    ),
    hierarchy: Math.max(20, Math.min(100, hierarchyScore)),
    balance: Math.max(20, Math.min(100, balanceScore)),
    spacing: Math.max(20, Math.min(100, spacingScore)),
    typography: Math.max(20, Math.min(100, typographyScore)),
    brandConsistency: Math.max(20, Math.min(100, brandScore)),
  };

  return {
    pageId: page.id,
    scores,
    issues,
    passedThreshold: scores.overall >= 80,
  };
}
