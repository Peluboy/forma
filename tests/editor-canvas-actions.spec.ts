import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("canvas text, colors, context actions and floating layers work together", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.locator('.artboard [data-field-id="title"]').dblclick();
  const editor = page.getByRole("textbox", { name: "Edit text on canvas" });
  await expect(editor).toBeVisible();
  await editor.fill("A directly edited headline");
  await editor.press("ControlOrMeta+Enter");
  await expect(
    page.locator('.artboard [data-field-id="title"] text'),
  ).toHaveAttribute("aria-label", "A directly edited headline");
  if (await page.getByRole("button", { name: "Show content panel" }).count())
    await page.getByRole("button", { name: "Show content panel" }).click();
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toContainText("A directly edited headline");
  await page.getByRole("button", { name: "Hide content panel" }).click();

  await page.locator('.artboard [data-field-id="title"]').click();
  await page.getByRole("button", { name: "Colors", exact: true }).click();
  await page.getByLabel("Change all matching colors").check();
  await page.getByRole("button", { name: "Use brand color #e9783d" }).click();
  await expect(
    page.locator('.artboard [data-field-id="title"] text'),
  ).toHaveAttribute("fill", "#e9783d");
  await expect(
    page.locator('.artboard [data-field-id="description"] text'),
  ).toHaveAttribute("fill", "#e9783d");

  await page
    .locator('.artboard [data-field-id="title"]')
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Copy", exact: true }).click();
  await page.getByRole("button", { name: "Page actions" }).click();
  await page.getByRole("menuitem", { name: "Paste", exact: true }).click();
  await expect(page.locator(".artboard [data-layer-id]")).toHaveCount(1);
  await page.getByRole("button", { name: "Show layers" }).click();
  const layers = page.getByRole("complementary", { name: "Layers" });
  await expect(layers.getByText("Manuscript fields")).toBeVisible();
  await page.screenshot({
    path: "/private/tmp/forma-canvas-layers.png",
    fullPage: true,
  });
  await layers.getByRole("button", { name: "Hide Headline" }).click();
  await expect(page.locator('.artboard [data-field-id="title"]')).toHaveCount(
    0,
  );
  await layers.getByRole("button", { name: "Show Headline" }).click();
  await expect(page.locator('.artboard [data-field-id="title"]')).toHaveCount(
    1,
  );
  await layers.getByRole("button", { name: "Close layers" }).click();
});

test("uploaded photos snap into resizable crop-to-fill frames", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page.getByRole("button", { name: "Add rounded photo frame" }).click();
  const png = await sharp({
    create: { width: 160, height: 90, channels: 4, background: "#2d89a0" },
  })
    .png()
    .toBuffer();
  await page.getByLabel("Upload layer image").setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: png,
  });
  const image = page.getByRole("button", { name: "Select portrait.png" });
  await expect(image).toBeVisible();
  const box = await image.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 + 24,
    box!.y + box!.height / 2 + 24,
    { steps: 4 },
  );
  await page.mouse.up();
  await expect(page.locator(".artboard [data-layer-id]")).toHaveCount(1);
  await expect(
    page.locator(
      '.artboard [data-layer-id] image[preserveAspectRatio="xMidYMid slice"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Select portrait.png" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "/private/tmp/forma-photo-frame.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.locator(
      '.artboard [data-layer-id] image[preserveAspectRatio="xMidYMid slice"]',
    ),
  ).toHaveCount(1);
});

test("slide page actions duplicate, add and hide slides", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page
    .locator(".design-formats")
    .getByRole("button", { name: "Slides", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create slides from Content" })
    .click();
  await expect(
    page.getByRole("button", { name: "Open slide 1" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Page actions" }).click();
  await page.getByRole("menuitem", { name: "Duplicate slide" }).click();
  await expect(
    page.getByRole("button", { name: "Open slide 2" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Page actions" }).click();
  await page.getByRole("menuitem", { name: "Hide page" }).click();
  await expect(page.getByText("hidden from export")).toBeVisible();
  await page.getByRole("button", { name: "Page actions" }).click();
  await page.getByRole("menuitem", { name: "Show page" }).click();
  await page.getByRole("button", { name: "Page actions" }).click();
  await page.getByRole("menuitem", { name: "Add slide" }).click();
  await expect(
    page.getByRole("button", { name: "Open slide 3" }),
  ).toBeVisible();
});
