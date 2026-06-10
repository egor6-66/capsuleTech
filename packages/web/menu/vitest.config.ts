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
    server: {
      deps: {
        inline: [
          /@capsuletech\/web-ui/,
          /@capsuletech\/web-core/,
          /@kobalte\/core/,
          /@corvu\//,
          /lucide-solid/,
          /solid-prevent-scroll/,
          /solid-presence/,
        ],
      },
    },
  },
});
