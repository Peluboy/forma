import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
async function register(page: Page) {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Forma Tester");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(`test-${crypto.randomUUID()}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("A long testing password 123!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("Save your recovery code.")).toBeVisible();
  await page.getByRole("button", { name: "I have saved my code" }).click();
  await expect(page.locator(".save-state")).toHaveText(
    "Saved to your account",
    { timeout: 10000 },
  );
}
test("account to saved design, history, client review, and logout works end to end", async ({
  page,
  context,
}) => {
  await register(page);
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill(
      "Headline: Ready for review.\n\nBody copy: These are the exact approved words.",
    );
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(page.locator(".save-state")).toHaveText("Saved to your account");
  await page.reload();
  await expect(page.locator(".artboard")).toContainText(/Ready for\s*review\./);
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page.getByRole("button", { name: "Version history" }).click();
  await expect(page.getByText("Version 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: "Create review link" }).click();
  const url = await page
    .getByRole("textbox", { name: "Review URL" })
    .inputValue();
  const reviewer = await context.newPage();
  await reviewer.goto(url);
  await expect(
    reviewer.getByRole("heading", { name: "Let’s get the details right." }),
  ).toBeVisible();
  await reviewer.getByLabel("Your name", { exact: true }).fill("Client");
  await reviewer.getByLabel("Your feedback").fill("Everything is correct.");
  await reviewer.getByRole("button", { name: "Add comment" }).click();
  await expect(reviewer.locator(".review-comments")).toContainText(
    "Everything is correct.",
  );
  await reviewer.getByRole("button", { name: "Approve design" }).click();
  await expect(reviewer.locator(".review-status")).toContainText("Approved");
  await page.getByRole("button", { name: "Refresh feedback status" }).click();
  await expect(page.locator(".share-links")).toContainText("approved");
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await reviewer.reload();
  await expect(
    reviewer.getByRole("heading", { name: "This review isn’t available." }),
  ).toBeVisible();
  await reviewer.close();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".artboard")).not.toContainText(
    /Ready for\s*review\./,
  );
});
test("automatic local OCR returns reviewable regions and preserves manuscript", async ({
  page,
}) => {
  await register(page);
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 900;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, 720, 900);
    x.fillStyle = "#111111";
    x.font = "bold 72px Arial";
    x.fillText("DESIGN MATTERS", 35, 180);
    x.font = "32px Arial";
    x.fillText("An evening for creative people", 35, 330);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('input[type=file][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "ocr-poster.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await page
    .getByRole("button", { name: "Show content panel", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: Approved headline.\n\nBody copy: Every word is mine.");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  await page.getByRole("button", { name: "Detect text areas" }).click();
  await expect(
    page.getByRole("dialog", { name: "Your reference, understood." }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".analysis-regions")).toContainText(
    "DESIGN MATTERS",
  );
  await page.getByRole("button", { name: /Use \d+ mapped text areas/ }).click();
  await page
    .getByRole("button", { name: "Show content panel", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toHaveValue(
    "Headline: Approved headline.\n\nBody copy: Every word is mine.",
  );
});
test("PDF input, PDF export, campaign ZIP, and reusable template flows work", async ({
  page,
}) => {
  await page.goto("/editor");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.text("Headline: PDF manuscript.", 15, 20);
  pdf.text("Body copy: These words came from a PDF.", 15, 40);
  await page
    .locator('input[type=file][accept=".txt,.md,.docx,.pdf"]')
    .setInputFiles({
      name: "manuscript.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(pdf.output("arraybuffer")),
    });
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toHaveValue(/PDF manuscript\./);
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByLabel("File type").selectOption("pdf");
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  const downloadedPdf = await pdfDownload;
  expect(downloadedPdf.suggestedFilename()).toMatch(/\.pdf$/);
  const pdfBytes = await readFile((await downloadedPdf.path())!);
  expect(pdfBytes.subarray(0, 5).toString()).toBe("%PDF-");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByLabel("File type").selectOption("zip");
  const zipDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  const downloadedZip = await zipDownload;
  expect(downloadedZip.suggestedFilename()).toMatch(/campaign\.zip$/);
  const zip = await JSZip.loadAsync(
    await readFile((await downloadedZip.path())!),
  );
  const approvedCopy = await page
    .getByRole("textbox", { name: "Content", exact: true })
    .inputValue();
  expect(await zip.file("approved-copy.txt")!.async("string")).toBe(
    approvedCopy,
  );
  const editable = JSON.parse(
    await zip.file("editable.forma.json")!.async("string"),
  );
  expect(editable.compatibility.project.manuscript).toBe(approvedCopy);
  for (const [format, width, height] of [
    ["portrait", 1080, 1350],
    ["square", 1080, 1080],
    ["story", 1080, 1920],
  ] as const) {
    const metadata = await sharp(
      await zip.file(`${format}.png`)!.async("nodebuffer"),
    ).metadata();
    expect([metadata.width, metadata.height]).toEqual([width, height]);
  }
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Save current design as a template" })
    .click();
  await page.getByRole("tab", { name: "My templates", exact: true }).click();
  await expect(page.locator(".project-list")).toContainText("template");
});
test("two editor tabs expose save conflicts and keep both versions", async ({
  page,
  context,
}) => {
  await register(page);
  const second = await context.newPage();
  await second.goto("/editor");
  await expect(second.locator(".save-state")).toHaveText(
    "Saved to your account",
  );
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: First editor.");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(page.locator(".save-state")).toHaveText("Saved to your account");
  await second
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: Second editor.");
  await second
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(
    second.getByText("A newer version exists. Your changes are still here."),
  ).toBeVisible();
  await second
    .getByRole("button", { name: "Keep my changes as a copy" })
    .click();
  await expect(second.locator(".save-state")).toHaveText(
    "Saved to your account",
  );
  await second.getByRole("button", { name: "More", exact: true }).click();
  await second.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(second.locator(".project-list .saved-project")).toHaveCount(2);
  await expect(second.locator(".artboard")).toContainText("Second editor.");
  await second.close();
});
