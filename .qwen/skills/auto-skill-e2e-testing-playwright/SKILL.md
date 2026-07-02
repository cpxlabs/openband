---
name: e2e-testing-playwright
description: Playwright E2E testing patterns for OpenBand DAW — critical user flows, responsive layout, studio workflow tests
source: auto-skill
extracted_at: '2026-07-02T13:05:00.000Z'
---

## E2E Testing with Playwright

### Project Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:8081",
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx expo start --web --no-dev --port 8081",
    port: 8081,
    timeout: 60000,
    reuseExistingServer: true,
  },
});
```

### Test Structure

Organize tests by user journey, not by component:

```typescript
// e2e/critical-flows.spec.ts
test.describe("OpenBand E2E — Critical User Flows", () => {
  test("Feed tab loads with posts", async ({ page }) => { /* ... */ });
  test("Library tab shows project list", async ({ page }) => { /* ... */ });
});

test.describe("OpenBand E2E — Studio Workflow", () => {
  test("Studio loads with transport controls", async ({ page }) => { /* ... */ });
});

test.describe("OpenBand E2E — Responsive Layout", () => {
  test("Desktop layout shows persistent sidebar", async ({ page }) => { /* ... */ });
  test("Mobile layout hides sidebar", async ({ page }) => { /* ... */ });
});
```

### Key Patterns

#### 1. Tab Navigation Tests
```typescript
test("Feed tab loads with posts", async ({ page }) => {
  await page.goto("/tabs");
  await page.waitForLoadState("networkidle");

  const feedHeader = page.getByText("Feed");
  await expect(feedHeader).toBeVisible({ timeout: 10000 });

  // Verify mock data renders
  const postCard = page.getByText("Solo de Guitarra Pesado");
  await expect(postCard.first()).toBeVisible();
});
```

#### 2. Studio Workflow Tests
```typescript
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
```

#### 3. Responsive Layout Tests
```typescript
test("Desktop layout shows persistent sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tabs");
  await page.waitForLoadState("networkidle");

  const feedNav = page.getByText("Feed");
  await expect(feedNav).toBeVisible({ timeout: 10000 });
});

test("Mobile layout hides sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tabs");
  await page.waitForLoadState("networkidle");

  const hamburger = page.getByText("☰");
  await expect(hamburger.first()).toBeVisible({ timeout: 10000 });
});
```

### Test Categories to Cover

| Category | What to Test |
|----------|-------------|
| **Tab Navigation** | Each tab renders with correct header and content |
| **Studio Workflow** | Transport controls, toolbar buttons, track list |
| **Responsive Layout** | Desktop sidebar visible, mobile hamburger menu |
| **Modal Dialogs** | Synth, Sampler, PianoRoll open and close |
| **Audio Playback** | Play button visible, progress bar updates (mocked) |

### Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/critical-flows.spec.ts

# Run with UI
npx playwright test --ui

# Run headed (for debugging)
npx playwright test --headed
```

### Common Pitfalls

1. **Timeout too short**: Expo web builds can take 30+ seconds to start. Use `timeout: 60000` in webServer config.
2. **Waiting for wrong selector**: React Native Web renders `<div>` elements — use text-based selectors (`getByText`) instead of CSS classes.
3. **Not waiting for networkidle**: Always `await page.waitForLoadState("networkidle")` before asserting.
4. **Viewport not reset**: Set viewport explicitly in each test if testing responsive behavior.
5. **Flaky auth state**: Tests should handle visitor mode (auto-sign-in) or explicitly mock auth state.
