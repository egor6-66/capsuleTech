---
tags: [hca, adr, accepted]
status: canon
date: 2026-06-01
last_updated: 2026-06-13
---

# ADR 022 — Matrix insert-mode v2: packing-zones (min-size reflow + orientation + drop-constraints)

> [!info] Status: accepted
> Контракт для эволюции `dndMode="insert"` в `Layout.Matrix` (`@capsuletech/web-ui`). Продолжает [[016-matrix-v2-rows-engine|ADR 016]], закрывает часть его секции «Не делаем сейчас». Имплементация — owner-web-ui.

## Контекст {#context}

[[016-matrix-v2-rows-engine|ADR 016]] ввёл Matrix rows-engine + swap/insert DnD, но в **«Не делаем сейчас»** отложил freeform/packing, per-row dndMode, nesting — «только если появится конкретный кейс» (Phase 4).

Кейс появился — `apps/nexus` dashboard («хаб узлов»): зона **main** + **палитра** + (план) **rightbar**; виджеты (1 экземпляр каждый) переносятся между зонами, ресайзятся с reflow. Текущий insert реализован как rows-of-fixed-cells + corvu fractional resize + cross-row move, и НЕ покрывает 4 требования пользователя:

1. **После cross-row переноса виджет нельзя дальше таскать / вернуть.** Корень: `insert.tsx` снапшотит drag-биндинги один раз на старте (`rowsSnapshot = opts.rows()`, коммент «Adding cells dynamically without unmounting Matrix is unsupported in v1»). Перенесённая ячейка не перепривязывается к sortable целевого ряда.
2. **Нет min-size; ресайз — corvu fractional (доли).** Нельзя «растянул виджет → сосед, не влезающий по min-ширине, уехал на новую линию».
3. **Нет per-zone orientation и wrap-политики.** rightbar должен быть вертикальной колонкой; main — горизонтальный wrap-грид (виджет может занять всю ширину линии, либо несколько в линию, если позволяет minW).
4. **`swapGroup` есть только для swap.** Для insert нет ограничения «какие виджеты в какую зону можно ронять».

## Решение {#decisions}

Insert-mode эволюционирует в **packing-zones**. Остаёмся в модели rows-of-cells (НЕ freeform x/y/w/h, НЕ collision detection), но зона умеет пакинг + reflow + ориентацию + constraints. **Все новые свойства — аддитивные опциональные**; ряд без них рендерится как сейчас (corvu fractional). swap-mode и preset `app-shell` не трогаем.

### Контракт — расширение `IRow` / `ICell` (ADR 016)

`IRow` (зона) `+=`:
- `orientation?: 'horizontal' | 'vertical'` — default `'horizontal'`. `'vertical'` → cells стопкой в колонку (rightbar).
- `wrap?: boolean` — default `false`. `true` → cells, не влезающие по `minW` (horizontal) / `minH` (vertical), переносятся на новую линию **внутри зоны**.
- `accepts?: string[]` — какие `cell.group` зона принимает при insert-drop. `undefined` → принимает любые.
- `minHeight?: number` — нижняя граница ряда при height-borrow (px).

`ICell` (виджет) `+=`:
- `minW?: number`, `minH?: number` — минимальный размер для пакинга/ресайза (px, absolute — пакингу нужен абсолютный минимум; `width`/`height` остаются fractional/`fr` для гибкой части).
- `group?: string` — метка для `accepts` (обобщает `swapGroup` на insert-режим).

### Поведение insert-mode v2

1. **DnD:** draggable cell → любая зона, где `accepts ∋ cell.group` (или `accepts` отсутствует). Двусторонне (palette↔main↔rightbar), reorder внутри зоны. **Refs перепривязываются при изменении `localRows`** (фикс snapshot-бага — закрывает требование 1).
2. **Width-resize** (horizontal zone): ручка меняет ширину cell; соседи, упавшие `< minW`, переносятся на новую линию (packing-reflow). Вертикальное содержимое может превысить зону → **вертикальный скролл зоны** — единственный допустимый кейс скролла.
3. **Height-resize:** перераспределяет высоту между **существующими** линиями/рядами; нижние жмутся до `minHeight`; при упоре ручка стопорится (**capped, без скролла**). Рядов НЕ добавляет.
4. **Orientation `vertical`:** симметрично — пакинг по вертикали, wrap в новые колонки; min-ось = `minH`.

