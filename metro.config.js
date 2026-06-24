const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths.push(
  path.resolve(__dirname, "node_modules/nativewind/node_modules"),
);

module.exports = withNativeWind(config, { input: "./global.css" });
