import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  parseHumanReviews,
  summarizeHumanReviews,
  type HumanReviewCaseScore,
  type HumanReviewRecord,
} from "../src/domain/design-quality/humanReview.js";

/**
 * Summarize human review packages.
 *
 *   npx tsx scripts/summarize-human-reviews.ts <reviews.json|reviews_dir> [scores.json]
 *
 * `reviews.json` is an array of HumanReviewRecord.
 * `scores.json` is either an array of { caseId, heuristicScore } or a
 * benchmark report.json containing a `records` array.
 */
async function main() {
  const [reviewsPath, scoresPath] = process.argv.slice(2);
  if (!reviewsPath) {
    process.stderr.write(
      "Usage: summarize-human-reviews <reviews.json|reviews_dir> [scores.json]\n",
    );
    process.exitCode = 1;
    return;
  }

  const targetPath = resolve(reviewsPath);
  const targetStat = await stat(targetPath);
  const rawReviews: any[] = [];

  if (targetStat.isDirectory()) {
    const files = await readdir(targetPath);
    for (const file of files) {
      if (file.endsWith("-review.json")) {
        try {
          const content = JSON.parse(
            await readFile(join(targetPath, file), "utf8"),
          );
          if (Array.isArray(content)) rawReviews.push(...content);
          else rawReviews.push(content);
        } catch {
          // Ignore invalid JSON
        }
      }
    }
  } else {
    const parsed = JSON.parse(await readFile(targetPath, "utf8"));
    if (Array.isArray(parsed)) rawReviews.push(...parsed);
    else rawReviews.push(parsed);
  }

  const validReviews = rawReviews.filter(
    (r) => r && typeof r.reviewer === "string" && typeof r.caseId === "string",
  );
  const reviews: HumanReviewRecord[] = parseHumanReviews(validReviews);

  let scores: HumanReviewCaseScore[] = [];
  if (scoresPath) {
    const parsed = JSON.parse(await readFile(resolve(scoresPath), "utf8"));
    const records = Array.isArray(parsed) ? parsed : parsed.records;
    if (Array.isArray(records))
      scores = records
        .filter(
          (record: { caseId?: unknown; id?: unknown; finalScore?: unknown }) =>
            record &&
            (typeof record.caseId === "string" ||
              typeof record.id === "string") &&
            typeof record.finalScore === "number",
        )
        .map(
          (record: { caseId?: string; id?: string; finalScore: number }) => ({
            caseId: record.caseId ?? record.id!,
            heuristicScore: record.finalScore,
          }),
        );
  }

  const summary = summarizeHumanReviews(reviews, scores);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
