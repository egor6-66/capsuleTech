---
name: "@capsuletech/web-profiler"
owner-agent: owner-web-profiler
group: web_base
zone: runtime
status: beta
priority: P2
last-updated: 2026-06-27
---

# @capsuletech/web-profiler

Performance-monitoring package: тонкий хаб-провайдер (MetricsBus + TraceBus + контексты) и независимые сабмодули-children — 13 collector-компонентов, reporter-компоненты, ProfilerDashboard. **Первый эталон канона тонких провайдеров (ADR 063).**

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — collector-pattern profiler. **Тонкий** `ProfilerProvider` (оркестратор-хаб) маунтится в BaseProviders; collectors/reporters/Dashboard — opt-in children.
- **Status:** `beta` (0.1.1) — де-баррелизован под ADR 063. Тонкий provider (шина+trace-sink+контекст, НИЧЕГО тяжёлого) + collector/reporter-компоненты (само-регистрация через контекст) + ProfilerDashboard (`/widget`) + **trace-канал** (ADR 062), 49 tests. Legacy `VitalsMonitoringProvider` shim + `utils.ts` + старый `/components` Dashboard — **удалены**.
- **Priority:** **P2** — обсервабилити, опциональный.
- **Эталон-инвариант (НЕ нарушать):** импорт `/providers` тянет ТОЛЬКО шину/контекст/trace — не коллекторы, не Dashboard, не reporters (проверяемо по dist-чанку `chunks/providers-*.mjs`). Provider не импортит ни одного сабмодуля.
- **Maturity bar (до stable):**
  - Custom collector API стабилизирован.
  - Reporter middleware-pipeline (batching / debounce).
- **Active blockers:** нет.
- **Roadmap:**
  1. Custom metric API canon.
  2. Reporter pipeline.
