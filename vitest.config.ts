import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import okReporter from "./tests/ok-reporter";

const rootDir = process.cwd();

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/types.test.ts", "tests/presets.test.ts"],
    server: {
      deps: {
        inline: ["react-native"],
      },
    },
    reporters: [okReporter()],
  },
  resolve: {
    alias: {
      "react-native": "react-native-web",
      "@bridge": resolve(rootDir, "./src/bridge/index.ts"),
      "@bridge/": resolve(rootDir, "./src/bridge/"),
    },
  },
  optimizeDeps: {
    exclude: ["react-native"],
  },
});
