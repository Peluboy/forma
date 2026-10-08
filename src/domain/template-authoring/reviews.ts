import type { TemplateReview } from "./types.js";

/**
 * Human review of templates (Part O).
 *
 * Reviews are deliberately small: rating, verdict, and optional per-layout
 * notes. They feed the usage analytics so a template's real-world verdict is
 * never lost, without introducing a dashboard.
 */

export function isTemplateReview(value: unknown): value is TemplateReview {
  if (!value || typeof value !== "object") return false;
  const review = value as Partial<TemplateReview>;
  return (
    typeof review.templateId === "string" &&
    typeof review.templateVersionId === "string" &&
    typeof review.reviewer === "string" &&
    typeof review.rating === "number" &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    ["approved", "needs_refinement", "reject"].includes(review.verdict ?? "") &&
    typeof review.createdAt === "string" &&
    Array.isArray(review.layoutNotes)
  );
}

export interface TemplateReviewSummary {
  templateId: string;
  reviewCount: number;
  averageRating: number;
  verdictCounts: {
    approved: number;
    needs_refinement: number;
    reject: number;
  };
  layoutNoteCounts: Record<string, number>;
  reviewers: string[];
  generatedAt: string;
}

export function summarizeTemplateReviews(
  reviews: TemplateReview[],
): TemplateReviewSummary[] {
  const byTemplate = new Map<string, TemplateReview[]>();
  for (const review of reviews)
    if (isTemplateReview(review))
      byTemplate.set(review.templateId, [
        ...(byTemplate.get(review.templateId) ?? []),
        review,
      ]);

  return Array.from(byTemplate.entries())
    .map(([templateId, items]) => {
      const verdictCounts = {
        approved: items.filter((r) => r.verdict === "approved").length,
        needs_refinement: items.filter((r) => r.verdict === "needs_refinement")
          .length,
        reject: items.filter((r) => r.verdict === "reject").length,
      };
      const layoutNoteCounts: Record<string, number> = {};
      for (const review of items)
        for (const note of review.layoutNotes)
          layoutNoteCounts[note.layoutId] =
            (layoutNoteCounts[note.layoutId] ?? 0) + 1;
      return {
        templateId,
        reviewCount: items.length,
        averageRating:
          Math.round(
            (items.reduce((sum, r) => sum + r.rating, 0) / items.length) * 10,
          ) / 10,
        verdictCounts,
        layoutNoteCounts,
        reviewers: Array.from(new Set(items.map((r) => r.reviewer))).sort(),
        generatedAt: new Date().toISOString(),
      };
    })
    .sort((a, b) => b.reviewCount - a.reviewCount);
}
