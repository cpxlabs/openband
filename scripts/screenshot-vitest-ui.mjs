import { spawn } from "child_process";
import { chromium } from "playwright";
import { join } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs");
const OUT_PATH = join(OUT_DIR, "vitest-ui-dashboard.png");
const PORT = 3002;
const HOST = "127.0.0.1";

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

console.log("Starting Vitest UI server on " + HOST + ":" + PORT + "...");
const vitest = spawn("npx", ["vitest", "--ui", "--api.port", String(PORT), "--api.host", HOST, "--run"], {
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

let serverStarted = false;
let output = "";

const checkStarted = new Promise((resolve, reject) => {
  vitest.stdout.on("data", (data) => {
    const str = data.toString();
    output += str;
    console.log("[Vitest stdout]", str.trim());
    if (str.includes(HOST + ":" + PORT) || str.includes("localhost:" + PORT) || str.includes("UI")) {
      serverStarted = true;
      resolve();
    }
  });

  vitest.stderr.on("data", (data) => {
    const str = data.toString();
    console.error("[Vitest stderr]", str.trim());
  });

  vitest.on("close", (code) => {
    if (!serverStarted) {
      reject(new Error(`Vitest UI exited early with code ${code}. Output: ${output}`));
    }
  });

  setTimeout(() => {
    if (!serverStarted) {
      reject(new Error(`Timeout waiting for Vitest UI server to start. Output: ${output}`));
    }
  }, 30000);
});

try {
  await checkStarted;
  console.log("Vitest UI server is up. Launching browser to take screenshot...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("http://" + HOST + ":" + PORT + "/__vitest__/");
  
  console.log("Waiting for dashboard UI to load and tests to display...");
  await page.waitForTimeout(6000);
  
  console.log(`Taking screenshot and saving to: ${OUT_PATH}`);
  await page.screenshot({ path: OUT_PATH });

  await browser.close();
  console.log("Browser closed successfully.");
} catch (err) {
  console.error("Failed to capture screenshot:", err);
} finally {
  console.log("Stopping Vitest UI server...");
  vitest.kill("SIGKILL");
  process.exit(0);
}
