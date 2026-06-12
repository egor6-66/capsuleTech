---
tags: [hca, adr, accepted]
status: canon
date: 2026-06-02
---

# ADR 026 — Grid-canvas layout для Matrix insert (free-form dashboard zones)

> [!info] Status: accepted
> Вводит **grid-режим зоны** в `Layout.Matrix` (`@capsuletech/web-ui`) для `dndMode:'insert'`: ячейка несёт grid-координаты `{x,y,w,h}`, свободно позиционируется, ресайзится по **обеим** осям, соседи раздвигаются по collision (а не сама ячейка). Pure grid-математика — в `@capsuletech/web-dnd` (Phase 1, owner-web-dnd); render/handles/проводка — в Matrix (Phase 2, owner-web-ui). **Аддитивно** к [[022-matrix-insert-packing-zones|ADR 022]] / [[025-geometric-live-sortable|ADR 025]]: swap, resize, flow-packing, preset `app-shell` — не трогаются.

## Контекст {#context}

[[025-geometric-live-sortable|ADR 025]] починил insert-DnD (кросс-зонный rail↔main перенос, геометрический индекс) — пользователь подтвердил в браузере, что DnD работает чётко. Но `main`-зона остаётся **flow-packing** (CSS `flex-wrap`, [[022-matrix-insert-packing-zones|ADR 022]]). На реальном дашборде (`apps/nexus`) всплыли два ограничения, которые `flex-wrap` снять не может:

1. **Само-ресайз выталкивает виджет на новую строку.** Растягиваешь ячейку шире контейнера → `flex-wrap` переносит её на следующую линию; сужаешь обратно → возвращается. Желаемое: виджет переносится **только когда его вытолкнул сосед**, сам себя на новую строку выкинуть не может.
2. **Ресайз одноосный + нет свободной позиции.** В горизонтальном пакинге ручка тянет только ширину; нельзя задать произвольный размер по высоте и произвольную позицию виджета. Цель пользователя: rail справа с минималками → перетащил в `main` → задал **любой** размер (обе оси) и **любую** позицию любому виджету.

**Первопричина — модель.** `flex-wrap` это **flow**: позиция выводится из порядка + размеров, а не *авторится*. «Произвольная позиция» и «перенос только при вытеснении» в flow структурно невыразимы; wrap-on-self-resize — симптом использования flow там, где нужен free-form канвас. Референс пользователя (Power BI / EFY-dashboard скрины) — классический **grid-дашборд**: виджет несёт `{x,y,w,h}` на сетке, drag двигает, угловые ручки ресайзят, collision раздвигает/компактит соседей (семантика react-grid-layout / gridstack).

## Решение {#decisions}

Зона **опционально** становится **grid-канвасом** (по умолчанию — текущий flow-packing).

> **Ключевой приём:** ячейка в grid-зоне несёт `grid:{x,y,w,h}` в grid-юнитах и размещается через CSS Grid placement (`grid-column / grid-row span`). Drag двигает (snap в юниты), угловой ресайз растит `w/h` (snap), а перекрытие соседей разрешается **compaction'ом — двигается сосед, не сама ячейка**. Ресайз никогда не перемещает ресайзимую ячейку → проблема 1 растворяется структурно (нет flex-wrap, нечему «само-выталкиваться»).

**Гибко, не хардкод.** Framework знает только «flow-зона» vs «grid-зона» + `accepts`. `main`/`rightbar` — это просто `id` зон, объявленные приложением. Композиция (rail справа + grid, rail слева, два грида, N рейлов) — целиком на стороне app, не зашита.

**Принцип ADR 025 сохраняется:** единственный droppable — контейнер зоны (items не droppable) → нет затенения вложенных droppable'ов. Grid-зона участвует в кросс-зонном DnD как обычная зона; 2D-размещение внутри неё считается grid-математикой.

### Контракт — расширение типов Matrix (аддитивно)

