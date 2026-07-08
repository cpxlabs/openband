import { defineConfig } from "vitest/config";
import okReporter from "./tests/ok-reporter";

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
    },
  },
  optimizeDeps: {
    exclude: ["react-native"],
  },
});
