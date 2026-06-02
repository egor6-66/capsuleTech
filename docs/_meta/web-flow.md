---
tags: [meta, web-flow, ai-context]
status: documented
type: ai-anchor
audience: claude
updated: 2026-06-02
---

# 🤖 web-flow — AI context anchor

> [!ai]
> Шпаргалка для Claude-инстансов. Без воды. Юзеру — [[flow|flow.md]].

## TL;DR

Node-canvas примитив (`Flow`+`FlowPalette`) — обёртка над `@dschz/solid-flow` (alpha v0.1.x на ядре `@xyflow/system`). Модель: `nodes[] + edges[] + pan/zoom`, композируется в Widget/Matrix. Theme-bridge: `colorMode` ← `useDarkMode()`, палитра ← `flow.css` → `--xy-*` токены. Ре-экспорт solid-flow блоков (Handle/NodeResizer/createNodeStore/...) изолирует от alpha-дрейфа.

## Где что лежит

| Файл | Что |
|---|---|
| `packages/web/flow/src/Flow.tsx` | Обёртка `Flow` (SolidFlowProvider, theme-bridge, дефолты bg/controls/minimap/fitView, palette→pane drop via `createNode`+`onDrop`) |
| `packages/web/flow/src/FlowPalette.tsx` | Draggable-список видов нод; HTML5 drag → `FLOW_NODE_MIME` |
| `packages/web/flow/src/dnd.ts` | `FLOW_NODE_MIME` констант (`'application/capsule-flow-node'`) |
| `packages/web/flow/src/flow.css` | Theme-bridge: `--xy-*` переменные → токены capsule |
| `packages/web/flow/src/index.ts` | Exports + ре-экспорты solid-flow (Handle, NodeResizer, …) |
| `packages/web/flow/OWNERSHIP.md` | Зоны ответственности, release-TODO |

## Примитив `Flow`

**Props:**
- `nodes`, `edges` — от solid-flow
- `nodeTypes?: {}` — map type → component (custom-ноды)
- `createNode?: (type, position) => Node` — palette→drop callback (omit чтобы отключить drop)
- `background?: false | 'dots' | 'lines' | 'cross'` — дефолт `'dots'`
- `controls?: boolean` — дефолт `true`
- `minimap?: boolean` — дефолт `true`
- `colorMode?: 'light' | 'dark'` — дефолт из `useDarkMode()`
- `fitView?: boolean` — дефолт `true`
- `fitViewOptions?: {}` — дефолт `{ maxZoom: 1 }` (cap при одной малой ноде)
- `class?`, `children?`, остальное → SolidFlow passthrough

**Структура:** `Flow` → `SolidFlowProvider` → `FlowInner` (внутри провайдера вызывает `useSolidFlow()`).

## Theme-bridge

**colorMode:** `FlowInner` читает `useDarkMode()` → `isDark() ? 'dark' : 'light'` → передаёт в `SolidFlow.colorMode`. Реактивный (Solid-сигнал).

**Палитра (CSS):** `flow.css` оверрайдит `--xy-*` переменные solid-flow → наши токены (`--card`, `--border`, `--primary`, …). Следуют `[data-theme]` атрибуту.

**@capsuletech/web-style — peer.** Singleton; lib-build externalize'ит (dist не бандлит web-style). Иначе Flow читает отдельный dark-сигнал → не синкится с тоглом приложения.

## Palette→canvas drop

1. `FlowPalette` item на `onDragStart` кладёт `type` в `dataTransfer` с MIME `FLOW_NODE_MIME`
2. `Flow.onDrop` перехватывает (если `createNode` задан)
3. `screenToFlowPosition({ x, y })` → flow-координаты
4. `createNode(type, position)` → возвращает Node объект
5. Center-on-drop: сдвиг позиции на `-w/2, -h/2` → нода падает центром на курсор
6. `flow.addNodes(node)` → материализуется

## Изоляция dep

Re-export из solid-flow в `index.ts`:
- `Handle`, `NodeResizer`, `NodeToolbar`
- `createNodeStore`, `createEdgeStore`, `useSolidFlow`
- Типы: `Node`, `Edge`, `NodeProps`, `ColorMode`

Консумер импортит **ВСЁ** из `@capsuletech/web-flow`, никогда `@dschz/solid-flow` напрямую. Это гасит alpha-дрейф (если solid-flow API сдвинется — меняем только обёртку).

## Кастомные ноды

Компонент с `NodeResizer` + `Handle` + контент:

```tsx
const MyNode = (props: NodeProps) => (
  <div class="border border-border bg-card p-2 rounded">
    <Handle type="target" position="top" />
    <div>{props.data.label}</div>
    <Handle type="source" position="bottom" />
    <NodeResizer />
  </div>
);
```

Регистрация через `nodeTypes={{ my: MyNode }}` пропс Flow.

## Композиция

**В Matrix:** Flow как content ячейки (слот `main`), FlowPalette рядом (соседний слот, `aside` или `sidebar`). Matrix передаёт `nodes`/`edges` как state → Flow мутирует через `flow.addNodes/addEdges/updateNode/...` (imperative).

**В Widget:** Flow как children, палитра как соседняя div.

Примечание: imperative `createNodeStore`/`addNodes` не ложится на HCA Feature (которая декларативна). Узлы живут в local state (Widget/Matrix), `createNode` — это композиция glue (mapping palette item → solid-flow Node).

## Gotchas

1. **Alpha dep (`@dschz/solid-flow` v0.1.x)** — API может двигаться. Трекаем релизы; обёртка изолирует.
2. **Peer singleton `@capsuletech/web-style`** — lib-build externalize'ит; если web-style попадёт в dist, Flow не синкается с тоглом приложения.
3. **CSS в lib-build (release-TODO)** — dist эмитит `assets/web-flow.css`, но `exports` его не отдаёт. Workspace-dev тянет через Vite.
4. **dist бандлит solid-flow (release-TODO)** — dist/index.mjs ~230kB включает solid-flow. Для publish externalize.
5. **`fitViewOptions.maxZoom: 1` cap** — без капа одна мелкая нода зумит во весь вьюпорт. Overridable.
6. **Center-on-drop math** — `-w/2, -h/2` offset; если `node.width/height` undefined, offset = 0.

## Что менять когда

| Хочу… | Куда лезть |
|---|---|
| Изменить UI Flow (bg/controls/minimap/...) | `Flow.tsx` props + дефолты в `FlowInner` |
| Добавить поле в Node/Edge | Re-export из solid-flow + type в `INodeData`/`IEdgeData` (если создаём) |
| Изменить тему (colorMode/палитра) | `flow.css` (`--xy-*` оверрайды) + `FlowInner` (`useDarkMode()` читаемость) |
| Отключить palette→drop | Omit `createNode` prop у Flow |
| Кастомная нода | Компонент с `NodeProps`, `Handle`, `NodeResizer` + регистрация в `nodeTypes` |
| Синк state с Matrix | Widget/Matrix передаёт `nodes/edges` в Flow, Flow мутирует через `flow.addNodes/updateNode/...` |

## Release TODOs

- Externalize `@dschz/solid-flow` в dist (не бандлить)
- CSS-export subpath (`@capsuletech/web-flow/styles`)
- Добавить в `nx.json` `web_base` fixed release group (зона главного)
- README.md (этой папки)

## Cross-links

- User-doc: [[flow]]
- ADR: [[027-web-flow-node-canvas]]
- Related: [[web-ui]], [[web-style]], [[web-dnd]]