```ts
// IRow — присутствие `grid` помечает зону как grid-канвас.
// Отсутствует → текущий flow/corvu/packing путь без изменений.
interface IRow {
  // ...всё из ADR 016/022 без изменений...
  grid?: {
    cols?: number;        // ширина сетки в колонках (default 12)
    rowHeight?: number;   // px на один grid-row юнит (default 64)
    compact?: 'none' | 'vertical'; // стратегия разрешения коллизий (default 'none')
  };
}

// ICell — координаты в grid-зоне + размер материализации из rail.
interface ICell {
  // ...всё из ADR 016/022 без изменений...
  grid?: { x: number; y: number; w: number; h: number }; // юниты; игнор в flow-зоне
  defaultGrid?: { w: number; h: number }; // размер при drop'е из rail в grid
}

// LayoutChangeEvent — новый вариант для grid-мутаций.
type LayoutChangeEvent =
  | { kind: 'swap'; a: string; b: string }
  | { kind: 'insert'; id: string; toRow: number; toIndex: number }
  | { kind: 'grid'; id: string; zone: string; x: number; y: number; w: number; h: number };
```

**`compact` стратегии:**
- **`'none'` (default):** ячейки держат авторскую `{x,y}`; при drop/resize перекрытые соседи выдавливаются (вниз) ровно настолько, чтобы освободить место; глобального компакта нет, дырки допустимы. Это и есть «перенос только при вытеснении» (требование пользователя).
- **`'vertical'`:** после любого изменения все ячейки компактятся вверх (классический RGL) — для плотных авто-дашбордов.

### Контракт — pure grid-математика в `@capsuletech/web-dnd` (Phase 1, owner-web-dnd)

Аддитивный модуль `grid.ts`. Чистые функции, **jsdom-тестируемые** (геометрия контейнера не нужна — математика на юнитах; px↔unit конвертация принимает измеренный rect параметром). Прецедент: ADR 025 так же вынес pure-хелперы (`computeInsertIndex`).

```ts
export interface IGridItem { id: string; x: number; y: number; w: number; h: number }
export type IGridLayout = IGridItem[];

/** px-точка внутри контейнера → grid-клетка (snap). */
export function pointToCell(
  point: { x: number; y: number },
  containerRect: { left: number; top: number; width: number; height: number },
  cols: number, rowHeight: number,
): { x: number; y: number };

/** Перемещение item'а на {x,y} с выдавливанием перекрытых соседей (collision push). */
export function moveItem(
  layout: IGridLayout, id: string, to: { x: number; y: number },
  cols: number, compact: 'none' | 'vertical',
): IGridLayout;

/** Ресайз item'а до {w,h} — растёт на месте, выдавливает соседей, НИКОГДА не двигает сам item. */
export function resizeItem(
  layout: IGridLayout, id: string, size: { w: number; h: number },
  cols: number, compact: 'none' | 'vertical',
): IGridLayout;

/** Материализация нового item'а из rail в grid на dropped-клетку с defaultGrid размером. */
export function placeItem(
  layout: IGridLayout, item: IGridItem,
  cols: number, compact: 'none' | 'vertical',
): IGridLayout;

// Вспомогательные (экспортируются для тестов): collides(a,b), getCollisions(layout,item),
// compactVertical(layout,cols), clampToCols(item,cols).
```

**Инвариант (guidance):** `resizeItem` фиксирует `item.x/item.y`, меняет только `w/h`, затем разрешает коллизии выдавливанием **других** item'ов. Это и есть формальный фикс проблемы 1.

**Scope Phase 1:** только математика + типы. **Никакого** нового component-примитива (`createGridZone`) в Phase 1 — если render-path Phase 2 покажет, что он нужен, owner-web-ui эскалирует главному, добавим Phase 1.5. Начинаем минимально.

### Контракт — потребление в Matrix (Phase 2, owner-web-ui)

Новый grid render-path (параллельно `renderPackingRow` / `renderRow`), активен **только** при `dndMode:'insert'` И наличии `row.grid`:

- **Render:** CSS Grid контейнер — `display:grid; grid-template-columns:repeat(cols,1fr); grid-auto-rows:rowHeight`. Ячейка: `grid-column:{x+1}/span {w}; grid-row:{y+1}/span {h}`.
- **Drag-move:** переиспользовать `createDraggable`; на `pointermove` → `pointToCell` → превью; на drop → `moveItem` + commit в `localRows`.
- **Resize:** угловые/краевые ручки (минимум SE-угол; цель — 8 точек), `pointermove` → `resizeItem` (выдавливает соседей), snap в юниты.
- **Кросс-зона:** grid-зона = зона в `createSortableGroup`; rail→grid drop материализует ячейку через `placeItem` с `defaultGrid`; grid→rail сворачивает (grid-коорды сбрасываются, ячейка пакуется в rail).
- **Persistence:** grid-коорды живут в `localRows` (как сейчас cells); `onLayoutChange({ kind:'grid', ... })` на каждую мутацию. Session-only (как ADR 025; controlled mutable layout — будущее).
- **Подсветка зон** (ADR 025 polish: `canAccept`/`isTarget`/`rejects`) — переиспользуется на grid-контейнере.

