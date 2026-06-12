---
name: "@capsuletech/web-flow"
owner-agent: owner-web-flow
group: web_base
zone: boost
status: alpha
priority: P2
last-updated: 2026-06-11
---

# @capsuletech/web-flow

Node-canvas примитив для capsule — обёртка над `@dschz/solid-flow` (Solid-порт React/Svelte Flow на официальном ядре `@xyflow/system`). Свободные позиции нод + рёбра + pan/zoom + NodeResizer. **Композируется** (в т.ч. как content ячейки `Layout.Matrix`), а НЕ режим Matrix (см. [[027-web-flow-node-canvas|ADR 027]]).

> **NAMING:** будет переименован в `@capsuletech/boost-flow` в Phase W6 ([[web-rework-plan]] / ADR 046 D1). Light-mirror — `Ui.Flow` placeholder (kit, Phase B6-placeholder).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `boost` — heavy domain-mirror `Ui.Flow` light-placeholder'а. Engine: `@dschz/solid-flow` (Solid-port XYFlow на `@xyflow/system`).
- **Status:** `alpha` (0.1.1) — node/edge/pan/zoom/resizer работают.
- **Priority:** **P2** — графовые редакторы (logic FSM editor, dataflow); опциональный.
- **Maturity bar (до beta):**
  - W6 rename `web-flow` → `boost-flow`.
  - `Ui.Flow` placeholder в `@capsuletech/web-ui` (Phase B6-placeholder).
  - Capsule manifest регистрирует `Flows.*` global (ADR 033).
  - Theme integration (CSS-tokens из web-style).
  - Custom node types API (Solid render для symbol nodes).
- **Active blockers:** нет.
- **Roadmap:**
  1. W6 rename → `boost-flow`.
  2. `Ui.Flow` placeholder координация с owner-web-ui.
  3. Theme tokens integration.
  4. Custom Solid nodes API.
