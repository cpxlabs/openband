import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "marketing", "screenshots");
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function serveFile(res, filePath) {
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = req.url.split("?")[0];
      if (urlPath === "/") urlPath = "/index.html";
      const filePath = join(DIST, urlPath);
      if (existsSync(filePath)) {
        serveFile(res, filePath);
      } else {
        serveFile(res, join(DIST, "index.html"));
      }
    });
    server.listen(PORT, () => {
      console.log(`Server running at ${BASE}`);
      resolve(server);
    });
  });
}

async function takeScreenshots() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("  [console.error]", msg.text());
  });
  page.on("pageerror", (err) => console.log("  [page error]", err.message));

  try {
    // Set visitor session in localStorage before any navigation
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem(
        "openband_visitor_session",
        JSON.stringify({
          id: "00000000-0000-4000-8000-000000000001",
          createdAt: new Date().toISOString(),
        }),
      );
    });

    // --- Feed / Tabs ---
    console.log("\nNavigating to Feed...");
    await page.goto(`${BASE}/tabs`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: join(OUT, "feed.png"),
      fullPage: false,
    });
    console.log("  ✓ feed.png saved");

    // --- Mastering Suite ---
    console.log("\nNavigating to Mastering Suite...");
    await page.goto(`${BASE}/mastering`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: join(OUT, "mastering-suite.png"),
      fullPage: false,
    });
    console.log("  ✓ mastering-suite.png saved");

  } finally {
    await browser.close();
    server.close();
    console.log("\nDone. Screenshots in marketing/screenshots/");
  }
}

takeScreenshots().catch((err) => {
  console.error("Screenshot script failed:", err);
  process.exit(1);
});
