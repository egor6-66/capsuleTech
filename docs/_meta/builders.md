---
tags: [meta, builders, ai-context]
status: documented
type: ai-anchor
audience: claude
last_updated: 2026-06-13
---

# 🤖 @capsuletech/builders — AI context anchor

> [!ai]
> Шпаргалка для Claude-инстансов, которые лезут в `packages/builders/`. Без воды. Юзеру — [[builders|builders.md]].

## TL;DR {#tldr}

5 build-time пакетов: `lib-builder` — zero-deps leaf (libConfig для любого пакета). `vite-builder` — рантайм для apps (dev-server + 9 плагинов). `docs-builder` — engine + Vite plugin для docs-as-data (ADR 052). `compliance` — AST-линтер HCA-правил. `biome-config` — shared lint preset. Релизятся ОДНОЙ группой `cli` в `nx.json` (fixed, releaseTagPattern `cli@{version}`) вместе с `@capsuletech/cli` и `shared-file-manager`. Корневой `docs/` vault бандлится в `@capsuletech/web-docs` (Phase 3.6 — бывший wrapper `@capsuletech/docs` удалён).

**Phase 3 (ADR 052) done (2026-06-16, после refactor Phase 3.5):** `@capsuletech/docs-builder` владеет engine `extractDocs()` + `DocsExtractPlugin` + CLI `capsule-docs`. lib-builder и vite-builder про docs не знают (zero-deps leaf сохранён). Consumers attach plugin явно: `libConfig({ plugins: [DocsExtractPlugin({ ... })] })`. `docs/_build/extract.mjs` удалён.

**Phase 3.6 done (2026-06-17):** wrapper `@capsuletech/docs` удалён, корневой `docs/` vault теперь бандлится самим `@capsuletech/web-docs` (viewer пакетом) — он эмитит `packages/web/docs/dist/docs.json` (181 doc) рядом с runtime'ом. `pnpm docs:build` → `pnpm --filter @capsuletech/web-docs build`. Причина: wrapper-пакет был content-delivery-vehicle без библиотечной ценности; viewer и его «дефолтный контент» (root capsule vault) = одна вещь.

Главное правило: **build-time пакеты живут тут**. Runtime cross-group — в `packages/shared/`. Критерий — используется в `vite.config.mts` чужих пакетов / `capsule.config.ts` apps'ов, а не в их JSX.

## Топология (после ADR 010)

```
packages/builders/
  lib/           @capsuletech/lib-builder    zero-deps, libConfig() для Vite
  vite/          @capsuletech/vite-builder   capsuleConfig + 9 плагинов
  docs-builder/  @capsuletech/docs-builder   docs-as-data engine + Vite plugin + bin
  compliance/    @capsuletech/compliance     AST-линтер HCA-слоёв
  biome/         @capsuletech/biome-config   biome.json preset (НЕТ src/dist!)
```

Цепочка зависимостей (НЕ должна циклить):
```
vite-builder → compliance (runtime через CompliancePlugin)
compliance   → lib-builder (build-time, в vite.config.mts)
lib-builder  → ничего (zero-deps leaf)
biome-config → ничего (zero-deps, чисто config-файл)
```

Поэтому `libConfig` живёт ОТДЕЛЬНО от `vite-builder`. Если положить в один пакет — bootstrap-цикл. Re-export `vite-builder/defines/libConfig.ts` сохраняет публичный API.

## Где что лежит {#layout}

