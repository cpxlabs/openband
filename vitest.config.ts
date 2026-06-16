import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/responsive.test.ts', 'tests/types.test.ts', 'tests/presets.test.ts'],
    server: {
      deps: {
        inline: ['react-native'],
      },
    },
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  optimizeDeps: {
    exclude: ['react-native'],
  },
});
