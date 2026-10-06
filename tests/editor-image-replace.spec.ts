import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { readFile } from "node:fs/promises";

test("replacing an image keeps its layer geometry and supports recovery", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  const image = async (red: number, blue: number) =>
    sharp({
      create: {
        width: 80,
        height: 60,
        channels: 4,
        background: { r: red, g: 60, b: blue, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  await page.getByLabel("Upload layer image").setInputFiles({
    name: "first.png",
    mimeType: "image/png",
    buffer: await image(230, 20),
  });
  await expect(
    page.getByRole("button", { name: "Select first.png" }),
  ).toBeVisible();
  const original = page.locator(".artboard g[data-layer-id] image").last();
  const src = await original.getAttribute("href");
  const box = await original.evaluate((node) => ({
    x: node.getAttribute("x"),
    y: node.getAttribute("y"),
    width: node.getAttribute("width"),
    height: node.getAttribute("height"),
  }));
  await page.getByLabel("Replacement image").setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Choose a PNG, JPEG or WebP",
  );
  await expect(original).toHaveAttribute("href", src!);
  await page.getByLabel("Replacement image").setInputFiles({
    name: "second.png",
    mimeType: "image/png",
    buffer: await image(20, 230),
  });
  await expect(
    page.getByRole("button", { name: "Select second.png" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  const replacement = page.locator(".artboard g[data-layer-id] image").last();
  const replacementSrc = await replacement.getAttribute("href");
  expect(replacementSrc).not.toBe(src);
  expect(
    await replacement.evaluate((node) => ({
      x: node.getAttribute("x"),
      y: node.getAttribute("y"),
      width: node.getAttribute("width"),
      height: node.getAttribute("height"),
    })),
  ).toEqual(box);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Select second.png" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page.getByRole("button", { name: "Save editable file" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  const backup = JSON.parse(
    await readFile((await (await downloaded).path())!, "utf8"),
  );
  expect(backup.compatibility.project.graphicLayers[0]).toMatchObject({
    name: "second.png",
    src: replacementSrc,
  });
});
