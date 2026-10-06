import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("a normal manuscript creates readable slides that can be edited and exported", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Headline", exact: true }).click();
  await expect(page.locator(".floating-tools")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Design tools" })
    .getByRole("button", { name: "Slides", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create slides from Content" })
    .click();
  await expect(page.locator(".floating-tools")).toHaveCount(0);
  await expect(page.locator(".canvas-footer .page-count")).toHaveText(
    "Slide 1 of 1",
  );
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const projects = JSON.parse(
          localStorage.getItem("forma.projects.v1") || "[]",
        );
        return projects.filter(
          (record: {
            family?: string;
            compatibility?: { project?: { family?: string } };
          }) =>
            (record.compatibility?.project || record).family === "presentation",
        ).length;
      }),
    )
    .toBe(1);
  const families = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("forma.projects.v1") || "[]").map(
      (record: {
        family?: string;
        compatibility?: { project?: { family?: string } };
      }) => (record.compatibility?.project || record).family || "graphic",
    ),
  );
  expect(families).toContain("graphic");
  expect(families).toContain("presentation");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator(".saved-project")
    .filter({ hasText: "The creative gathering" })
    .filter({ hasNotText: "slides" })
    .click();
  await expect(page.locator(".canvas-footer .page-count")).toHaveText(
    "Page 1 of 1",
  );
  await page
    .locator(".saved-project")
    .filter({ hasText: "The creative gathering slides" })
    .click();
  await expect(page.locator(".canvas-footer .page-count")).toHaveText(
    "Slide 1 of 1",
  );
  await page
    .getByRole("navigation", { name: "Design tools" })
    .getByRole("button", { name: "Slides", exact: true })
    .click();
  const slide = page.locator(".canvas-stage svg[role=img]").first();
  await expect(slide).toBeVisible();
  const headingBounds = await slide
    .locator("text")
    .first()
    .evaluate((node) => {
      const box = (node as SVGGraphicsElement).getBBox();
      return { x: box.x, width: box.width };
    });
  expect(headingBounds.x).toBeGreaterThanOrEqual(0);
  expect(headingBounds.x + headingBounds.width).toBeLessThanOrEqual(960);
  await expect(page.getByLabel("Slide title")).toHaveValue(
    "Good things\ntake shape.",
  );
  await expect(page.getByLabel("Slide text")).toHaveValue(
    /COME CURIOUS. LEAVE INSPIRED./,
  );
  await page.getByRole("button", { name: "Add slide" }).click();
  await expect(page.getByLabel("Slide title")).toHaveValue("");
  await page.getByLabel("Slide title").fill("Approved update");
  await page
    .getByLabel("Slide text")
    .fill("This exact sentence belongs on slide two.");
  await page.getByText("Speaker notes", { exact: true }).click();
  await page.getByLabel("Speaker notes").fill("Presenter reminder.");
  await expect(page.locator(".canvas-stage")).toContainText(
    "This exact sentence belongs on slide two.",
  );
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page
    .getByRole("button", { name: "Update slides from Content" })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Update slides from Content?",
  });
  await expect(confirm).toBeVisible();
  expect(
    await confirm.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).not.toBe("rgb(255, 255, 255)");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Slide title")).toHaveValue("Approved update");
  await page.reload();
  await expect(page.getByLabel("Slide title")).toHaveValue("Approved update");
  await expect(page.getByLabel("Speaker notes")).toHaveValue(
    "Presenter reminder.",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("json");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download design" }).click();
  const backup = JSON.parse(
    await readFile((await (await downloaded).path())!, "utf8"),
  );
  expect(backup.compatibility.project.presentation.slides).toHaveLength(2);
  expect(backup.compatibility.project.presentation.slides[1]).toMatchObject({
    title: "Approved update",
    body: "This exact sentence belongs on slide two.",
    notes: "Presenter reminder.",
  });
});
