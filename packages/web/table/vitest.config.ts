import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid({ hot: false })],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts', '@testing-library/jest-dom/vitest'],
    // Several deps ship .jsx files in dist — Node cannot process JSX natively.
    // Inline them so Vite transforms JSX before running tests.
    // Mirrors web-shell vitest.config.ts inline list.
    server: {
      deps: {
        inline: [
          /@capsuletech\/web-ui/,
          /@capsuletech\/web-core/,
          /@tanstack\/solid-router/,
          /@solidjs\/meta/,
          /@kobalte\/core/,
          /@corvu\//,
          /lucide-solid/,
          /solid-prevent-scroll/,
          /solid-presence/,
          /solid-motionone/,
        ],
      },
    },
  },
});