- **Last activity:** 2026-06-11 (canon refresh).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@dschz/solid-flow`** (`^0.1.4`, dep) — main engine (Solid wrapper). https://github.com/dsh-ze/solid-flow
- **`@xyflow/system`** (transitive через solid-flow) — core node-canvas engine. https://xyflow.com/
- **`@capsuletech/web-style`** (workspace, peerDep) — tokens (для theme integration).

## Зона ответственности

### Owns

- `packages/web/flow/src/`:
  - `Flow.tsx` — примитив `Flow` (themed canvas: `colorMode` из активной темы web-style + `--xy-*` оверрайды, дефолты bg/controls/minimap/fitView, `createNode` + pane `onDrop` для палитры, center-on-drop, `fitViewOptions.maxZoom` cap)
  - `FlowPalette.tsx` — `FlowPalette` (простой draggable-список видов нод; HTML5-drag несёт `type` через `FLOW_NODE_MIME`)
  - `dnd.ts` — `FLOW_NODE_MIME` (dataTransfer-MIME для palette→pane drop)
  - `flow.css` — theme-bridge: `--xy-*` переменные → токены capsule (`--card`/`--border`/`--primary`/...)
  - `index.ts` — exports + ре-экспорт строительных блоков из solid-flow
- `packages/web/flow/package.json` — deps / peerDeps / exports
- `packages/web/flow/vite.config.mts` — build config (libConfig)

### Не трогает

- Theme tokens, `createStyle`, `useDarkMode` — owner-web-style (web-flow только ПОТРЕБЛЯЕТ через peer)
- `Layout.Matrix` (композирует Flow в ячейку) — owner-web-ui
- `@dschz/solid-flow` / `@xyflow/system` upstream — внешняя зависимость
- Root-infra (`tsconfig.base.json`, `capsuleConfig.ts` optimizeDeps, nx release group) — главный assistant

## Публичный API

| Export | Что |
|---|---|
| `Flow` | Themed node-canvas. Props: `nodes`, `edges`, `nodeTypes`, `createNode?`, `background?`, `controls?`, `minimap?`, `colorMode?`, `class?`, `children?` + passthrough SolidFlow-props. `colorMode` по умолчанию следует `useDarkMode()`. |
| `IFlowProps` | Тип props для `Flow`. |
| `FlowPalette` | Draggable-список видов нод (drag → `FLOW_NODE_MIME`). Кладётся рядом с `Flow` (incl. слот Matrix). |
| `IFlowPaletteItem`, `IFlowPaletteProps` | Типы палитры. |
| `FLOW_NODE_MIME` | `'application/capsule-flow-node'` — MIME для palette→pane drop. |
| Re-export из solid-flow | `Handle`, `NodeResizer`, `NodeToolbar`, `createNodeStore`, `createEdgeStore`, `useSolidFlow`, типы `NodeProps`, `Node`, `Edge`, `ColorMode`. Консумер импортит ВСЁ из `@capsuletech/web-flow` — `@dschz/solid-flow` напрямую не трогает (изоляция от alpha-дрейфа). |

**Это контракт.** Изменение публичного API = breaking change.

## Quirks / gotchas

- **`@dschz/solid-flow` — alpha (v0.1.x).** API может двигаться. Обёртка `Flow` изолирует консумеров; следить за релизами solid-flow. Построен на `@xyflow/system` (официальное ядро xyflow) — это снижает риск базовой геометрии.
- **Theme-sync = `colorMode` (light/dark) + `--xy-*` (палитра).** `colorMode` подвязан к `useDarkMode()` из web-style (реактивно). Палитра идёт через `flow.css` оверрайды `--xy-*` → наши токены (следуют активной `[data-theme]`). Рёбра/handle'ы следуют только за light/dark colorMode-базисом — красить их прямо в `--primary` пока НЕ делаем (точные `--xy-edge/handle` имена не подтверждены).
- **`@capsuletech/web-style` — peerDependency, НЕ dependency.** Критично: должен быть singleton, иначе `useDarkMode()` в Flow читает ОТДЕЛЬНЫЙ сигнал и не синкается с тоглом приложения. Lib-build externalize'ит peer (проверено — dist ~230kB, web-style не бандлится).
- **Center-on-drop.** `Flow.onDrop` создаёт ноду через `createNode`, затем сдвигает позицию на `-w/2,-h/2` → нода падает центром на курсор, а не левым углом.
- **`fitViewOptions.maxZoom: 1` дефолт.** Без капа `fitView` с одной/мелкой нодой зумит её во весь вьюпорт. Overridable через `fitViewOptions` prop.
- **CSS в lib-build (release TODO).** Build эмитит `dist/assets/web-flow.css`, но package.json `exports` его НЕ отдаёт. В workspace-dev CSS работает (Flow.tsx импортит `@dschz/solid-flow/styles` + `./flow.css`, Vite их тянет). Для publish нужен CSS-export subpath. См. план.
- **dist бандлит solid-flow (release TODO).** `dist/index.mjs` ~230kB включает сам solid-flow (lib-builder бандлит `dependencies`). Для publish — externalize `@dschz/solid-flow`. Dev использует source-alias, dist неважен.
- **Imperative node-store не ложится на HCA Feature.** `createNodeStore`/`addNodes` — императивное состояние solid-flow. В nexus `createNode` живёт в `Widgets.Canvas` (composition glue, данные из `Entities.NodeKind`), не в Feature. Это осознанный компромисс (см. ADR 027 «Последствия»).

## План рефакторинга / оптимизаций

- [x] **Scaffold + примитив `Flow` (ADR 027, 2026-06-02)** — themed canvas, theme-bridge `--xy-*`, ре-экспорты. Билд чистый (166 модулей, DTS, CSS).
- [x] **theme-sync (2026-06-02)** — `colorMode` ← `useDarkMode()`; web-style как peer (externalized).
- [x] **Палитра + drop-into-canvas (2026-06-02)** — `FlowPalette` + `FLOW_NODE_MIME` + `Flow.createNode`/`onDrop` (`screenToFlowPosition` + `addNodes`). Center-on-drop.
- [ ] **Release-prep** — externalize `@dschz/solid-flow` в dist; CSS-export subpath (`@capsuletech/web-flow/styles`); добавить в nx `web_base` fixed release group; написать README.md.
- [ ] **Edge/handle theming под палитру** — подтвердить `--xy-edge-stroke`/`--xy-handle-*` имена, замапить на токены (`--primary`/`--border`).
- [ ] **Flow↔Flow cross-instance перенос нод** — НЕ нативно (каждый SolidFlow изолирован). Кастомный мост (coord-translation + cross-canvas drop). Только при конкретном кейсе; для «регионов» предпочесть group-ноды/subflows в ОДНОМ Flow.
- [ ] **owner-web-flow agent** — выделить отдельного owner'а (пока главный). После создания — restart сессии (см. [[feedback_new_agent_needs_restart]]).

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | — (TBD) | Пока нет. Кандидаты: `Flow` props-defaults (bg/controls/minimap toggles), center-on-drop offset-математика, theme `colorMode` биндинг. |
| Runtime | `apps/nexus` dashboard | Верифицировано пользователем в браузере: канвас, palette→drop, resize (NodeResizer), theme-sync (light/dark + палитры), center-on-drop. |

**Перед изменением:** билд должен быть чистый (`pnpm --filter @capsuletech/web-flow build` — DTS = typecheck).

## Cross-package dependencies

| Зона | Owner |
|---|---|
| Theme tokens, `useDarkMode`, createStyle | owner-web-style (peer) |
| `Layout.Matrix` (композирует Flow) | owner-web-ui |
| Root infra (tsconfig.base, capsuleConfig, release group) | главный assistant |

## Release group

`web_base` (fixed). **TODO:** пакет ещё НЕ добавлен в nx release-group конфиг — сделать перед первым релизом (зона главного).

## Связанные документы

- [[027-web-flow-node-canvas|ADR 027]] — решение (обёртка solid-flow, «компоновать не режим», theme-bridge, изоляция dep)
- [[026-matrix-grid-canvas|ADR 026]] — grid-канвас Matrix (sibling-capability для tile-дашбордов; Flow — для нод-графов)
- [[web-ui|web-ui.md]] — Matrix композирует Flow
- README.md (этой папки) — user-facing (TBD)
