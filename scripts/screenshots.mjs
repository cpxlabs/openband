import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync, mkdirSync } from "fs";
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

const VISITOR_SESSION = JSON.stringify({
  id: "00000000-0000-4000-8000-000000000001",
  createdAt: new Date().toISOString(),
});

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const SCREENS = [
  { folder: "auth", name: "login.png", route: "/login", viewport: MOBILE, visitor: false },
  { folder: "tabs", name: "feed.png", route: "/tabs/feed", viewport: MOBILE },
  { folder: "tabs", name: "momentos.png", route: "/tabs/moments", viewport: MOBILE },
  { folder: "tabs", name: "biblioteca.png", route: "/tabs/library", viewport: MOBILE },
  { folder: "tabs", name: "conta.png", route: "/tabs/account", viewport: MOBILE },
  { folder: "tabs", name: "ajustes.png", route: "/tabs/settings", viewport: MOBILE },
  { folder: "tabs", name: "modos.png", route: "/tabs/modes", viewport: MOBILE },
  { folder: "tabs", name: "explorer-tab.png", route: "/tabs/explorer", viewport: DESKTOP },
  { folder: "tabs", name: "3d-studio-tab.png", route: "/tabs/virtual-studio", viewport: DESKTOP },
  { folder: "stack", name: "stem-extractor.png", route: "/extractor", viewport: MOBILE },
  { folder: "stack", name: "daw-studio.png", route: "/studio/1", viewport: DESKTOP },
  { folder: "stack", name: "mastering-suite.png", route: "/mastering", viewport: DESKTOP },
  { folder: "creative", name: "beatmaker.png", route: "/beatmaker", viewport: DESKTOP },
  { folder: "creative", name: "synth-lab.png", route: "/synth-lab", viewport: DESKTOP },
  { folder: "creative", name: "mixing-console.png", route: "/mixing-console", viewport: DESKTOP },
  { folder: "creative", name: "dj-stage.png", route: "/dj-stage", viewport: DESKTOP },
  { folder: "creative", name: "autotune.png", route: "/autotune", viewport: DESKTOP },
  { folder: "creative", name: "live-room.png", route: "/live-room", viewport: DESKTOP },
  { folder: "creative", name: "spatial-audio.png", route: "/spatial-audio", viewport: DESKTOP },
  { folder: "creative", name: "stem-collider.png", route: "/stem-collider", viewport: DESKTOP },
  { folder: "creative", name: "lofi-tape.png", route: "/lofi-tape", viewport: DESKTOP },
  { folder: "creative", name: "acoustics-lab.png", route: "/acoustics", viewport: DESKTOP },
  { folder: "creative", name: "cover-jam.png", route: "/cover-jam", viewport: DESKTOP },
  { folder: "creative", name: "vocal-booth.png", route: "/vocal-booth", viewport: DESKTOP },
  { folder: "creative", name: "explorer-missao.png", route: "/explorer", viewport: DESKTOP },
];

async function captureScreen(browser, screen) {
  const page = await browser.newPage({ viewport: screen.viewport });
  page.on("pageerror", (err) => console.log(`  [page error @ ${screen.route}]`, err.message));

  await page.addInitScript((session) => {
    try {
      if (session) {
        localStorage.setItem("openband_visitor_session", session);
      } else {
        localStorage.removeItem("openband_visitor_session");
      }
    } catch {}
  }, screen.visitor === false ? null : VISITOR_SESSION);

  try {
    await page.goto(`${BASE}${screen.route}`, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    console.log(`  [goto timeout @ ${screen.route}] continuing`);
  }

  try {
    await page.waitForFunction(
      () => (document.getElementById("root")?.childElementCount ?? 0) > 0,
      { timeout: 20000 },
    );
  } catch {
    console.log(`  [root empty @ ${screen.route}]`);
  }
  await page.waitForTimeout(2000);

  const outPath = join(OUT, screen.folder, screen.name);
  mkdirSync(join(OUT, screen.folder), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: false });
  await page.close();
  console.log(`  ✓ ${screen.folder}/${screen.name} (${screen.viewport.width}x${screen.viewport.height})`);
}

async function takeScreenshots() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const screen of SCREENS) {
      console.log(`\nNavigating to ${screen.route}...`);
      await captureScreen(browser, screen);
    }
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
