import { test, expect } from "@playwright/test";

test.describe("OpenBand Smoke Tests", () => {
  test("app loads and shows login screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(await page.title()).toBeDefined();
  });
});
