import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import { QUALITY_CASES } from "../tests/fixtures/qualityCases.js";
import {
  parseHumanReview,
  type HumanReviewRecord,
} from "../src/domain/design-quality/humanReview.js";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const outputDirectory = flags.has("--artifacts")
  ? resolve("test-results/quality-benchmark")
  : null;
// Continuation pagination is on by default; disable with --no-continuations.
const enableContinuations = !flags.has("--no-continuations");
// AI visual influence stays opt-in even in the benchmark.
const enableAiCritic =
  flags.has("--ai-critic") || flags.has("--with-ai-critic");
// Review packages can be written via --write-review-package or --artifacts
const writeReviewPackages =
  flags.has("--write-review-package") || flags.has("--artifacts");
const reviewPackageDirectory = resolve(
  "test-results/quality-benchmark/reviews",
);

// Target specific case if --case <id> or --case=<id> is passed
let targetCaseId: string | null = null;
const caseIndex = args.indexOf("--case");
if (caseIndex !== -1 && args[caseIndex + 1] && !args[caseIndex + 1].startsWith("--")) {
  targetCaseId = args[caseIndex + 1];
} else {
  const caseArg = args.find((a) => a.startsWith("--case="));
  if (caseArg) targetCaseId = caseArg.split("=")[1];
}

if (outputDirectory) await mkdir(outputDirectory, { recursive: true });
if (writeReviewPackages) await mkdir(reviewPackageDirectory, { recursive: true });

const fixturesToRun = targetCaseId
  ? QUALITY_CASES.filter((fixture) => fixture.id === targetCaseId)
  : QUALITY_CASES;

if (targetCaseId && fixturesToRun.length === 0) {
  process.stderr.write(`Warning: Case "${targetCaseId}" not found in QUALITY_CASES.\n`);
}

const records = [];
const issueCounts = new Map<string, number>();
const failedCorrectionCounts = new Map<string, number>();
const fidelityOverallCounts = new Map<string, number>();
const deliverableStatusCounts = new Map<string, number>();
let totalPages = 0;
let passingPages = 0;
let copyFailures = 0;
let fitFailures = 0;
let corrections = 0;
let fidelityScoreTotal = 0;
let fidelityScoredDocuments = 0;
let trustedDocuments = 0;
let exportConsistentDocuments = 0;
let continuationDocuments = 0;
let continuationPagesTotal = 0;
let unresolvedContinuations = 0;
let humanReviewsCount = 0;

