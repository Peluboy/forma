import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  parseHumanReviews,
  summarizeHumanReviews,
  type HumanReviewCaseScore,
} from "../src/domain/design-quality/humanReview.js";

/**
 * Summarize human review packages.
 *
 *   npx tsx scripts/summarize-human-reviews.ts <reviews.json> [scores.json]
 *
 * `reviews.json` is an array of HumanReviewRecord.
 * `scores.json` is either an array of { caseId, heuristicScore } or a
 * benchmark report.json containing a `records` array.
 */
async function main() {
  const [reviewsPath, scoresPath] = process.argv.slice(2);
  if (!reviewsPath) {
    process.stderr.write(
      "Usage: summarize-human-reviews <reviews.json> [scores.json]\n",
    );
    process.exitCode = 1;
    return;
  }
  const rawReviews = JSON.parse(await readFile(resolve(reviewsPath), "utf8"));
  const reviews = parseHumanReviews(
    Array.isArray(rawReviews) ? rawReviews : [rawReviews],
  );

  let scores: HumanReviewCaseScore[] = [];
  if (scoresPath) {
    const parsed = JSON.parse(await readFile(resolve(scoresPath), "utf8"));
    const records = Array.isArray(parsed) ? parsed : parsed.records;
    if (Array.isArray(records))
      scores = records
        .filter(
          (record: { caseId?: unknown; id?: unknown; finalScore?: unknown }) =>
            record &&
            (typeof record.caseId === "string" || typeof record.id === "string") &&
            typeof record.finalScore === "number",
        )
        .map((record: { caseId?: string; id?: string; finalScore: number }) => ({
          caseId: record.caseId ?? record.id!,
          heuristicScore: record.finalScore,
        }));
  }

  const summary = summarizeHumanReviews(reviews, scores);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
