---
name: "@capsuletech/canvas-ui"
owner-agent: owner-canvas
group: canvas
status: pre-1.0
last-updated: 2026-06-11
---

# @capsuletech/canvas-ui

DOM-side overlay-компоненты (LoadingOverlay, ErrorOverlay, PauseOverlay, FpsCounter, и др.) для отображения поверх canvas-движков. Обычные HCA-Entity (Solid JSX), не opaque.

## Зона ответственности

### Owns
- `packages/canvas/ui/src/` (полностью)
- `packages/canvas/ui/package.json` exports / deps
- `packages/canvas/ui/vite.config.mts`

### Не трогает
- `packages/canvas/host/` — контракт bridge/lifecycle; изменения требуют отдельного scope'а.
- `packages/canvas/three/` — engine-адаптер; изменения требуют отдельного scope'а.
- `packages/web/ui/` и другие `@capsuletech/web-*` — чужие пакеты, делегировать соответствующим owner'ам.
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework-developer scope).
- `scripts/release-local.mjs` и shared infra (главный assistant).

## Публичный API

Пакет на стадии scaffold — реализаций нет. Единственный текущий экспорт (`.`):

- `__scaffold` — строковая константа-плейсхолдер; будет удалена при первой реальной реализации.

Запланированные компоненты (см. `README.md`):
- `LoadingOverlay` — прогресс-бар / spinner поверх canvas во время фазы `loading`.
- `ErrorOverlay` — отображение `ICanvasError` (фаза + сообщение).
- `PauseOverlay` — визуальный индикатор паузы.
- `FpsCounter` — счётчик FPS (получает данные через bridge-событие).
- `FullscreenToggle` — кнопка переключения полноэкранного режима.
- `ResizeObserver` — headless-компонент, нотифицирует адаптер при изменении размера canvas.

Все компоненты позиционируются через CSS `absolute` поверх `<canvas>` (z-index coordination — документировать конвенцию при реализации).

## Quirks / gotchas

- **Scaffold, нет реализаций** — `src/index.ts` экспортирует только `__scaffold`. Все реальные компоненты появятся после ревью контракта `canvas-host`.
- **Зависит от `canvas-host`** — overlays должны подписываться на lifecycle-состояния и bridge-события через `ICanvasEngineAdapter`. Потребует `useCanvas()` hook (TBD в `canvas-host`).
- **Позиционирование поверх `<canvas>` через CSS `absolute`** — если host-app использует `<Layout>` с разными slot'ами, может потребоваться z-index coordination. Конвенцию задокументировать при реализации первого overlay.
- **Тесты в jsdom** — DOM-side компоненты тестируются в jsdom (аналог UiProxy-тестов в `packages/web/core`). WebGL в jsdom недоступен, поэтому тесты overlays не должны инстанцировать engine-адаптеры.
- **peer: `solid-js ^1.9.0`** — объявлен, но не используется пока `src/index.ts` — scaffold. При первой JSX-реализации убедиться что Vite не пре-бандлит Solid (добавить в `optimizeDeps.exclude` через `vite-builder`).

## План рефакторинга / оптимизаций

- [ ] **Реализовать `LoadingOverlay`** — первый эталонный компонент после ревью контракта. (priority: high)
- [ ] **`useCanvas()` hook** — TBD в `canvas-host`; overlays зависят от него. (priority: high)
- [ ] **Реализовать остальные overlays** — ErrorOverlay, PauseOverlay, FpsCounter, FullscreenToggle, ResizeObserver. (priority: medium)
- [ ] **z-index конвенция** — задокументировать при реализации первого overlay. (priority: medium)
- [ ] **Удалить `__scaffold`** — при первом реальном экспорте. (priority: low)

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | — | нет (scaffold, нет реализаций) |
| Integration | — | нет |
| E2E | — | нет |

Тесты появятся вместе с первыми реализациями компонентов. Среда — jsdom (DOM-side overlays). WebGL не нужен: overlays общаются с движком только через типизированный `ICanvasEngineAdapter` (mock в тестах).

**Перед изменением:** убедиться что `pnpm --filter @capsuletech/canvas-ui build` проходит без ошибок.
**При breaking change:** обновить контракт подписки на lifecycle/events + тесты.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| Canvas bridge / lifecycle типы | owner-canvas (`packages/canvas/host/`) |
| Engine-адаптер Three.js | owner-canvas (`packages/canvas/three/`) |
| Vite plugins / lib-builder | owner-builders |
| HCA wrappers, providers | owner-web-core |
| UI primitives (если нужны в overlays) | owner-web-ui |

## Release group

Пакет не входит ни в одну release-группу `nx.json` (все три `canvas-*` на версии 0.0.0). Release включится вместе с `canvas-host` / `canvas-three` после первых рабочих реализаций. Координировать через главного.
