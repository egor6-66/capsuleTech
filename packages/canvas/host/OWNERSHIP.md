---
name: "@capsuletech/canvas-host"
owner-agent: owner-canvas
group: canvas
status: pre-1.0
last-updated: 2026-06-11
---

# @capsuletech/canvas-host

Движко-агностичный контракт (типы + интерфейсы) для интеграции canvas/WebGL/WASM-движков в HCA как opaque-Entity.

## Зона ответственности

### Owns
- `packages/canvas/host/src/` (полностью)
- `packages/canvas/host/package.json` exports / deps
- `packages/canvas/host/vite.config.mts`

### Не трогает
- Содержимое других `@capsuletech/*` пакетов (делегировать).
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework-developer scope).
- `packages/canvas/ui/` и `packages/canvas/three/` — отдельные пакеты, владелец тот же owner-canvas, но изменения требуют явного scope'а.
- `scripts/release-local.mjs` и shared infra (главный assistant).

## Публичный API

Единственный entrypoint `.` — только типы, никаких runtime-значений:

- `ICanvasEngineAdapter<TConfig, TCommand, TEvent>` (`src/adapter.ts`) — контракт, который реализует каждый engine-адаптер. Методы: `load / mount / start / pause / resume / dispose / send / on / onState / onError`.
- `ICanvasCommand<TType, TPayload>` (`src/bridge.ts`) — base-тип tagged-команды JS → engine.
- `ICanvasEvent<TType, TPayload>` (`src/bridge.ts`) — base-тип tagged-события engine → JS.
- `CanvasEventHandler<E>` (`src/bridge.ts`) — тип колбэка подписки на события.
- `CanvasUnsubscribe` (`src/bridge.ts`) — тип функции отписки.
- `CanvasLifecycle` (`src/lifecycle.ts`) — union 9 состояний FSM: `idle | loading | initializing | ready | running | paused | disposing | disposed | error`.
- `ICanvasLoadProgress` (`src/lifecycle.ts`) — прогресс загрузки (`loaded`, `total?`, `detail?`).
- `ICanvasError` (`src/lifecycle.ts`) — структура ошибки с полем `phase: CanvasLifecycle`.

Изменение любого из этих интерфейсов — breaking change для всех адаптеров. Согласовывать с главным перед правкой, если есть хоть одна in-flight реализация.

## Quirks / gotchas

- **Только типы, нет runtime** — пакет экспортирует исключительно `type`-импорты. Любая попытка добавить runtime-значения (helpers, factories) требует обсуждения с главным (влияет на размер bundle у потребителей).
- **`solid-js` не в peers** — пакет намеренно не объявляет `solid-js` как peer (только `lib.dom` нужен для `HTMLCanvasElement`). HCA-обвязка (`createCanvasEntity/Controller/Feature`) появится позже и сама задекларирует peer.
- **Адаптер не владеет `<canvas>`** — это инвариант контракта (`adapter.ts:39`). Нарушение приводит к конфликту с Solid-reconciler, который управляет DOM-узлом. Проверять в code-review любой реализации.
- **`onError` вместо `throw`** — после успешного `load()` все runtime-ошибки должны идти через `onError`, не бросаться исключением (`adapter.ts:18`). Иначе FSM Controller'а не узнает о переходе в `error`-состояние.
- **Lifecycle states нельзя расширять под движок** — движкоспецифичные фазы (WASM-instantiate у UE, shader-compile у Three) сворачиваются в ближайший канонический state (`lifecycle.ts:1`). Не плодить новые состояния в `CanvasLifecycle` без координации с главным.

## План рефакторинга / оптимизаций

- [ ] **HCA-обвязка** — реализовать `createCanvasEntity`, `createCanvasController`, `createCanvasFeature` (после ревью контракта). (priority: high)
- [ ] **ADR NNN-opaque-entity** — оформить через `docs-writer` с готовым skeleton'ом из README. (priority: high)
- [ ] **Compliance-rule** — запрет `meta`-тегов на `<canvas>`-элементах через `owner-builders`. (priority: medium)

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | — | нет (scaffold, только типы) |
| Integration | — | нет |
| E2E | — | нет |

Пакет содержит только TypeScript-типы — runtime-тесты появятся вместе с HCA-обвязкой (`createCanvasEntity/Controller/Feature`). До этого верификация — через `tsc --noEmit` при сборке.

**Перед изменением:** убедиться что `pnpm --filter @capsuletech/canvas-host build` проходит без ошибок.
**При breaking change:** обновить `ICanvasEngineAdapter` + все in-flight адаптеры (`canvas-three` и др.) + `OWNERSHIP.md`.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| Vite plugins / lib-builder | owner-builders |
| HCA wrappers, providers | owner-web-core |
| XState / bridge state | owner-web-state |
| Compliance rules | owner-builders |
| Engine-адаптер Three.js | owner-canvas (`packages/canvas/three/`) |
| DOM overlays поверх canvas | owner-canvas (`packages/canvas/ui/`) |

## Release group

Пакет не входит ни в одну release-группу `nx.json` (все три `canvas-*` на версии 0.0.0). Release включится после первой рабочей версии `canvas-three`. Планируется отдельная группа `canvas` с `releaseTagPattern: canvas@{version}`. Координировать через главного.
