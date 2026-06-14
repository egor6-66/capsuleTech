---
tags: [09-packages, dnd]
status: documented
type: guide
last_updated: 2026-06-13
---

# 🤏 @capsuletech/web-dnd

> [!info]
> Лёгкий drag-and-drop для Solid.js. Pointer-based — единый код для мыши и touch, без HTML5 native dragenter/dragleave-флэйков.

> Реализация может быть переписана позже под другой подход (HTML5 DnD spec
> или dedicated lib). Текущая API-форма — стабильный контракт; меняйте только
> если переписывается ВСЁ.

## Структура {#structure}

```
packages/web/dnd/src/
├── index.ts        public API
├── context.tsx     DnDProvider / useDnD — корневой context с active draggable, pointer, drop-targets
├── draggable.ts    createDraggable(opts) — primitive для draggable элемента
├── droppable.ts    createDroppable(opts) — primitive для drop-зоны
├── sortable.ts     createSortable(opts) — sortable-список (reorder через items + onReorder)
├── overlay.tsx     DragOverlay — render-prop overlay, следующий за курсором
├── autoScroll.ts   auto-scroll при перетаскивании к краям контейнера
└── types.ts        IDraggable* / IDroppable* / IDropInfo / IDragEndResult / DragData / IPoint
```

## API {#api}

```tsx
import { DnDProvider, createDraggable, createDroppable, DragOverlay } from '@capsuletech/web-dnd';

const App = () => (
  <DnDProvider autoScroll>
    <Palette />
    <DropZone />
    <DragOverlay>{(data) => <div>{data.label}</div>}</DragOverlay>
  </DnDProvider>
);

const PaletteItem = (props: { item: { type: string; label: string } }) => {
  const drag = createDraggable<{ source: 'palette'; type: string; label: string }>({
    id: `palette:${props.item.type}`,
    data: () => ({ source: 'palette', ...props.item }),
  });
  return <div ref={drag.ref}>{props.item.label}</div>;
};

const DropZone = () => {
  const drop = createDroppable<{ type: string }>({
    id: 'zone',
    accepts: (d) => d.type === 'Button',
    onDrop: (d) => console.log('dropped', d),
  });
  return <div ref={drop.ref}>{drop.canDrop() ? '✅' : '⬇️'}</div>;
};
```

`createSortable` сверху на этих primitives — управляет переупорядочиванием массива:

```tsx
const [items, setItems] = createSignal(['alpha', 'beta', 'gamma']);
const sortable = createSortable({ id: 'list', items, onReorder: setItems });

<For each={items()}>
  {(id) => {
    const item = sortable.createItem(id);
    return <div ref={item.ref} classList={{ 'opacity-40': item.isDragging() }}>{id}</div>;
  }}
</For>
```

## Что делает `DnDProvider`

Корневой context с reactive-state:
- `state.active` — текущий draggable (id + data + start-pointer).
- `state.pointer` — текущий `{x, y}`, обновляется на каждый `pointermove`.
- `state.over` — drop-target под курсором (если `accepts`-предикат проходит).
- `state.canDrop` — текущая возможность drop (derived).

`autoScroll: true` навешивает scroll-loop, который скроллит ближайший scrollable-ancestor когда draggable приближается к краю.

## DragOverlay

Render-prop, рендерящий visual-preview под курсором. Получает `data: DragData` (что тащим), возвращает JSX. Полезно когда самый draggable-элемент скрывается/трансформируется при `pointerdown`.

## Когда использовать

- Tree-editor (drag node из палитры, reorder children).
- Sortable lists.
- Drag-and-drop forms.

Когда **НЕ** использовать: web-page-wide native browser drag (файлы из ОС, перетаскивание между окнами) — там нужны HTML5 DnD events. Этот пакет про in-app DnD.

## Связанное {#related}

- Используется демо-виджетами в `apps/sandbox/src/widgets/demos/dnd.tsx`.
- В связке с [[ui-creator|@capsuletech/web-ui-creator]] — для редактора UI-дерева.
