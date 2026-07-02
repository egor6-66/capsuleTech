# Brief — owner-web-dnd: reorder-примитивы (zone + DropIndicator) + перенос DnD-фидбека из студии

> Зона: `packages/web/runtime/dnd/`. Релиз-группа `web_base`. Commit-only.
> Перед PR: `pnpm --filter @capsuletech/web-dnd test` + `nx typecheck @capsuletech/web-dnd` +
> `biome check --write packages/web/runtime/dnd/src`. Пушит/мержит architect.
> Contract-change между web-dnd и web-studio — координирует architect.

## 0. Проблема (мандат USER)

DnD-фидбек для reorder (вычисление зоны before/after/inside + визуальный индикатор вставки)
сейчас **захардкожен в `@capsuletech/web-studio`** (`tree/useRowDnd.ts`, `tree/dndHelpers.ts`,
индикатор-разметка в `TreeRow.tsx`). Это generic DnD-функционал — при следующем консюмере
(не только студия) он размажется по фреймворку. **Канон:** возможность DnD живёт в пакете DnD;
консюмер даёт только домен-предикаты + контент.

Перенести generic-часть в `web-dnd`, студия станет тонким консюмером.

## 1. Что уже есть в web-dnd (не дублировать)

- `createDraggable` / `createDroppable` — low-level (ref + register). `IDropInfo.ratio` (0..1
  позиция курсора в droppable).
- `useDnD().state` — `activeData` / `pointer` / `overId` / `canDrop` (live).
- `DragOverlay` — портал-призрак у курсора (render-prop). **Механизм оверлея уже generic — НЕ трогаем.**
- `createSortable` / `createSortableGroup` / `sortableZone` — flat multi-zone reorder. **Наш кейс
  другой** (per-элемент before/after/inside), поэтому нужен отдельный примитив — но свериться со
  стилем этих API.

## 2. Что построить

### 2.1. Тип `DropZone`
```ts
export type DropZone = 'before' | 'after' | 'inside';
```
(сейчас временно объявлен в `web-studio/document.ts` — станет каноничным здесь, студия импортит отсюда).

### 2.2. `createReorderable` — draggable+droppable на одном элементе + live-зона
```ts
createReorderable<T extends DragData>({
  id: string,
  data: Accessor<T> | T,
  disabled?: Accessor<boolean>,        // напр. корень дерева не draggable
  accepts?: (data: T) => boolean,      // консюмер: не в себя/потомка (доменный guard)
  canInside?: (data: T) => boolean,    // консюмер: цель принимает как ребёнка → включает зону 'inside'
  onDrop: (data: T, zone: DropZone) => void,
  thresholds?: { before?: number; after?: number }, // дефолт 0.3 / 0.7 (container), 0.5 (leaf)
}): {
  setRef: (el: HTMLElement) => void,   // объединяет drag.ref + drop.ref + захват el
  isDragging: Accessor<boolean>,
  zone: Accessor<DropZone | null>,     // live-зона под курсором (для индикатора), null вне ховера/невалида
}
```
Логика `zone()` (перенести из `useRowDnd.ts`): если `overId === my droppable id` и
`accepts(activeData)` → взять `pointer` из `useDnD`, посчитать `ratioY = (pointer.y − rect.top)
/ rect.height`, вернуть `zoneFromRatio(ratioY, canInside(activeData))`. `onDrop` считает зону тем
же `zoneFromRatio(info.ratio.y, …)` — консистентно с индикатором.

### 2.3. `zoneFromRatio` (pure, экспорт + тест)
```ts
zoneFromRatio(ratioY: number, canInside: boolean): DropZone
// !canInside: <0.5 → before, else after
// canInside:  <0.3 → before, >0.7 → after, else inside
```
(дословно из `web-studio/tree/dndHelpers.ts`).

### 2.4. `<DropIndicator zone={} />` — визуал сепаратора (web-dnd владеет стилем)
Pure-компонент, рендерится внутри `position:relative`-обёртки строки:
- `before` / `after` — **жирная линия-сепаратор** (primary, ~3px, rounded) с точкой-маркером слева,
  обведённой фоном; абсолютно у верхнего/нижнего края.
- `inside` — кольцо `ring-primary` + заливка `bg-primary/10` вокруг цели.

⚠️ **Баг для расследования:** текущий студийный индикатор (та же логика через `useDnD`
pointer/overId) **визуально не показывается** при реальном драге, хотя `onDrop` отрабатывает
(reorder срабатывает). Разобраться при переносе — вероятные кандидаты: реактивность `zone()`
(сейчас plain-функция, не memo), клиппинг абсолютного элемента родителем с `overflow`,
negative-offset вне content-box кнопки-триггера аккордеона, z-index. Индикатор ДОЛЖЕН быть
стабильно виден на leaf и container строках.

### 2.5. (опц.) helper для labeled-overlay
Механизм (`DragOverlay`) достаточен, **контент чипа остаётся у консюмера** (студия рисует
иконку+название из своих манифестов — см. `web-studio/providers/DragChip.tsx`). Если хочется —
можно добавить тонкий `<DragChip label icon />` convenience, но это не обязательно; не тащить в
web-dnd знание доменных манифестов.

## 3. Референс — что лифтить из студии (owner-studio удалит у себя после)

- `packages/web/studio/src/tree/dndHelpers.ts` → `zoneFromRatio` (generic, забрать),
  `isSelfOrDescendant` (**остаётся в студии** — знает топологию дерева).
- `packages/web/studio/src/tree/useRowDnd.ts` → generic-каркас (draggable+droppable+zone) забрать
  в `createReorderable`; предикаты `accepts`/`canInside` (манифесты) остаются в студии.
- `packages/web/studio/src/tree/TreeRow.tsx` → разметка индикатора → `<DropIndicator>`.

## 4. Non-goals

- Не трогать `createSortable`/`sortableZone` (flat-кейс отдельный).
- Не тащить доменную логику (accept-политику, манифесты, топологию дерева) в web-dnd — только
  предикатами от консюмера.
- Auto-scroll длинного контейнера при драге — отдельно (в `DnDProvider autoScroll` уже есть).

## 5. Acceptance

- `zoneFromRatio` — юнит-тест (container/leaf пороги).
- `createReorderable` — тест: `zone()` реагирует на `overId`/`pointer` (мок `useDnD`),
  `onDrop(data, zone)` зовётся с зоной по ratio, `disabled`/`accepts` гейтят.
- `<DropIndicator>` — smoke-рендер по каждой зоне.
- Typecheck 0, biome 0.
- Реальный браузер (студия-консюмер после миграции): индикатор-сепаратор **виден** при драге
  (before/after линия, inside кольцо); reorder/reparent работает как раньше.

## 6. После merge (owner-studio, отдельно)

Студия переписывает `useRowDnd` на `createReorderable` + `<DropIndicator>`, `DropZone` импортит
из web-dnd, удаляет `zoneFromRatio` из своего `dndHelpers` (оставляет `isSelfOrDescendant`).
Координирует architect (contract-change между web-dnd и web-studio).
