---
name: "@capsuletech/canvas-three"
owner-agent: owner-canvas
group: canvas
status: pre-1.0
last-updated: 2026-06-11
---

# @capsuletech/canvas-three

Эталонный engine-адаптер — реализация `ICanvasEngineAdapter` для Three.js. Маппирует lifecycle/bridge-протокол `canvas-host` на Three.js renderer, scene graph и animation loop.

## Зона ответственности

### Owns
- `packages/canvas/three/src/` (полностью)
- `packages/canvas/three/package.json` exports / deps
- `packages/canvas/three/vite.config.mts`

### Не трогает
- `packages/canvas/host/` — контракт `ICanvasEngineAdapter`; изменения требуют отдельного scope'а и согласования с главным.
- `packages/canvas/ui/` — DOM overlays; отдельный scope.
- `packages/web/*/` и другие `@capsuletech/*` — чужие пакеты, делегировать соответствующим owner'ам.
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework-developer scope).
- `scripts/release-local.mjs` и shared infra (главный assistant).

## Публичный API

Пакет на стадии scaffold — реализации нет. Единственный текущий экспорт (`.`):

- `__scaffold` — строковая константа-плейсхолдер; будет удалена при первой реальной реализации.

Запланированный публичный API (см. `README.md`):
- `createThreeAdapter(options?)` — фабрика, возвращает `ICanvasEngineAdapter` для Three.js.
- Конкретные union-типы команд (`ThreeCommand`) и событий (`ThreeEvent`) для type-safe bridge.

Маппинг lifecycle → Three.js (план):
- `load` → инициализация `WebGLRenderer`, загрузка ассетов через `THREE.LoadingManager`.
- `mount` → `renderer.domElement` заменяется на переданный `<canvas>` (или renderer создаётся с ним).
- `start` → `renderer.setAnimationLoop(callback)`.
- `pause` → `renderer.setAnimationLoop(null)`.
- `resume` → `renderer.setAnimationLoop(callback)`.
- `dispose` → `renderer.dispose()` + `scene.traverse(obj => obj.geometry?.dispose(); obj.material?.dispose())`.

## Quirks / gotchas

- **Scaffold, нет реализации** — `src/index.ts` экспортирует только `__scaffold`. Реализация появится после ревью контракта `canvas-host`.
- **WebGL недоступен в jsdom** — unit-тесты адаптера должны мокировать Three.js core (`WebGLRenderer`, `Scene`, `Camera`). Реальный WebGL — только в integration/e2e через Playwright / headless Chrome.
- **`renderer.setAnimationLoop(null)` ≠ полная пауза** — GPU держит buffers; остановлен только loop. Реальный dispose — отдельный шаг с `renderer.dispose()` и traverse по scene graph.
- **`THREE.LoadingManager` shared** — если адаптер использует несколько loader'ов (GLTF + KTX2 + DRACO), все должны идти через один `LoadingManager` для единственного `onProgress`-колбэка (иначе прогресс в `ICanvasLoadProgress` будет некорректным).
- **peer `three >= 0.160.0`** — Three.js делает breaking changes часто (renamed imports, removed APIs). При каждом major-bump нужен smoke + readthrough changelog. Текущий minimum: `0.160.0`.
- **peer `solid-js ^1.9.0`** — объявлен; при реализации убедиться что Vite не пре-бандлит (добавить в `optimizeDeps.exclude` через `vite-builder`).
- **Адаптер — эталон** — по нему пойдут `canvas-babylon` и `canvas-ue`. Любое архитектурное решение, принятое здесь, становится паттерном для других адаптеров. Обсуждать с главным перед нетривиальными изменениями структуры.

## План рефакторинга / оптимизаций

- [ ] **Реализовать `createThreeAdapter`** — эталонная реализация `ICanvasEngineAdapter` после ревью контракта. (priority: high)
- [ ] **Mock Three.js для unit-тестов** — mock renderer/scene/camera; проверить маппинг lifecycle-методов. (priority: high)
- [ ] **Integration-тесты через Playwright** — headless Chrome + реальный WebGL; отдельный setup. (priority: medium)
- [ ] **`ThreeCommand` / `ThreeEvent` union-типы** — задать конкретный набор поддерживаемых команд/событий. (priority: medium)
- [ ] **OffscreenCanvas + Worker** — out-of-process рендеринг для CPU-heavy сцен; контракт `send/on` уже совместим (tagged-messages сериализуются). Отдельная phase. (priority: low)
- [ ] **Удалить `__scaffold`** — при первом реальном экспорте. (priority: low)

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | — | нет (scaffold, нет реализации) |
| Integration | — | нет (требует headless Chrome) |
| E2E | — | нет |

Тесты появятся вместе с реализацией. Unit — mock Three.js в Vitest node-env (без WebGL). Integration — Playwright/headless Chrome (отдельный setup, после impl).

**Перед изменением:** убедиться что `pnpm --filter @capsuletech/canvas-three build` проходит без ошибок.
**При breaking change:** обновить тесты + обновить `packages/canvas/host/README.md` (маппинг lifecycle).

## Cross-package dependencies

| Зона | Owner |
|---|---|
| Canvas bridge / lifecycle типы | owner-canvas (`packages/canvas/host/`) |
| DOM overlays поверх canvas | owner-canvas (`packages/canvas/ui/`) |
| Vite plugins / lib-builder | owner-builders |
| HCA wrappers, providers | owner-web-core |

## Release group

Пакет не входит ни в одну release-группу `nx.json` (все три `canvas-*` на версии 0.0.0). Release группы `canvas` (`canvas-host` + `canvas-ui` + `canvas-three`) включится после первой рабочей версии этого пакета. Координировать через главного.
