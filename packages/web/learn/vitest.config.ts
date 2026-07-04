import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // solid: трансформирует JSX в *.tsx (плейсхолдеры рендерятся через solid-js/web).
  // hot: false — отключаем solid-refresh для тестов.
  plugins: [solid({ hot: false })],
  resolve: {
    // Vite 8 native tsconfig-paths — резолвит @capsuletech/* в исходники
    // по tsconfig.base.json (иначе уходит в node_modules → dist, которого нет в dev).
    tsconfigPaths: true,
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    // jsdom нужен потому что smoke-тесты рендерят реальный web-ui kit
    // (Typography/Button) через solid-js/web — нужен DOM.
    environment: 'jsdom',
    globals: false,
    // vitest.setup.ts полифилит matchMedia + ResizeObserver — нужно тестам,
    // которые импортят реальный web-ui kit.
    setupFiles: ['./vitest.setup.ts'],
    // Несколько deps поставляются как .jsx/.tsx из dev-conditions.
    // Node не умеет JSX нативно — inline заставляет vite-plugin-solid трансформировать.
    server: {
      deps: {
        inline: [
          /lucide-solid/,
          /@capsuletech\/web-ui/,
          /@capsuletech\/web-style/,
          /@capsuletech\/web-core/,
          /@capsuletech\/web-docs/,
          /@capsuletech\/web-router/,
          /@tanstack\/solid-router/,
          /@solidjs\/meta/,
          /@kobalte\/core/,
          /@corvu\//,
          /solid-prevent-scroll/,
          /solid-presence/,
          /solid-motionone/,
        ],
      },
    },
  },
});
