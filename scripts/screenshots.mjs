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
  const path = route.split("?")[0].split("#")[0];
  return path.replace(/^\//, "").replace(/\//g, "-") || "index";
}

function parseArgs() {
  const args = process.argv.slice(2);
  let mode = "fullpage";
  let maxHeight = 10000;
  const routes = [];

  for (const a of args) {
    if (a.startsWith("--mode=")) {
      const m = a.split("=")[1];
      if (CAPTURE_MODES.includes(m)) mode = m;
    } else if (a.startsWith("--max-height=")) {
      maxHeight = parseInt(a.split("=")[1], 10) || 10000;
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

  return { mode, maxHeight, routes: routes.length > 0 ? routes : ["/tabs", "/mastering"] };
}

async function expandPage(h) {
  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = "visible";
  html.style.maxHeight = `${h}px`;
  body.style.overflow = "visible";
  body.style.maxHeight = `${h}px`;
  body.style.height = "auto";

  const all = document.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (!(el instanceof HTMLElement)) continue;
    const cs = getComputedStyle(el);
    if (
      cs.overflow === "auto" || cs.overflow === "scroll" ||
      cs.overflowX === "auto" || cs.overflowX === "scroll" ||
      cs.overflowY === "auto" || cs.overflowY === "scroll"
    ) {
      el.style.overflow = "visible";
      el.style.overflowX = "visible";
      el.style.overflowY = "visible";
      el.style.maxHeight = "none";
      el.style.height = "auto";
      el.style.flex = "none";
    }
  }
}

async function captureFullPage(page, route, maxHeight = 10000) {
  const filename = routeToFilename(route);
  await page.evaluate(expandPage, maxHeight);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, `${filename}.png`),
    fullPage: true,
  });
  console.log(`  ✓ ${filename}.png (full page, max ${maxHeight}px)`);
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

async function captureRoutes(browser, mode, maxHeight, routes) {
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
    fullpage: (p, r) => captureFullPage(p, r, maxHeight),
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

  const { mode, maxHeight, routes } = parseArgs();

  try {
    await captureRoutes(browser, mode, maxHeight, routes);
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
