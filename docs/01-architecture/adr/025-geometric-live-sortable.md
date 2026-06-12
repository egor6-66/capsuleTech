---
tags: [hca, adr, accepted]
status: accepted
date: 2026-06-01
---

# ADR 025 — Geometric live multi-zone sortable (insert-mode DnD engine)

> [!info] Status: accepted
> Контракт нового DnD-примитива `createSortableGroup` в `@capsuletech/web-dnd` + переписанного insert-engine в `Layout.Matrix` (`@capsuletech/web-ui`). **Ревизует механизм DnD из [[022-matrix-insert-packing-zones|ADR 022]]** (его узкую установку «НЕ collision detection»), сохраняя весь packing/resize/orientation/accepts-каркас ADR 022 без изменений. Имплементация: Phase 1 — owner-web-dnd, Phase 2 — owner-web-ui.

## Контекст {#context}

[[022-matrix-insert-packing-zones|ADR 022]] ввёл packing-zones (orientation/wrap/min-size/accepts) и осознанно зафиксировал **«НЕ collision detection»** — insert-DnD остался на простой модели: per-row `createSortable` (reorder внутри ряда) + per-row `createDroppable` (cross-row insert). На практике (`apps/nexus` dashboard) эта модель **работает плохо**. Корни — конкретные, не косметические:

1. **Затенение вложенных droppable'ов.** Хит-тест движка `findDroppableAt()` ([`context.tsx:176`](../../../packages/web/dnd/src/context.tsx)) берёт **только самый внутренний** droppable под курсором (`elementFromPoint` → вверх, первый найденный; без fallback'а на принимающего родителя). Каждая ячейка — это sortable-item, т.е. одновременно droppable. Когда тащишь виджет в зону, где **уже есть ячейки**, курсор над чужой ячейкой → её droppable перехватывает `overId`, но не принимает (другой `__sortable`) → row-droppable под ней **не получает drop**. Итог: перенос в непустую зону молча проваливается (срабатывает лишь над пустым местом зоны).
2. **Нет collision-detection / nearest-center.** Никакой геометрии — только topmost-элемент.
3. **Реордер только по оси Y.** `createSortable` решает before/after по `info.ratio.y` ([`sortable.ts:76`](../../../packages/web/dnd/src/sortable.ts)). В горизонтальном wrap-гриде (`main`) нужна `ratio.x` → позиция вставки геометрически неверна. (В вертикальном rail ось совпала — поэтому *там* reorder работает.)
4. **Кросс-зонная вставка бинарная** — только начало/конец зоны ([`insert.tsx:192`](../../../packages/web/ui/src/primitives/layout/matrix/dnd/insert.tsx)). Нельзя «между 2-й и 3-й».
5. **Нет живого превью.** Порядок считается только в момент `onDrop`; во время драга ничего не сдвигается → пользователь не видит, куда упадёт.

swap-mode при этом надёжен именно потому, что **не мутирует структуру DOM**: фиксированные слоты, меняются только ссылки на контент. Insert обязан мутировать раскладку (виджет физически переезжает между зонами) — значит, ему нужен настоящий sortable-интеллект, которого в движке нет.

**Библиотеки рассмотрены и отвергнуты** (см. «Альтернативы»): Kobalte DnD не существует; возврат `@thisbeyond/solid-dnd` = откат осознанного решения + два DnD-движка в проекте.

## Решение {#decisions}

Вводим геометрический live multi-zone sortable. **Ключевой архитектурный приём, снимающий первопричину:**

> **Items — только draggable (не droppable). Единственный droppable — контейнер зоны. Индекс вставки считается геометрически по snapshot'у rect'ов, снятому на старте драга.**

