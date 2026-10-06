import { test, expect } from "@playwright/test";
import { tmpdir } from "node:os";

test("editor keeps manuscript actions accessible and safely returns to the dashboard", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.locator(".artboard")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: Design with intention.");
  await page
    .getByRole("button", { name: "Back to projects", exact: true })
    .click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(
    page.getByText("Apply your manuscript changes before leaving the editor.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).focus();
  await expect(
    page.getByRole("tooltip", { name: "Undo", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${tmpdir()}/forma-editor-redesign-desktop.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Back to projects", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: /^Open / })).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: /^Open / }).click();
  await expect(page.locator(".artboard")).toBeVisible();
  await page
    .getByRole("button", { name: "Show content panel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply changes", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${tmpdir()}/forma-editor-redesign-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
