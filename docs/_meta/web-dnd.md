---
tags: [meta, web-dnd, ai-context]
status: documented
type: ai-anchor
audience: claude
---

# @capsuletech/web-dnd — AI context anchor

> Шпаргалка для Claude-инстансов, работающих с `packages/web/dnd/`. Без воды.

## TL;DR {#tldr}

Pointer-based DnD для Solid.js (mouse + touch, нет HTML5 native). Два export-entry:
- `.` — generic-ядро (framework-agnostic, нет web-core dep)
- `./controllers` — HCA-прослойка: meta-aware draggable/droppable с emit через `useEmit` (ADR 032)

## Топология

```
packages/web/dnd/
  src/
    index.ts            barrel generic-ядра
    types.ts            DragData, IDropInfo, IDraggableOptions, IDroppableOptions, etc.
    context.tsx         DnDProvider + useDnD (signals: activeId, activeData, pointer, overId)
    draggable.ts        createDraggable — pointer events, pending-drag threshold
    droppable.ts        createDroppable — accepts predicate, onDrop callback
    sortable.ts         createSortable — ordered-list reorder pattern
    sortableZone.ts     createSortableGroup — geometric multi-zone sortable (ADR 025)
    overlay.tsx         DragOverlay — render-prop custom ghost
    autoScroll.ts       window-level auto-scroll при drag near edge
    grid.ts             pure math: pointToCell/moveItem/resizeItem/placeItem (ADR 026)
    controllers/
      index.ts          barrel ./controllers subpath (ADR 032)
      types.ts          IDragPayload, IDropPayload, IDroppableEmitMap, IDraggableEmitMap
      emitting-droppable.ts   createEmittingDroppable
      emitting-draggable.ts   createEmittingDraggable
```

## Граф зависимостей

```
@capsuletech/web-dnd (.)          → solid-js (peer)
@capsuletech/web-dnd/controllers  → web-dnd (.) + @capsuletech/web-core (useEmit)
@capsuletech/web-core             → ничего из web-dnd (ацикличен)
```

## Generic-ядро (`src/index.ts`) — Public API

| Export | Сигнатура / что |
|---|---|
| `DnDProvider` | Component, props: IDnDProviderProps. Context-провайдер. |
| `useDnD()` | Hook → IDnDContext: `{ state: {activeId, activeData, pointer, overId, canDrop}, registerDraggable, registerDroppable, startDrag }` |
| `createDraggable(opts)` | `IDraggableOptions → IDraggable { ref, isDragging }`. Directive-паттерн: `<div ref={drag.ref} />`. |
| `createDroppable(opts)` | `IDroppableOptions → IDroppable { ref, isOver, canDrop }`. |
| `createSortable(opts)` | Sorted-list + onReorder. |
| `createSortableGroup(opts)` | Geometric multi-zone sortable (ADR 025). |
| `DragOverlay` | Render-prop: `{(active) => JSX}`. |
| `isFromSortable(data)` | Type-guard. |
| Grid-math | `pointToCell`, `moveItem`, `resizeItem`, `placeItem`, `collides`, `getCollisions`, `compactVertical`, `clampToCols` |
| Types | `DragData`, `DraggableId`, `DroppableId`, `IDnDProviderProps`, `IDraggableOptions`, `IDroppableOptions`, `IDropInfo`, `IDragEndResult`, `IPoint`, `IDraggable`, `IDroppable`, `IGridItem`, `IGridLayout`, `ISortableItem`, `ISortableOptions`, `ISortableGroupOptions`, `ISortableGroup`, `ISortableZoneOptions`, `ISortableDropEvent`, `ISortableZone`, `ISortableZoneItem`, `IRect` |

## HCA-прослойка (`src/controllers/`) — ADR 032, фаза 4

### createEmittingDroppable

```ts
import { createEmittingDroppable } from '@capsuletech/web-dnd/controllers';

const drop = createEmittingDroppable({
  id: 'canvas-zone',
  accepts: (data) => data.kind === 'component',
  // + все IDroppableOptions (onDrop, data, disabled)
  emits: {
    onDrop: 'onDrop',       // → emit('onDrop', { payload: { data, pointer, dropInfo } })
    onDragOver: 'onDragOver', // → emit('onDragOver', { payload: { data, pointer } })
  },
});
// <div ref={drop.ref} />
```

Возвращает тот же `IDroppable` интерфейс — совместим с `createDroppable`.

**Payload shapes:**
- `onDrop`: `IDropPayload = { data: T, pointer: IPoint, dropInfo: IDropInfo }`
- `onDragOver`: `IDragPayload = { data: T, pointer: IPoint }`

`onDrop` emit срабатывает ПЕРВЫМ (до оригинального `options.onDrop` callback если передан).
`onDragOver` — на каждый `pointermove` пока `isOver=true`. Дросселинга нет — Controller должен быть идемпотентен.

