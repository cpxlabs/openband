const Metro = require("metro");
const { loadUserConfig, getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

async function build() {
  const config = await loadUserConfig({ projectRoot, serverRoot: projectRoot });
  config.resetCache = true;
  config.maxWorkers = 1;
  config.cacheStores = [];
  config.reporter = {
    update(event) {
      const relevant = ["dep_graph_loading", "dep_graph_loaded", "bundle_build_started",
        "bundle_build_done", "bundle_transform_progressed", "bundle_requested",
        "transform_module_started", "transform_module_done", "initialize_started",
        "initialize_done", "cache_loaded", "cache_read", "cache_write",
        "global_cache_error", "transform_cache_read", "transform_cache_write"];
      if (relevant.includes(event.type)) {
        const extra = event.type === "bundle_transform_progressed"
          ? ` ${event.transformedFileCount}/${event.totalFileCount} files (${event.percentage.toFixed(1)}%)`
          : event.fileName ? ` ${event.fileName}` : "";
        console.log(`[METRO] ${event.type}${extra}`);
      }
    }
  };

  console.log("Starting...");
  let timer = setTimeout(() => console.log("Still running..."), 5000);
  try {
    const result = await Metro.runBuild(config, {
      entry: "expo-router/entry.js",
      platform: "web",
      dev: false,
      minify: false,
      sourceMap: false,
    });
    clearTimeout(timer);
    console.log(`Done! Code: ${result.code?.length || 0} bytes`);
  } catch (e) {
    clearTimeout(timer);
    console.error("FAIL:", e.message);
    process.exit(1);
  }
}

build();
