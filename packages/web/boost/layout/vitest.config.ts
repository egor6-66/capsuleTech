import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid({ hot: false })],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    environment: 'jsdom',
    globals: false,
    // vitest.setup.ts installs ResizeObserver + matchMedia mocks (jsdom does not ship them).
    setupFiles: ['./vitest.setup.ts', '@testing-library/jest-dom/vitest'],
    // Several deps ship .jsx/.tsx source files in dev conditions.
    // Node natively cannot process JSX — inline these deps so Vite transforms them.
    server: {
      deps: {
        inline: [
          /@capsuletech\/web-dnd/,
          /@capsuletech\/web-ui/,
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
