const Metro = require("metro");
const { loadUserConfig, getDefaultConfig } = require("@expo/metro-config");
const { getMetroServerRoot } = require("@expo/config/paths");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const serverRoot = getMetroServerRoot(projectRoot);

async function build() {
  const config = await loadUserConfig({ projectRoot, serverRoot });
  config.resetCache = true;
  config.maxWorkers = 2;
  config.cacheStores = [];
  config.reporter = { update: (e) => { if (e.type) console.log("EVENT:", e.type); } };

  console.log("entry:", config.resolver?.resolveRequest ? "custom resolver" : "default");

  const r = await Metro.runBuild(config, {
    entry: "expo-router/entry.js",
    platform: "web",
    dev: false,
    minify: false,
    sourceMap: false,
  });

  const outputDir = path.join(projectRoot, "dist");
  fs.mkdirSync(outputDir, { recursive: true });
  if (r.code) {
    fs.writeFileSync(path.join(outputDir, "bundle.js"), r.code);
    console.log("Bundle:", r.code.length, "bytes");
  }
  console.log("Done");
}

build().catch((e) => {
  console.error("FAIL:", e.message);
  console.error(e.stack?.split("\n").slice(0, 10).join("\n"));
  process.exit(1);
});
