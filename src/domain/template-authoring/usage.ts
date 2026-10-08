import type { TemplateUsageFailure, TemplateUsageMetadata } from "./types.js";

/**
 * Usage analytics v1 (Part N). Only what helps improve a template is stored —
 * no dashboard, no per-user tracking.
 */

export function emptyUsageMetadata(): TemplateUsageMetadata {
  return {
    timesUsed: 0,
    commonFailures: [],
    humanVerdicts: { approved: 0, needs_refinement: 0, reject: 0 },
  };
}

export interface UsageRunReport {
  qualityScore: number;
  projectionFidelityScore: number;
  pageCount: number;
  continued: boolean;
  failures?: string[];
}

function bumpFailures(
  current: TemplateUsageFailure[],
  failures: string[],
): TemplateUsageFailure[] {
  const map = new Map(current.map((item) => [item.code, item.count]));
  for (const code of failures) map.set(code, (map.get(code) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

function runningAverage(
  previous: number | undefined,
  previousCount: number,
  next: number,
): number {
  if (previous === undefined || previousCount === 0) return next;
  return (previous * previousCount + next) / (previousCount + 1);
}

export function recordTemplateUsage(
  usage: TemplateUsageMetadata | undefined,
  report: UsageRunReport,
): TemplateUsageMetadata {
  const current = usage ?? emptyUsageMetadata();
  const timesUsed = current.timesUsed + 1;
  const continuationFrequency =
    current.continuationFrequency === undefined
      ? report.continued
        ? 1
        : 0
      : runningAverage(
          current.continuationFrequency,
          current.timesUsed,
          report.continued ? 1 : 0,
        );

  return {
    ...current,
    timesUsed,
    lastUsedAt: new Date().toISOString(),
    averageQualityScore: Math.round(
      runningAverage(
        current.averageQualityScore,
        current.timesUsed,
        report.qualityScore,
      ),
    ),
    averageProjectionFidelity: Math.round(
      runningAverage(
        current.averageProjectionFidelity,
        current.timesUsed,
        report.projectionFidelityScore,
      ),
    ),
    averagePageCount: Math.round(
      runningAverage(
        current.averagePageCount,
        current.timesUsed,
        report.pageCount,
      ),
    ),
    continuationFrequency: Math.round(continuationFrequency * 100) / 100,
    commonFailures: bumpFailures(current.commonFailures, report.failures ?? []),
  };
}

export function mergeHumanVerdict(
  usage: TemplateUsageMetadata | undefined,
  verdict: "approved" | "needs_refinement" | "reject",
): TemplateUsageMetadata {
  const current = usage ?? emptyUsageMetadata();
  return {
    ...current,
    humanVerdicts: {
      ...current.humanVerdicts,
      [verdict]: (current.humanVerdicts[verdict] ?? 0) + 1,
    },
  };
}
