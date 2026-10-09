import { test, expect } from "@playwright/test";
test("preview roadmap, learning, task, quiz, projects, career and theme", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Good/ })).toBeVisible();
  await expect(page.getByText("Exploration mode")).toBeVisible();
  await page.goto("/academy");
  await expect(page.locator(".week-card")).toHaveCount(52);
  await page.goto("/academy/restart/1");
  await expect(
    page.getByRole("heading", { name: "Your first Python program" }),
  ).toBeVisible();
  await page
    .getByLabel("What did you build, test, and learn?")
    .fill("Ran hello.py twice and explained input.");
  await page.getByRole("button", { name: "Save my work" }).click();
  for (const c of await page.locator("input[type=checkbox]").all())
    await c.check();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await expect(
    page.getByRole("button", { name: "Reopen lesson" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Today’s plan", exact: true }).click();
  await page.getByLabel("Task title").fill("Practice boundary cases");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(
    page
      .locator(".custom-task")
      .getByText("Practice boundary cases", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Assessments", exact: true }).click();
  await expect(page.locator("fieldset.quiz-question")).toHaveCount(6);
  for (const fieldset of await page.locator("fieldset.quiz-question").all())
    await fieldset.locator("input").first().check();
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByText(/Submitted. Concept score/)).toBeVisible();
  await page.getByRole("link", { name: "Project lab", exact: true }).click();
  await page.getByRole("link", { name: /Predictive Analytics System/ }).click();
  await page.getByLabel("Dataset selected").check();
  await expect(page.getByLabel("Dataset selected")).toBeChecked();
  await page.getByRole("link", { name: "Career", exact: true }).click();
  await page.getByLabel("company", { exact: true }).fill("Example Labs");
  await page.getByLabel("role", { exact: true }).fill("ML Intern");
  await page.getByRole("button", { name: "Add opportunity" }).click();
  await expect(
    page.getByRole("heading", { name: "Example Labs" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("timer survives reload and paused time does not accumulate", async ({
  page,
}) => {
  await page.goto("/focus");
  await page.getByRole("button", { name: "Begin focus" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.locator(".timer-circle strong").innerText();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".timer-circle strong")).toHaveText(before);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Finish & save" }).click();
  await expect(
    page.getByText("Session recorded.", { exact: false }),
  ).toBeVisible();
});
test("private API rejects anonymous reads and writes", async ({ request }) => {
  expect((await request.get("/api/state")).status()).toBe(401);
  expect(
    (
      await request.post("/api/state", {
        data: { kind: "lesson", id: "x", data: {} },
      })
    ).status(),
  ).toBe(401);
});
for (const width of [360, 390, 768, 1366, 1920])
  test("responsive routes at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/dashboard", "/academy", "/focus", "/settings"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  });