### createEmittingDraggable

```ts
import { createEmittingDraggable } from '@capsuletech/web-dnd/controllers';

const drag = createEmittingDraggable({
  id: 'node-42',
  data: () => ({ kind: 'component', nodeId: '42' }),
  // + все IDraggableOptions (disabled, activationDistance)
  emits: {
    onDragStart: 'onDragStart', // → emit('onDragStart', { payload: { data, pointer } })
    onDragEnd: 'onDragEnd',     // → emit('onDragEnd', { payload: { data, pointer } })
  },
});
// <div ref={drag.ref} />
```

Возвращает тот же `IDraggable` интерфейс.

**Timing gotcha:** `startDrag` устанавливает `setActiveId` ДО `setActiveData`/`setPointer`. `onDragStart` effect читает все три реактивно и эмитит когда все три доступны.

**Оба wrapper'а:**
- `@throws` если вызваны вне Controller/Feature-scope (нет ControllerContext).
- `emits` ключи опциональны — не задан ключ = нет emit.

## Ключевые gotcha

### No setPointerCapture
`document.elementFromPoint(x, y)` при pointer capture возвращает captured element а не реальный target → ломает `findDroppableAt`. Window-level listeners без capture. Не менять.

### [data-dnd-cancel]
Потомок с `[data-dnd-cancel]` блокирует start drag. Solid делегирует pointerdown через document, native listener на draggable-el срабатывает раньше → `e.stopPropagation()` на потомке не помогает. Решение: `e.target.closest('[data-dnd-cancel]')` check в `onPointerDown`.

### startDrag signal ordering
`setActiveId → setActiveData → setPointer` — в этом порядке. При reactive effect на `isDragging` — activeData ещё null при первом запуске effect. Нужно читать все три реактивно вместе, не через untrack.

### Controllers и useEmit scope
`createEmittingDroppable` / `createEmittingDraggable` вызывают `useEmit()` при инициализации. Если вызваны вне Controller/Feature scope — useEmit бросает. Нужно создавать эти wrappery внутри компонента, вложенного в Controller/Feature scope.

### onDragOver частота
Reactive `createEffect` в `onDragOver` срабатывает при каждом изменении `pointer` сигнала (каждый `pointermove`). Controller должен обрабатывать это идемпотентно.

### Isolated dependency
`@capsuletech/web-core` добавлен как package-level dependency (npm не поддерживает per-entry deps). Но только `src/controllers/**` его импортирует — tree-shaking гарантирует что `dist/index.mjs` не тянет `dist/controllers.mjs`.

## Что менять когда {#changes-guide}

| Хочу... | Куда |
|---|---|
| Новая опция в createDraggable/createDroppable | `types.ts` (IDraggableOptions/IDroppableOptions) + реализация |
| Новый lifecycle в emitting-droppable | `controllers/types.ts > IDroppableEmitMap` + `controllers/emitting-droppable.ts` + тест |
| Новый lifecycle в emitting-draggable | `controllers/types.ts > IDraggableEmitMap` + `controllers/emitting-draggable.ts` + тест |
| Расширить IDropInfo | `types.ts` + `context.tsx` (onPointerUp) + тест |
| Keyboard DnD (a11y) | новый `keyboard.ts` + опция в IDraggableOptions |
| Изменить payload shape | `controllers/types.ts` + оба emitting-* + тесты + BREAKING CHANGE |
| tsconfig.base.json alias для controllers | **главный assistant** (не owner-web-dnd) |

## Build config

```ts
// vite.config.mts — multi-entry:
libConfig({
  entry: {
    index: 'src/index.ts',
    controllers: 'src/controllers/index.ts',
  },
  name: 'CapsuleDnd',
})
```

```json
// package.json exports:
"./controllers": {
  "types": "./dist/controllers/index.d.ts",
  "import": "./dist/controllers.mjs",
  "default": "./dist/controllers.mjs"
}
```

## Тесты {#tests}

Запуск: `pnpm --filter @capsuletech/web-dnd test`

| Файл | Тестов | Что покрывает |
|---|---|---|
| `src/__tests__/provider-cleanup.test.tsx` | 5+4 | listeners lifecycle, activation threshold |
| `src/__tests__/sortableZone.test.ts` | 27 | geometric helpers |
| `src/__tests__/grid.test.ts` | 56 | grid-math (ADR 026) |
| `src/__tests__/controllers.test.tsx` | 9 | ADR 032: emit payload, timing, isolation |

Итого: **101 тест**.

## Release group {#release-group}

`web_base` (fixed). Coordinating release → главный assistant.

Связанное: ADR 032, ADR 025, ADR 026, OWNERSHIP.md, packages/web/dnd/README.md
