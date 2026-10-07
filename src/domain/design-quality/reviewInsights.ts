import type {
  ComplaintCategory,
  HumanReviewCaseScore,
  HumanReviewRecord,
} from "./humanReview.js";
import { classifyComplaint, summarizeHumanReviews } from "./humanReview.js";

export interface RubricTuningSuggestion {
  dimension: string;
  action:
    | "increase_weight"
    | "decrease_weight"
    | "tighten_threshold"
    | "relax_threshold";
  rationale: string;
  impactedComplaint: ComplaintCategory;
}

export interface ReviewInsightsReport {
  totalReviews: number;
  overallSatisfactionRate: number;
  averageHumanRating: number;
  complaintRankings: Array<{
    category: ComplaintCategory;
    count: number;
    percentage: number;
    sampleNotes: string[];
  }>;
  calibrationGaps: {
    falsePositiveCount: number;
    falseNegativeCount: number;
    correlationScore: number | null;
  };
  rubricTuningSuggestions: RubricTuningSuggestion[];
  caseInsights: Array<{
    caseId: string;
    averageRating: number;
    acceptanceRate: number;
    commonComplaints: ComplaintCategory[];
    keyNotes: string[];
  }>;
}

export function generateReviewInsights(
  reviews: HumanReviewRecord[],
  scores: HumanReviewCaseScore[] = [],
): ReviewInsightsReport {
  const summary = summarizeHumanReviews(reviews, scores);

  // Group notes by complaint category
  const notesByCategory: Record<ComplaintCategory, string[]> = {
    spacing: [],
    typography: [],
    hierarchy: [],
    imagery: [],
    color_brand: [],
    tables_data: [],
    density: [],
    continuation: [],
    other: [],
  };

  // Group by case
  const reviewsByCase = new Map<string, HumanReviewRecord[]>();

  for (const r of reviews) {
    const list = reviewsByCase.get(r.caseId) || [];
    list.push(r);
    reviewsByCase.set(r.caseId, list);

    if (r.notes) {
      const cat = classifyComplaint(r.notes);
      notesByCategory[cat].push(r.notes);
    }

    if (r.pageNotes) {
      for (const pn of r.pageNotes) {
        const cat = classifyComplaint(pn.note);
        notesByCategory[cat].push(pn.note);
      }
    }
  }

  const complaintRankings = summary.mostCommonComplaints.map((item) => ({
    category: item.complaint,
    count: item.count,
    percentage:
      reviews.length > 0 ? Math.round((item.count / reviews.length) * 100) : 0,
    sampleNotes: notesByCategory[item.complaint].slice(0, 3),
  }));

  // Generate actionable rubric tuning suggestions
  const rubricTuningSuggestions: RubricTuningSuggestion[] = [];

  for (const item of summary.mostCommonComplaints) {
    if (item.count === 0) continue;
    switch (item.complaint) {
      case "spacing":
        rubricTuningSuggestions.push({
          dimension: "composition.whitespace",
          action: "tighten_threshold",
          rationale: `Frequent human complaints about spacing (${item.count} occurrences). Increase penalty for crowded margins or uneven gaps.`,
          impactedComplaint: "spacing",
        });
        break;
      case "typography":
        rubricTuningSuggestions.push({
          dimension: "typography.scale",
          action: "increase_weight",
          rationale: `Frequent human complaints about typography (${item.count} occurrences). Raise weight on small body text and leading readability.`,
          impactedComplaint: "typography",
        });
        break;
      case "hierarchy":
        rubricTuningSuggestions.push({
          dimension: "typography.hierarchy",
          action: "tighten_threshold",
          rationale: `Hierarchy clarity flagged ${item.count} times. Require stronger contrast between heading, subheading, and body scale.`,
          impactedComplaint: "hierarchy",
        });
        break;
      case "imagery":
        rubricTuningSuggestions.push({
          dimension: "imageTreatment.focalCrop",
          action: "tighten_threshold",
          rationale: `Image composition and crop issues noted ${item.count} times. Tighten subject cutoff and aspect ratio checks.`,
          impactedComplaint: "imagery",
        });
        break;
      case "tables_data":
        rubricTuningSuggestions.push({
          dimension: "dataDense.tableReadability",
          action: "increase_weight",
          rationale: `Table readability or chart overcrowding flagged ${item.count} times. Elevate table density scoring.`,
          impactedComplaint: "tables_data",
        });
        break;
      case "density":
        rubricTuningSuggestions.push({
          dimension: "documentRhythm.density",
          action: "tighten_threshold",
          rationale: `Page density spikes noted ${item.count} times. Stricter pacing across multi-page transitions.`,
          impactedComplaint: "density",
        });
        break;
      case "color_brand":
        rubricTuningSuggestions.push({
          dimension: "brand.colorAdherence",
          action: "increase_weight",
          rationale: `Brand color misuse noted ${item.count} times. Ensure strict palette token alignment.`,
          impactedComplaint: "color_brand",
        });
        break;
      default:
        break;
    }
  }

  // Build per-case insights
  const caseInsights = Array.from(reviewsByCase.entries()).map(
    ([caseId, caseReviews]) => {
      const avgRating =
        caseReviews.reduce((sum, r) => sum + r.rating, 0) / caseReviews.length;
      const acceptedCount = caseReviews.filter((r) => r.acceptable).length;
      const acceptanceRate = Math.round(
        (acceptedCount / caseReviews.length) * 100,
      );

      const caseComplaints = new Set<ComplaintCategory>();
      const keyNotes: string[] = [];

      for (const r of caseReviews) {
        if (r.notes) {
          caseComplaints.add(classifyComplaint(r.notes));
          keyNotes.push(r.notes);
        }
        r.pageNotes?.forEach((pn) => {
          caseComplaints.add(classifyComplaint(pn.note));
          keyNotes.push(pn.note);
        });
      }

      return {
        caseId,
        averageRating: Math.round(avgRating * 10) / 10,
        acceptanceRate,
        commonComplaints: Array.from(caseComplaints),
        keyNotes: keyNotes.slice(0, 3),
      };
    },
  );

  return {
    totalReviews: reviews.length,
    overallSatisfactionRate: summary.percentAcceptable,
    averageHumanRating: summary.averageRating,
    complaintRankings,
    calibrationGaps: {
      falsePositiveCount: summary.falsePositives.length,
      falseNegativeCount: summary.falseNegatives.length,
      correlationScore: summary.correlation,
    },
    rubricTuningSuggestions,
    caseInsights,
  };
}
