---
name: marketing-screenshots
description: Headless browser screenshot generation for OpenBand product marketing — captures key screens from the production web build
source: auto-skill
extracted_at: '2026-07-04T09:38:00.000Z'
---

## Marketing Screenshots with Playwright

### How It Works

Uses Playwright's headless Chromium to open the production web build (`dist/`), set up a visitor session to bypass auth, and capture full-viewport screenshots of key product screens.

### Prerequisites

- Build must exist: `npm run build` produces `dist/`
- Playwright installed with Chromium: `npx playwright install chromium`

### Script

Located at `scripts/screenshots.mjs`. It:

1. Starts a static HTTP server serving `dist/` on port 4173
2. Launches headless Chromium at 1440×900
3. Seeds `localStorage` with a visitor session to bypass auth
4. Navigates to each route, waits for the SPA to render
5. Saves PNG screenshots to `marketing/screenshots/`

### Usage

```bash
# 1. Build the web app
npm run build

# 2. Run the screenshot script
node scripts/screenshots.mjs
```

### Adding a New Screen

Add a new block to `scripts/screenshots.mjs`:

```js
console.log("\nNavigating to [Screen Name]...");
await page.goto(`${BASE}/your-route`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);

await page.screenshot({
  path: join(OUT, "your-screen.png"),
  fullPage: false,
});
console.log("  ✓ your-screen.png saved");
```

### Auth Bypass

The app uses a visitor session stored in `localStorage` under `openband_visitor_session`. The script sets this key before navigating so the auth guard passes through to the real screens. Without it, the app redirects to `/login`.

### Viewport

Default is `1440×900` (desktop). Change the `viewport` option in `browser.newPage()` for mobile/tablet variants:

```js
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, // iPhone 14 Pro
});
```

### Output

All screenshots land in `marketing/screenshots/` (gitignored — add to repo manually when needed).
