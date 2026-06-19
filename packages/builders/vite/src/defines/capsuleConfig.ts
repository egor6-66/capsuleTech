import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IDesktopConfig } from '@capsuletech/desktop';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import {
  AliasesPlugin,
  AppSourceServePlugin,
  CapsuleRegistryPlugin,
  CompliancePlugin,
  createDevDiagnosticsPlugin,
  EnsureScaffoldPlugin,
  HMRWrappingPlugin,
  RouterPlugin,
  solidPlugin,
} from '../plugins';
import { DEFINE_FACTORIES, HOOK_IMPORTS, WRAPPER_NAMES } from '../plugins/constants';
import { appConfig } from './appConfig';

/**
 * Параметры раздачи app на self-hosted preview-сервер (ADR 024). Читаются
 * `@capsuletech/cli` командой `capsule deploy` — vite-builder сами поля НЕ
 * использует. Семантические свойства app (постоянные для всех релизов); infra
 * (server URL / bearer token) живёт в `docker/preview-server/.env`, а per-run
 * override'ы — CLI-флаги `--no-build` / `--dist`. CLI-флаги имеют приоритет
 * над конфигом.
 */
export interface IDeployConfig {
  /**
   * Раздать приложение под корнем `/` (testing-hub режим). Требует `base: '/'`
   * (или отсутствие `base`). Эквивалент CLI-флага `--root`.
   */
  root?: boolean;
  /**
   * Собирать с моками (`CAPSULE_MOCKS=true`) — для demo-app, которым нужен
   * preview без реального бэка. Эквивалент CLI-флага `--mocks`.
   */
  mocks?: boolean;
}

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
   * НЕ использует — это data-только поле, прокидывается через capsule.config.ts.
   */
  desktop?: IDesktopConfig;
  /**
   * Опциональная секция для `capsule deploy` (ADR 024). См. {@link IDeployConfig}.
   */
  deploy?: IDeployConfig;
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

  // Вычисляем флаг моков. Приоритет (убывающий):
  //   1. env CAPSULE_MOCKS='true'/'false'  — явный override (CLI-флаг или CI)
  //   2. config.deploy?.mocks             — статическое намерение из capsule.config.ts
  //      (позволяет `capsule build && capsule preview` без ручного env)
  //   3. isDev                            — дефолт: моки on в dev, off в build
  const mocks =
    process.env.CAPSULE_MOCKS != null
      ? process.env.CAPSULE_MOCKS === 'true'
      : config.deploy?.mocks != null
        ? config.deploy.mocks
        : isDev;

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
    // Static assets (favicons, robots.txt, capsule.manifest.json for remote-app,
    // etc.) live in `apps/<app>/public/` — the conventional Vite location.
    // Without this override Vite default would be `<root>/public` = `.capsule/public/`,
    // which is a generated directory and not the right place for hand-crafted assets.
    // Phase 1 of ADR-053 app-as-remote: manifest fetch 404 fix.
    // See: docs/_meta/briefs/builders-app-as-remote-dev-gaps-2026-06-19.md Phase 1
    publicDir: join(root, 'public'),
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
      rolldownOptions: {
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
      //
      // shared-* пакеты (shared-utils, shared-zod) тоже исключены — они workspace
      // пакеты с внешними deps (es-toolkit, zod). Без исключения esbuild пытается
      // пре-бандлить их вместе с app-кодом; workspace-границы при этом нарушаются.
      exclude: [
        '@capsuletech/shared-utils',
        '@capsuletech/shared-zod',
        '@capsuletech/web-agent',
        '@capsuletech/web-auth',
        '@capsuletech/web-core',
        '@capsuletech/web-dnd',
        '@capsuletech/boost-flow',
        '@capsuletech/boost-layout',
        '@capsuletech/boost-chart',
        '@capsuletech/web-studio',
        '@capsuletech/boost-map',
        '@capsuletech/web-profiler',
        '@capsuletech/web-query',
        '@capsuletech/web-remote',
        '@capsuletech/web-renderer',
        '@capsuletech/web-router',
        '@capsuletech/web-shell',
        '@capsuletech/web-state',
        '@capsuletech/web-style',
        '@capsuletech/web-intl',
        '@capsuletech/web-date',
        '@capsuletech/web-ui',
        '@capsuletech/boost-table',
        '@capsuletech/web-contract',
        '@capsuletech/web-access',
        '@capsuletech/web-docs',
        '@capsuletech/data-gen',
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
          // ADR-034: registry namespace imports.
          // Инжектируют `import { Widgets } from '@capsule/registry'` вместо
          // Object.assign(globalThis). Бандлер видит статический граф и
          // tree-shake'ит неиспользуемые слои по роутам.
          {
            '@capsule/registry': [
              'Widgets',
              'Views',
              'Features',
              'Shapes',
              'Controllers',
              'Entities',
            ],
          },
        ],
        dts: './@types/capsule-imports.d.ts',
      }),
      HMRWrappingPlugin(),
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
      // Phase 2 of ADR-053 app-as-remote dev-gap fix.
      // Rewrites `/src/*` → `/@fs/<appRoot>/src/*` so that manifest entry URLs
      // like `/src/standalone.tsx` are stable and portable (no /@fs/D:/... hacks).
      // TEMPORARY — remove when Variant B ADR (Vite root = appRoot) lands.
      AppSourceServePlugin({ appRoot: root }),
      // Dev-diagnostics stream → .capsule/dev-diagnostics.log (JSONL).
      // SessionStart hook агента подцепит файл через Monitor; каждая запись = notification.
      // Только в serve-режиме (apply: 'serve' внутри плагина); в build игнорируется.
      ...(isDev
        ? (() => {
            const { plugin, state } = createDevDiagnosticsPlugin({
              workspaceRoot,
              appRoot: root,
            });
            return [
              plugin,
              CompliancePlugin({
                mode: 'warn',
                appConfigState,
                onDiagnostic: (file, violations) => {
                  if (violations.length === 0) {
                    state.clearFor('compliance', file);
                    return;
                  }
                  state.emit(
                    violations.map((v) => ({
                      ts: Date.now(),
                      type: 'compliance' as const,
                      severity: v.severity,
                      file: v.file,
                      line: v.line,
                      col: v.column,
                      code: v.kind,
                      message: v.message,
                    })),
                  );
                },
              }),
            ];
          })()
        : [CompliancePlugin({ mode: 'warn', appConfigState })]),

      RouterPlugin({
        watchDir,
        outDir: join(capsuleRoot, 'routes'),
        appRoot: root,
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
      // Нативная поддержка Vite 8: читает tsconfig.json, следует extends-цепочке
      // (app tsconfig.json → tsconfig.base.json), резолвит @capsuletech/* пути.
      // Заменяет vite-tsconfig-paths плагин (убран из plugins[] выше).
      // Layer-алиасы (@widgets/*, @entities/*, ...) по-прежнему через AliasesPlugin
      // → resolve.alias (они в paths.config.json, не в tsconfig.base.json).
      tsconfigPaths: true,
      // ADR-034: '@capsule/registry' alias registered by CapsuleRegistryPlugin
      // via configResolved hook (app-specific, per-capsuleRoot).
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