for (const fixture of fixturesToRun) {
  try {
    const result = await runAiDesignerPipeline(fixture.manuscript, {
      qualityPresetId: fixture.presetId,
      maxCriticIterations: 3,
      enableContinuations,
      enableAiCritic,
    });
    const quality = result.quality;
    const applied = quality.report.steps.flatMap(
      (step) => step.appliedCorrections,
    );
    corrections += applied.length;
    totalPages += quality.final.pageScores.length;
    passingPages += quality.final.pageScores.filter(
      (page) => page.score.overall >= 80,
    ).length;
    if (!result.copyCoverage.valid) copyFailures++;
    if (!result.fitReport.valid) fitFailures++;
    fidelityScoreTotal += result.projectionFidelity.score;
    fidelityScoredDocuments += 1;
    fidelityOverallCounts.set(
      result.projectionFidelity.overall,
      (fidelityOverallCounts.get(result.projectionFidelity.overall) ?? 0) + 1,
    );
    deliverableStatusCounts.set(
      result.deliverableQuality.status,
      (deliverableStatusCounts.get(result.deliverableQuality.status) ?? 0) + 1,
    );
    if (result.deliverableQuality.trusted) trustedDocuments += 1;
    if (result.exportConsistency.valid) exportConsistentDocuments += 1;
    if (result.continuation.applied) continuationDocuments += 1;
    continuationPagesTotal += result.continuation.continuationPageCount;
    unresolvedContinuations += result.continuation.unresolvedCount;
    for (const issue of quality.initial.aggregateIssues)
      issueCounts.set(issue.type, (issueCounts.get(issue.type) ?? 0) + 1);
    for (const step of quality.report.steps)
      for (const rejected of step.rejectedCorrections)
        failedCorrectionCounts.set(
          rejected.action.type,
          (failedCorrectionCounts.get(rejected.action.type) ?? 0) + 1,
        );
    const record = {
      id: fixture.id,
      category: fixture.category,
      manuscriptWordCount: fixture.manuscript.split(/\s+/).length,
      templateFamilyId: result.family.id,
      pages: result.finalSpec.pages.length,
      initialScore: quality.report.initialScore,
      finalScore: quality.report.finalScore,
      issues: quality.initial.aggregateIssues.map((issue) => ({
        type: issue.type,
        severity: issue.severity,
        pageId: issue.pageId,
      })),
      corrections: applied.map((action) => ({
        type: action.type,
        pageId: action.pageId,
        elementId: action.elementId,
      })),
      copyResult: result.copyCoverage.valid ? "pass" : "fail",
      fitResult: result.fitReport.valid ? "pass" : "fail",
      success: result.success,
      projectionFidelity: {
        overall: result.projectionFidelity.overall,
        score: result.projectionFidelity.score,
        blockers: result.projectionFidelity.counts.blockers,
        lost: result.projectionFidelity.counts.lost,
        unsupported: result.projectionFidelity.counts.unsupported,
        transformed: result.projectionFidelity.counts.transformed,
        preserved: result.projectionFidelity.counts.preserved,
        unsupportedItems: result.projectionFidelity.unsupported.map(
          (u) => `${u.kind}: ${u.userImpact}`,
        ),
        lostItems: result.projectionFidelity.lost.map(
          (l) => `${l.kind}: ${l.userImpact}`,
        ),
      },
      exportConsistent: result.exportConsistency.valid,
      continuation: {
        applied: result.continuation.applied,
        pages: result.continuation.continuationPageCount,
        unresolved: result.continuation.unresolvedCount,
      },
      deliverableQuality: result.deliverableQuality.status,
      trusted: result.deliverableQuality.trusted,
      aiCritic: result.aiCritic.source,
      humanReview: null as string | null,
      humanNotes: null as string | null,
      humanRating: null as number | null,
      screenshots: outputDirectory
        ? result.pageSvgs.map(
            (_, index) => `${fixture.id}-page-${index + 1}.png`,
          )
        : [],
    };

    // Attempt to load existing human review if available
    try {
      const reviewFile = resolve(reviewPackageDirectory, `${fixture.id}-review.json`);
      const rawReview = JSON.parse(await readFile(reviewFile, "utf8"));
      const parsedReview = parseHumanReview(rawReview);
      record.humanReview = parsedReview.verdict;
      record.humanNotes = parsedReview.notes ?? null;
      record.humanRating = parsedReview.rating;
      humanReviewsCount += 1;
    } catch {
      // Review not yet recorded for this fixture
    }

    records.push(record);

    if (writeReviewPackages) {
      const reviewPackage = {
        caseId: fixture.id,
        category: fixture.category,
        beforeSnapshot: {
          score: quality.report.initialScore,
          issues: quality.initial.aggregateIssues.map((issue) => ({
            type: issue.type,
            severity: issue.severity,
            pageId: issue.pageId,
          })),
        },
        afterSnapshot: {
          score: quality.report.finalScore,
          issues: quality.final.aggregateIssues.map((issue) => ({
            type: issue.type,
            severity: issue.severity,
            pageId: issue.pageId,
          })),
        },
        pageThumbnails: record.screenshots,
        qualityScores: {
          initial: quality.report.initialScore,
          final: quality.report.finalScore,
          pages: quality.final.pageScores.map((p) => ({
            pageId: p.pageId,
            score: p.score.overall,
          })),
          rhythm: quality.final.rhythmReport.score,
        },
        topIssues: quality.initial.aggregateIssues.slice(0, 5),
        correctionsApplied: applied.map((action) => ({
          type: action.type,
          pageId: action.pageId,
          elementId: action.elementId,
        })),
        fidelityReport: {
          score: result.projectionFidelity.score,
          overall: result.projectionFidelity.overall,
          counts: result.projectionFidelity.counts,
          unsupported: record.projectionFidelity.unsupportedItems,
          lost: record.projectionFidelity.lostItems,
          blockers: result.projectionFidelity.blockers.map((b) => b.message),
          warnings: result.projectionFidelity.warnings.map((w) => w.message),
        },
        copyStatus: result.copyCoverage.valid ? "pass" : "fail",
        fitStatus: result.fitReport.valid ? "pass" : "fail",
        deliverableStatus: result.deliverableQuality.status,
        humanReviewTemplate: {
          caseId: fixture.id,
          reviewer: "",
          acceptable: true,
          rating: 5,
          verdict: "acceptable",
          notes: "",
          pageNotes: [],
        },
      };
      await writeFile(
        resolve(reviewPackageDirectory, `${fixture.id}-review-package.json`),
        JSON.stringify(reviewPackage, null, 2),
      );
    }

    if (outputDirectory) {
      for (let index = 0; index < result.pageSvgs.length; index++) {
        await writeFile(
          resolve(outputDirectory, `${fixture.id}-page-${index + 1}.svg`),
          result.pageSvgs[index],
        );
        await sharp(Buffer.from(result.pageSvgs[index]))
          .png()
          .toFile(resolve(outputDirectory, record.screenshots[index]));
      }
    }
  } catch (error) {
    records.push({
      id: fixture.id,
      category: fixture.category,
      error: error instanceof Error ? error.message : "unknown failure",
      success: false,
    } as (typeof records)[number]);
  }
}

