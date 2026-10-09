import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

test("self-hosted font and text styles survive save and embed in SVG export", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  expect(
    await page
      .getByRole("button", { name: "Add text", exact: true })
      .evaluate((button) => getComputedStyle(button).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await page.getByRole("button", { name: "Add heading" }).click();
  await page
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("Only approved words");
  const toolbar = page.getByRole("group", { name: "Text formatting" });
  await toolbar
    .getByRole("combobox", { name: "Font family" })
    .selectOption("Inter");
  await toolbar
    .getByRole("combobox", { name: "Font weight" })
    .selectOption("600");
  await toolbar.getByRole("button", { name: "Underline" }).click();
  await toolbar.getByRole("button", { name: "Italic" }).click();
  await toolbar
    .locator(".toolbar-spacing:not(.toolbar-opacity) summary")
    .click();
  await toolbar.getByRole("spinbutton", { name: "Letter spacing" }).fill("2");
  await toolbar.getByRole("spinbutton", { name: "Line height" }).fill("1.3");
  await toolbar
    .locator(".toolbar-spacing:not(.toolbar-opacity) summary")
    .click();
  await toolbar.locator(".toolbar-opacity summary").click();
  const opacity = toolbar.getByRole("slider", { name: "Text opacity" });
  await opacity.focus();
  await opacity.press("End");
  await opacity.press("ArrowLeft");
  await expect(opacity).toHaveValue("99");
  await toolbar.locator(".toolbar-opacity summary").click();
  await expect(
    page.locator('.artboard text[font-family="Inter"]'),
  ).toBeVisible();
  await page.screenshot({
    path: join(tmpdir(), "forma-typography-toolbar.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("svg");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  const svg = await readFile((await (await pending).path())!, "utf8");
  expect(svg).toContain('font-family="Inter"');
  expect(svg).toContain('font-weight="600"');
  expect(svg).toContain('font-style="italic"');
  expect(svg).toContain('letter-spacing="2"');
  expect(svg).toContain('opacity="0.99"');
  expect(svg).toContain('text-decoration="underline"');
  expect(svg).toContain("data:font/woff2;base64,");
  expect(svg).toContain("Only approved words");
});

test("Elements categories open working Forma tools", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  await page.getByRole("textbox", { name: "Search elements" }).fill("triangle");
  await page.getByRole("button", { name: "Add triangle" }).click();
  await expect(
    page.getByRole("button", { name: "Select Triangle" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search elements" }).fill("");
  await page.getByRole("button", { name: "Images", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Upload image" }),
  ).toBeVisible();
  await page.screenshot({
    path: join(tmpdir(), "forma-elements-categories.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Tables", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Document", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Slides", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create slides from Content" })
    .click();
  await expect(
    page.getByRole("button", { name: "Open slide 1" }),
  ).toBeVisible();
  const slidesId = new URL(page.url()).searchParams.get("project");
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByRole("button", { name: "Graphics", exact: true }).click();
  await expect(page.locator(".artboard")).toContainText("Good things");
  expect(new URL(page.url()).searchParams.get("project")).not.toBe(slidesId);
});

test("text toolbar stays usable on a narrow dark workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor");
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add heading" }).click();
  await page
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("Mobile style");
  await page.getByRole("button", { name: "Close library" }).click();
  const toolbar = page.getByRole("group", { name: "Text formatting" });
  await expect(
    toolbar.getByRole("combobox", { name: "Font family" }),
  ).toBeVisible();
  await toolbar
    .getByRole("combobox", { name: "Font family" })
    .selectOption("Lora");
  await expect(
    page.locator('.artboard text[font-family="Lora"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: join(tmpdir(), "forma-typography-mobile-dark.png"),
    fullPage: true,
  });
});
