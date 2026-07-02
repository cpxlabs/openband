import { test, expect } from "@playwright/test";

test.describe("OpenBand E2E — Critical User Flows", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("Feed tab loads with posts", async ({ page }) => {
    await page.goto("/tabs");
    await page.waitForLoadState("networkidle");

    const feedHeader = page.getByText("Feed");
    await expect(feedHeader).toBeVisible({ timeout: 10000 });

    // Mock posts should render
    const postCards = page.locator("text=Solo de Guitarra Pesado");
    await expect(postCards.first()).toBeVisible();
  });

  test("Library tab shows project list", async ({ page }) => {
    await page.goto("/tabs/library");
    await page.waitForLoadState("networkidle");

    const libraryHeader = page.getByText("Biblioteca");
    await expect(libraryHeader).toBeVisible({ timeout: 10000 });
  });

  test("Settings tab renders", async ({ page }) => {
    await page.goto("/tabs/settings");
    await page.waitForLoadState("networkidle");

    const settingsHeader = page.getByText("Ajustes");
    await expect(settingsHeader).toBeVisible({ timeout: 10000 });
  });

  test("Account tab renders profile", async ({ page }) => {
    await page.goto("/tabs/account");
    await page.waitForLoadState("networkidle");

    const accountHeader = page.getByText("Conta");
    await expect(accountHeader).toBeVisible({ timeout: 10000 });
  });
});

test.describe("OpenBand E2E — Studio Workflow", () => {
  test("Studio loads with transport controls", async ({ page }) => {
    await page.goto("/studio/test-project-1");
    await page.waitForLoadState("networkidle");

    // Transport bar
    const playBtn = page.getByText("▶");
    await expect(playBtn).toBeVisible({ timeout: 10000 });

    const stopBtn = page.getByText("■");
    await expect(stopBtn).toBeVisible();

    // BPM display
    const bpmDisplay = page.getByText("120");
    await expect(bpmDisplay).toBeVisible();
  });

  test("Studio toolbar buttons are present", async ({ page }) => {
    await page.goto("/studio/test-project-1");
    await page.waitForLoadState("networkidle");

    // Tool buttons should be visible
    const synthBtn = page.getByText("🎹");
    await expect(synthBtn).toBeVisible({ timeout: 10000 });

    const samplerBtn = page.getByText("🎛️");
    await expect(samplerBtn).toBeVisible();
  });
});

test.describe("OpenBand E2E — Responsive Layout", () => {
  test("Desktop layout shows persistent sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/tabs");
    await page.waitForLoadState("networkidle");

    // On desktop, sidebar should be visible with nav items
    const feedNav = page.getByText("Feed");
    await expect(feedNav).toBeVisible({ timeout: 10000 });
  });

  test("Mobile layout hides sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/tabs");
    await page.waitForLoadState("networkidle");

    // On mobile, hamburger menu should be visible instead
    const hamburger = page.getByText("☰");
    await expect(hamburger.first()).toBeVisible({ timeout: 10000 });
  });
});
