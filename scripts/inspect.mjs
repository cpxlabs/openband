import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

const MIME_TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json",
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = req.url.split("?")[0];
      if (urlPath === "/") urlPath = "/index.html";
      const filePath = join(DIST, urlPath);
      if (existsSync(filePath)) {
        const ext = extname(filePath);
        const ct = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": ct });
        res.end(readFileSync(filePath));
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(readFileSync(join(DIST, "index.html")));
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function inspectDom(page, label) {
  return page.evaluate((l) => {
    const info = { label: l, rootHeight: 0, bodyHeight: 0, docHeight: 0, maxBottom: 0, scrollContainers: [] };
    info.rootHeight = document.getElementById("root")?.getBoundingClientRect().height || 0;
    info.bodyHeight = document.body.getBoundingClientRect().height;
    info.docHeight = document.documentElement.scrollHeight;

    let maxB = 0;
    const all = document.querySelectorAll("*");
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (!(el instanceof HTMLElement)) continue;
      const r = el.getBoundingClientRect();
      const b = r.top + r.height;
      if (b > maxB) maxB = b;
      const cs = getComputedStyle(el);
      if (cs.overflowY === "auto" || cs.overflowY === "scroll") {
        info.scrollContainers.push({
          tag: el.tagName,
          id: el.id,
          class: (el.className || "").slice(0, 60),
          rectHeight: r.height,
          scrollHeight: el.scrollHeight,
          diff: el.scrollHeight - r.height,
        });
      }
    }
    info.maxBottom = Math.ceil(maxB);
    return info;
  }, label);
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem("openband_visitor_session", JSON.stringify({
      id: "00000000-0000-4000-8000-000000000001",
      createdAt: new Date().toISOString(),
    }));
  });

  const routes = ["/tabs", "/mastering", "/tabs/moments", "/studio/sample?scratch=1&genre=pop&bpm=120&key=C&title=Demo&numBars=8&timeSignature=4/4"];

  for (const route of routes) {
    console.log(`\n=== ${route} ===`);
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    const info = await inspectDom(page, route);
    console.log(`  root height:     ${info.rootHeight}`);
    console.log(`  body height:     ${info.bodyHeight}`);
    console.log(`  doc scrollHeight: ${info.docHeight}`);
    console.log(`  maxBottom (px):  ${info.maxBottom}`);
    if (info.scrollContainers.length > 0) {
      console.log(`  scroll containers:`);
      for (const sc of info.scrollContainers) {
        console.log(`    <${sc.tag}> .${sc.class.slice(0, 50)} rect=${sc.rectHeight} scroll=${sc.scrollHeight} diff=+${sc.diff}`);
      }
    } else {
      console.log(`  scroll containers: none`);
    }
  }

  await browser.close();
  server.close();
}

main().catch(console.error);