const scored = records.filter(
  (
    record,
  ): record is (typeof records)[number] & {
    initialScore: number;
    finalScore: number;
  } => "initialScore" in record,
);
const improvements = scored
  .map((record) => record.finalScore - record.initialScore)
  .sort((a, b) => a - b);
const avg = (values: number[]) =>
  Math.round(
    (values.reduce((sum, value) => sum + value, 0) /
      Math.max(1, values.length)) *
      10,
  ) / 10;
const summary = {
  totalFixtures: records.length,
  successfulFixtures: scored.filter((record) => record.success).length,
  averageInitialScore: avg(scored.map((record) => record.initialScore)),
  averageFinalScore: avg(scored.map((record) => record.finalScore)),
  medianImprovement: improvements.length
    ? improvements[Math.floor(improvements.length / 2)]
    : 0,
  percentPagesAbove80: Math.round(
    (passingPages / Math.max(1, totalPages)) * 100,
  ),
  percentDocumentsWithUnresolvedFit: Math.round(
    (fitFailures / Math.max(1, records.length)) * 100,
  ),
  percentDocumentsWithCopyIssues: Math.round(
    (copyFailures / Math.max(1, records.length)) * 100,
  ),
  averageCorrectionsPerDocument: avg([
    corrections / Math.max(1, records.length),
  ]),
  mostCommonIssues: [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10),
  mostCommonFailedCorrections: [...failedCorrectionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10),
  averageProjectionFidelity: avg([
    fidelityScoreTotal / Math.max(1, fidelityScoredDocuments),
  ]),
  fidelityOverallBreakdown: Object.fromEntries(fidelityOverallCounts.entries()),
  percentDeliverableTrusted: Math.round(
    (trustedDocuments / Math.max(1, records.length)) * 100,
  ),
  deliverableStatusBreakdown: Object.fromEntries(
    deliverableStatusCounts.entries(),
  ),
  percentDocumentsExportConsistent: Math.round(
    (exportConsistentDocuments / Math.max(1, records.length)) * 100,
  ),
  percentDocumentsWithContinuation: Math.round(
    (continuationDocuments / Math.max(1, records.length)) * 100,
  ),
  continuationPagesTotal,
  unresolvedContinuations,
  humanReviewCompleted: humanReviewsCount,
  flags: {
    enableContinuations,
    enableAiCritic,
    targetCaseId,
    writeReviewPackages,
  },
};
const report = { summary, records };
if (outputDirectory)
  await writeFile(
    resolve(outputDirectory, "report.json"),
    JSON.stringify(report, null, 2),
  );
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
