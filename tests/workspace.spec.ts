import { tmpdir } from "node:os";
import { test, expect, type Page } from "@playwright/test";

async function openContent(page: Page) {
  await expect(page.locator(".artboard")).toBeVisible();
  if (
    !(await page
      .getByRole("textbox", { name: "Content", exact: true })
      .isVisible())
  ) {
    const show = page.getByRole("button", { name: "Show content panel" });
    if (await show.isVisible()) await show.click();
    else
      await page.getByRole("button", { name: "Content", exact: true }).click();
  }
}

async function openDesign(page: Page) {
  if (!(await page.getByPlaceholder("Search templates").isVisible()))
    await page.getByRole("button", { name: "Design", exact: true }).click();
}
test("manuscript revisions preserve copy, survive reload, undo, and export", async ({
  page,
}) => {
  await page.goto("/editor");
  await openContent(page);
  await expect(page.getByRole("heading", { name: "Content" })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill(
      "Headline: Exact words.\n\nBody copy: Tickets cost $25 — no extra copy.\n\nFooter: Call 555-0100.",
    );
  await page.getByRole("button", { name: /Review changes/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tickets cost $25 — no extra copy.",
  );
  await page.getByRole("button", { name: /Apply \d+ changes/ }).click();
  await expect(page.locator(".artboard")).toContainText("Exact words.");
  await expect(page.locator(".artboard")).toContainText("Call 555-0100.");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".artboard")).toContainText("Good things");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".artboard")).toContainText("Exact words.");
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator(".artboard")).toContainText("Exact words.");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await download.saveAs(`${tmpdir()}/forma-export-test.png`);
});
test("template filtering and switching keep manuscript intact", async ({
  page,
}) => {
  await page.goto("/editor");
  await openDesign(page);
  await page.getByPlaceholder("Search templates").fill("slow");
  await expect(
    page.getByRole("button", { name: "Use Slow mornings template" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use Slow mornings template" })
    .click();
  await expect(page.locator(".artboard")).toContainText("Good things");
  await page.getByPlaceholder("Search templates").fill("not-a-template");
  await expect(page.getByText("No matching templates")).toBeVisible();
});
test("overflow blocks export and can be reviewed without lost words", async ({
  page,
}) => {
  await page.goto("/editor");
  await openContent(page);
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: " + "Every word is important. ".repeat(100));
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download design" }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText(
    "Headline needs more room",
  );
});
test("reference upload supports comparison and manuscript upload reads files", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  await page
    .locator('input[type=file][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6z0sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(
    page.getByAltText("Original reference for comparison"),
  ).toBeVisible();
  await page
    .locator('input[type=file][accept=".txt,.md,.docx,.pdf"]')
    .setInputFiles({
      name: "new-copy.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Headline: Uploaded exactly.\n\nBody copy: From the manuscript.",
      ),
    });
  await openContent(page);
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toHaveValue(
    "Headline: Uploaded exactly.\n\nBody copy: From the manuscript.",
  );
});
test("desktop workspace has no horizontal overflow and renders cleanly", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${tmpdir()}/forma-desktop.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("plans show unpublished pricing honestly and work on mobile", async ({
  page,
}) => {
  await page.goto("/pricing");
  await expect(
    page.getByRole("heading", { name: "More room for good ideas." }),
  ).toBeVisible();
  await expect(
    page.getByText("Free beta is open.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upgrade to Pro" }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Pro", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Create a free account" }).click();
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
});
test("guided reference editing replaces a marked area and preserves the image outside it", async ({
  page,
}) => {
  await page.goto("/editor");
  const reference = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 900;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#f1dec7";
    ctx.fillRect(0, 0, 720, 900);
    ctx.fillStyle = "#b34435";
    ctx.fillRect(470, 500, 120, 120);
    ctx.fillStyle = "#252525";
    ctx.font = "60px Arial";
    ctx.fillText("OLD HEADLINE", 70, 200);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  await page
    .locator('input[type=file][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "poster.png",
      mimeType: "image/png",
      buffer: Buffer.from(reference, "base64"),
    });
  await page.getByRole("button", { name: "Use reference as canvas" }).click();
  await openContent(page);
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: NEW COPY");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  const box = await page.locator(".artboard svg").boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(
    box!.x + (50 * box!.width) / 720,
    box!.y + (110 * box!.height) / 900,
  );
  await page.mouse.down();
  await page.mouse.move(
    box!.x + (650 * box!.width) / 720,
    box!.y + (300 * box!.height) / 900,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.locator(".artboard")).toContainText("NEW COPY");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const stored = JSON.parse(
          localStorage.getItem("forma.projects.v1") || "[]",
        )[0];
        return (stored?.compatibility?.project ?? stored)?.mappedFields || [];
      }),
    )
    .toContain("title");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  await (await downloaded).saveAs(`${tmpdir()}/forma-reference-export.png`);
  const pixel = await page.evaluate(async () => {
    const node = document.getElementById("export-svg")!;
    const xml = new XMLSerializer().serializeToString(node);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
      image.src = url;
    });
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 900;
    c.getContext("2d")!.drawImage(image, 0, 0, 720, 900);
    const p = [...c.getContext("2d")!.getImageData(500, 550, 1, 1).data];
    URL.revokeObjectURL(url);
    return p;
  });
  expect(pixel).toEqual([179, 68, 53, 255]);
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page
    .getByRole("button", { name: "Use Slow mornings template" })
    .click();
  await expect(
    page.locator('.artboard text[aria-label="NEW COPY"]'),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const stored = JSON.parse(
          localStorage.getItem("forma.projects.v1") || "[]",
        )[0];
        const project = stored?.compatibility?.project ?? stored;
        return (
          project && {
            mode: project.designMode,
            x: project.layouts.title.x,
            y: project.layouts.title.y,
            mapped: project.mappedFields,
          }
        );
      }),
    )
    .toEqual({ mode: "template", x: 50, y: 124, mapped: [] });
});
test("mobile panels can be opened and dismissed without trapping the canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor");
  await expect(page.locator(".artboard")).toBeVisible();
  await openDesign(page);
  await expect(page.getByRole("heading", { name: "Design" })).toBeVisible();
  await page.getByRole("button", { name: "Close library" }).click();
  await openContent(page);
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close content panel" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${tmpdir()}/forma-mobile.png`,
    fullPage: true,
  });
});
