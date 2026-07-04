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

const CAPTURE_MODES = ["fullpage", "viewport", "sections"];

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

function routeToFilename(route) {
  return route.replace(/^\//, "").replace(/\//g, "-") || "index";
}

function parseArgs() {
  const args = process.argv.slice(2);
  let mode = "fullpage";
  const routes = [];

  for (const a of args) {
    if (a.startsWith("--mode=")) {
      const m = a.split("=")[1];
      if (CAPTURE_MODES.includes(m)) mode = m;
    } else if (a === "--viewport") {
      mode = "viewport";
    } else if (a === "--sections") {
      mode = "sections";
    } else if (a === "--fullpage") {
      mode = "fullpage";
    } else if (!a.startsWith("--")) {
      routes.push(a);
    }
  }

  return { mode, routes: routes.length > 0 ? routes : ["/tabs", "/mastering"] };
}

async function captureFullPage(page, route) {
  const filename = routeToFilename(route);
  await page.screenshot({
    path: join(OUT, `${filename}.png`),
    fullPage: true,
  });
  console.log(`  ✓ ${filename}.png (full page)`);
}

async function captureViewport(page, route) {
  const filename = routeToFilename(route);
  await page.screenshot({
    path: join(OUT, `${filename}.png`),
    fullPage: false,
  });
  console.log(`  ✓ ${filename}.png (viewport)`);
}

async function captureSections(page, route) {
  const filename = routeToFilename(route);
  const { scrollHeight } = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
  }));
  const viewportHeight = 900;
  const sections = Math.ceil(scrollHeight / viewportHeight);

  for (let i = 0; i < sections; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * viewportHeight);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(OUT, `${filename}-section-${i + 1}.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${filename}-section-${i + 1}.png (section ${i + 1}/${sections})`);
  }
}

async function captureRoutes(browser, mode, routes) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("  [console.error]", msg.text());
  });
  page.on("pageerror", (err) => console.log("  [page error]", err.message));

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

  const capturers = {
    fullpage: captureFullPage,
    viewport: captureViewport,
    sections: captureSections,
  };
  const capture = capturers[mode];

  for (const route of routes) {
    console.log(`\nNavigating to ${route}...`);
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    await capture(page, route);
  }
}

async function takeScreenshots() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });

  const { mode, routes } = parseArgs();

  try {
    await captureRoutes(browser, mode, routes);
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
