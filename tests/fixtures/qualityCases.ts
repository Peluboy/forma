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
  [
    "stress-image-heavy",
    "image_heavy",
    "# Comprehensive Facility Audit\n\nImage: Primary Processing Facility Overview\n\nFigure 1. High-capacity sorting line during peak morning throughput.\n\nThe initial inspection verified full operational compliance across all primary processing wings. Safety protocols met standard targets and sorting accuracy remained above 99.4%.\n\n# Distribution Logistics Hub\n\nImage: Automated Fleet Loading Bay\n\nFigure 2. Rapid dispatch conveyor linking warehouse inventory with regional haulers.\n\nDispatch times were reduced by 14 minutes per route, supporting enhanced on-time delivery across metropolitan zones.",
  ],
  [
    "stress-chart-heavy",
    "statistics_heavy",
    "# Annual Performance & Financial Metrics\n\nRevenue: $14.2M\n\nEBITDA: $3.8M\n\nGrowth: 28%\n\nOperating efficiency reached historical highs following automated workflow deployment across manufacturing units.\n\n# Capital Allocation Matrix\n\n| Department | Allocation | Deployed | Variance |\n| --- | --- | --- | --- |\n| Engineering | $4.5M | $4.2M | -$300k |\n| Operations | $6.2M | $6.1M | -$100k |\n| Expansion | $3.5M | $3.5M | $0 |",
  ],
  [
    "stress-stat-heavy",
    "statistics_heavy",
    "# Key Operational Indicators\n\nThroughput: 98.4%\n\nUptime: 99.9%\n\nCustomer Satisfaction: 94%\n\nIncident Rate: 0.02%\n\nContinuous telemetry monitoring demonstrates superior system stability throughout the peak quarter.",
  ],
  [
    "stress-text-heavy-layout-swap",
    "dense_narrative",
    "# Strategic Evolution and Market Integration\n\nOur transformation journey began with a clear mandate to unify disconnected operational silos into an integrated, data-driven service ecosystem. Over eighteen months of continuous refinement, cross-functional teams established shared protocols, transparent reporting metrics, and agile delivery frameworks.\n\nDeep customer engagement remains the central pillar of our strategic orientation. By integrating direct customer feedback directly into sprint planning cycles, product reliability increased by 35% while escalations dropped dramatically.\n\nLooking toward the subsequent fiscal period, sustainable scaling requires ongoing investment in automated testing pipelines, talent development, and resilient technical infrastructure.",
  ],
  [
    "stress-table-continuation",
    "table_heavy",
    "# Enterprise Risk and Compliance Register\n\n| ID | Risk Category | Vulnerability Description | Mitigation Strategy | Owner | Review Status |\n| --- | --- | --- | --- | --- | --- |\n| R-01 | Infrastructure | Power grid fluctuation | Redundant generator systems | Operations | Approved |\n| R-02 | Data Security | Unauthorized API access | Zero-trust token rotation | Security | Approved |\n| R-03 | Supply Chain | Single-source supplier bottleneck | Dual-vendor framework | Procurement | In Review |\n| R-04 | Compliance | Data localization audit | Region-locked sovereign clusters | Legal | Approved |\n| R-05 | Workforce | Critical skill gap | Internal academy program | HR | In Review |\n| R-06 | Telemetry | Ingestion delay during peaks | Kafka partition expansion | DevOps | Approved |\n| R-07 | Hardware | Disk degradation in cluster B | NVMe proactive swap | Infrastructure | Approved |\n| R-08 | Customer Ops | SLA breach on tier-3 tickets | 24/7 follow-the-sun rotation | Support | Approved |\n| R-09 | Billing | Gateway timeout during renewals | Multi-gateway retry queue | Finance | Approved |\n| R-10 | Disaster Recovery | Multi-region failover lag | Hot-standby automated promotion | SRE | Approved |\n| R-11 | Physical Access | Biometric badge synchronization | Real-time directory sync | Facilities | Approved |\n| R-12 | Vendor Audit | Third-party subprocessor compliance | Annual SOC2 verification | Governance | Approved |",
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
