import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // hot:false — отключаем solid-refresh для тестов (иначе jsdom получает
  // file:///@solid-refresh URL и ругается на 'filename must be ...').
  plugins: [solid({ hot: false })],
  resolve: {
    alias: {
      // workspace-пакеты, которые ещё не материализованы в node_modules
      // (pnpm install не запускался после добавления dep). Алиасы указывают
      // прямо на src — Vite трансформирует их как обычные модули.
      '@capsuletech/shared-utils': resolve(__dirname, '../../shared/utils/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    // jsdom нужен для UiProxy render-тестов (создание элементов, dispatchEvent).
    // Pure-helper тесты (derivation/controller-proxy/getTargetData) от этого
    // не страдают — jsdom-globals им просто не мешают.
    environment: 'jsdom',
    globals: false,
    // vitest.setup.ts stubs window.matchMedia + ResizeObserver (jsdom omits both).
    // Required after LCP de-lazy: static web-ui imports pull web-style at collect
    // time which reads matchMedia on module load.
    setupFiles: ['./vitest.setup.ts'],
    // Several deps ship .jsx/.tsx source files in dev conditions.
    // Node natively cannot process JSX — inline these deps so Vite transforms them.
    // - @tanstack/solid-router: ui-kit/imports.tsx re-exports Link → dev .jsx entry
    // - @solidjs/meta: transitive via web-ui subpaths
    // - @kobalte/core: ships .jsx in dist/polymorphic; pulled in by static web-ui
    //   imports (Button, Input, Toggle etc.) after the LCP de-lazy in imports.tsx.
    //   Mirror of what web-ui's vitest.config.ts does for the same reason.
    // - solid-prevent-scroll, solid-presence: kobalte peer deps, also ship .jsx
    server: {
      deps: {
        inline: [
          /@tanstack\/solid-router/,
          /@solidjs\/meta/,
          /@kobalte\/core/,
          /solid-prevent-scroll/,
          /solid-presence/,
          /lucide-solid/,
          /solid-motionone/,
          /solid-map-gl/,
          /@capsuletech\/shared-utils/,
        ],
      },
    },
  },
});
