import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // hot:false — disable solid-refresh for tests (jsdom gets file:// URLs otherwise)
  plugins: [solid({ hot: false })],
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    // jsdom required for Solid render + IframeTransport (window.dispatchEvent, MessageEvent).
    environment: 'jsdom',
    globals: false,
    // Explicit empty setupFiles prevents vite-plugin-solid from auto-adding
    // @testing-library/jest-dom/vitest which is not installed in this package.
    setupFiles: [],
    // Several deps ship .jsx/.tsx source files — inline so Vite transforms them.
    server: {
      deps: {
        inline: [/solid-js/],
      },
    },
  },
});