### Guardrails — не сломать swap + resize (главный constraint пользователя)

- **Перед** рефактором matrix owner-web-ui кладёт **characterization-тесты** на swap (`createSwapEngine`, DragBadge, swap-highlight) и на существующий resize (corvu-handle'ы + packing px-resize), фиксируя текущее поведение. Регресс ловится сразу.
- Grid **чисто аддитивен:** зона без `row.grid` ведёт себя ровно как сегодня. swap-движок не трогается (grid только под insert). corvu-resize и packing-resize остаются для flow/swap/view-зон — отдельный путь, без пересечения с grid-resize.

## Альтернативы {#alternatives}

| Вариант | Почему отвергнут |
|---|---|
| **Клемпить flex-wrap само-ресайз** | Лечит только проблему 1, не даёт свободной позиции / независимой высоты. `main` всё равно становится сеткой → правка выкидышная. POLICY #1 (без костылей). |
| **Обернуть gridstack.js** | Vanilla-lib сама рулит DOM и drag'ом → конфликт с `web-dnd` и философией «UI is a shadow»; новая тяжёлая зависимость; интеграционное трение. |
| **react-grid-layout** | React-only, неприменимо к Solid. |
| **Свободный пиксельный канвас (Figma-like, absolute px)** | «Перенос только при вытеснении» = collision/compaction = снапнутая сетка, а не свободный пиксель. Сетка проще, детерминированнее, сериализуема в юнитах. |

## Последствия {#consequences}

**Плюсы:** free-form дашборды (цель пользователя — rail↔grid, любой размер/позиция); **проблема 1 растворяется** (нет flex-wrap; ресайз выдавливает соседей, не себя); grid-математика переиспользуема (канбан, deck-builder); swap/resize/flow/preset не тронуты (аддитивно); сериализуемая раскладка в grid-юнитах.

**Минусы / риски:** реальная геометрия меряется только в браузере → unit-покрытие Phase 1 ограничено pure-математикой, grid-resize UX верифицируется руками (Phase 3). Раскладка session-only (`localRows`-reset при смене `rows()` из ADR 016 сохраняется). Grid render-path добавляет третью ветку в `renderRow` — сложность matrix растёт (митигация: характеризационные тесты + строгое gate'ирование `dndMode:'insert' && row.grid`).

## План имплементации (phase-per-PR)

1. **Phase 1 (owner-web-dnd):** `grid.ts` (pure math: `pointToCell`/`moveItem`/`resizeItem`/`placeItem` + helpers) + unit-тесты на mock-layout'ах. PR в `web_base`.
2. **Phase 2a (owner-web-ui):** characterization-тесты на swap + существующий resize (lock текущего поведения).
3. **Phase 2b (owner-web-ui):** grid render-path + drag-move + collision (`compact:'none'`) + rail→grid материализация. Без resize.
4. **Phase 2c (owner-web-ui):** grid-resize (угловые ручки, обе оси, выдавливание соседей, snap).
5. **Phase 3 (главный + верификация):** проводка `apps/nexus` dashboard (`main.grid`, `defaultGrid` на нодах) + реальный браузер; обновить OWNERSHIP обоих пакетов; статус ADR → implemented.

## Связанное {#related}

- [[025-geometric-live-sortable|ADR 025]] — геометрический insert-DnD (каркас createSortableGroup сохраняется; grid-зона = ещё один тип зоны)
- [[022-matrix-insert-packing-zones|ADR 022]] — packing-zones (flow-путь, остаётся default'ом)
- [[016-matrix-v2-rows-engine|ADR 016]] — Matrix rows-engine + session-only localRows
- [[web-dnd|web-dnd OWNERSHIP]] · [[web-ui|web-ui]]
