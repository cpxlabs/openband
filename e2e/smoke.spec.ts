import { test, expect } from "@playwright/test";

test.describe("OpenBand Smoke Tests", () => {
  test("App loads — root page renders without crash", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("div", { timeout: 15000 });
    const rootDivs = page.locator("div");
    expect(await rootDivs.count()).toBeGreaterThan(0);
  });

  test("Login page — redirect and elements present", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const loginTitle = page.getByText("OpenBand");
    await loginTitle.waitFor({ state: "visible", timeout: 15000 });
    await expect(loginTitle).toBeVisible();

    const subtitle = page.getByText("Entre para criar música");
    await expect(subtitle).toBeVisible();

    const emailInput = page.getByText("E-mail");
    await expect(emailInput).toBeVisible();

    const submitButton = page.getByText("Entrar");
    await expect(submitButton).toBeVisible();
  });

  test("Extractor page — heading renders", async ({ page }) => {
    await page.goto("/extractor");
    await page.waitForLoadState("networkidle");

    const heading = page.getByText("Separar Stems");
    await heading.waitFor({ state: "visible", timeout: 15000 });
    await expect(heading).toBeVisible();

    const subtitle = page.getByText("Extraia faixas individuais de qualquer áudio");
    await expect(subtitle).toBeVisible();
  });

  test("Mastering page — mastering suite elements render", async ({ page }) => {
    await page.goto("/mastering");
    await page.waitForLoadState("networkidle");

    const heading = page.getByText("Mastering Suite");
    await heading.waitFor({ state: "visible", timeout: 15000 });
    await expect(heading).toBeVisible();

    const exportBtn = page.getByText("Export");
    await expect(exportBtn).toBeVisible();
  });

  test("Studio page — loads for a project", async ({ page }) => {
    await page.goto("/studio/1");
    await page.waitForLoadState("networkidle");

    const playButton = page.getByText("▶");
    await playButton.waitFor({ state: "visible", timeout: 15000 });
    await expect(playButton).toBeVisible();
  });
});
