import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const baseURL = process.argv.includes("--test-preview")
  ? "http://127.0.0.1:3001"
  : "http://127.0.0.1:3000";
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: "reduce",
});
await fs.mkdir("artifacts", { recursive: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(baseURL + "/dashboard");
await page.locator("h1").waitFor();
await page.waitForFunction(
  () => getComputedStyle(document.querySelector(".hero-card")).opacity === "1",
);
await page.addStyleTag({ content: "nextjs-portal {display:none !important}" });
await page.screenshot({
  path: "artifacts/dashboard-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForFunction(
  () => document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
);
await page.screenshot({
  path: "artifacts/dashboard-mobile.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Switch color theme" }).click();
await page.setViewportSize({ width: 1440, height: 1100 });
await page.screenshot({
  path: "artifacts/dashboard-light.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Switch color theme" }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseURL + "/focus");
await page.waitForFunction(
  () => !document.querySelector(".timer-buttons button")?.disabled,
);
await page.screenshot({ path: "artifacts/focus-mobile.png", fullPage: true });
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(baseURL + "/academy");
await page.locator(".week-card").first().waitFor();
await page.getByPlaceholder("Search topics or a week number").fill("Python");
await page.getByPlaceholder("Search topics or a week number").fill("");
await page.screenshot({
  path: "artifacts/academy-desktop.png",
  fullPage: false,
});
await browser.close();
console.log(JSON.stringify({ errors }));
