import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
async function exported(page: Page, format: string) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("dialog").getByRole("combobox").selectOption(format);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download design", exact: true })
    .click();
  return readFile((await (await pending).path())!, "utf8");
}
test("current editor applies content, preserves output across themes, reloads and reopens backups", async ({
  page,
}) => {
  await page.goto("/editor");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Theme-safe design");
  if (
    !(await page
      .getByRole("textbox", { name: "Content", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Show content panel", exact: true })
      .click();
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: Approved words\n\nBody copy: Keep this wording intact.");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await page.getByRole("radio", { name: "Light", exact: true }).click();
  const light = await exported(page, "svg");
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  const dark = await exported(page, "svg");
  expect(dark).toBe(light);
  expect(dark).toContain("Approved words");
  const backup = await exported(page, "json");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${tmpdir()}/forma-current-dark.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("dialog")).toBe(false);
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
    "Theme-safe design",
  );
  await page.getByRole("textbox", { name: "Project name" }).fill("Temporary");
  await page.locator('input[type="file"][accept=".json"]').setInputFiles({
    name: "reopen.forma.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
    "Theme-safe design",
  );
  await page.getByRole("radio", { name: "System", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
});
test("mobile editor switches between content and tools without hiding the canvas permanently", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor");
  await page
    .getByRole("button", { name: "Show content panel", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Close library", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${tmpdir()}/forma-current-mobile.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Close library", exact: true })
    .click();
  await expect(page.locator(".artboard")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
