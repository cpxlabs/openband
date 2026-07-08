import { defineConfig } from "vitest/config";

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
    onConsoleLog(log) {
      if (
        log.includes("Not implemented") ||
        log.includes('unique "key" prop') ||
        log.includes("props.pointerEvents is deprecated") ||
        log.includes('"shadow*" style props are deprecated')
      ) return false;
    },
  },
  resolve: {
    alias: {
      "react-native": "react-native-web",
    },
  },
  optimizeDeps: {
    exclude: ["react-native"],
  },
});
