import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

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

test("public pages have real navigation, pricing and mobile layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".site-header .site-logo")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A design you love.",
  );
  await page.screenshot({ path: `${tmpdir()}/forma-home-overhaul.png` });
  await page
    .getByRole("link", { name: "Try the editor", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.locator(".artboard")).toBeVisible();
  for (const path of [
    "/",
    "/templates",
    "/pricing",
    "/help",
    "/login",
    "/signup",
    "/forgot-password",
    "/onboarding",
    "/does-not-exist",
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    if (path === "/login" || path === "/onboarding")
      await page.screenshot({
        path: `${tmpdir()}/forma-${path.slice(1)}-mobile-overhaul.png`,
      });
  }
  await expect(
    page.getByRole("heading", { name: "This page isn’t in the picture." }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Pricing", exact: true })
    .click();
  await expect(
    page.getByText("Free beta is open.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upgrade to Pro" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("template discovery hands off to a fresh guided editor and preserves previous projects", async ({
  page,
}) => {
  await page.goto("/editor");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Existing browser project");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.goto("/templates");
  await page.getByRole("button", { name: "Lifestyle", exact: true }).click();
  await expect(page.locator(".public-template-grid a")).toHaveCount(1);
  await page.getByRole("link", { name: /Slow mornings/ }).click();
  await page.getByRole("button", { name: "Next, your starting point" }).click();
  await expect(
    page.getByRole("button", { name: "Slow mornings", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Open my workspace" }).click();
  await expect(page.locator(".starter-guide")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("forma.projects.v1") || "[]")[0]
            ?.compatibility?.project?.template,
      ),
    )
    .toBe("botanical");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    page.getByText("Existing browser project", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Dismiss quick-start checklist" })
    .click();
  await page.reload();
  await expect(page.locator(".starter-guide")).toHaveCount(0);
});

test("signup, onboarding, profile, security, export and account deletion work end to end", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Your name", { exact: true }).fill("Maya Designer");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(`public-${Date.now()}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("public-test-password-123");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Save your recovery code." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I have saved my code" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("button", { name: /My business or brand/ }).click();
  await page.getByRole("button", { name: "Next, your starting point" }).click();
  await page.getByRole("button", { name: /Use my own reference/ }).click();
  await page.getByRole("button", { name: "Open my workspace" }).click();
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
    "My reference design",
  );
  await expect(
    page.getByText("Saved to your account", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open account", exact: true }).click();
  await page
    .getByRole("button", { name: "Account settings", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByLabel("I use Forma for")).toHaveValue("business");
  await page.getByLabel("Display name", { exact: true }).fill("Maya Studio");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your profile has been updated.",
  );
  await page.reload();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Maya Studio",
  );
  await page.screenshot({
    path: `${tmpdir()}/forma-account-settings.png`,
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page.screenshot({
    path: `${tmpdir()}/forma-account-settings-dark.png`,
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("radio", { name: "Light", exact: true }).click();
  await page.getByRole("button", { name: "Security", exact: true }).click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("public-test-password-123");
  await page
    .getByLabel("New password", { exact: true })
    .fill("replacement-password-456");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("different-password-789");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("replacement-password-456");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Password updated.");
  await page.getByRole("button", { name: "Sign out other sessions" }).click();
  await expect(page.getByRole("status")).toContainText(
    "This browser stays signed in.",
  );
  await page
    .getByRole("button", { name: "Data & privacy", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workspace data" }).click();
  const download = await downloading;
  const data = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(data.user.name).toBe("Maya Studio");
  expect(
    data.projects.some((p: any) => p.data.name === "My reference design"),
  ).toBe(true);
  expect(data.preferences.start).toBe("reference");
  expect(JSON.stringify(data)).not.toContain("replacement-password-456");
  await page
    .getByRole("button", { name: "Delete my account", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Permanently delete account" }),
  ).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page
    .getByRole("button", { name: "Permanently delete account" })
    .click();
  await expect(page).toHaveURL(/account=deleted/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("guest draft transfer is explicit and saving settings does not discard an unapplied manuscript", async ({
  page,
}) => {
  await page.goto("/editor");
  await openContent(page);
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: A personal first draft.");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Next, your starting point" }).click();
  await page.getByRole("button", { name: /Continue my browser draft/ }).click();
  await page.getByRole("button", { name: "Open my workspace" }).click();
  await openContent(page);
  await expect(
    page.locator('.artboard text[aria-label="A personal first draft."]'),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Content", exact: true })
    .fill("Headline: Not applied yet.");
  await page.getByRole("button", { name: "Back to projects" }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(
    page.getByText("Apply your manuscript changes before leaving the editor.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("expired auth callback and account protection give a useful next step", async ({
  page,
}) => {
  await page.goto("/account?tab=security");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto(
    "/auth/callback#error=access_denied&error_description=expired",
  );
  await expect(page.getByRole("alert")).toContainText("expired or invalid");
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
