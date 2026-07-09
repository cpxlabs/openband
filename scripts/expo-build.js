const { exportAppAsync } = require("@expo/cli/build/src/export/exportApp");
const { getConfig } = require("@expo/config");
const path = require("path");
const fs = require("fs");

async function build() {
  const projectRoot = path.resolve(__dirname, "..");
  const outputDir = "dist";

  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  await exportAppAsync(projectRoot, {
    outputDir,
    platforms: ["web"],
    minify: true,
    bytecode: false,
    clear: true,
    dev: false,
    dumpSourcemap: false,
    maxWorkers: 2,
  });

  console.log("Export completed!");
}

build().catch((e) => {
  console.error("Build failed:", e.message);
  console.error(e.stack);
  process.exit(1);
});
