import { test, expect } from "@playwright/test";

test("Gemini is selectable and analysis never replaces or transmits manuscript copy", async ({
  page,
}) => {
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        user: {
          id: "provider-test",
          email: "test@example.test",
          name: "Provider tester",
        },
        csrfToken: null,
        capabilities: { analysis: { local: true, openai: true, gemini: true } },
      },
    }),
  );
  await page.route("**/api/projects", (r) =>
    r.fulfill({ json: { projects: [] } }),
  );
  await page.route("**/api/projects/*", (r) => {
    const b = r.request().postDataJSON();
    return r.fulfill({
      json: { project: b.project, version: (b.expectedVersion || 0) + 1 },
    });
  });
  const requested: string[] = [];
  let unavailable = false;
  await page.route("**/api/reference/analyze", (r) => {
    const b = r.request().postDataJSON();
    expect(Object.keys(b).sort()).toEqual(["image", "provider"]);
    requested.push(b.provider);
    if (unavailable)
      return r.fulfill({
        status: 503,
        json: {
          error:
            "Gemini is temporarily unavailable. Choose another provider or map text areas manually.",
        },
      });
    return r.fulfill({
      json: {
        provider: b.provider,
        warnings: [],
        regions: [
          {
            id: "r1",
            text: "Original reference words",
            confidence: 0.95,
            box: { x: 30, y: 100, width: 650, height: 120 },
            fontSize: 48,
            fontFamily: "Arial",
            textColor: "#111111",
            coverColor: "#ffffff",
            field: "title",
          },
        ],
      },
    });
  });
  await page.goto("/editor");
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 900;
    const x = c.getContext("2d")!;
    x.fillStyle = "white";
    x.fillRect(0, 0, 720, 900);
    return c.toDataURL().split(",")[1];
  });
  await page
    .locator('input[type=file][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await expect(page.getByLabel("Analysis provider")).toHaveValue("gemini");
  await expect(
    page.getByText(/Google’s free tier may use submitted content/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show content panel", exact: true })
    .click();
  const manuscript = "Headline: My exact approved words.";
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill(manuscript);
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  await page
    .getByRole("button", { name: "Detect text areas", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Your reference, understood." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Use 1 mapped text area/ }).click();
  await page
    .getByRole("button", { name: "Show content panel", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toHaveValue(manuscript);
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  await page.getByLabel("Analysis provider").selectOption("openai");
  await page
    .getByRole("button", { name: "Detect text areas", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Your reference, understood." }),
  ).toBeVisible();
  expect(requested).toEqual(["gemini", "openai"]);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  unavailable = true;
  await page.getByLabel("Analysis provider").selectOption("gemini");
  await page
    .getByRole("button", { name: "Detect text areas", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Gemini is temporarily unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Detect text areas", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Mark headline area", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Show content panel", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toHaveValue(manuscript);
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  unavailable = false;
  await page.getByLabel("Analysis provider").selectOption("openai");
  await page
    .getByRole("button", { name: "Detect text areas", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Your reference, understood." }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(requested).toEqual(["gemini", "openai", "gemini", "openai"]);
});
