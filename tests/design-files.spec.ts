import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("editable backup downloads, reopens, saves and appears in the dashboard", async ({
  page,
}) => {
  await page.goto("/editor");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("My reusable flyer");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page
    .getByRole("button", { name: "Save editable file", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download design", exact: true })
    .click();
  const download = await downloading;
  const text = await readFile((await download.path())!, "utf8");
  const file = JSON.parse(text);
  expect(file.schemaVersion).toBe(1);
  expect(file.pages).toHaveLength(1);
  await page.reload();
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Temporary name");
  await page.locator('input[type="file"][accept=".json"]').setInputFiles({
    name: "saved.forma.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
    "My reusable flyer",
  );
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
    "My reusable flyer",
  );
  file.schemaVersion = 99;
  await page.locator('input[type="file"][accept=".json"]').setInputFiles({
    name: "future.forma.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(
    page.getByText(/newer or unsupported Forma format/),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
    "My reusable flyer",
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("link", { name: "Open My reusable flyer", exact: true }),
  ).toBeVisible();
});
