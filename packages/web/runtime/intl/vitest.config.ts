import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // vite-plugin-solid resolves solid-js to its reactive build — without it
  // vitest's SSR resolver loads the non-reactive dist/server.js and signal
  // updates never propagate. hot:false disables solid-refresh (irrelevant
  // under vitest).
  plugins: [solid({ hot: false })],
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
    // vite-plugin-solid auto-injects '@testing-library/jest-dom/vitest' as a
    // setupFile when the package is resolvable (it is, via workspace hoisting).
    // Listing it explicitly satisfies the plugin's "already handled" guard and
    // ensures it resolves in this package's context. Mirrors web-map.
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
});
