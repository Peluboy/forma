import { test, expect } from "@playwright/test";
import { tmpdir } from "node:os";

test("dashboard searches saved designs, opens the selected project and creates a template", async ({
  page,
}) => {
  await page.goto("/editor");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("First saved design");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Use Slow mornings template", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Second saved design");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  expect(
    await page
      .getByRole("button", { name: "New design" })
      .evaluate((button) => getComputedStyle(button).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await expect(page.getByRole("link", { name: /^Open / })).toHaveCount(2);
  await page.getByRole("textbox", { name: "Search designs" }).fill("First");
  await expect(page.getByRole("link", { name: /^Open / })).toHaveCount(1);
  await page
    .getByRole("link", { name: "Open First saved design", exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
    "First saved design",
  );
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /^Open / })).toHaveCount(2);
  await page.screenshot({
    path: `${tmpdir()}/forma-dashboard-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".dashboard-sidebar")).toHaveCSS(
    "position",
    "static",
  );
  expect(
    (await page.locator(".dashboard-sidebar").boundingBox())?.height,
  ).toBeLessThan(180);
  await expect(
    page.getByRole("button", { name: /Use a reference/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `${tmpdir()}/forma-dashboard-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("textbox", { name: "Search designs" }).fill("missing");
  await expect(
    page.getByRole("heading", { name: "No matching designs" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("link", { name: /^Open / })).toHaveCount(2);
  await page.goto("/editor?project=missing");
  await expect(
    page.getByText(
      "This design is unavailable. Return to My designs to choose another.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("forma.projects.v1") || "[]").length,
    ),
  ).toBe(2);
});

test("dashboard handles account storage failure and loads only account designs", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "dashboard-user",
          name: "Test Designer",
          email: "test@example.test",
        },
        csrfToken: null,
      },
    }),
  );
  let fail = true;
  await page.route("**/api/projects", (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: { error: "Storage unavailable" } }
        : { json: { projects: [] } },
    ),
  );
  await page.goto("/dashboard");
  await expect(page.getByRole("alert")).toContainText("Storage unavailable");
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your first design" }),
  ).toBeVisible();
  await expect(
    page.getByText("Start from a template or upload a reference image."),
  ).toBeVisible();
});

test("a saved flyer template creates a new exact-copy job from the dashboard", async ({
  page,
}) => {
  await page.goto("/editor");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Agency flyer");
  await page.evaluate(() => {
    localStorage.setItem(
      "forma.brand.v2",
      JSON.stringify({
        id: "brand-client-a",
        version: 1,
        name: "Client A",
        colors: { text: "#123456", background: "#eeeeee", accent: "#ff6600" },
        fonts: { display: "Georgia", body: "Arial" },
        palette: [],
        spacingNote: "",
        updatedAt: new Date().toISOString(),
      }),
    );
  });
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Save current design as a template" })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: /Agency flyer.*Use with new copy/s })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: `${tmpdir()}/forma-template-job-dialog.png`,
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Manuscript" })
    .fill(
      "Headline: A launch for everyone\n\nBody copy: Every word stays. €25 & 10%.",
    );
  await page.getByRole("radio", { name: /Fit the content/ }).check();
  await page.getByRole("checkbox", { name: /Apply Client A/ }).check();
  await page.getByRole("button", { name: "Create design" }).click();
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
    "Agency flyer design",
  );
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Content", exact: true })
    .click();
  await expect(
    page.getByRole("complementary").getByRole("textbox", { name: "Headline" }),
  ).toHaveValue("A launch for everyone");
  await expect(
    page.getByRole("complementary").getByRole("textbox", { name: "Body copy" }),
  ).toHaveValue("Every word stays. €25 & 10%.");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("forma.projects.v1")?.includes("brand-client-a"),
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `${tmpdir()}/forma-template-job-result.png`,
    fullPage: true,
  });
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: /Agency flyer.*Use with new copy/s }),
  ).toBeVisible();
});
