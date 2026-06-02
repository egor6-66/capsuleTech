import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IDesktopConfig } from '@capsuletech/desktop';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import {
  AliasesPlugin,
  CapsuleRegistryPlugin,
  CompliancePlugin,
  EnsureScaffoldPlugin,
  HMRWrappingPlugin,
  RouterPlugin,
  solidPlugin,
  tsconfigPaths,
} from '../plugins';
import { DEFINE_FACTORIES, HOOK_IMPORTS, WRAPPER_NAMES } from '../plugins/constants';
import { appConfig } from './appConfig';

export interface ICapsuleConfig {
  devServerPort?: number;
  /**
   * URL-базовый путь приложения для раздачи под под-путём (Vite `base`).
   * Дефолт `'/'`. Пример: `'/ewc/'` — ассеты будут `/ewc/assets/...`, dev и build
   * под этим путём. Прокидывается в роутер как basepath через import.meta.env.BASE_URL.
   * Соглашение Vite: ведущий и завершающий слеш (`/ewc/`).
   */
  base?: string;
  /**
   * Опциональная секция для Tauri-shell. Читается @capsuletech/cli командой
   * `capsule desktop dev|build <app>` (см. ADR 017). vite-builder сам секцию
   * НЕ использует — это data-only поле, прокидывается через capsule.config.ts.
   */
  desktop?: IDesktopConfig;
}