Следствия приёма:
- **Нет вложенных droppable'ов → нет затенения** (дефект 1 исчезает структурно, не правкой хит-теста).
- **Collision-detection становится присущим:** целевая зона = зона под курсором (или ближайшая по центру среди принимающих); индекс внутри = ближайший слот по главной оси (дефекты 2–4).
- **Snapshot на старте** (resting-позиции) — индекс считается против неподвижной геометрии, поэтому gap-сдвиг/маркер не создают обратной связи (jitter'а).
- **Живой `activeIndex`** даёт превью до drop'а (дефект 5).

Provider **почти не трогаем**: примитив строится на уже публичных `useDnD` (`pointer`/`activeId`/`activeData`) + `createDraggable` + `createDroppable`. Никакого breaking change существующего API. (Общий collision-detection в самом провайдере — возможное будущее улучшение, **в scope этого ADR не входит**.)

### Контракт — новый примитив `@capsuletech/web-dnd` (Phase 1, owner-web-dnd)

Аддитивный экспорт `sortableZone.ts`. **Существующий `createSortable` не трогаем** (служит tree-editor'у). Имя нового item-типа — `ISortableZoneItem` (во избежание клэша с экспортируемым `ISortableItem`).

```ts
export interface ISortableGroupOptions {
  /** Стабильный id группы. Item может переехать между любыми зонами группы. */
  id: string;
}

export interface ISortableGroup {
  /** Зарегистрировать зону (контейнер). */
  createZone: (opts: ISortableZoneOptions) => ISortableZone;
  /**
   * Живая цель активного драга: куда (зона + индекс) упадёт item,
   * или null когда указатель не над принимающей зоной группы.
   * Single source of truth — общий для всех зон (драйвит маркер + commit).
   */
  activeTarget: Accessor<{ zoneId: string; index: number } | null>;
  /** Id перетаскиваемого item'а в этой группе (или null). */
  activeItemId: Accessor<string | null>;
}

export interface ISortableZoneOptions {
  /** Id зоны (уникален в группе). */
  id: string;
  /**
   * Главная ось расчёта индекса:
   * - 'x'    — горизонтальный ряд (сравнение по center.x);
   * - 'y'    — вертикальная колонка (center.y);
   * - 'grid' — wrap/2D: ближайший центр в 2D → линейный индекс.
   */
  axis: 'x' | 'y' | 'grid';
  /** Текущий порядок item-id'ов в зоне (реактивно). */
  items: Accessor<string[]>;
  /** Доп. payload item'а (для accepts/commit). */
  data?: (itemId: string) => DragData;
  /**
   * Принимает ли зона данный item (ADR 022 group-constraint).
   * undefined → принимает любой. false → зона подсветится «нельзя».
   */
  accepts?: (itemId: string, data: DragData) => boolean;
  /** Commit: item приземлился в эту зону на index (уже валидирован). */
  onDrop: (e: ISortableDropEvent) => void;
}

export interface ISortableDropEvent {
  itemId: string;
  fromZone: string;
  fromIndex: number;
  toZone: string;   // === id этой зоны
  toIndex: number;
}

export interface ISortableZone {
  /** Ref контейнера зоны (меряется для bounds + служит droppable'ом). */
  containerRef: (el: HTMLElement) => void;
  /** Привязка item'а — drag-источник + меряется для геометрии. */
  createItem: (itemId: string) => ISortableZoneItem;
  /** Активный драг группы сейчас целится в ЭТУ зону. */
  isTarget: Accessor<boolean>;
  /** Живой индекс вставки в этой зоне (null когда не цель). */
  activeIndex: Accessor<number | null>;
  /** Активный драг отвергается accepts этой зоны (для «нельзя»-highlight). */
  rejects: Accessor<boolean>;
}

export interface ISortableZoneItem {
  /** Ref элемента item'а. */
  ref: (el: HTMLElement) => void;
  isDragging: Accessor<boolean>;
  /**
   * ОПЦИОНАЛЬНЫЙ визуальный сдвиг (px) для gap-анимации в x/y-зонах:
   * `transform: translate(shift().x, shift().y)`. Items до индекса → 0;
   * на/после → сдвиг на главный размер перетаскиваемого. В 'grid' разрешено
   * возвращать {0,0} (см. «живое превью» ниже — primary-механизм = маркер).
   */
  shift: Accessor<{ x: number; y: number }>;
}

export const createSortableGroup: (opts: ISortableGroupOptions) => ISortableGroup;

// Дополнительно экспортируются чистые геометрические хелперы (и тип IRect),
// чтобы их index-математику можно было покрыть unit-тестами без доступа к
// внутренним путям модуля (jsdom не меряет layout — см. «Тесты Phase 1»):
export function computeInsertIndex(
  point: { x: number; y: number },
  axis: 'x' | 'y' | 'grid',
  itemRects: IRect[],
): number;
export function findZoneAtPoint(
  point: { x: number; y: number },
  zoneRects: Array<{ id: string; rect: IRect }>,
): string | null;
export function findNearestZone(
  point: { x: number; y: number },
  zoneRects: Array<{ id: string; rect: IRect }>,
): string | null;
```

**Внутренняя механика (guidance owner-web-dnd, не жёсткий контракт):**
- Группа держит **не-реактивные** реестры: зоны (`id → { el, opts }`), items (`id → { el, zoneId }`).
- `createEffect` на `activeId()`: переход `null → id` (старт драга) → **snapshot** всех container-rect'ов + item-rect'ов (resting, viewport-координаты + текущий scroll); выставить `activeItemId`. Переход `→ null` → очистить snapshot/target.
- `createEffect` на `pointer()`: пока драг активен — вычислить целевую зону (контейнер под курсором; иначе ближайшая по центру **среди принимающих**) и индекс (по `axis` против snapshot-центров) → `activeTarget`. Если курсор над **непринимающей** зоной → её `rejects=true`, `activeTarget=null`.
- Зона = один `createDroppable` на контейнере (`accepts` = group/zone-accept). На pointerup провайдер вызовет `droppable.onDrop` → читаем `activeTarget` → зовём `zoneOpts.onDrop({ itemId, fromZone, fromIndex, toZone, toIndex })`.
- `shift`/`activeIndex` — производные от `activeTarget`.

**Тесты Phase 1:** index-математика на mock-rect'ах (jsdom не меряет layout — это известное ограничение, см. CLAUDE.md known-issues). Реальная геометрия/UX — верификация в браузере на Phase 3, не в jsdom.

### Контракт — потребление в Matrix (Phase 2, owner-web-ui)

`createInsertEngine` переписывается на `createSortableGroup`:
- Одна группа `createSortableGroup({ id: 'matrix-insert' })` на инстанс Matrix.
- Каждый ряд/зона → `createZone`. `axis` из ряда: `orientation:'vertical'` → `'y'`; `wrap` (горизонтальный) → `'grid'`; плоский горизонтальный → `'x'`.
- `accepts` зоны = текущая ADR 022 проверка `rowAcceptsGroup(row, cell.group)`.
- Рендер (`renderPackingRow`): `zone.containerRef` на контейнер, `createItem(cell.id).ref` на ячейку.
- **Живое превью (primary):** рендерить **insertion-marker** (вертикальная/горизонтальная линия-вставка) на позиции `zone.activeIndex()`. Маркер робастен в wrap/grid; per-item `shift` (transform-gap) — опциональный polish только для `'x'`/`'y'`-зон.
- `rejects()` → переиспользовать существующую «cannot-drop» подсветку.
- `onDrop` → мутирует `localRows` (перенос ячейки `fromZone/fromIndex → toZone/toIndex`) → эмитит `onLayoutChange({ kind:'insert', id, toRow, toIndex })`.
- **Удаляется** старая модель: per-row `createSortable` + per-row `createDroppable` уходят целиком.
- **Не трогаем** (ортогонально): resize-handle'ы (`renderPackingRow` resize), `direction='horizontal'`, swap-mode, preset `app-shell`, accepts-каркас, типы `IRow`/`ICell` из ADR 022.

`LayoutChangeEvent` (`kind:'insert'`) остаётся прежним — внешний контракт Matrix не меняется.

## Альтернативы {#alternatives}

| Вариант | Почему отвергнут |
|---|---|
| **Kobalte DnD** | Не существует — Kobalte это headless UI-примитивы (Dialog/Popover/Select), drag-and-drop в нём нет. |
| **Вернуть `@thisbeyond/solid-dnd`** | web-dnd создан именно чтобы её заменить (pointer-based, без HTML5-флэйков). Возврат = откат осознанного решения + два DnD-движка в репо; их multi-container sortable сам по себе капризный. |
| **Точечные фиксы текущей модели** (ось x, точный индекс, collision-fallback в хит-тесте) | Делает дропы корректными, но оставляет drop-time-only (нет живого превью) и продолжает бороться с конкурирующими слоями droppable. Лечит симптомы, не первопричину (POLICY #1). |
| **Общий collision-detection в провайдере** | Шире нужного для этого кейса; приём «items не droppable» снимает затенение без правки хит-теста. Оставлено как возможное будущее улучшение. |

## Последствия {#consequences}

**Плюсы:** insert работает «как задумано» — двусторонний перенос rail↔main в любую позицию, точный reorder по правильной оси, живой маркер вставки, корректный «нельзя»-highlight; первопричина (затенение) снята структурно; провайдер не ломается; новый примитив переиспользуем будущими потребителями (деревья, канбан).

**Минусы / риски:** геометрия меряется только в реальном браузере → unit-покрытие Phase 1 ограничено index-математикой, основная верификация ручная (Phase 3). Snapshot на старте драга не отражает reflow во время драга (приемлемо — gap визуальный). `localRows`-reset при смене `rows()` (известное упрощение ADR 016) сохраняется; контролируемая мутабельная раскладка — отдельная будущая работа.

## План имплементации (phase-per-PR)

1. **Phase 1 (owner-web-dnd):** `sortableZone.ts` + экспорты + unit-тесты index-математики. PR в `web_base`.
2. **Phase 2 (owner-web-ui):** переписать `createInsertEngine` + рендер маркера + удалить старую модель. PR в `web_base`.
3. **Phase 3 (главный + верификация):** реальный браузер на `apps/nexus` dashboard; обновить OWNERSHIP обоих пакетов + статус ADR → implemented.

## Связанное {#related}

- [[022-matrix-insert-packing-zones|ADR 022]] — packing-zones (каркас сохраняется; ревизуется только DnD-механизм)
- [[016-matrix-v2-rows-engine|ADR 016]] — Matrix rows-engine + swap/insert DnD
- [[web-dnd|web-dnd OWNERSHIP]] · [[web-ui|web-ui]]
