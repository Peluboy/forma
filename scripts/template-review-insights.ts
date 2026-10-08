import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  isTemplateReview,
  summarizeTemplateReviews,
  type TemplateReview,
} from "../src/domain/template-authoring/index.js";

/**
 * Summarize template human reviews.
 *
 *   npx tsx scripts/template-review-insights.ts <reviews.json|reviews_dir>
 *
 * `reviews.json` is an array of TemplateReview. A directory is scanned for
 * `*-review.json` files (matching the benchmark artifacts layout).
 */
async function main() {
  const reviewsPath = process.argv[2];
  if (!reviewsPath) {
    process.stderr.write(
      "Usage: template-review-insights <reviews.json|reviews_dir>\n",
    );
    process.exitCode = 1;
    return;
  }

  const targetPath = resolve(reviewsPath);
  const targetStat = await stat(targetPath);
  const raw: unknown[] = [];

  if (targetStat.isDirectory()) {
    for (const file of await readdir(targetPath)) {
      if (!file.endsWith("-review.json")) continue;
      try {
        const content = JSON.parse(
          await readFile(join(targetPath, file), "utf8"),
        );
        if (Array.isArray(content)) raw.push(...content);
        else raw.push(content);
      } catch {
        // Ignore invalid JSON.
      }
    }
  } else {
    const parsed = JSON.parse(await readFile(targetPath, "utf8"));
    if (Array.isArray(parsed)) raw.push(...parsed);
    else raw.push(parsed);
  }

  const reviews = raw.filter(isTemplateReview) as TemplateReview[];
  const summaries = summarizeTemplateReviews(reviews);
  process.stdout.write(`${JSON.stringify({ summaries }, null, 2)}\n`);
}

await main();