**Инвариант (определяет resize-математику):** *линии/ряды добавляет только wrap (overflow по главной оси); height-resize только перераспределяет существующие ряды и ограничен контейнером.* Поэтому wrap может дать скролл, а height-resize — никогда.

### Edge-cases (обязательны в реализации)

- Пустая зона — валидный drop-target (рендерит droppable даже без cells).
- Drag последнего виджета из зоны — зона остаётся (пустой droppable), не схлопывается.
- `Σ(minW|minH) > контейнер` — скролл по главной оси (крайний случай, см. инвариант).
- `accepts`-конфликт — drop отклоняется, highlight «нельзя» (нейтральный border, как swap `isOver` чужой группы).

### Back-compat (критично — не ломать существующее)

- Все новые props опциональны. Ряд без `orientation`/`wrap`/min-полей → текущий corvu-fractional путь.
- Packing-движок — **отдельный render-path** для зон с `wrap` || `orientation:'vertical'` || наличием `minW`/`minH` у cells. corvu fractional остаётся для остальных рядов.
- swap-mode не трогаем. Preset `app-shell` не трогаем. Потребители продолжают работать: `apps/ewc`, `apps/sandbox`, `apps/nexus` workspace-shell (все на `app-shell`), nexus dashboard (raw rows — мигрирует на новые props).

### Matrix-level `direction` prop (side-by-side zones)

`IMatrixCommonProps` получает `direction?: 'vertical' | 'horizontal'` (default `'vertical'`).

**Дизайн:**

| `direction` | Что происходит |
|---|---|
| `'vertical'` (default) | Ряды стопкой сверху вниз (поведение «как было»). Внешний Flex vertical. **Ничего не меняется.** |
| `'horizontal'` | Ряды (зоны) кладутся **рядом слева-направо** (внешний Flex horizontal). Resize между зонами — горизонтальный corvu handle (cursor `ew-resize`). |

`direction` — **внешняя ось**. Каждая зона сохраняет свою `orientation`/`wrap` (внутренняя ось пакинга). Это две независимые оси на двух уровнях:
- `direction='horizontal'` на Matrix → зоны в ряд
- `row.orientation='vertical'` на зоне → cells внутри зоны в колонку

**Семантика `row.height` в `direction:'horizontal'`:**
В горизонтальном режиме `row.height` переинтерпретируется как **ширина зоны**. Полная таблица маппинга для non-resizable горизонтального пути (plain flex-row):

| `row.height` | CSS flex | Назначение |
|---|---|---|
| `'auto'` | `flex: 0 0 auto` | Контент-driven ширина (shrink-to-fit); **rail-зоны** (~60px иконки) |
| `number` (0..1) | `flex: 0 0 {n}%` | Явная фракционная ширина |
| `'fr'` / `undefined` | `flex: 1` | Заполняет оставшееся пространство |

В resizable-пути (`hasResizableZones === true`) `row.height` передаётся в corvu как `initialSize`. `'auto'`-зоны в resizable-пути НЕ поддерживаются (corvu не понимает `auto`) — если нужен rail, используй non-resizable путь (все строки `resizable: false`). `row.minHeight` передаётся в corvu как `minSize` для колонки (минимальная ширина). Это задокументировано в JSDoc `IMatrixCommonProps.direction`.

**Fixed-rail pattern (non-resizable horizontal zones):**
Когда ВСЕ rows `resizable: false`, рендерится plain flex-row (без corvu). Сочетание `height:undefined` (main, `flex:1`) + `height:'auto'` (rightbar, `flex:0 0 auto`) даёт layout «main заполняет всё, rail — ровно по контенту» без каких-либо хэндлов между зонами. Виджеты ВНУТРИ main (packing-зоны) сохраняют cell-level resize-хэндлы — `renderPackingRow` гейтит их по `layoutMode`, а НЕ по `row.resizable`.

**DnD в `direction:'horizontal'`:**
`handleCrossRowDrop` использует `info.ratio.x` (а не `ratio.y`) для определения позиции вставки: левая половина дроп-цели → insert в начало, правая → в конец. Это геометрически корректно: зоны — колонки, и «верх/низ» внутри колонки соответствует «лево/право» на уровне Matrix. `rowAcceptsGroup` — pure функция без зависимости от оси, работает идентично.

