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
    // vitest.setup.ts stubs window.matchMedia (jsdom omits it). web-style's
    // theme switcher reads matchMedia at module-load — pulled transitively by
    // RemoteComponent (host-theme forwarding) and web-core/bootstrap. The setup
    // file does NOT import @testing-library/jest-dom (not installed here).
    setupFiles: ['./vitest.setup.ts'],
    // Several deps ship .jsx/.tsx source files — inline so Vite transforms them.
    server: {
      deps: {
        inline: [/solid-js/],
      },
    },
  },
});
