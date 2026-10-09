import { test, expect } from "@playwright/test";
test("onboarding, review, library, export and command search", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Display name").fill("Anoop");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Daily focus capacity").fill("50");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Begin my journey" }).click();
  await expect(page.getByRole("heading", { name: /Anoop/ })).toBeVisible();
  await page.getByRole("link", { name: "Weekly review", exact: true }).click();
  await page
    .getByLabel("What did you complete this week?")
    .fill("My first program.");
  await page
    .getByLabel("One concrete next-week goal")
    .fill("Practice five loop problems");
  await page.getByRole("button", { name: "Save reflection" }).click();
  await page.getByRole("button", { name: "Plan next week’s goal" }).click();
  await page.getByRole("link", { name: "Today’s plan", exact: true }).click();
  await expect(
    page
      .locator(".custom-task")
      .getByText("Practice five loop problems", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await page.getByLabel("Search", { exact: true }).fill("CS50");
  await expect(page.locator(".resource-card")).toHaveCount(1);
  await page.getByRole("button", { name: /^Favorite / }).click();
  await page.getByLabel("Favorites only").check();
  await expect(page.locator(".resource-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my progress" }).click();
  expect((await download).suggestedFilename()).toBe("atlas-backup-v1.json");
  await page.keyboard.press("Control+k");
  await page
    .getByPlaceholder("Python, retrieval, projects…")
    .fill("linear regression");
  await page.getByRole("button", { name: /Week 14/ }).click();
  await expect(
    page.getByRole("heading", { name: "Linear regression", exact: true }),
  ).toBeVisible();
});
test("two tabs share one paused timer", async ({ page, context }) => {
  await page.goto("/focus");
  await page.getByRole("button", { name: "Begin focus" }).click();
  const other = await context.newPage();
  await other.goto("/focus");
  await expect(
    other.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await other.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await expect(
    other.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
});
test("mobile menu and light theme remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good sources. Less searching." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
