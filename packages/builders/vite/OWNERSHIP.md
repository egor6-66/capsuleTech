---
name: @capsuletech/vite-builder
owner-agent: owner-builders
group: cli
status: pre-1.0
last-updated: 2026-06-25
---

# @capsuletech/vite-builder

Vite-конфиг и 9 плагинов для dev-сервера HCA-apps. Дёргается через CLI (`createDevCapsuleServer` / `buildCapsuleApp`).

## Зона ответственности

### Owns
- `packages/builders/vite/src/` — всё
- `packages/builders/vite/vite.config.mts` — self-build (deep-imports минуя barrel)
- `packages/builders/vite/package.json` exports / deps

### Не трогает
- `packages/builders/compliance/src/` — потребляет через CompliancePlugin, не правит
- `packages/builders/lib/src/` — потребляет `libConfig`, не правит
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant)
- `apps/*/` (user / framework-developer scope)
- `scripts/release-local.mjs` и shared infra (главный assistant)

## Публичный API

Экспортируется через `.` entrypoint (`dist/index.mjs`):

- `capsuleConfig({ config, root, workspaceRoot, isDev }): UserConfig` — главная точка входа. Собирает Vite config с 9 плагинами для HCA-app dev-сервера.
- `createDevCapsuleServer(workspaceRoot, appName): Promise<ViteDevServer>` — CLI дёргает для `capsule dev`.
- `buildCapsuleApp(workspaceRoot, appName): Promise<void>` — CLI дёргает для `capsule build`.
- `appConfig(config, isDev): UserConfig` — минимальный конфиг для plain Vite apps без HCA.
- `libConfig` — re-export из `@capsuletech/lib-builder` для legacy compat.
- `type ICapsuleConfig` — тип опций capsuleConfig (включая `desktop?: IDesktopConfig` для Tauri-shell — ADR 017).
- `type IDesktopConfig` — реэкспорт из `@capsuletech/desktop` для удобства apps (одна точка типов).
- `type IDefineLibConfigOptions` — тип опций libConfig.
- `plugins` namespace — все плагины как named exports (через barrel `plugins/index.ts`).
- `defines` namespace — все define-хелперы.

### Плагины (порядок в `capsuleConfig.ts`)