| Файл | Что |
|---|---|
| `packages/builders/lib/src/libConfig.ts` | Vite `UserConfig`-фабрика для библиотек: external selector, dts, `cleanRootPkgForDist` |
| `packages/builders/lib/src/__tests__/libConfig.test.ts` | характеризационные тесты на external + cleanRootPkgForDist (S-3 регрессия) |
| `packages/builders/vite/src/defines/capsuleConfig.ts` | главный конфиг dev-сервера для apps; собирает плагины. `ICapsuleConfig` содержит `base?: string` — прокидывается как Vite `base` (дефолт `'/'`). Инжектирует `__CAPSULE_MOCKS__` (boolean-литерал) через Vite `define` для tree-shaking моков. |
| `packages/builders/vite/src/defines/appConfig.ts` | минимальный конфиг для plain Vite apps без HCA |
| `packages/builders/vite/src/defines/libConfig.ts` | re-export `libConfig` из `@capsuletech/lib-builder` (legacy compat) |
| `packages/builders/vite/src/actions.ts` | `createDevCapsuleServer / buildCapsuleApp` — обёртки над Vite, дёргаются из CLI |
| `packages/builders/vite/src/plugins/constants.ts` | **SSOT** для `WRAPPER_NAMES`, `DEFINE_FACTORIES`, `LAYER_TO_NAMESPACE` |
| `packages/builders/vite/src/plugins/HMRWrapping.ts` | babel-AST pre-transform: `const X = Page(...)` → `(props) => Page(...)(props)` + `export default` |
| `packages/builders/vite/src/plugins/capsuleRegistry.ts` | **Unified codegen orchestrator.** Владеет ВСЕМ что генерируется в `.capsule/`. `LAYER_INIT_ORDER` — единственная точка контроля порядка инициализации. Stateless sub-generators: `generateWrappersRuntime`, `generateEndpointsRuntime`, `generateAppConfigRuntime`, `generateBootstrap`. Единый watcher на `src/**`. Заменяет ExportGeneratorPlugin + EndpointsRegistryPlugin + AppConfigPlugin (codegen). Генерирует `.capsule/bootstrap.tsx` детерминированно (не статический template). Alias `@capsule/registry` регистрируется через **`config()`-хук** (не `configResolved`!) — только так alias попадает и в dev-resolver, и в build (см. ADR-034 dev fix). |
| `packages/builders/vite/src/plugins/__tests__/capsuleRegistry.test.ts` | Тесты pure sub-generators + LAYER_INIT_ORDER контракт + transform hooks + ordering regression |
| `packages/builders/vite/src/plugins/__tests__/codegenOrchestrator.test.ts` | Тесты нового оркестратора: plugin shape, config alias, transform chain, sub-gen factory contract, ordering invariant |
| `packages/builders/vite/src/plugins/codegen/interfaces.ts` | **CodegenContext + SubGenerator контракты** (ADR 037) |
| `packages/builders/vite/src/plugins/codegen/orchestrator.ts` | **createCapsuleRegistryPlugin** — новый публичный API оркестратора. Принимает массив SubGenerator, единый watcher, dispatch, flush по order |
| `packages/builders/vite/src/plugins/codegen/index.ts` | barrel: createCapsuleRegistryPlugin + createXxxSubGenerator + type SubGenerator/CodegenContext |
| `packages/builders/vite/src/plugins/codegen/shared.ts` | re-export чистых генераторов из capsuleRegistry.ts для кастомных sub-gen модулей |
| `packages/builders/vite/src/plugins/codegen/generators/barrelRegistry.ts` | SubGenerator order:10 — barrel-registry + @capsule/registry alias + legacy cleanup |
| `packages/builders/vite/src/plugins/codegen/generators/endpoints.ts` | SubGenerator order:20 — endpoints.ts + api.d.ts + defineEndpoint transform |
| `packages/builders/vite/src/plugins/codegen/generators/appConfig.ts` | SubGenerator order:30 — app-config.gen.ts + app-tags.d.ts + defineAppConfig transform |
| `packages/builders/vite/src/plugins/codegen/generators/packages.ts` | SubGenerator order:40 — registry/packages.ts + packages.d.ts |
| `packages/builders/vite/src/plugins/codegen/generators/docs-sources.ts` | SubGenerator order:50 — registry/docs-sources.ts (opt-in через `docs:` поле в capsule.app.ts). Exports: `createDocsSourcesSubGenerator`, `generateDocsSourcesRuntime`, `derivePackageShort`, `checkDocsJsonExport` |
| `packages/builders/vite/src/plugins/codegen/generators/bootstrap.ts` | SubGenerator order:90 — bootstrap.tsx (assembled last) |
| `packages/builders/vite/src/plugins/router/index.ts` | RouterPlugin: ensureRoot + page-mirror generator + TanStackRouterVite |
| `packages/builders/vite/src/plugins/router/template/__root.tsx.template` | шаблон корневого route |
| `packages/builders/vite/src/plugins/scaffold/index.ts` | EnsureScaffoldPlugin: копирует `index.html / index.ts / paths.config.json / styles.css` в `.capsule/` если их нет. `bootstrap.tsx` **НЕ** в списке — генерируется `CapsuleRegistryPlugin`. |
| `packages/builders/vite/src/plugins/scaffold/template/*.template` | 4 статических шаблона. `bootstrap.tsx.template` остаётся как историческая ссылка, больше не используется автоматически. |
| `packages/builders/vite/src/plugins/compliance.ts` | тонкая обёртка над `check()` — режимы warn/error |
| `packages/builders/vite/src/plugins/aliases.ts` | AliasesPlugin: мержит base + local paths → `.capsule/tsconfig.paths.json`; emit'ит Vite `resolve.alias` |
| `packages/builders/vite/src/plugins/staticCopy.ts` | `closeBundle`-копировальщик файлов; используется в собственном vite.config.mts |
| `packages/builders/vite/src/plugins/html.ts` | **МЁРТВЫЙ** — `HtmlPlugin` без потребителей |
| `packages/builders/vite/src/utils/walk.ts` | `walkFiles(dir)` — рекурсивный обход для initial-scan (chokidar `ignoreInitial: true` пропускает) |
| `packages/builders/vite/src/utils/watcher.ts` | singleton `WatcherManager` — один `server.watcher.on('all')` на много подписчиков |
| `packages/builders/vite/src/utils/generateFromTemplates.ts` | **МЁРТВЫЙ** — RouterPlugin перешёл на inline `ROUTE_TEMPLATE` |
| `packages/builders/compliance/src/classify.ts` | `classify(absPath) → Layer` + `extractGroup` (берёт имя группы из пути) |
| `packages/builders/compliance/src/rules.ts` | `RUNTIME_ALLOWED` (allowlist по слоям), `LAYER_PREFIXES`, `CROSS_LAYER_ALLOWED` |
| `packages/builders/compliance/src/check.ts` | главный чекер: babel parse → traverse → 5 видов violations |
| `packages/builders/compliance/src/format.ts` | `formatViolation/s` для лога Vite |
| `packages/builders/biome/biome.json` | сам preset; root репо делает `extends: ["./packages/builders/biome/biome.json"]` (filepath) |

