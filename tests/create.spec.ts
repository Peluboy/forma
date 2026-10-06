import { test, expect } from "@playwright/test";

const concepts = [
  {
    name: "Editorial",
    rationale: "Large title and open space.",
    template: "editorial",
    composition: "editorial",
    colors: { background: "#ffffff", text: "#111111", accent: "#cc4422" },
    fonts: { display: "Playfair Display", body: "Inter" },
  },
  {
    name: "Centered",
    rationale: "Focused and calm.",
    template: "botanical",
    composition: "centered",
    colors: { background: "#f4f4e8", text: "#112211", accent: "#446633" },
    fonts: { display: "Lora", body: "Inter" },
  },
  {
    name: "Split",
    rationale: "Strong contrast.",
    template: "electric",
    composition: "split",
    colors: { background: "#121224", text: "#ffffff", accent: "#ffbb22" },
    fonts: { display: "Space Grotesk", body: "DM Sans" },
  },
];

test("AI creation supports graphics, documents and slides with exact source copy", async ({
  page,
}) => {
  const requests: Array<{ family: string; manuscript: string }> = [];
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "creative-test-user",
          name: "Creative Tester",
          email: "creative@example.test",
        },
        csrfToken: "test",
      },
    }),
  );
  await page.route("**/api/brand", (route) =>
    route.fulfill({ status: 503, json: { error: "No brand" } }),
  );
  await page.route("**/api/projects**", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { projects: [] } });
    const body = route.request().postDataJSON();
    return route.fulfill({ json: { project: body.project, version: 1 } });
  });
  await page.route("**/api/design/concepts", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { concepts } });
  });
  for (const [label, family] of [
    ["Graphics", "graphics"],
    ["Documents", "document"],
    ["Slides", "presentation"],
  ] as const) {
    await page.goto("/create");
    await page.getByRole("radio", { name: new RegExp(label) }).check();
    if (family === "document") {
      await page
        .getByRole("combobox", { name: "Document Workflow" })
        .selectOption({ label: "Standard Article / Document" });
    }
    const copy = `Exact ${family} copy: ₦12,500 — 18% growth.`;
    await page.getByRole("textbox", { name: "Approved manuscript" }).fill(copy);
    await page.getByRole("button", { name: "Create three directions" }).click();
    await expect(
      page.getByRole("heading", { name: "Editorial" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open and review" }),
    ).toHaveCount(3);
    if (family === "graphics") {
      await page.screenshot({
        path: "/tmp/forma-create-directions.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: "/tmp/forma-create-mobile.png",
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await page.getByRole("button", { name: "Open and review" }).first().click();
    await expect(page).toHaveURL(/\/editor$/);
    await expect(
      page.getByRole("textbox", { name: "Project name" }),
    ).toHaveValue("Editorial");
    await page
      .getByRole("button", { name: "Content", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("textbox", { name: "Content", exact: true }),
    ).toHaveValue(copy);
  }
  expect(requests.map((request) => request.family)).toEqual([
    "graphics",
    "document",
    "presentation",
  ]);
  expect(
    requests.every((request) => request.manuscript.includes("₦12,500")),
  ).toBe(true);
});

test("guest copy survives the sign-in gate before AI generation", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { user: null, csrfToken: null } }),
  );
  await page.goto("/create");
  await page
    .getByRole("textbox", { name: "Approved manuscript" })
    .fill("Exact guest copy.");
  await page.getByRole("button", { name: "Sign in to create" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcreate$/);
  await page.goto("/create");
  await expect(
    page.getByRole("textbox", { name: "Approved manuscript" }),
  ).toHaveValue("Exact guest copy.");
});

test("report workflow shows a valid editable draft with exact copy", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "report-test-user",
          name: "Report Tester",
          email: "report@example.test",
        },
        csrfToken: "test",
      },
    }),
  );
  await page.route("**/api/brand", (route) =>
    route.fulfill({ status: 503, json: { error: "No brand" } }),
  );
  await page.route("**/api/projects**", (route) =>
    route.fulfill({ json: { projects: [] } }),
  );
  await page.goto("/create");
  await page.getByRole("radio", { name: /Documents/ }).check();
  await page
    .getByRole("textbox", { name: "Approved manuscript" })
    .fill("# Approved Report\n\nExact revenue is $12,500 and growth is 18%.");
  await page.getByRole("button", { name: "Generate Branded Report" }).click();
  await expect(
    page.getByRole("heading", { name: "Report Generation Complete" }),
  ).toBeVisible();
  await expect(page.getByText("100% Conforming")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open in Editor" }),
  ).toBeVisible();
});
