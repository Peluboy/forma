import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

test("shapes and images stack with text, persist, reopen and export", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("Text above the shape");
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page
    .getByRole("button", { name: "Add rectangle", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send backward", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Send backward", exact: true }),
  ).toBeDisabled();
  const rect = page.getByRole("button", {
    name: "Select Rectangle",
    exact: true,
  });
  await rect.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByText("Position and size", { exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "x", exact: true }),
  ).toHaveValue("221");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "x", exact: true }),
  ).toHaveValue("220");
  await page
    .locator(".selection-inspector")
    .getByRole("button", { name: "Lock", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bring forward", exact: true }),
  ).toHaveCount(0);
  await rect.focus();
  await page.keyboard.press("Delete");
  await expect(rect).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(rect).toBeVisible();
  const removeButtons = page.getByRole("button", {
    name: "Remove",
    exact: true,
  });
  await expect(removeButtons).toHaveCount(2);
  for (const button of await removeButtons.all())
    await expect(button).toBeDisabled();
  await page
    .locator(".selection-inspector")
    .getByRole("button", { name: "Unlock", exact: true })
    .click();
  await page.getByRole("button", { name: "Add ellipse", exact: true }).click();
  const png = await sharp({
    create: {
      width: 100,
      height: 60,
      channels: 4,
      background: { r: 20, g: 120, b: 180, alpha: 0.7 },
    },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload layer image")
    .setInputFiles({ name: "my-logo.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByRole("button", { name: "Select my-logo.png", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${tmpdir()}/forma-elements-desktop.png`,
    fullPage: true,
  });
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Select my-logo.png", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page
    .getByRole("button", { name: "Save editable file", exact: true })
    .click();
  let downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download design", exact: true })
    .click();
  const backup = JSON.parse(
    await readFile((await (await downloading).path())!, "utf8"),
  );
  expect(backup.schemaVersion).toBe(3);
  expect(backup.compatibility.project.graphicLayers).toHaveLength(3);
  expect(
    backup.pages[0].elements.slice(-4).map((l: { type: string }) => l.type),
  ).toEqual(["shape", "text", "shape", "image"]);
  await page.reload();
  await page.locator('input[type="file"][accept=".json"]').setInputFiles({
    name: "elements.forma.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("button", { name: "Select my-logo.png", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page
    .getByRole("button", { name: "Save editable file", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("svg");
  downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download design", exact: true })
    .click();
  const svg = await readFile((await (await downloading).path())!, "utf8");
  expect(svg).toContain("data:image/webp;base64,");
  expect(svg).toContain("<ellipse");
  expect(svg).not.toContain("tabindex");
  expect(svg).toContain('fill="#0f766e"');
  expect(svg).toContain("Text above the shape");
  expect(svg.indexOf('fill="#0f766e"')).toBeLessThan(
    svg.indexOf("Text above the shape"),
  );
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page
    .getByRole("button", { name: "Save editable file", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("png");
  downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download design", exact: true })
    .click();
  const pngExport = await readFile((await (await downloading).path())!);
  const metadata = await sharp(pngExport).metadata();
  expect(metadata.width).toBe(1080);
  expect(metadata.height).toBe(1350);
  await page.reload();
  await page
    .getByRole("button", { name: "Select my-logo.png", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open elements panel", exact: true })
    .click();
  await page
    .locator(".selection-inspector")
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Select my-logo.png", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Select my-logo.png", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole("listitem").filter({ hasText: "my-logo.png" }).click();
  await expect(
    page.getByRole("textbox", { name: "Element name", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${tmpdir()}/forma-elements-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("unsupported image files explain recovery without adding a layer", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page.getByLabel("Upload layer image").setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Choose a PNG, JPEG or WebP",
  );
  await expect(
    page.getByRole("button", { name: "Upload image", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Select bad.svg", exact: true }),
  ).toHaveCount(0);
});