## Single Source of Truth

`packages/builders/vite/src/plugins/constants.ts` — **обязательно править ТОЛЬКО его**, не дублируй списки в плагинах:

- `WRAPPER_NAMES = ['Page', 'Widget', 'View', 'Controller', 'Feature', 'Shape', 'Entity']` — потребители: HMRWrappingPlugin, AutoImport в capsuleConfig
- `DEFINE_FACTORIES = { '@capsuletech/web-query': ['defineEndpoint'] }` — config-time фабрики: (1) попадают в AutoImport для TSX-файлов, (2) **`CapsuleRegistryPlugin.transform` инжектирует их в `src/endpoints/**` как enforce:'pre'** (TDZ-safe, без зависимости от AutoImport timing)
- `LAYER_TO_NAMESPACE = { widgets: 'Widgets', views: 'Views', controllers: 'Controllers', features: 'Features', shapes: 'Shapes', entities: 'Entities' }` — mapping для `CapsuleRegistryPlugin` (sub-generator wrappers)
- `EAGER_IMPORT_LAYERS = Set(['entities'])` — слои, для которых `CapsuleRegistryPlugin` генерирует eager `import X from '...'` вместо `lazy()`. Entity — plain value (zod schema), не Solid component.

Добавляешь новый слой → правишь ОДИН файл, плагины подхватят.

## Sub-generator архитектура (ADR 037 P1)

**`createCapsuleRegistryPlugin`** — новый публичный API (замена будущих consumers; `CapsuleRegistryPlugin` остаётся для backward compat).

```ts
import { createCapsuleRegistryPlugin, type SubGenerator } from '@capsuletech/vite-builder';

// Добавить новый саб-ген:
const myGen: SubGenerator = {
  id: 'my-manifest',
  order: 50,          // между packages(40) и bootstrap(90)
  match: (file) => file.includes('/widgets/'),
  onEvent: (ev, file, ctx) => { /* обновить стейт */ return true; },
  flush: (ctx, forced) => { ctx.writeOut(..., content); },
  bootstrap: (ctx) => ({ phase: 'subsystems', importPath: './my-manifest' }),
};

const plugin = createCapsuleRegistryPlugin({
  capsuleRoot, watchDir, appConfigPath,
  extraGenerators: [myGen],
});
```

**CodegenContext** — shared context (writeOut / removeOut / parse / names / loadAppConfig).

**Порядок flush:** barrel(10) → endpoints(20) → app-config(30) → packages(40) → docs-sources(50) → [extra] → bootstrap(90).

**Bootstrap** всегда последний — собирает `bootstrap.tsx` из двух источников (P2 реализован, 2026-06-17):
1. `LAYER_INIT_ORDER` (legacy, всегда присутствует — packages/app-config/routes)
2. `bootstrap()` вкладов всех остальных sub-gen'ов (например docs-sources)

`generateBootstrap(contributions?)` принимает опциональный массив `BootstrapContribution[]`. Вклады дедуплицируются по `importPath` (если sub-gen дублирует LAYER_INIT_ORDER — пропускается). Порядок: LAYER_INIT_ORDER first, contributions after (в порядке gen.order).

**docs-sources bootstrap() условный:** возвращает contribution только если `_hasFile === true` (файл был записан в последнем flush). При отсутствии `docs:` поля в appConfig — возвращает null, bootstrap.tsx не импортирует несуществующий файл.