| Плагин | Файл | Что делает |
|---|---|---|
| `AutoImport` | `capsuleConfig.ts` (inline) | Инжектит WRAPPER_NAMES + DEFINE_FACTORIES как глобальные имена |
| `HMRWrappingPlugin` | `plugins/HMRWrapping.ts` | babel-AST: `const X = Page(...)` → `(props) => Page(...)(props)` + `export default` |
| `resolve.tsconfigPaths: true` | `capsuleConfig.ts` (resolve section, Vite 8 native) | Резолв `@capsuletech/*` из `tsconfig.base.json` через extends-цепочку. Плагин `vite-tsconfig-paths` удалён. |
| `EnsureScaffoldPlugin` | `plugins/scaffold/index.ts` | Копирует статические entry-файлы в `.capsule/` при первом запуске |
| `CapsuleRegistryPlugin` | `plugins/capsuleRegistry.ts` | Unified codegen: scan src/** → barrel-registry + endpoints.ts + api.d.ts + app-config.gen.ts + packages.ts/.d.ts + **registry/remotes.ts + @types/remotes.d.ts** (ADR 060 D5/D6) + bootstrap.tsx |
| `tailwindcss()` | `capsuleConfig.ts` (inline) | Tailwind v4 через `@tailwindcss/vite` |
| `AliasesPlugin` | `plugins/aliases.ts` | Мержит paths → `.capsule/tsconfig.paths.json` + Vite `resolve.alias` |
| `AppSourceServePlugin` | `plugins/appSourceServe.ts` | **TEMPORARY** — rewrite `/src/*` → `/@fs/<appRoot>/src/*` (см. ниже) |
| `ContractArtifactPlugin` | `plugins/contractArtifact.ts` | ADR 060 Phase 1 — эмит контракт-артефакта из `apps/<app>/contract.ts` (manifest/schema/d.ts/mjs) → build: `dist/.capsule/contract/*`, dev: middleware `/.capsule/contract/*`. No-op без `contract.ts` |
| `CompliancePlugin` | `plugins/compliance.ts` | pre-transform: `check()` на каждый файл, режим `warn` |
| `RouterPlugin` | `plugins/router/index.ts` | ensureRootRoutePlugin + page-mirror generator + TanStackRouterVite |
| `solidPlugin` | `capsuleConfig.ts` (inline) | Solid.js JSX transform |

## Публичный API / dev-server behavior

### Static assets — `public/` folder

`capsuleConfig` устанавливает `publicDir: join(root, 'public')`, где `root = apps/<app>/`. Это **канонический** путь для статических asset'ов:

- Файлы в `apps/<app>/public/` отдаются Vite dev-server'ом по URL'у `/` без трансформации.
- `apps/<app>/public/capsule.manifest.json` → `GET /capsule.manifest.json` → 200 JSON (используется в app-as-remote паттерне, ADR-053).
- В production (`capsule build`) Vite копирует `public/` в `dist/` автоматически.

До Phase 1 (2026-06-19) `publicDir` не был переопределён — Vite дефолтировал на `.capsule/public/`, что требовало ручного копирования файлов в сгенерированный каталог.

### `/src/*` URL rewrite

`AppSourceServePlugin` регистрирует middleware, который rewrite'ит запросы `/src/*` в `/@fs/<appRoot>/src/*`. Это позволяет manifest'у remote-app указывать `"entry": "/src/standalone.tsx"` вместо абсолютного `/@fs/D:/...` пути.

**AppSourceServePlugin — KNOWN TEMPORARY WORKAROUND.**

- Корень проблемы: Vite root = `.capsule/`, поэтому `/src/...` URL'ы резолвятся в `.capsule/src/...` (не существует).
- Этот middleware — Variant A: rewrite в `/@fs/` namespace.
- **Removal condition:** удалить `AppSourceServePlugin` + его регистрацию в `capsuleConfig.ts` + его barrel-export при landing'е **Variant B ADR** («Vite root = appRoot»). После Variant B `/src/...` резолвятся корректно без middleware.
- Связано: `docs/_meta/briefs/builders-app-as-remote-dev-gaps-2026-06-19.md` Phase 2, ADR-053.

## SSOT

`packages/builders/vite/src/plugins/constants.ts` — **единственный файл**, где объявлены:
- `WRAPPER_NAMES` — `['Page', 'Widget', 'View', 'Controller', 'Feature', 'Shape', 'Entity']`
- `DEFINE_FACTORIES` — `{ '@capsuletech/web-query': ['defineEndpoint'] }`
- `LAYER_TO_NAMESPACE` — `{ widgets: 'Widgets', views: 'Views', controllers: 'Controllers', features: 'Features', shapes: 'Shapes', entities: 'Entities' }`
- `EAGER_IMPORT_LAYERS` — `Set<string>(['entities'])` — слои, генерирующие eager imports вместо lazy()

Добавляешь новый слой → правишь только этот файл.

## Quirks / gotchas

- **Scaffold/router templates путь в dist.** `EnsureScaffoldPlugin` в runtime читает `.template`-файлы через `__dirname` → `dist/plugins/scaffold/template/` (вычислено от `dist/index.mjs`). Но libConfig/rollup не копирует non-JS ресурсы. Явный `staticCopyPlugin` в `vite.config.mts` копирует `src/plugins/scaffold/template` и `src/plugins/router/template` в `dist/template/`. При добавлении нового `.template`-файла обязательно добавить запись в `staticCopyPlugin`, иначе `ENOENT` в рантайме. Фикс применён 2026-05-20.

- **`vite.config.mts` deep-imports.** Файл импортирует `staticCopyPlugin` напрямую через `'./src/plugins/staticCopy'`, минуя `plugins/index.ts` barrel. Это намеренно: esbuild при использовании barrel'а вытянет `CompliancePlugin → compliance/dist`, нарушая bootstrap-порядок сборки. Не добавляй transit-импорты через barrel в `vite.config.mts`.

- **`@babel/traverse` и `@babel/generator` — CJS.** В `HMRWrapping.ts` и `compliance/check.ts` есть interop: `_traverse.default ?? _traverse`. ESM-import возвращает namespace-объект, не функцию. Не убирай interop без понимания.

- **HMRWrappingPlugin матчит wrapper по identifier-name.** `import { Page as MyPage }` — HMR молча сломается. AutoImport инжектит чистые имена — edge case, но важен при нестандартных импортах.

- **`bundleDependencies` в `vite.config.mts` — проверяй при правках.** Список должен включать `/^@capsuletech\/compliance/` и `/^@capsuletech\/lib-builder/`. Исторически бывали stale-имена от переименований пакетов.

- **`dist/` rebuild обязателен после правок `src/`.** Apps читают `dist/index.mjs`, не `src/`. После изменений: `pnpm --filter @capsuletech/vite-builder build` + рестарт dev-сервера. Smoke: `console.log('[plugin] loaded')` на верхнем уровне плагина.

- **`defineAppConfig` / `defineCapsuleConfig` / `defineEndpoint` — Vite-time глобалы, не доступны в jiti.** `capsule.app.ts` может использовать `defineAppConfig({...})` как bare-идентификатор (инжектируется AutoImport через Vite-плагин). При загрузке через `jiti` (config-time в `loadConfigFresh`) эти глобалы не существуют → `ReferenceError`. **Решение** (2026-06-18): перед `j(configPath)` инжектируются identity-стабы через `globalThis`, cleanup в `finally`. Это поведение задокументировано в `VITE_TIME_GLOBALS` константе в orchestrator.ts и `CAPSULE_VITE_TIME_GLOBALS` в capsuleRegistry.ts. При добавлении новых Vite-time глобалов — обновлять оба массива.

- **`optimizeDeps.exclude`** — список `@capsuletech/web-*` пакетов в `capsuleConfig.ts`. При добавлении нового workspace-пакета добавь его сюда, иначе esbuild попытается пре-бандлить и сломает JSX-транспиляцию.

- **`AppSourceServePlugin` — temporary middleware, Variant A.** Перехватывает `/src/*` запросы и rewrite'ит в `/@fs/<appRoot>/src/*`. Нужен потому что Vite root = `.capsule/` → `/src/...` URL'ы не резолвятся к реальным source-файлам. **Удалить при landing'е Variant B ADR («Vite root = appRoot»).** До тех пор не добавляй альтернативных механизмов для той же цели — duplicate middleware ломает `/src/*` chain.

- **Entry прокидывает contract в createCapsuleApp (ADR 060 Phase 3 / D1).** `generateIndexEntry(hasContract)`: если есть `apps/<app>/contract.ts` — сгенерённый `.capsule/index.ts` импортит `import contract from '../contract'` и передаёт `contract` в `createCapsuleApp('root', { …, contract })` (web-core 2-of-3 форвардит хосту только `out`-события + валидирует входящие host-диспатчи по `in`). Без contract.ts — `contract` не передаётся (опционально, standalone как раньше). `defineContract` в contract.ts — bare-глобал (`DEFINE_FACTORIES`); при импорте `../contract` файл попадает в Vite-граф → AutoImport инжектит реальный импорт `defineContract`, entry обращается только к вычисленному default. Наличие contract.ts определяется в `initialScan` (`existsSync`); добавление contract.ts mid-session требует рестарта dev (как и любой новый entry-импорт).

- **Remote-codegen — `registry/remotes.ts` + `@types/remotes.d.ts` (ADR 060 Phase 2 / D5+D6).** `CapsuleRegistryPlugin` из `capsule.app.ts → remotes` (`[{name,url,contract?}]`) генерит: (D5) `registry/remotes.ts` — data-реестр `export const remotes = [{name,url}] as const` (`contract` — vendoring-hint, НЕ в runtime); (D6) `@types/remotes.d.ts` — для каждого `remote.name` с vendored `apps/<app>/remotes/<name>/schema.json` augmentation `declare module '@capsuletech/web-remote' { interface CapsuleRemotes { '<name>': { in: {...}; out: {...} } } }`. Без vendored-`schema.json` name пропускается + warn `capsule remote sync <name>`. Watch на `apps/<app>/remotes/**` (add/unlink) регенерит при появлении/удалении vendored-контракта.
  - **⚠️ Типы ИНЛАЙНЯТСЯ из `schema.json` через `jsonSchemaToTs` — БЕЗ `import`/`import('path').Type`.** Корень (architect задиагностировал tsc'ом): в app-tsconfig (`moduleDetection: 'force'` + tsconfig.base) ЛЮБАЯ cross-module ссылка в augmentation-файле → `declare module` НЕ применяется (`<Remote.View>` сваливается в loose `any`). Работает только полностью инлайн-форма. `export {};` ОБЯЗАТЕЛЕН — делает файл модулем (иначе `declare module` = ambient, не augmentation — тоже ломается). Источник — vendored `schema.json` (per-event json-schema, форма Phase 1 `buildSchemaJson`), рендер — `jsonSchemaToTs` из `contractArtifact.ts`.
  - **Граница:** `CapsuleRemotes` интерфейс + типизация `Remote.View` + чтение `remotes.ts` Provider'ом — зона **web-remote** (ADR 060 4-of-4). Здесь только ЭМИТ; runtime-потребление реестра Provider'ом в web-remote ещё не landed (Provider берёт `modules` пропом) — `remotes.ts` готов к подключению, но пока не импортируется.

- **`ContractArtifactPlugin` — esbuild bundle + data-URL eval (ADR 060 Phase 1).** Эмиттер контракт-артефакта ремоут-аппа. Один конвейер `produceArtifacts(appRoot)`: (1) esbuild-бандлит `apps/<app>/contract.ts` через `stdin` (`resolveDir = appRoot`, чтобы `@capsuletech/*` и `zod` резолвились из app-node_modules) в self-contained ESM (zod инлайнится) — это `contract.mjs`; (2) eval бандла через `import('data:text/javascript;base64,...')` → живой объект контракта; (3) из объекта генерятся `manifest.json` / `schema.json` / `contract.d.ts`. Build → `this.emitFile({ type:'asset', fileName:'.capsule/contract/<name>' })` (попадает в `dist/.capsule/contract/*`). Dev → middleware отдаёт `/.capsule/contract/*` из памяти, rebuild на change `contract.ts`. **Deps:** `esbuild` (external — нативные бинарники, в `vite.config.mts → external`), `zod-to-json-schema` (external) + `zod` (peer для zod-to-json-schema; external через BROWSER_EXTERNAL). **POC-нюанс:** `zodToJsonSchema(schema, { $refStrategy:'none', target:'jsonSchema7' })` БЕЗ опции `name` — иначе `$ref`+`definitions` прячут top-level `properties`. **`defineContract` инжект:** автор может писать `defineContract` как bare-глобал (зарегистрирован в `DEFINE_FACTORIES`), конвейер инжектит `import` перед bundling (как defineEndpoint-инжект) — поэтому contract.ts работает и в Vite-графе (auto-import), и вне его (esbuild/eval). **Phase 2** (host vendoring / `remotes.d.ts`) и **Phase 3** (root-event-bus) — НЕ здесь.

- **`solidPlugin` exclude для `entities/`.** `vite-plugin-solid` внутри использует `solid-refresh`, который оборачивает любой `const X = SomeCall(...)` в `.tsx`-файле в `(props) => SomeCall(...)(props)` для поддержки HMR компонентов. `Entity` возвращает plain config object (`{ schema, defaults }`), а не Solid-компонент — после такой обёртки `Entities.Users` становится функцией, и любой доступ к `.schema`/`.defaults` падает TypeError. `HMRWrappingPlugin` entity уже скипает (использует только `RENDER_WRAPPER_NAMES`), но `solid-refresh` — отдельный babel-pass внутри `solidPlugin`. Поэтому `solidPlugin` получает `exclude: [/[\\/]entities[\\/]/]`. Регекс покрывает оба сепаратора (Win/Unix). При добавлении других data-layer слоёв (не возвращающих Solid-компонент) — добавлять в этот же exclude-список.

- **`desktop?: IDesktopConfig` — type-only без peerDep.** Vite-builder секцию НЕ читает в runtime — только тип. CLI читает её через `importModule('capsule.config.ts')` и передаёт в `runDev`/`runBuild` пакета `@capsuletech/desktop` (PR 5). **Никакого peerDep на `@capsuletech/desktop`** — пробовали, ловили Nx circular dependency (`vite-builder → desktop → vite-builder`, т.к. desktop сам использует vite-builder для сборки). Type-only `import type` работает через `tsconfigPaths` в workspace; Verdaccio consumers защищены `skipLibCheck: true` в `tsconfig.base.json` (apps без install'а `@capsuletech/desktop` не получают TS error на transitive reference).

- **Мёртвый код вычищен (Ф3, 2026-06-04):** удалены artефакты `'building.ts-plugin-solid'`, `'building.ts-plugin-dts'`, `'building.ts-tsconfig-paths'`, `'@tailwindcss/building.ts'` из NODE_EXTERNAL (lib-builder) и `'@tailwindcss/building.ts'` из appConfig optimizeDeps.exclude; `solid-js` убран из stale bundleDependencies vite.config.mts.

## План рефакторинга / оптимизаций

- [ ] **Удалить мёртвый код** — `html.ts`, `generateFromTemplates.ts`. (priority: low)
- [ ] **Добавить тесты vite-builder** — AutoImport генерация, plugins ordering smoke. (priority: high)
- [ ] **Bump CompliancePlugin mode `warn` → `error`** после стабилизации allowlist. ADR 004. (priority: medium)

### Закрытые задачи

- [x] **Layer init ordering (TDZ fix) — 2026-05-28.** ESM hoisting: endpoints → features → widgets → pages → routeTree evaluate до `Object.assign(globalThis, _registry)` в bootstrap body → `Entities.X` = undefined / ReferenceError. Fix: `CapsuleRegistryPlugin.generateWrappersRuntime` добавляет `Object.assign(globalThis, { Widgets, Views, ... })` как последнюю строку генерируемого `wrappers.ts`. `bootstrap.tsx` генерируется `CapsuleRegistryPlugin` по `LAYER_INIT_ORDER`.
- [x] **CapsuleRegistryPlugin refactor — 2026-05-28.** Удалены `ExportGeneratorPlugin`, `EndpointsRegistryPlugin`, `AppConfigPlugin` (deprecated re-exports и тесты). Все функции объединены в `CapsuleRegistryPlugin`. 39 тестов deadwood удалены.
- [x] **slots.d.ts ambient value-binding — 2026-06-02 (PR #223).** `generateWrappersTypes` теперь эмитит `const <NS>: <NS>;` рядом с каждым `interface <NS>` для всех шести namespace'ов (Widgets, Views, Features, Shapes, Controllers, Entities), заполненных и пустых. Без этого плюральные реестры оставались type-only после коммита #165 (убрал `dirs:` из AutoImport) — fresh-apps ловили `Cannot find name 'Features'` / `'Widgets'` при использовании их как значений в TSX. Рантайм не ломался (`wrappers.ts` по-прежнему populate'ит через `Object.assign(globalThis, ...)`), регрессия была чисто type-layer. Плюрали в `AutoImport > imports` НЕ возвращались — это воскресило бы цикл #165. 7 новых unit-тестов, 91/91 green.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/plugins/__tests__/capsuleRegistry.test.ts` | CapsuleRegistryPlugin — generateWrappersRuntime/Types (включая `interface + const` для всех 6 NS), generateEndpointsRuntime/Types, generateAppConfigRuntime, generateBootstrap, LAYER_INIT_ORDER контракт, transform hooks; **resolvePackageEntries** (packages[]-кодген сквозной тест через parseManifestSource mock-source — закрывает дыру e2e smoke); generatePackagesRuntime/Types с controllerKeys; **generateRemotesRuntime/Types** (ADR 060 D5/D6 — {name,url}-реестр; CapsuleRemotes augmentation ИНЛАЙН из schema.json без import + export {}; vendored-schema skip+warn; пустая ось → {}) |
| Unit | `src/plugins/__tests__/hmrWrapping.test.ts` | HMRWrappingPlugin — babel-AST transforms для всех wrapper-типов, export default injection, Entity skip |
| Unit | `src/plugins/__tests__/contractArtifact.test.ts` | ContractArtifactPlugin (ADR 060 Phase 1) — чистые генераторы (`buildManifestJson`/`buildSchemaJson`/`buildContractDts`/`jsonSchemaToTs`), POC-нюанс (schema top-level `properties`, не `$ref`), `ensureDefineContractImport` (идемпотентный инжект), `matchContractRequest` (URL→имя файла), `produceArtifacts` no-op без contract.ts + **end-to-end** (esbuild bundle + data-URL eval → 4 файла на tmp-фикстуре) |
| Unit | `src/plugins/__tests__/loadAppConfig.test.ts` | **jiti globals injection** (Fix 1) — `defineAppConfig/defineCapsuleConfig/defineEndpoint` не бросают ReferenceError, cleanup globalThis; **`loadAppConfig` три-стейтовый API** (Fix 2) — `ok/missing/error` states через реальные tmp-файлы; **docs-sources resilience** — `status:error` → не удаляет файл, логирует; `status:missing` → cleanup OK; **Fix 3** — info-лог при успешной генерации |

Перед изменением любого плагина: `pnpm --filter @capsuletech/vite-builder test`.
Перед release: `pnpm test:e2e:cli` обязателен.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| CLI (дёргает `createDevCapsuleServer` / `buildCapsuleApp`) | owner-cli |
| compliance (встроен в dist через bundleDependencies) | owner-builders |
| lib-builder (встроен в dist через bundleDependencies) | owner-builders |
| web-style (CSS pipeline, `@source` paths в scaffold template) | owner-web-style |
| web-core (WRAPPER_NAMES, AutoImport) | owner-web-core |

## Release group

- `cli` — fixed group: cli + compliance + lib-builder + shared-file-manager + vite-builder

Breaking change в публичном API (`capsuleConfig`, `createDevCapsuleServer`, `buildCapsuleApp`) — согласовать с owner-cli перед release.
