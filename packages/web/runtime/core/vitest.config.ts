import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
// require.resolve('@xstate/solid') follows package.json#exports → the CJS
// entry (main). Its real ESM build sits next to it on disk as
// xstate-solid.esm.js — reachable by filesystem path even though the
// package's exports map doesn't expose that subpath directly.
const xstateSolidEsm = join(dirname(require.resolve('@xstate/solid')), 'xstate-solid.esm.js');

export default defineConfig({
  // hot:false — отключаем solid-refresh для тестов (иначе jsdom получает
  // file:///@solid-refresh URL и ругается на 'filename must be ...').
  plugins: [solid({ hot: false })],
  resolve: {
    alias: {
      // workspace-пакеты, которые ещё не материализованы в node_modules
      // (pnpm install не запускался после добавления dep). Алиасы указывают
      // прямо на src — Vite трансформирует их как обычные модули.
      '@capsuletech/shared-utils': resolve(__dirname, '../../../shared/utils/src/index.ts'),
      // @xstate/solid's package.json "import" condition points at a CJS-wrapped
      // .mjs (`export {...} from './xstate-solid.cjs.js'`), NOT its real ESM
      // build (`dist/xstate-solid.esm.js`). That CJS require()'s solid-js
      // through Node's native module system, bypassing Vite's ESM module
      // graph entirely — a SEPARATE solid-js instantiation from the one used
      // by JSX/render() elsewhere in the test. Result: useMachine()'s signals
      // never notify computations tracked under the other instance — silent
      // dead reactivity, no thrown error, only the "multiple instances of
      // Solid" console warning as a clue. Force-resolve straight to the real
      // ESM build so it shares module identity with everything else.
      '@xstate/solid': xstateSolidEsm,
    },
    // Зеркалит dedupe из vite-builder/capsuleConfig.ts (production apps). Без
    // этого vitest резолвит solid-js ОТДЕЛЬНО для web-core и для transitively
    // импортируемого @capsuletech/web-ui → "multiple instances of Solid" →
    // signals/stores из web-ui-side инстанса не трекаются computations'ами
    // web-core-side инстанса (owner/tracking — module-level singleton внутри
    // каждого экземпляра solid-js). Тест-only артефакт, не воспроизводится в
    // реальном app-build (vite-builder уже дедупит).
    dedupe: ['solid-js', 'solid-js/web', 'solid-js/store'],
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
    // - @corvu/utils: kobalte transitive dep, ships .jsx in dist/reactivity;
    //   surfaced after web-ui input restructure (select/textarea under input/).
    server: {
      deps: {
        inline: [
          /@tanstack\/solid-router/,
          /@solidjs\/meta/,
          /@kobalte\/core/,
          /@corvu\//,
          /solid-prevent-scroll/,
          /solid-presence/,
          /lucide-solid/,
          /solid-motionone/,
          /solid-map-gl/,
          /@capsuletech\/shared-utils/,
          // @xstate/solid's "import" condition resolves to a CJS-wrapped .mjs
          // (see its package.json — module vs import point at different
          // builds); left external, Vite/vitest resolves solid-js SEPARATELY
          // for that CJS require() vs the ESM import graph everywhere else →
          // "multiple instances of Solid" → useMachine()'s signals never
          // notify computations from the other instance (silent dead
          // reactivity, no error). Production apps dodge this because
          // vite-builder's optimizeDeps.include pre-bundles solid-js +
          // xstate + @xstate/solid together (capsuleConfig.ts comment: "xstate
          // отдаёт CJS-сборку"). Mirror that here via inline so both resolve
          // to the same solid-js instance in tests too.
          /@xstate\/solid/,
          /^xstate$/,
        ],
      },
    },
  },
});