- **Last activity:** 2026-06-27 (de-barrel эталон, ADR 063).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@kobalte/core`** (peerDep) — Tabs / Dialog для ProfilerDashboard (только субпатх `/widget`, тяжесть изолирована). https://kobalte.dev/
- **web-vitals** (`dep`) — Web Vitals collector (CLS/FCP/LCP/INP/TTFB). https://github.com/GoogleChrome/web-vitals
- **dev:** `vite-plugin-solid` + `jsdom` — рендер компонент-тестов (`.test.tsx`, jsdom через докблок). См. quirk о jest-dom авто-подстановке.

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
Convenience-барел: re-export всех субпатхов ниже. Для prod-дифференциации билда импортируй узкие субпатхи (`/providers`, `/trace`, нужный collector) — `.` тянет всё.

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
- `useTraceBus()` — `ITraceBus` из контекста или `undefined` вне Provider
- `TraceContext` — Solid Context объект trace-потока
- Типы: `IPerfApi`, `IPerfTimer`

### `./trace` — trace-канал (ADR 062), **тонкий leaf-субпатх**
Push-канал трейсов жизненного цикла. **Module-level** (НЕ Solid-хук) — зовётся из не-компонентного кода (классы транспортов, фабрики). Субпатх лёгкий: zero runtime-deps (типы из `core/trace` через `import type`), потребитель (web-remote, web-core, …) импортит только `trace()`-контракт, не таща профайлер.
- `trace(node, phase, data?, opts?)` — разовое событие; `.enable(cat)` / `.disable(cat)` / `.setLevel(lvl)` / `.isEnabled(node?)` — рантайм-тогл
- `startTrace(): traceId` + `span(traceId, node, phase, data?)` — причинная цепочка birth→death под одним id
- `registerTraceSink(sink)` — регистрация sink'а (вызывает `ProfilerProvider` на маунте); возвращает unregister
- `configureTrace({ enabled?, nodes?, level? })` — app-baseline тогла (не перебивает URL `?trace=`)
- `useTrace()` — опц. сахар для компонент-скоупа
- `__resetTrace()` — test-only сброс singleton'а
- Типы: `ITraceEvent`, `ITraceLevel`, `ITraceSink`, `ITraceConfig`, `ITraceFn`, `ITraceOpts`

### `./core` (trace-часть)
- `createTraceBus({ capacity? })` — упорядоченный причинный поток (ring), группировка по `traceId`: `push/all/byTrace/traceIds/subscribe/clear`. Отдельный от `MetricsBus` (тот дедупит по значению).
- Типы: `ITraceBus`, `ITraceEvent`, `ITraceLevel`, `ITraceSink`, `ITraceListener`, `ICreateTraceBusOpts`

### `./reporters` (trace-часть)
- `traceConsoleReporter(opts?)` / `traceCallbackReporter(fn)` / `traceBeaconReporter({ url, on?, serializer? })` — синки поверх `ITraceBus` (console=dev, beacon=prod-ship, callback=generic)
- Типы: `ITraceReporter`, `ITraceConsoleReporterOpts`, `ITraceBeaconReporterOpts`

### `./providers` — тонкий хаб (ADR 063 D2)
- `ProfilerProvider` — ЕДИНСТВЕННЫЙ provider, оркестратор-хаб. Создаёт `MetricsBus` + `TraceBus`, провайдит их через контекст, регистрирует trace-sink, применяет app-baseline тогла trace. **Не импортит ни одного сабмодуля.**
- **Config-props only:** `historySize`, `trace?: { enabled?, nodes?, level?, capacity? }`, тест-инъекции `bus?` / `traceBus?`. Ни collectors, ни reporters, ни dashboard в props — это children.
- Типы: `IProfilerProviderProps`, `IProfilerTraceConfig`

### `./collectors`
13 коллекторов как **само-регистрирующиеся компоненты** (`<WebVitalsCollector/>`, `<MemoryCollector/>`, …, `<NetworkDeepCollector/>`) — на маунте дёргают `collector.init(bus)` из контекста, на unmount — cleanup; рендерят `null`, ставятся где угодно в дереве под провайдером. Props = opts соответствующей фабрики. Гранулярность → tree-shake.
- `<Collectors preset="all|all-except-deep|legacy"/>` — **opt-in комбо** (ADR 063 D3): монтирует НАБОР разом; не дефолт, тянет в бандл весь свой набор. Тип `ICollectorsProps`.
- Сырые `ICollector`-фабрики (примитивы под компонентами / ручную композицию):
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
Reporter-**компоненты-читатели** (само-подписка на шину из контекста + `onCleanup`):
- metric: `<ConsoleReporter prefix? filter?/>`, `<BeaconReporter url on? serializer?/>`, `<CallbackReporter on={listener}/>`
- trace: `<TraceConsoleReporter/>`, `<TraceBeaconReporter url=.../>`, `<TraceCallbackReporter on={listener}/>` (подписка на `TraceBus` из `TraceContext`)
- Сырые фабрики (примитивы): `consoleReporter` / `beaconReporter` / `callbackReporter` + `traceConsoleReporter` / `traceBeaconReporter` / `traceCallbackReporter`
- Типы: `IBeaconReporterOpts`, `IConsoleReporterOpts`, `ITraceReporter`, `ITraceConsoleReporterOpts`, `ITraceBeaconReporterOpts`

### `./widget`
- `ProfilerDashboard` — draggable панель (kobalte Tabs + sparklines, 5 вкладок). **Сабмодуль-child**: потребитель монтит `<ProfilerDashboard/>` где угодно (в т.ч. в глубине дерева). Тяжесть kobalte изолирована в этом субпатхе — провайдер её не тянет.
- Также panels/primitives (`VitalsPanel`, `Sparkline`, `ProfilerWindow`, …) для кастомных дашбордов.

## Quirks / gotchas

- **`networkDeepCollector` monkey-patches globals** (`window.fetch`, `XMLHttpRequest.prototype.send`, `WebSocket`). Конфликт с Sentry/datadog если те патчат те же globals. Поэтому collector **opt-in** и не включается в `'all-except-deep'` (дефолт ProfilerProvider). Источник: `src/collectors/networkDeep.ts`.

- **`fpsCollector` использует RAF + setInterval** — cleanup обязан cancel ОБА. Если переписываешь логику, не забудь оба `onCleanup`-вызова иначе memory leak. Источник: `src/collectors/fps.ts`.

- **`memoryCollector` Chromium-only** — `performance.memory` non-standard. Tolerant: пропускает sample если undefined. Источник: `src/collectors/memory.ts`.

- **`errorsCollector` — running counter**, не список событий. Если нужны индивидуальные ошибки — новый collector с `IMetricKind = 'event'`.

- **`userTimingCollector` создаёт metric ID per-name** (`custom.mark.foo` и т.д.). Тысячи уникальных marks → много `IMetricId` и разрастание bus history. Используй `historySize` опцию `createMetricsBus`.

- **`webVitalsCollector` default `reportAllChanges = true`** — каждое обновление LCP при scroll даёт новый sample. Для final-only значений передай `{ reportAllChanges: false }`.

- **`dom.listeners` в `domStatsCollector` не реализован** — строка в `IBuiltinMetricId` зарезервирована, но monkey-patch `addEventListener` не написан. Источник: `src/collectors/domStats.ts`.

- **Legacy `VitalsMonitoringProvider` УДАЛЁН** (ADR 063 de-barrel, 2026-06-27). Вместе с ним удалены `utils.ts` (@deprecated rating/web-vitals helpers) и старый `/components` Dashboard. **Консьюмеры (`web-core/BaseProviders.vitals`, apps) требуют миграции** на новую композицию (тонкий provider + дочерние collectors/Dashboard) — координирует architect (парный бриф owner-web-core). Это сознательный breaking change, не back-compat shim.

- **vite-plugin-solid авто-подставляет `@testing-library/jest-dom/vitest`** в `test.setupFiles`, если в `vitest.config.ts` НЕ задать `server.deps.external: [/solid-js/]`. Его `config`-хук возвращает свой test-override (jsdom env + jest-dom setup) только когда сам выставляет `server.deps`; задав external — он его не трогает. Без этого все тесты падают `Cannot find module .../@testing-library/jest-dom/vitest` (пакет jest-dom не установлен). Источник: `vitest.config.ts`.

- **`MetricsBus.subscribe` возвращает unsubscribe** — в Solid-компоненте всегда оборачивай в `onCleanup(unsubscribe)`, иначе подписка живёт после unmount.

- **`getRating` default `'info'`** для неизвестного id или нечислового значения. Не throws.

- **Trace singleton якорится на `globalThis`** (`Symbol.for('@capsuletech/web-profiler/trace.registry')`). Это намеренно: sink, зарегистрированный из `providers`-чанка, должен быть виден `trace()` из `trace`-чанка и из независимо собранных пакетов-потребителей (web-remote/web-core) в одном app-бандле. Rolldown к тому же выделяет shared trace-chunk (импортится и `/trace`, и `/providers` entry) → один инстанс. Не заменяй на module-local `let` — потеряешь видимость sink'а между субпатхами. Источник: `src/trace/index.ts`.

- **Trace-тогл off по умолчанию** — `trace()` делает мгновенный return ДО сборки события (ноль аллокаций), пока не включат через `ProfilerProvider trace={{ enabled }}`, рантайм `trace.enable('remote')`, localStorage `capsule.trace`, или URL `?trace=remote`. URL перебивает app-config (явный debug-намерение). Источник: `src/trace/index.ts` (`hydrate`/`configureTrace`).

- **`createTraceBus` отдельный от `MetricsBus`** — трейсам нужен упорядоченный причинный лог (ring по времени, группировка по `traceId`), а `MetricsBus` дедупит по значению и хранит per-metric. Не сливать. Источник: `src/core/trace.ts` (ADR 062 D5).

## План рефакторинга / оптимизаций

- [ ] **`dom.listeners` collector** — реализовать monkey-patch `addEventListener`. Аккуратно с performance impact. (priority: low)
- [ ] **Reset на route change** — auto-clear metrics между навигациями (opt-in через router subscribe). (priority: medium)
- [ ] **Sentry/datadog reporter** — production-grade APM integration. (priority: medium)
- [x] **Trace-канал (фундамент, ADR 062)** — `createTraceBus` + `/trace` субпатх (module-level emit, рантайм-тогл, корреляция) + trace-reporters + Traces-панель. (2026-06-27) Обобщает идею `web-query/web-renderer traces` в первоклассный канал — теперь любой узел инструментируется `trace()`, не нужен отдельный per-пакет механизм.
- [ ] **Инструментация узлов (next, ADR 062 D6)** — пилот remote (`IframeTransport`/`RemoteComponent`/forward/host-bridge), затем HCA-engine. Каждый owner размечает свою зону; `traceId` в конверте remote-протокола — owner-web-remote + owner-web-core. **НЕ моя зона** (фундамент закрыт).
- [ ] **Историческое сохранение через IndexedDB** — post-mortem analysis. (priority: low)
- [x] **De-barrel ProfilerProvider (эталон ADR 063)** — provider тонкий (шина+trace-sink+контекст), collectors/reporters → само-регистрирующиеся компоненты, Dashboard → `/widget` субпатх. Legacy `VitalsMonitoringProvider` + `utils.ts` + старый `/components` удалены. (2026-06-27)
- [ ] **Миграция консьюмеров** — `web-core/BaseProviders.vitals` на новую композицию (тонкий provider всегда + collectors/Dashboard opt-in за `vitals`). Парный бриф owner-web-core, координирует architect. (priority: high — иначе BaseProviders.vitals сломан)
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
| Unit | `src/__tests__/trace.test.ts` | traceBus (order/byTrace/traceIds/ring/subscribe/clear) + субпатх (no-op off/no-sink, per-node фильтр, level-gate, корреляция startTrace+span, enable/disable) |
| Component (jsdom) | `src/__tests__/components.test.tsx` | само-регистрация: collector-компонент init→cleanup, reporter-компонент subscribe→unsubscribe, trace через тонкий provider → дочерний trace-reporter |

Итого 49 тестов (vitest).

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
