import { CORPORATE_REPORT_MANUSCRIPT } from "./corporateReportManuscript.js";

export interface QualityCase {
  id: string;
  category: string;
  manuscript: string;
  presetId: string;
}

const reports = [
  [
    "short-summary",
    "short",
    "# Quarterly Snapshot\n\nRevenue improved by 8% while customer support response times fell.",
  ],
  [
    "sparse-note",
    "sparse",
    "# Field Note\n\nA brief update on the current program.",
  ],
  [
    "long-heading",
    "long_headings",
    "# A Long Executive Heading About Operational Resilience, Regional Growth, and the Next Stage of Strategic Investment\n\nOur teams completed the next phase of work.",
  ],
  [
    "dense-narrative",
    "dense_narrative",
    `# Operations Review\n\n${"Teams reviewed delivery risk, staffing, and customer outcomes across all regions. ".repeat(24)}`,
  ],
  [
    "many-sections",
    "many_sections",
    Array.from(
      { length: 9 },
      (_, i) =>
        `# Section ${i + 1}\n\nThis section describes an approved milestone for the operating plan.`,
    ).join("\n\n"),
  ],
  [
    "stats-growth",
    "statistics_heavy",
    "# Growth Review\n\nRevenue: 18%\n\nRetention: 92%\n\nAdoption: 64%\n\nThe metrics reflect measured outcomes.",
  ],
  [
    "stats-cost",
    "statistics_heavy",
    "# Cost Review\n\nOperating cost: $3.2M\n\nSavings: $420,000\n\nEfficiency: 14%\n\nThe finance team verified these figures.",
  ],
  [
    "table-budget",
    "table_heavy",
    "# Budget Review\n\n| Division | Budget | Actual |\n| --- | --- | --- |\n| Sales | $900,000 | $850,000 |\n| Product | $1,200,000 | $1,180,000 |",
  ],
  [
    "table-operations",
    "table_heavy",
    "# Operations Matrix\n\n| Region | Owner | Status |\n| --- | --- | --- |\n| North | Amina | Complete |\n| South | David | In progress |",
  ],
  [
    "quote-leadership",
    "quote_heavy",
    "# Leadership Perspective\n\n> We will keep the customer at the center of every decision.\n\nThe team documented the next steps.",
  ],
  [
    "quote-culture",
    "quote_heavy",
    "# Culture Update\n\n> Good systems make quality repeatable.\n\nManagers reviewed the change with their teams.",
  ],
  [
    "mixed-program",
    "mixed",
    "# Program Review\n\nDelivery is on schedule.\n\nAdoption: 73%\n\n| Phase | Status |\n| --- | --- |\n| Pilot | Complete |\n| Rollout | Active |",
  ],
  [
    "mixed-market",
    "mixed",
    "# Market Outlook\n\nDemand stayed steady in the first half.\n\nGrowth: 6%\n\n> We remain cautiously optimistic.",
  ],
  [
    "editorial-story",
    "long",
    `# The Next Chapter\n\n${"The program connected local teams with shared tools and clearer decisions. ".repeat(12)}`,
  ],
  ["report-primary", "mixed", CORPORATE_REPORT_MANUSCRIPT],
  [
    "report-corporate",
    "brand_heavy",
    CORPORATE_REPORT_MANUSCRIPT.replaceAll("Corporate", "Regional"),
  ],
  [
    "report-financial",
    "statistics_heavy",
    CORPORATE_REPORT_MANUSCRIPT.replaceAll("2026", "2027"),
  ],
  [
    "report-editorial",
    "brand_light",
    CORPORATE_REPORT_MANUSCRIPT.replaceAll("Corporate", "Community"),
  ],
  [
    "one-column",
    "dense_narrative",
    "# One-Column Essay\n\nA clear narrative needs readable text and enough whitespace.\n\nEvery statement is approved copy.",
  ],
  [
    "two-column",
    "dense_narrative",
    "# Two-Column Brief\n\nThe first workstream covers research and discovery.\n\nThe second workstream covers launch and support.",
  ],
  [
    "image-led",
    "image_heavy",
    "# Visual Field Report\n\nImage: Regional operations site\n\nThe site visit recorded improvements in safety and delivery.",
  ],
  [
    "executive-summary",
    "short",
    "# Executive Summary\n\nThree priorities guide the next quarter: reliability, access, and measurable impact.",
  ],
] as const;

export const QUALITY_CASES: QualityCase[] = reports.map(
  ([id, category, manuscript]) => ({
    id,
    category,
    manuscript,
    presetId:
      category === "statistics_heavy"
        ? "financial_report"
        : category === "short"
          ? "executive_summary"
          : "editorial_report",
  }),
);
