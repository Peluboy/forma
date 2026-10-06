import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

test("additional wording survives manuscript application and overflow explains recovery", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("Keep my extra wording");
  await page
    .getByRole("button", { name: "Show content panel", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: Updated headline");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Select text: Keep my extra wording" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("Every word must stay. ".repeat(150));
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page
    .getByRole("button", { name: "Save editable file", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("png");
  await expect(page.getByRole("dialog")).toContainText(
    "This text needs more room.",
  );
  await expect(
    page.getByRole("button", { name: "Download design", exact: true }),
  ).toBeDisabled();
  await page.getByRole("dialog").getByRole("combobox").selectOption("json");
  await expect(
    page.getByRole("button", { name: "Download design", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("Keep my extra wording");
  await page.screenshot({
    path: `${tmpdir()}/forma-text-layers-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await expect(
    page.getByRole("textbox", { name: "Text", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${tmpdir()}/forma-text-layers-mobile.png`,
    fullPage: true,
  });
});

test("additional text edits, moves, undoes, persists and exports without editor controls", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const wording = page.getByRole("textbox", {
    name: "Text",
    exact: true,
  });
  await wording.fill("Approved extra wording — 2026");
  const layer = page.getByRole("button", {
    name: "Select text: Approved extra wording — 2026",
  });
  await expect(layer).toBeVisible();
  await layer.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByText("Position and size", { exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "x", exact: true }),
  ).toHaveValue("61");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "x", exact: true }),
  ).toHaveValue("60");
  await page
    .locator(".selection-inspector")
    .getByRole("button", { name: "Lock", exact: true })
    .click();
  await expect(wording).toBeDisabled();
  await layer.focus();
  await page.keyboard.press("Delete");
  await expect(layer).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(layer).toBeVisible();
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
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Select text: Approved extra wording — 2026",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page
    .getByRole("button", { name: "Save editable file", exact: true })
    .click();
  let downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download design", exact: true })
    .click();
  const backup = JSON.parse(
    await readFile((await (await downloaded).path())!, "utf8"),
  );
  expect(backup.schemaVersion).toBe(3);
  expect(backup.content.at(-1).text).toBe("Approved extra wording — 2026");
  await page.reload();
  await page.locator('input[type="file"][accept=".json"]').setInputFiles({
    name: "layers.forma.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("button", {
      name: "Select text: Approved extra wording — 2026",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page
    .getByRole("button", { name: "Save editable file", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("svg");
  downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download design", exact: true })
    .click();
  const svg = await readFile((await (await downloaded).path())!, "utf8");
  expect(svg).toContain("Approved extra wording");
  expect(svg).not.toContain("tabindex");
  await page.reload();
  await page
    .getByRole("button", { name: "Select text: Approved extra wording — 2026" })
    .click();
  await page
    .getByRole("button", { name: "Open text panel", exact: true })
    .click();
  await page
    .locator(".selection-inspector")
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Select text: Approved extra wording — 2026",
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Select text: Approved extra wording — 2026",
    }),
  ).toBeVisible();
});