**Back-compat:** `direction` опционален, default `'vertical'`. Все существующие потребители (`app-shell`, ewc, sandbox, nexus-shell) не передают `direction` — поведение не изменяется бит-в-бит.

**Стори:** `SideBySideZones` в `matrix.stories.tsx` — main (wrap, 72%) | rightbar (vertical, 28%), insert-DnD, accepts-constraints.

### Scope — что НЕ делаем

- Freeform x/y absolute + collision detection (ADR 016 Phase 4 остаётся отложенным).
- User-defined presets (ADR 016 Phase 2).
- Отдельный built-in `dashboard-grid` preset — опционально потом; nexus пока на raw rows + новые props.
- **True 2D-вложенность (зона внутри зоны)** — не делаем. `direction` реализует только одноосевой top-level split (main | rightbar). Для вложенных direction-контейнеров нужен отдельный ADR с полноценным 2D-движком.

## Альтернативы {#alternatives}

- **Отдельный `Layout.DashboardGrid`.** Отклонено: дублирование движка (ADR 016, alt A); пользователь явно отверг — «нам не нужен DashboardGrid, insert просто недоделан».
- **Натянуть packing на corvu fractional.** Костыль: corvu = fixed-count fractional panels, не min-size wrap. Отдельный packing render-path чище (POLICY: без костылей).
- **Per-row `dndMode`.** Не требуется — insert остаётся глобальным режимом; зоны различаются `orientation`/`wrap`/`accepts`, не режимом DnD.

## Последствия {#consequences}

**Положительные**
- Один движок (Matrix insert) покрывает dashboard-кейсы (main-wrap-grid + vertical rightbar + dockable palette через raw rows).
- HCA-инверсия сохранена: Matrix эмиттит `onLayoutChange`, state владеет Controller/Feature.
- Аддитивно — без breaking change.

**Отрицательные**
- Новый packing/resize render-path — заметный объём работы в owner-web-ui.
- Geometry-reflow (px-ширины, wrap-переносы, height-borrow) верифицируется только в **реальном браузере** — jsdom не меряет layout. Unit-тесты покрывают модель (accepts-предикат, re-bind после move, решение wrap по числам), не пиксели. Финальная визуальная верификация — preview/desktop.

## Order of work

1. **owner-web-ui** (`packages/web/ui/src/primitives/layout/matrix/`):
   - Типы: `orientation`/`wrap`/`accepts`/`minHeight` в `IRow`, `minW`/`minH`/`group` в `ICell` (`interfaces.ts`).
   - **Re-bind fix** в `dnd/insert.tsx` — refs перепривязываются при изменении `localRows` (закрывает требование 1; можно как первый коммит).
   - Packing render-path в `matrix.tsx` (зоны с wrap/vertical/min) — width-wrap reflow, height-borrow, vertical-column.
   - DnD `accepts`/`group` constraints в insert-engine.
   - Storybook stories: packing-wrap, vertical-zone, accepts-constraints, drag-back.
   - Unit-tests на модель (re-bind, accepts-предикат, wrap-решение). Существующие Matrix-тесты + swap + app-shell — green.
   - НЕ ломать: swap-mode, preset `app-shell`, ewc/sandbox/nexus-shell.
2. **Architect** (я): подключить в `apps/nexus` dashboard (`orientation`/`wrap`/`minW`/`minH`/`group`/`accepts` на зонах main/palette/rightbar), верифицировать в preview/desktop.
3. **owner-tests / release** — позже, вне этой итерации (сейчас workspace-dev, не публикуем).

## Связанное {#related}

- [[016-matrix-v2-rows-engine|ADR 016]] — базовый rows-engine + insert; этот ADR продолжает его insert-ветку и закрывает часть «Не делаем сейчас».
- `packages/web/ui/src/primitives/layout/matrix/` — реализация (`matrix.tsx`, `dnd/insert.tsx`, `interfaces.ts`).
- `packages/web/dnd/` — DnD-движок (`createSortable`/`createDroppable`), на котором строится insert.
- `apps/nexus` — конкретный кейс-потребитель.