**Bootstrap onAppConfigChange:** теперь `dirty = true; return true` — пересобирается при изменении appConfig (т.к. opt-in sub-gen'ы могут изменить свой вклад).

**Добавить новый codegen-вывод** = 1 файл (`plugins/codegen/generators/myGen.ts`) + регистрация в `createCapsuleRegistryPlugin > extraGenerators`. Оркестратор не трогаем.

## Главный поток в dev (что собирается в каком порядке)

```
1. CLI (apps/<app>/project.json dev-таргет) дёргает createDevCapsuleServer
2. capsuleConfig() собирает плагины:
   - AutoImport              (импорты wrapper'ов и define-фабрик)
   - HMRWrappingPlugin       (pre-transform всех .tsx/.ts)
   - tsconfigPaths           (резолв @capsuletech/* и @entities/* из tsconfig)
   - EnsureScaffoldPlugin    (config-хук: гарантирует статические scaffold-файлы в .capsule/)
   - CapsuleRegistryPlugin   (enforce:'pre' transform + buildStart/configureServer:
                               - scan src/** → registry/wrappers.ts + slots.d.ts
                               - scan endpoints/** → registry/endpoints.ts + api.d.ts
                               - jiti-load capsule.app.ts → app-config.gen.ts + app-tags.d.ts
                               - ГЕНЕРИРУЕТ bootstrap.tsx по LAYER_INIT_ORDER
                               - единый watcher на src/**)
   - tailwindcss
   - AliasesPlugin           (config-хук: tsconfig.paths.json + resolve.alias)
   - CompliancePlugin        (pre-transform: check() на каждый файл)
   - RouterPlugin            ([ensureRootRoutePlugin, GeneratorPlugin, TanStackRouterVite])
   - solidPlugin
3. Vite root = apps/<app>/.capsule/, outDir = apps/<app>/dist/
4. bootstrap.tsx (сгенерирован CapsuleRegistryPlugin, import order = LAYER_INIT_ORDER):
   - Phase globals:   import './registry/wrappers'   ← Object.assign(globalThis, ...) здесь
   - Phase subsystems: import './app-config.gen'     ← registerAliases + createApi
   - Phase render:    import { routeTree } ...       ← TanStack Router
```

**LAYER_INIT_ORDER** — единственная точка контроля порядка загрузки. Добавляешь новый слой → добавляешь запись в `LAYER_INIT_ORDER` в `capsuleRegistry.ts` + пишешь sub-generator. Порядок в `bootstrap.tsx` обновится автоматически.

## Rolldown — статус Ф1 (2026-06-04)

### Механизм включения

В **Vite 8** Rolldown является **бандлером по умолчанию для `build`** — Rollup полностью заменён без каких-либо флагов. Подтверждение: `rolldown` прямая dep Vite 8 (`"rolldown": "1.0.1"` в package.json vite), в выводе build присутствует `dist/assets/rolldown-runtime-*.js` и `[PLUGIN_TIMINGS]` из Rolldown CLI.

Для dev-сервера в Vite 8 также доступен экспериментальный **Rolldown-bundled dev server**: `experimental.bundledDev: true` в Vite config (`configDefaults.experimental.bundledDev = false`). Создаёт `FullBundleDevEnvironment` вместо transform-on-demand. Текущий статус: **не включён** (оставлен в default=false).

Никакого внешнего пакета `rolldown-vite` устанавливать **не нужно** — Rolldown встроен в Vite 8.

### Ф1 прогон — результаты (2026-06-04)

**Build:**

| App | Модулей | Время | Rolldown runtime chunk | Статус |
|---|---|---|---|---|
| ewc (production) | 3034 | 5.71s | rolldown-runtime-D7Y0JD-f.js 0.67kB | ✅ OK |
| ui-creator (production) | 3067 | 6.11s | rolldown-runtime-D7Y0JD-f.js 0.67kB | ✅ OK |
| vite-builder self-build | 408 | 2.06s | — (SSR/lib mode) | ✅ OK |

**Dev server (experimental.bundledDev: true):**

Тест через programmatic createServer с capsuleConfig plugins + `experimental.bundledDev: true`:
- `FullBundleDevEnvironment` создаётся корректно
- Все 14 плагинов проходят config-хук без ошибок
- RouterPlugin, EnsureScaffoldPlugin, CapsuleRegistryPlugin работают
- `@babel/traverse` CJS-interop не затронут (babel runs в transform hooks, не в rolldown pipeline)
- Статус: **виабелен**, но НЕ включён пока (не production-ready в Vite 8.0.x)

**E2E smoke:** `pnpm test:e2e:cli` — все шаги прошли (verdaccio → release-local → create-app → dev + curl).

### Rolldown-специфичные наблюдения

| Компонент | Статус | Детали |
|---|---|---|
| `TanStackRouterVite` | ✅ OK | Работает как Rollup-compatible plugin |
| `vite-plugin-solid` + `solid-refresh` | ✅ OK | transform-hooks совместимы |
| `unplugin-auto-import` | ✅ OK | No issues |
| `@tailwindcss/vite` | ✅ OK с warning | `[lightningcss minify] Unknown at rule: @theme` — известный косметический warning Tailwind v4 |
| `HMRWrappingPlugin` | ✅ OK | babel-AST transform в Vite plugin hook — совместим |
| `CapsuleRegistryPlugin` | ✅ OK | enforce:'pre' transform hook совместим |
| `CompliancePlugin` | ✅ OK | Показывает 12-14% plugin time в PLUGIN_TIMINGS |
| `AliasesPlugin` | ✅ OK | resolve.alias hook совместим |
| `RouterPlugin` | ✅ OK | TanStackRouterVite wrapper работает |
| `@babel/traverse` CJS-interop | ✅ OK | `_traverse.default ?? _traverse` pattern продолжает работать |
| `vite-tsconfig-paths` | ⚠️ Deprecated | Vite 8 выдаёт warn: use `resolve.tsconfigPaths: true` вместо плагина. Занимает 40-42% plugin-time. |
| `optimizeDeps.exclude` | ✅ Актуален | Для `@capsuletech/web-*` пакетов по-прежнему нужен в стандартном dev-режиме |
| `resolve.conditions` | ✅ OK | `['solid', 'browser', 'import']` работает |
| `manualChunks` (rollupOptions) | ✅ OK | Rolldown принимает `rolldownOptions` (alias к `rollupOptions`), предупреждает о deprecated rollupOptions |

### Что схлопывается в Ф2

**`vite-tsconfig-paths` → `resolve.tsconfigPaths: true`** (нативный Vite 8):
- Экономия 40-42% plugin-time по данным `[PLUGIN_TIMINGS]`
- App tsconfig.json уже `extends tsconfig.base.json` → нативный find-up подхватит полную цепочку
- Риск: root точка — `.capsule/` (нет своего tsconfig), find-up пойдёт в `apps/<app>/tsconfig.json` — OK
- Риск 2: `.capsule/tsconfig.paths.json` генерируется `AliasesPlugin` — нативный tsconfigPaths читает extends-chain, включая `tsconfig.paths.json`. Нужно проверить timing.
- **Не откатываем пока** — требует отдельного тестирования в Ф2

### 🔴 Стабильные грабли

0. **[CLOSED 2026-06-05] `@capsule/registry` alias — `configResolved` не виден dev-resolver'у.** ADR-034 phase 2 регистрировал alias мутацией `config.resolve.alias.push(...)` в `configResolved`. Rolldown подхватывает post-resolution мутацию на build — отсюда `vite build` работал. Dev-server строит свой resolver из конфига ДО configResolved → alias отсутствует → `Failed to resolve import "@capsule/registry"`. Фикс: alias регистрируется через **`config()` hook** (return `{ resolve: { alias: { '@capsule/registry': path } } }`). Тест: `CapsuleRegistryPlugin.config hook` в `capsuleRegistry.test.ts`. Проверено через `resolveConfig` (11 alias entries включая наш).

1. **biome-config — config-only пакет.** Нет `src/`/`dist/`. `package.json`: `files: ["biome.json"]` + `exports: { "./biome.json": "./biome.json" }`. Тарбол содержит `biome.json`, внешний consumer пишет `"extends": ["@capsuletech/biome-config/biome.json"]`. `dev:builders` в root исключает пакет (`--filter "!@capsuletech/biome-config"`), потому что у него нет `build`/`dev` — это нормально, не баг.

2. **Compliance allowlist outdated** ([rules.ts](../../packages/builders/compliance/src/rules.ts)) — ссылки на `@capsuletech/style/state/router/ui`, но реальные пакеты теперь `@capsuletech/web-*`. Regex не матчит → каждый widget/page-импорт `@capsuletech/web-ui` → `disallowed-import`. Не падает только потому что `mode: 'warn'`. Тесты `check.test.ts` тоже на старых именах. Фикс — обновить regex + тесты.

3. **vite-builder `bundleDependencies` stale** ([vite.config.mts:23](../../packages/builders/vite/vite.config.mts:23)) — `/^@capsuletech\/shared-compliance/` от старого имени. Должно быть `/^@capsuletech\/compliance/`. Сейчас compliance остаётся external в dist (работает через workspace, но intent комментария нарушен).

### 🟡 По месту

4. **HMRWrappingPlugin матчит wrapper по identifier-name.** Если пишешь `import { Page as MyPage }` — HMR молча сломается. AutoImport инжектит чистые имена, edge case, но знай.

5. **`@babel/traverse` и `@babel/generator` — CJS** — оба плагина (`HMRWrapping`, `compliance/check`) делают `_traverse.default ?? _traverse` interop. Не трогай без понимания, оборачивается ещё одним слоем после ESM-import default.

6. **CapsuleRegistryPlugin.transform defineAppConfig — known limitation** — regex replace bare-identifier; `defineAppConfig` в комментариях тоже превратится в `((__x__)=>__x__)`. Безобидно (identity), но мусорит код. ADR 013 — миграция на explicit-import закрывает class бага. Legacy-bridge остаётся для existing apps.

7. **`vite.config.mts` deep-imports** — `import { staticCopyPlugin } from './src/plugins/staticCopy'` минуя barrel, чтобы esbuild не вытянул `CompliancePlugin → compliance/dist`. Магия не видна из barrel'а. Если кто-то трогает plugins/index.ts — может сломать silently.

8. **Двойной initial-scan ЗАКРЫТ** — `CapsuleRegistryPlugin` использует единый флаг `scanned` и один `walkFiles` на `buildStart`. Больше не дублируется.

14. **`slots.d.ts` даёт И тип, И значение — не возвращай плюрали в AutoImport `dirs`.** `generateWrappersTypes` эмитит `interface <NS> {...}` (тип) и `const <NS>: <NS>;` (ambient value-binding) для всех шести namespace'ов. Именно `const` делает `<Widgets.X>` и `Widgets.X.Y` валидными значениями в app-TSX — TS без него видит только тип, не значение. Коммит #165 убрал `dirs:`-сканирование registry из AutoImport (правильно: создавало circular через `endpoints`); плюрали не должны возвращаться в `AutoImport > imports` — это воскресит цикл. Value binding остаётся исключительно в `slots.d.ts`; рантайм-значения заполняет `wrappers.ts` через `Object.assign(globalThis, ...)`.

9. **Мёртвый код** — `vite/src/utils/generateFromTemplates.ts`, `vite/src/plugins/html.ts` (HtmlPlugin). Можно удалять без последствий.

10. **CHANGELOG.md в compliance/vite** — 60+ записей "version bump only". Побочка release-group `cli` (fixed). Не actionable.

11. **[[shared-vite-dist]] цикл** — после правок в `packages/builders/vite/src/` обязательно `pnpm --filter @capsuletech/vite-builder build` + рестарт dev-сервера. Без ребилда твоё изменение не видно — apps читают dist/, не src/. Smoke-test: `console.log('[plugin] loaded')` на верхнем уровне (вне transform).

12. **Scaffold templates не попадают в dist автоматически** — `EnsureScaffoldPlugin` при runtime'е читает `.template`-файлы из `dist/plugins/scaffold/template/` (через `__dirname`). Но `libConfig` / rollup не копируют non-JS ресурсы — нужна явная запись в `staticCopyPlugin` в `vite/vite.config.mts`. Если добавить новый `.template`-файл в `src/` без добавления в `staticCopyPlugin` → `copyFile` бросит ENOENT при запуске dev-сервера, scaffold тихо ломается. Фикс уже применён (2026-05-20): `scaffold/template` копируется в `dist/plugins/scaffold/template/`.

13. **[CLOSED 2026-05-28] Layer init ordering — ESM hoisting TDZ.** Fix: `wrappers.ts` выполняет `Object.assign(globalThis, ...)` как top-level side-effect. `bootstrap.tsx` теперь **генерируется** `CapsuleRegistryPlugin` по `LAYER_INIT_ORDER` — порядок фаз (globals → subsystems → render) невозможно нарушить случайно.

### RouterPlugin как потенциальный SubGenerator (отложено)

RouterPlugin уже использует тот же `watcherManager`. Консолидация в один watcher технически возможна, но:
- FileGenerator — async (`async fileGenerator`), все остальные sub-gens синхронны в `flush`
- `ensureRootRoutePlugin` должен запускаться до `TanStackRouterVite` (отдельный Vite plugin)
- `TanStackRouterVite` — внешний плагин, не может быть Sub-generator

Вывод: RouterPlugin лучше оставить отдельным плагином-тройкой (`[ensureRoot, generator, TanStackRouterVite]`). Консолидация watcher-подписки не даёт пользы, риск async-рассинхрона — неоправдан. Отдельный шаг если понадобится.

## Что менять когда {#changes-guide}

| Хочу… | Куда лезть |
|---|---|
| Добавить новый wrapper-слой (например `Layout`) | `vite/src/plugins/constants.ts > WRAPPER_NAMES` + `LAYER_TO_NAMESPACE` (если нужен registry) |
| Добавить новую define-фабрику (`defineRoute`/`defineShape`) | `vite/src/plugins/constants.ts > DEFINE_FACTORIES` |
| **Добавить новый генерируемый слой с контролем порядка загрузки** | `vite/src/plugins/capsuleRegistry.ts > LAYER_INIT_ORDER` (новая запись) + stateless sub-generator + `generateBootstrap()` подхватит автоматически |
| Добавить новый Vite-плагин (не codegen) | `vite/src/plugins/<name>.ts` + barrel `plugins/index.ts` + регистрация в `capsuleConfig.ts > plugins[]` |
| Расширить compliance allowlist для app | НЕ править `rules.ts`. Передавай `extraAllowed: { feature: [/^@my\/api/] }` в `CompliancePlugin({ extraAllowed })` |
| Добавить новое нарушение в линтер | `compliance/src/check.ts > IViolation['kind']` + handler в `traverse()` + `format.ts > ICONS` + тест в `check.test.ts` |
| Поменять Rollup external-policy для lib | `lib/src/libConfig.ts > rollupExternalSelector` или передавай `bundleDependencies: […]` |
| Добавить новый статический scaffold-файл | `vite/src/plugins/scaffold/template/<name>.template` + `vite/src/plugins/scaffold/index.ts > FILES` + `vite/vite.config.mts > staticCopyPlugin` |
| Поменять формат route-файла | `vite/src/plugins/router/index.ts > ROUTE_TEMPLATE` (inline string) |
| Поменять формат `wrappers.ts` или `slots.d.ts` | `vite/src/plugins/capsuleRegistry.ts > generateWrappersRuntime / generateWrappersTypes`. **slots.d.ts должна содержать И `interface <NS>`, И `const <NS>: <NS>;` для каждого namespace — иначе плюральные реестры станут type-only и app-TSX не скомпилируется.** |
| Поменять формат `endpoints.ts` или `api.d.ts` | `vite/src/plugins/capsuleRegistry.ts > generateEndpointsRuntime / generateEndpointsTypes` |
| Поменять формат `app-config.gen.ts` | `vite/src/plugins/capsuleRegistry.ts > generateAppConfigRuntime(aliases, opts?)` — `opts.hasAccess` / `opts.hasAuthSession` управляют условной эмиссией `web-access` / `web-auth/session` блоков |
| Поменять порядок import'ов в `bootstrap.tsx` | `vite/src/plugins/capsuleRegistry.ts > LAYER_INIT_ORDER` |
| **Добавить controllers из integration-пакета в глобал `Controllers`** | Прописать `controllers` в `/capsule`-манифесте пакета (`manifest.controllers = { Editor: ... }`). `CapsuleRegistryPlugin` через jiti прочитает ключи в `resolveManifestInfo` → `controllerKeys`. `generatePackagesRuntime` смержит каждый ключ через `(globalThis.Controllers ??= {})[key] = ...` (augment, не overwrite). `generatePackagesTypes` добавит `interface Controllers { Key: typeof import('...')[...] }` в `declare global` блок `packages.d.ts`. |
| **Подключить docs-as-data для app** | App добавляет `docs: { rootVault?: true, packages?: ['@capsuletech/web-ui'] }` в `capsule.app.ts`. `DocsSourcesSubGenerator` (order:50) читает поле → проверяет `./docs.json` export в `package.json` каждого пакета → эмитит `.capsule/registry/docs-sources.ts` с `setDocsSources({...})` вызовом. Нет поля `docs:` → file cleanup. |
| **Добавить новый пакет с docs** | Убедись что `package.json` пакета имеет `exports['./docs.json']`. Затем добавь имя пакета в `capsule.app.ts > docs.packages`. Короткий ключ выводится автоматически через `derivePackageShort()` (strip @scope/ prefix). |
| Поменять путь под которым раздаётся app (sub-path deploy) | `capsule.config.ts > base: '/path/'` → уходит в Vite `base`; `bootstrap.tsx` подхватывает через `import.meta.env.BASE_URL` |
| Включить моки в prod-сборке (preview-deploy) | `CAPSULE_MOCKS=true capsule build` — env-флаг прокидывается в `__CAPSULE_MOCKS__`. Без флага: dev=true/build=false. App: `if (__CAPSULE_MOCKS__) { ... }`. TS-тип: `declare const __CAPSULE_MOCKS__: boolean;` в env.d.ts. |
| Поменять biome-правила | `biome/biome.json` (root репо подхватит через extends) |
| **Добавить `/controllers` subpath в integration-пакет** | см. «Конвенция `/controllers` subpath» ниже — libConfig multi-entry, package.json exports, tsconfig.base.json path, dep web-core |

## Конвенция `/controllers` subpath (ADR 032, Фаза 2)

Integration-пакеты (`web-dnd`, `web-renderer`, `web-ui-creator`, …) экспонируют opt-in HCA-прослойку через subpath `@capsuletech/<pkg>/controllers`. Ниже — полная пошаговая инструкция для owner'а пакета.

### Механизм (уже работает — новая машинерия не нужна)

`lib-builder` поддерживает multi-entry через `entry: Record<string, string>` в `libConfig()`. web-ui-creator использует это сейчас для `/manifests`, `/state`, `/inspector`, `/generators` — ровно тот же механизм нужен для `/controllers`. Авто-дискавери нет: каждый entry регистрируется **явно** в `vite.config.mts` пакета.

Rollup вывод: `entryFileNames: '[name].mjs'` — значит entry `controllers` → `dist/controllers.mjs`. DTS-плагин эмитит `dist/controllers/index.d.ts` (`entryRoot: 'src'`, mirror-структура).

### Пошагово: что прописать owner'у пакета

**1. Структура src**

```
packages/web/<pkg>/src/controllers/index.ts   ← публичный API subpath'а
packages/web/<pkg>/src/controllers/           ← всё остальное внутри
```

`src/controllers/index.ts` импортирует `@capsuletech/web-core` и экспортирует готовые Controller'ы / meta-aware entry-points.

**2. `vite.config.mts` — добавить entry**

```ts
export default libConfig({
  entry: {
    index: 'src/index.ts',
    // ...существующие entries...
    controllers: 'src/controllers/index.ts',   // ← добавить
  },
  name: 'Capsule<Pkg>',
});
```

**3. `package.json` — добавить exports-запись**

```json
"./controllers": {
  "types": "./dist/controllers/index.d.ts",
  "import": "./dist/controllers.mjs",
  "default": "./dist/controllers.mjs"
}
```

Паттерн: `types` → зеркальная DTS-папка (`dist/<entry>/index.d.ts`), `import`/`default` → плоский `.mjs` (`dist/<entry>.mjs`). Точно такой же паттерн, как у `/manifests`, `/state` и т.д. в web-ui-creator.

**4. `tsconfig.base.json` — добавить path-alias**

```json
"@capsuletech/web-<pkg>/controllers": [
  "packages/web/<pkg>/src/controllers/index.ts"
]
```

Это позволяет app-коду и тестам резолвить subpath через workspace-src без сборки. Редактирует **главный assistant** (root-level файл — не зона owner'а пакета).

**5. Зависимость на `@capsuletech/web-core`**

`/controllers`-код живёт в том же пакете, что и generic-ядро, поэтому `web-core` добавляется как **package-level dep** (не subpath-level — npm не поддерживает per-entry deps):

```json
"dependencies": {
  "@capsuletech/web-core": "workspace:*"
}
```

Generic-ядро пакета (`src/index.ts`) при этом web-core **не импортирует** — только `src/controllers/**`. Tree-shaking на уровне бандлера обеспечивает ацикличность: `dist/index.mjs` не тянет `dist/controllers.mjs`. Ацикличность архитектурная: subpath → web-core, web-core → ничего из этих пакетов.

**6. Пересборка и рестарт**

После добавления нового entry — пересобери пакет (`pnpm --filter @capsuletech/<pkg> build`) и перезапусти dev-сервер. Vite читает `optimizeDeps`/резолвы на старте. Новый subpath в tsconfig.base.json требует рестарта TS language server.

### Что owner НЕ делает сам

- Правку `tsconfig.base.json` (root-level — главный assistant).
- Правку compliance allowlist (`rules.ts`) — не нужна: `/controllers` не в слоях `widgets/entities/…`, compliance-линтер файлы вне `src/` слоёв не проверяет.
- Новых plugin'ов в `vite-builder` — build через существующий `libConfig()` multi-entry.

### Итог: checklist для owner'а

```
[ ] src/controllers/index.ts создан
[ ] vite.config.mts: добавлен entry controllers → 'src/controllers/index.ts'
[ ] package.json exports: добавлена запись "./controllers"
[ ] package.json dependencies: добавлен @capsuletech/web-core (если не было)
[ ] tsconfig.base.json: запрос к главному добавить path-alias
[ ] пакет пересобран, dev-сервер перезапущен
[ ] тест на основной экспорт /controllers написан
```



- [[api-middleware]] — `CapsuleRegistryPlugin` (generateEndpointsRuntime + generateAppConfigRuntime) собирают рантайм для `services.api`
- [[004-compliance-linter|ADR 004]] — обоснование линтера (warn → error)
- [[010-builders-split|ADR 010]] — почему 4 пакета вместо 1, почему `lib-builder` zero-deps
- [[013-explicit-define-app-config|ADR 013]] — почему `defineAppConfig` теперь explicit-import, что осталось от legacy-bridge
- [[vite-plugins]] — user-facing description 5 плагинов (compliance/HMR/router/export/scaffold/etc)
- [[compliance|@capsuletech/compliance]] — user-facing
- [[cli|@capsuletech/cli]] — actions из `actions.ts` дёргаются именно оттуда
- [[032-package-controllers-and-useemit|ADR 032]] — `/controllers` subpath конвенция + `useEmit` канонический канал

## Cross-links {#cross-links}

- User-doc: [[builders]]
- Релиз-группа: см. `nx.json > release.groups.cli` — `vite-builder`/`compliance`/`lib-builder` версионируются вместе с CLI
