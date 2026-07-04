import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const PORT = 4174;
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

  const route = "/studio/sample?scratch=1&genre=pop&bpm=120&key=C&title=Demo&numBars=8&timeSignature=4/4";
  console.log(`Navigating to ${route}...`);

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);

  const visibleText = await page.evaluate(() => {
    const els = document.querySelectorAll("*");
    const texts = [];
    for (const el of els) {
      if (el.children.length === 0 && el.textContent?.trim()) {
        texts.push(el.textContent.trim().slice(0, 100));
      }
    }
    return texts.slice(0, 50).join(" | ");
  });
  console.log("Visible text:", visibleText);

  console.log("Console errors:", errors.slice(0, 10));

  const dims = await page.evaluate(() => ({
    root: document.getElementById("root")?.getBoundingClientRect(),
    bodyH: document.body.scrollHeight,
    docH: document.documentElement.scrollHeight,
  }));
  console.log("Dims:", JSON.stringify(dims));

  await browser.close();
  server.close();
}

main().catch(console.error);
