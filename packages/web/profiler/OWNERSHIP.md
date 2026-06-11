---
name: "@capsuletech/web-profiler"
owner-agent: owner-web-profiler
group: web_base
zone: runtime
status: beta
priority: P2
last-updated: 2026-06-11
---

# @capsuletech/web-profiler

Performance-monitoring package: MetricsBus ring-buffer, 13 built-in collectors, 3 reporters, and ProfilerDashboard widget for Solid.js apps.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — collector-pattern profiler, провайдер маунтится в BaseProviders.
- **Status:** `beta` (0.1.1) — 13 collectors + 3 reporters + ProfilerDashboard (kobalte Tabs + sparklines), 29 tests. Legacy `VitalsMonitoringProvider` shim — deprecated.
- **Priority:** **P2** — обсервабилити, опциональный.
- **Maturity bar (до stable):**
  - Legacy `VitalsMonitoringProvider` shim удалён.
  - Custom collector API стабилизирован.
  - Reporter middleware-pipeline (batching / debounce).
- **Active blockers:** нет.
- **Roadmap:**
  1. Legacy shim removal.
  2. Custom metric API canon.
  3. Reporter pipeline.
- **Last activity:** 2026-06-11 (canon refresh).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@kobalte/core`** (peerDep) — Tabs / Dialog для ProfilerDashboard. https://kobalte.dev/
- **web-vitals** (`dep`) — Web Vitals collector (CLS/FCP/LCP/INP/TTFB). https://github.com/GoogleChrome/web-vitals

## Зона ответственности

### Owns
- `packages/web/profiler/src/` (полностью)
- `packages/web/profiler/vite.config.mts`
- `packages/web/profiler/package.json` exports / deps

### Не трогает
- Содержимое других `@capsuletech/*` пакетов (делегировать).
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework-developer scope).
- `scripts/release-local.mjs` и подобные shared infra (главный assistant).
- `packages/web/core/` — BaseProviders.vitals потребляет legacy shim; изменения shim согласовывать с owner-web-core.
- `packages/web/ui/` — Dashboard использует kobalte Tabs + sparkline primitives; UI-kit изменения через owner-web-ui.

## Публичный API

Экспортируется через `package.json.exports`:

### `.` — main entrypoint (`src/index.ts`)
Re-exports всего ниже плюс `MetricRating` type utility.

### `./core`
- `createMetricsBus({ historySize? })` — фабрика bus (Map-based, per-metric ring-buffer, dedup-on-equal-value)
- `createRingBuffer<T>(capacity)` — примитив ring-buffer
- `getRating(id, value)` — lookup рейтинга по `IBuiltinMetricId`
- `isBrowser`, `hasPO()`, `supportsEntryType(type)` — env-guards для collectors/reporters
- Типы: `IMetricsBus`, `IMetricId`, `IBuiltinMetricId`, `ICustomMetricId`, `IMetricKind`, `IMetricMeta`, `IMetricSample`, `IMetricsListener`, `IMetricsSnapshot`, `IRating`, `IRatingLabel`, `ICollector`, `IReporter`, `IRingBuffer`, `ICreateBusOpts`

### `./api`
- `useProfiler()` — hook, возвращает `IMetricsBus` из контекста (throws если нет Provider)
- `useProfilerSafe()` — то же, но возвращает `undefined` вне Provider
- `createPerfApi(bus)` — фабрика perf-хелперов (mark/measure/count/gauge/time)
- `usePerf()` — hook-обёртка над `createPerfApi(useProfiler())`
- `ProfilerContext` — Solid Context объект
- Типы: `IPerfApi`, `IPerfTimer`

### `./providers`
- `ProfilerProvider` — root provider; принимает `collectors`, `reporters`, `showDashboard`, `historySize`
- `VitalsMonitoringProvider` — **deprecated** legacy shim над `ProfilerProvider collectors="legacy"` (для backward-compat с `web-core/BaseProviders.vitals`)
- `VitalsMonitoringContext`, `useVitalsContext` — legacy context из shim
- Типы: `IProfilerProviderProps`, `IProfilerCollectorsOpt`, `IMonitoringContextType`, `VitalsMonitoringProviderProps`

### `./collectors`
13 встроенных коллекторов:
- `webVitalsCollector(opts?)` — CLS/FCP/LCP/INP/TTFB через web-vitals 5.x
- `memoryCollector(opts?)` — `performance.memory.usedJSHeapSize` MB (Chromium-only)
- `networkCollector(opts?)` — resource transfer/decoded sizes
- `navigationCollector()` — `dom.ready` (one-shot)
- `connectionCollector()` — `navigator.connection.effectiveType` + change listener
- `longTasksCollector(opts?)` — longtask entries, threshold 50 ms
- `loafCollector(opts?)` — long-animation-frame entries, threshold 50 ms
- `eventTimingCollector(opts?)` — event timing, durationThreshold 40 ms
- `fpsCollector(opts?)` — RAF-counter + 1 s setInterval
- `domStatsCollector(opts?)` — `dom.nodes` каждые 5 s (`dom.listeners` не реализован)
- `errorsCollector()` — running counters `error.js` / `error.promise`
- `userTimingCollector()` — `custom.mark.*` / `custom.measure.*`
- `networkDeepCollector(opts?)` — **opt-in**: monkey-patches fetch/XHR/WebSocket → `network.inflight/requests/failed`
- Типы opts: `IWebVitalsOpts`, `IMemoryOpts`, `INetworkOpts`, `IDomStatsOpts`, `IEventTimingOpts`, `IFpsOpts`, `ILoafOpts`, `ILongTasksOpts`, `INetworkDeepOpts`

### `./reporters`
- `consoleReporter(opts?)` — логирует каждый bus-tick; принимает `{ prefix?, filter? }`
- `beaconReporter(opts)` — sendBeacon на visibilitychange/pagehide; принимает `{ url, on?, serializer? }`
- `callbackReporter(fn)` — generic обёртка над `bus.subscribe`
- Типы: `IBeaconReporterOpts`, `IConsoleReporterOpts`

### `./components`
Low-level UI (Sparkline и пр.) — используются внутри Dashboard.

## Quirks / gotchas

- **`networkDeepCollector` monkey-patches globals** (`window.fetch`, `XMLHttpRequest.prototype.send`, `WebSocket`). Конфликт с Sentry/datadog если те патчат те же globals. Поэтому collector **opt-in** и не включается в `'all-except-deep'` (дефолт ProfilerProvider). Источник: `src/collectors/networkDeep.ts`.

- **`fpsCollector` использует RAF + setInterval** — cleanup обязан cancel ОБА. Если переписываешь логику, не забудь оба `onCleanup`-вызова иначе memory leak. Источник: `src/collectors/fps.ts`.

- **`memoryCollector` Chromium-only** — `performance.memory` non-standard. Tolerant: пропускает sample если undefined. Источник: `src/collectors/memory.ts`.

- **`errorsCollector` — running counter**, не список событий. Если нужны индивидуальные ошибки — новый collector с `IMetricKind = 'event'`.

- **`userTimingCollector` создаёт metric ID per-name** (`custom.mark.foo` и т.д.). Тысячи уникальных marks → много `IMetricId` и разрастание bus history. Используй `historySize` опцию `createMetricsBus`.

- **`webVitalsCollector` default `reportAllChanges = true`** — каждое обновление LCP при scroll даёт новый sample. Для final-only значений передай `{ reportAllChanges: false }`.

- **`dom.listeners` в `domStatsCollector` не реализован** — строка в `IBuiltinMetricId` зарезервирована, но monkey-patch `addEventListener` не написан. Источник: `src/collectors/domStats.ts`.

- **Legacy `VitalsMonitoringProvider`** — deprecated shim; `BaseProviders.vitals` в web-core потребляет именно его. Не удалять без миграции apps и согласования с owner-web-core.

- **`MetricsBus.subscribe` возвращает unsubscribe** — в Solid-компоненте всегда оборачивай в `onCleanup(unsubscribe)`, иначе подписка живёт после unmount.

- **`getRating` default `'info'`** для неизвестного id или нечислового значения. Не throws.

## План рефакторинга / оптимизаций

- [ ] **`dom.listeners` collector** — реализовать monkey-patch `addEventListener`. Аккуратно с performance impact. (priority: low)
- [ ] **Reset на route change** — auto-clear metrics между навигациями (opt-in через router subscribe). (priority: medium)
- [ ] **Sentry/datadog reporter** — production-grade APM integration. (priority: medium)
- [ ] **`web-query` traces** — request lifecycle в profiler (координация с owner-web-query). (priority: low)
- [ ] **`web-renderer` traces** — render-tree performance (координация с owner-web-renderer). (priority: low)
- [ ] **Историческое сохранение через IndexedDB** — post-mortem analysis. (priority: low)
- [ ] **Remove legacy VitalsMonitoringProvider** — после миграции всех apps (координация с owner-web-core). (priority: low, P3)
- [x] **Phase 2a: MetricsBus + 13 collectors** — реализованы. (2026-05)
- [x] **Phase 2b: 3 reporters** — consoleReporter, beaconReporter, callbackReporter. (2026-05)
- [x] **Phase 2c: ProfilerDashboard** — kobalte Tabs, draggable, collapsible, localStorage persistence, 5 вкладок. (2026-05)

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/__tests__/bus.test.ts` | subscribe, dedup, ring-buffer, snapshot |
| Unit | `src/__tests__/ringBuffer.test.ts` | ring-buffer capacity, wraparound |
| Unit | `src/__tests__/ratings.test.ts` | getRating таблица, HIGHER_IS_BETTER edge cases |
| Unit | `src/__tests__/reporters.test.ts` | consoleReporter, beaconReporter, callbackReporter |
| Unit | `src/__tests__/perfApi.test.ts` | usePerf mark/measure/count/gauge/time |

Итого 29 тестов (vitest).

**Перед изменением:** `pnpm --filter @capsuletech/web-profiler test` должен быть green.
**При breaking change:** обновить tests + добавить новые для нового contract.
**Перед release:** `pnpm test:e2e:cli` обязателен.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| UI primitives, Layout, kobalte | owner-web-ui |
| Theme variables, Tailwind tokens | owner-web-style |
| HCA wrappers, providers, BaseProviders.vitals | owner-web-core |
| Vite plugins / lib-builder | owner-builders |
| Future: request traces | owner-web-query |
| Future: render-tree traces | owner-web-renderer |

## Release group

`web_base` — fixed group: web-core/dnd/editor/profiler/query/remote/renderer/router/state/style/ui + shared-zod.

После изменений в этом пакете — координировать release через главного.
