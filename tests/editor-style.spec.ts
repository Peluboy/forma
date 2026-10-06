import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("text and shape styling survives save and visual export", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add heading" }).click();
  const inspector = page.locator(".selection-inspector");
  await expect(
    inspector.getByRole("spinbutton", { name: "Font size" }),
  ).toHaveValue("64");
  await inspector
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("A new heading");
  await inspector
    .getByRole("combobox", { name: "Font", exact: true })
    .selectOption("Verdana");
  await inspector.getByRole("button", { name: "Bold" }).click();
  await inspector.getByRole("button", { name: "Italic" }).click();
  await expect(
    page.getByRole("button", { name: "Select text: A new heading" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page.getByRole("button", { name: "Add triangle" }).click();
  await expect(
    page.getByRole("button", { name: "Select Triangle" }),
  ).toBeVisible();
  await inspector
    .getByRole("combobox", { name: "Shape" })
    .selectOption("rounded");
  await expect(
    page.locator(".artboard g[data-layer-id] rect[rx]"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add triangle" }).click();
  await expect(
    page.locator(".artboard g[data-layer-id] polygon"),
  ).toBeVisible();

  await page.getByRole("button", { name: "File", exact: true }).click();
  await page.getByRole("button", { name: "Save editable file" }).click();
  let downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  const backup = JSON.parse(
    await readFile((await (await downloaded).path())!, "utf8"),
  );
  const styled = backup.compatibility.project.textLayers.find(
    (layer: { text: string }) => layer.text === "A new heading",
  );
  expect(styled.layout).toMatchObject({
    fontFamily: "Verdana",
    size: 64,
    bold: true,
    italic: true,
  });
  expect(
    backup.compatibility.project.graphicLayers.map(
      (layer: { shape: string }) => layer.shape,
    ),
  ).toEqual(["rounded", "triangle"]);

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Select text: A new heading" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("svg");
  downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  const svg = await readFile((await (await downloaded).path())!, "utf8");
  expect(svg).toContain('font-family="Verdana"');
  expect(svg).toContain('font-weight="700"');
  expect(svg).toContain('font-style="italic"');
  expect(svg).toContain("<polygon");
  expect(svg).toContain('rx="');
  expect(svg).toContain("A new heading");
});