interface IProps {
  config: any;
  root: string;
  workspaceRoot: string;
  isDev: boolean;
}

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const capsuleConfig = ({ config, root, workspaceRoot, isDev }: IProps) => {
  const capsuleRoot = join(root, '.capsule');
  const watchDir = join(root, 'src');
  const appConfigState = { aliasKeys: new Set<string>() };

  // Вычисляем флаг моков:
  //   CAPSULE_MOCKS='true'  capsule build → prod-сборка с моками (для preview-деплоя)
  //   CAPSULE_MOCKS='false' capsule dev   → явное отключение моков в dev
  //   (не задан)            capsule dev   → моки on  (текущее поведение)
  //   (не задан)            capsule build → моки off
  const mocks = process.env.CAPSULE_MOCKS != null ? process.env.CAPSULE_MOCKS === 'true' : isDev;

  const dedupe = [
    'solid-js',
    'solid-js/web',
    'solid-js/store',
    '@capsuletech/web-ui',
    '@capsuletech/web-state',
  ];

  const capsuleConfig = {
    ...config,
    root: capsuleRoot,
    base: config.base ?? '/',
    define: {
      __CAPSULE_CONFIG__: JSON.stringify(config),
      // NB: identity-unwrap для `defineAppConfig` живёт в
      // `CapsuleRegistryPlugin.transform` (см. plugins/capsuleRegistry.ts).
      // Через esbuild `define:` это сделать нельзя — он валидирует value как
      // identifier|literal и отбивает arrow-expression со стороны `[vite:define]`.
      //
      // Build-time флаг моков. Инжектируется как boolean-литерал (true/false),
      // что позволяет Rollup DCE сворачивать `__CAPSULE_MOCKS__ ? mock : real`
      // в один branch и tree-shake'ать мёртвый код.
      // App читает:  if (__CAPSULE_MOCKS__) { ... }
      // TS-тип:      declare const __CAPSULE_MOCKS__: boolean;  (добавь в apps/<app>/src/env.d.ts)
      __CAPSULE_MOCKS__: String(mocks),
    },
    build: {
      // watch: {} только в dev — production-сборка должна быть one-shot
      // (иначе CI-step `capsule build` зависает после первого цикла и не
      // освобождает workflow).
      ...(isDev ? { watch: {} } : {}),
      rollupOptions: {
        input: join(capsuleRoot, 'index.html'),
        // Generic vendor-split for ALL capsule apps (no app-specific paths).
        // Goals:
        //  1. Move heavy stable vendor libs out of the entry chunk so the entry
        //     is smaller and can be fetched in parallel with vendor chunks.
        //  2. Make Vite emit <link rel="modulepreload"> for these static chunks
        //     (Vite only emits preload for statically-imported chunks).
        //  3. Deduplicate shared runtime (solid-js, kobalte) across lazy chunks
        //     that are already in the tree (e.g. map, dropdown, dataTable).
        //
        // Buckets are conservative to avoid Solid/XState init-order breakage:
        //  - 'maplibre'     — geospatial lib, has NO dependency on solid/xstate;
        //                     safe to split completely.
        //  - 'vendor-core'  — solid-js + xstate + router: always co-initialised,
        //                     kept together to preserve module evaluation order.
        //  - 'vendor-ui'    — kobalte + its peer deps (solid-prevent-scroll,
        //                     solid-presence): UI primitives, no side-effects on
        //                     import, deduplicates across lazy dropdown/table chunks.
        //
        // Function form (not object form) lets us inspect the full resolved id and
        // apply rules without hardcoding internal chunk names.
        output: {
          ...(!isDev
            ? {
                manualChunks(id: string) {
                  if (
                    id.includes('node_modules/maplibre-gl') ||
                    id.includes('node_modules/@maplibre/')
                  ) {
                    return 'maplibre';
                  }
                  if (
                    id.includes('node_modules/solid-js') ||
                    id.includes('node_modules/@solidjs/') ||
                    id.includes('node_modules/xstate') ||
                    id.includes('node_modules/@xstate/') ||
                    id.includes('node_modules/@tanstack/solid-router')
                  ) {
                    return 'vendor-core';
                  }
                  if (
                    id.includes('node_modules/@kobalte/') ||
                    id.includes('node_modules/solid-prevent-scroll') ||
                    id.includes('node_modules/solid-presence')
                  ) {
                    return 'vendor-ui';
                  }
                },
              }
            : {}),
        },
      },
      // outDir — `apps/<app>/dist/` (не `.capsule/dist/`). Vite-root указан в
      // `.capsule/`, но артефакт должен лежать рядом с `src/`, как ожидает
      // и пользователь `capsule build`, и `scripts/desktop.mjs` (default
      // `--dist=apps/<app>/dist`). Vite предупредит «outDir is outside of
      // root» — это намеренно.
      outDir: join(root, 'dist'),
      emptyOutDir: true,
    },
    optimizeDeps: {
      // Принудительно подготавливаем Solid + CJS-зависимости (xstate отдаёт
      // CJS-сборку, и без явного include esbuild не вытащит named exports —
      // в дев-сервере падает `does not provide an export named 'Actor'`).
      include: ['solid-js', 'solid-js/web', 'solid-js/store', 'xstate', '@xstate/solid'],
      // Исключаем внутренние пакеты монорепозитория из пре-бандлинга esbuild.
      // Благодаря этому Vite будет обрабатывать их на лету через плагины
      // (включая JSX транспиляцию).
      exclude: [
        '@capsuletech/web-core',
        '@capsuletech/web-dnd',
        '@capsuletech/web-flow',
        '@capsuletech/web-ui-creator',
        '@capsuletech/web-map',
        '@capsuletech/web-profiler',
        '@capsuletech/web-query',
        '@capsuletech/web-remote',
        '@capsuletech/web-renderer',
        '@capsuletech/web-router',
        '@capsuletech/web-state',
        '@capsuletech/web-style',
        '@capsuletech/web-ui',
      ],
    },
    plugins: [
      AutoImport({
        // NB: список wrapper'ов и define-фабрик — из единого источника
        // (plugins/constants). Когда добавляешь новый wrapper/factory —
        // правишь только constants.ts.
        //
        // `dirs:` намеренно НЕ задан. Раньше тут было
        // `dirs: [join(capsuleRoot, 'registry')]`, что заставляло
        // unplugin-auto-import сканировать `.capsule/registry/*.ts` и
        // экспонировать каждый named export (Widgets, Views, …, endpoints)
        // как глобальный identifier. Это создавало catastrophic circular:
        // AutoImport видит `endpoints` как identifier в createApi.ts (где
        // это локальный параметр, не declaration) → инжектит `import { endpoints }
        // from '/registry/endpoints'` → endpoints.ts тянет app-уровень
        // `src/endpoints/auth.ts` → auth.ts импортит `@capsuletech/web-query`
        // → cycle закрывается, evaluation web-query ещё не закончен,
        // defineEndpoint в TDZ → `ReferenceError: Cannot access
        // 'defineEndpoint' before initialization`.
        //
        // Runtime registry-объекты (`Widgets`/`Views`/…) НЕ нужны как
        // auto-import: wrappers.ts (сгенерированный CapsuleRegistryPlugin) сам делает
        // `Object.assign(globalThis, _registry)`, а TS-типизация приходит из slots.d.ts.
        // `endpoints` глобал не нужен вовсе —
        // в Feature идёт `services.api.X.Y(...)`, не `endpoints.X.Y`.
        imports: [
          { '@capsuletech/web-core': [...WRAPPER_NAMES] },
          ...Object.entries(HOOK_IMPORTS).map(([mod, names]) => ({
            [mod]: [...names],
          })),
          ...Object.entries(DEFINE_FACTORIES).map(([mod, names]) => ({
            [mod]: [...names],
          })),
        ],
        dts: './@types/capsule-imports.d.ts',
      }),
      HMRWrappingPlugin(),
      tsconfigPaths({
        projects: [join(root, 'tsconfig.json'), join(workspaceRoot, 'tsconfig.base.json')],
      }),
      EnsureScaffoldPlugin(capsuleRoot),
      CapsuleRegistryPlugin({
        capsuleRoot,
        watchDir,
        appConfigPath: join(root, 'capsule.app.ts'),
        onAppConfigLoad: (cfg) => {
          appConfigState.aliasKeys = new Set(Object.keys(cfg.aliases ?? {}));
        },
      }),
      tailwindcss(),
      AliasesPlugin({ appRoot: root, workspaceRoot }),
      CompliancePlugin({ mode: 'warn', appConfigState }),

      RouterPlugin({
        watchDir,
        outDir: join(capsuleRoot, 'routes'),
      }),
      // Exclude entities/ from solid-refresh HMR wrapping.
      // vite-plugin-solid internally uses solid-refresh which wraps every
      // `const X = SomeCall(...)` in a .tsx file into `(props) => SomeCall(...)`
      // for component hot-reload. Entity returns a plain config object (not a
      // Solid component), so that wrapping turns `Entities.Users` into a
      // function — any access to `.schema`/`.defaults` → TypeError at runtime.
      // HMRWrappingPlugin already skips Entity (RENDER_WRAPPER_NAMES only), but
      // solid-refresh is a separate babel pass that runs inside solidPlugin.
      // FilterPattern supports both slash styles; the regex covers Win (\) and
      // Unix (/) path separators.
      solidPlugin({ ssr: false, exclude: [/[\\/]entities[\\/]/] }),
    ],
    resolve: {
      dedupe,
      // Без `'development'` условия: оно бы перенаправило `@capsuletech/*` на
      // `./src/...`, который не публикуется в npm/Verdaccio (`files: ["dist"]`).
      // Для внешних воркспейсов это ломает резолв `@capsuletech/web-core/providers`
      // и т.п. App-сервер всегда читает собранный `dist/*.mjs` через `import`.
      conditions: ['solid', 'browser', 'import'],
    },
    server: {
      port: config.devServerPort || 3000,
    },
    esbuild: {
      tsconfigRaw: readFileSync(join(root, 'tsconfig.json'), 'utf-8'),
    },
  };

  return appConfig(capsuleConfig, isDev);
};
