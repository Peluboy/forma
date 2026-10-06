import type { HumanReviewVerdict } from "./qualityTypes.js";

export interface HumanReviewPageNote {
  pageId?: string;
  note: string;
}

export interface HumanReviewRecord {
  caseId: string;
  reviewer: string;
  acceptable: boolean;
  rating: number; // 1–5
  verdict: HumanReviewVerdict;
  notes?: string;
  pageNotes?: HumanReviewPageNote[];
}

export interface HumanReviewCaseScore {
  caseId: string;
  heuristicScore: number;
}

export type ComplaintCategory =
  | "spacing"
  | "typography"
  | "hierarchy"
  | "imagery"
  | "color_brand"
  | "tables_data"
  | "density"
  | "continuation"
  | "other";

export interface HumanReviewSummary {
  totalReviews: number;
  averageRating: number;
  percentAcceptable: number;
  verdictBreakdown: Record<HumanReviewVerdict, number>;
  mostCommonComplaints: Array<{ complaint: ComplaintCategory; count: number }>;
  correlation: number | null;
  falsePositives: Array<{
    caseId: string;
    heuristicScore: number;
    rating: number;
    verdict: HumanReviewVerdict;
  }>;
  falseNegatives: Array<{
    caseId: string;
    heuristicScore: number;
    rating: number;
    verdict: HumanReviewVerdict;
  }>;
}

const VERDICTS: HumanReviewVerdict[] = [
  "acceptable",
  "needs_refinement",
  "needs_redesign",
];

export function parseHumanReview(raw: unknown): HumanReviewRecord {
  if (!raw || typeof raw !== "object")
    throw new Error("Human review must be an object.");
  const value = raw as Record<string, unknown>;
  if (typeof value.caseId !== "string" || !value.caseId)
    throw new Error("Human review needs a caseId.");
  if (typeof value.reviewer !== "string" || !value.reviewer)
    throw new Error("Human review needs a reviewer.");
  if (typeof value.rating !== "number" || value.rating < 1 || value.rating > 5)
    throw new Error("Human review rating must be between 1 and 5.");
  if (
    typeof value.verdict !== "string" ||
    !VERDICTS.includes(value.verdict as HumanReviewVerdict)
  )
    throw new Error("Human review verdict is invalid.");
  return {
    caseId: value.caseId,
    reviewer: value.reviewer,
    acceptable: Boolean(value.acceptable),
    rating: value.rating,
    verdict: value.verdict as HumanReviewVerdict,
    notes: typeof value.notes === "string" ? value.notes : undefined,
    pageNotes: Array.isArray(value.pageNotes)
      ? (value.pageNotes as HumanReviewPageNote[]).filter(
          (note) => note && typeof note.note === "string",
        )
      : undefined,
  };
}

export function parseHumanReviews(raw: unknown): HumanReviewRecord[] {
  if (!Array.isArray(raw)) throw new Error("Human reviews must be an array.");
  return raw.map(parseHumanReview);
}

export function classifyComplaint(text: string): ComplaintCategory {
  const value = text.toLowerCase();
  if (/(space|spacing|gap|whitespace|margin|breath)/.test(value))
    return "spacing";
  if (/(font|type|typography|leading|kerning|size)/.test(value))
    return "typography";
  if (/(hierarch|heading|title|focus|dominant)/.test(value)) return "hierarchy";
  if (/(image|photo|crop|picture|visual)/.test(value)) return "imagery";
  if (/(color|colour|brand|palette|contrast)/.test(value)) return "color_brand";
  if (/(table|cell|column|data|chart|number)/.test(value)) return "tables_data";
  if (/(density|dense|crowded|busy|overflow)/.test(value)) return "density";
  if (/(continuation|continued|split|page break)/.test(value))
    return "continuation";
  return "other";
}

function pearson(pairs: Array<[number, number]>): number | null {
  if (pairs.length < 2) return null;
  const n = pairs.length;
  const meanX = pairs.reduce((s, [x]) => s + x, 0) / n;
  const meanY = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const [x, y] of pairs) {
    num += (x - meanX) * (y - meanY);
    denX += (x - meanX) ** 2;
    denY += (y - meanY) ** 2;
  }
  if (denX === 0 || denY === 0) return null;
  return Math.round((num / Math.sqrt(denX * denY)) * 100) / 100;
}

export function summarizeHumanReviews(
  reviews: HumanReviewRecord[],
  scores: HumanReviewCaseScore[],
  thresholds: { high: number; low: number } = { high: 85, low: 70 },
): HumanReviewSummary {
  const scoreByCase = new Map(
    scores.map((entry) => [entry.caseId, entry.heuristicScore]),
  );
  const verdictBreakdown: Record<HumanReviewVerdict, number> = {
    acceptable: 0,
    needs_refinement: 0,
    needs_redesign: 0,
  };
  const complaints = new Map<ComplaintCategory, number>();
  const pairs: Array<[number, number]> = [];
  const falsePositives: HumanReviewSummary["falsePositives"] = [];
  const falseNegatives: HumanReviewSummary["falseNegatives"] = [];

  for (const review of reviews) {
    verdictBreakdown[review.verdict] += 1;
    for (const note of [
      review.notes,
      ...(review.pageNotes || []).map((n) => n.note),
    ]) {
      if (!note) continue;
      const category = classifyComplaint(note);
      complaints.set(category, (complaints.get(category) ?? 0) + 1);
    }
    const score = scoreByCase.get(review.caseId);
    if (score === undefined) continue;
    pairs.push([score, review.rating]);
    if (
      score >= thresholds.high &&
      (review.rating <= 2 || review.verdict === "needs_redesign")
    )
      falsePositives.push({
        caseId: review.caseId,
        heuristicScore: score,
        rating: review.rating,
        verdict: review.verdict,
      });
    if (score < thresholds.low && review.rating >= 4 && review.acceptable)
      falseNegatives.push({
        caseId: review.caseId,
        heuristicScore: score,
        rating: review.rating,
        verdict: review.verdict,
      });
  }

  const total = reviews.length;
  const averageRating = total
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 100) /
      100
    : 0;
  const percentAcceptable = total
    ? Math.round(
        (reviews.filter((r) => r.acceptable || r.verdict === "acceptable")
          .length /
          total) *
          100,
      )
    : 0;

  return {
    totalReviews: total,
    averageRating,
    percentAcceptable,
    verdictBreakdown,
    mostCommonComplaints: [...complaints.entries()]
      .map(([complaint, count]) => ({ complaint, count }))
      .sort((a, b) => b.count - a.count),
    correlation: pearson(pairs),
    falsePositives,
    falseNegatives,
  };
}
