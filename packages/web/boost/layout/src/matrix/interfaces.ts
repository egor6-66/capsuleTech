import type { JSX } from 'solid-js';

/**
 * SlotValue — либо JSX-элемент напрямую, либо объект с children + overrides.
 *
 * JSX-форма: `header: <MyHeader />` — обёртывается в normalizeSlotValue.
 * Object-форма: `header: { children: <MyHeader />, initialSize: 0.2, ... }`
 *
 * Heuristic: если у объекта есть ключ `children` — считается object-формой.
 */
export type SlotValue =
  | JSX.Element
  | {
      children: JSX.Element;
      initialSize?: number;
      minSize?: number;
      maxSize?: number;
      /**
       * Per-slot draggable override. Tri-state precedence (highest → lowest):
       * - `true`  — DnD активен для этого слота ВСЕГДА (оверрайдит `mode` и
       *             глобальный `useDndMode()`);
       * - `false` — DnD для слота выключен всегда;
       * - `undefined` (default) — следует matrix-резолюции (`dnd` prop >
       *   `mode` > глобальный сигнал).
       */
      draggable?: boolean;
      /**
       * Группа, внутри которой возможен swap/insert через DnD.
       * Cells с одинаковой `swapGroup` могут меняться местами.
       *
       * Если не задан в slot — preset кладёт все слоты в общую группу
       * `'shell'` (любой слот свапается с любым при включённом DnD).
       * Ограничить свап — явный `swapGroup` или `draggable: false`.
       */
      swapGroup?: string;
      /**
       * Per-slot resizable override. Tri-state precedence (highest → lowest):
       * - `true`  — ручка слота активна ВСЕГДА (оверрайдит `mode` и глобальный
       *             `useResizeMode()`);
       * - `false` — ручка слота выключена всегда;
       * - `undefined` (default) — активность следует matrix-резолюции
       *   (`resize` prop > `mode` > глобальный сигнал).
       *
       * corvu-ручка живёт МЕЖДУ двумя панелями и активна когда активны оба
       * соседа; «эластичный центр» пресета (middle-row / main) всегда согласен,
       * поэтому активность определяет флаг периферийного слота.
       * `initialSize` задаёт размер независимо от resizable.
       */
      resizable?: boolean;
      /**
       * Per-slot border override. `bordered` рисует ВНУТРЕННИЕ разделители
       * (hairline между слотами) — слоты это общее пространство, разделённое
       * линиями, не независимые карточки. Divider между двумя слотами виден,
       * если ХОТЯ БЫ ОДИН из них резолвится в bordered и между ними не
       * рисуется активная resize-ручка (её линия сама служит разделителем).
       * `undefined` (default) — следует Matrix-level `bordered` prop.
       */
      bordered?: boolean;
      /**
       * Fallback shown inside the per-cell `<Suspense>` boundary while the
       * slot's child (e.g. a lazy Widget chunk) is loading.
       *
       * Defaults to a full-cell pulse placeholder (`h-full w-full` muted bg).
       * Override per-slot to show a content-shaped skeleton:
       *   `skeleton: <Skeleton variant="table" />`
       */
      skeleton?: JSX.Element;
    };

export interface IRow {
  id?: string;
  /**
   * Высота row.
   * - `number` (0..1) → corvu Panel initialSize (доля от родителя)
   * - `'auto'` → content-height, не resizable
   * - `'fr'` → flex-1 (grow)
   */
  height?: number | 'auto' | 'fr';
  /**
   * Tri-state (как ICell.resizable): `true` — вертикальная ручка row активна
   * всегда; `false` — структурно отсутствует; `undefined` — активность следует
   * matrix-резолюции. Структурный выбор ветки (corvu vs plain) — по
   * `resizable === true || typeof height === 'number'`.
   */
  resizable?: boolean;
  cells: ICell[];
  // -------------------------------------------------------------------------
  // Packing-zone props (ADR 022) — все опциональны.
  // Зоны БЕЗ этих полей рендерятся через текущий corvu-fractional путь.
  // -------------------------------------------------------------------------
  /**
   * Ориентация пакинга cells внутри зоны.
   * - `'horizontal'` (default) — cells в строку, wrap по ширине
   * - `'vertical'` — cells в колонку, wrap по высоте
   *
   * `'vertical'` активирует packing render-path вместо corvu fractional.
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Включает перенос cells на новую линию когда cell не помещается по minW
   * (horizontal) / minH (vertical). Активирует packing render-path.
   *
   * Вертикальный overflow при wrap → вертикальный скролл зоны.
   */
  wrap?: boolean;
  /**
   * Набор `cell.group`, которые эта зона принимает при insert-drop.
   * `undefined` → принимает любые cells.
   * Конфликт → drop отклоняется с «нельзя»-highlight.
   */
  accepts?: string[];
  /**
   * Нижняя граница высоты ряда при вертикальном resize (height-borrow).
   * Значение — **доля (0..1)** от высоты corvu-контейнера (аналогично
   * `IFlexItem.minSize` / corvu Panel `minSize`). Ручка стопорится при
   * упоре (capped, без скролла).
   *
   * Px-семантика не используется: конвертация px → доля требует измерения
   * контейнера в рантайме (jsdom не меряет); доля — прагматичный
   * компромисс (задокументировано в ADR 022).
   *
   * Пример: `minHeight: 0.1` → ряд не схлопнется ниже 10 % высоты лейаута.
   */
  minHeight?: number;
  // -------------------------------------------------------------------------
  // Grid-canvas props (ADR 026) — опциональны.
  // Присутствие `grid` переключает зону в grid-режим (только при dnd='insert' или prop dnd='insert').
  // Отсутствует → текущий flow/corvu/packing путь без изменений.
  // -------------------------------------------------------------------------
  /**
   * Включает grid-канвас для этой зоны (ADR 026).
   * Активен только когда DnD включён в режиме 'insert'. В остальных режимах игнорируется.
   *
   * - `cols` — ширина сетки (колонок). Default: 24.
   * - `rowHeight` — высота одного grid-row юнита (px). Default: 20.
   * - `compact` — стратегия разрешения коллизий:
   *     - `'none'` (default) — displacement-only; дырки допустимы.
   *     - `'vertical'` — после любого изменения компактирует все ячейки вверх.
   */
  grid?: {
    cols?: number;
    rowHeight?: number;
    compact?: 'none' | 'vertical';
  };
}

export interface ICell {
  id: string;
  children: JSX.Element;
  tag?: 'div' | 'header' | 'aside' | 'main' | 'footer' | 'nav' | 'section';
  /**
   * Ширина cell.
   * - `number` (0..1) → corvu Panel initialSize
   * - `'auto'` → content-width
   * - `'fr'` → flex-1
   */
  width?: number | 'auto' | 'fr';
  /**
   * Per-cell resizable flag. Tri-state:
   * - `true`  — ручка активна всегда (оверрайдит `mode`/global);
   * - `false` — ручка структурно отсутствует (cell вне resize);
   * - `undefined` (default) — активность следует matrix-резолюции.
   * Ручка между соседями активна когда активны ОБА (corvu AND).
   */
  resizable?: boolean;
  /**
   * Per-cell draggable flag. Tri-state precedence (highest → lowest):
   * - `true`  — DnD активен для этой cell всегда (оверрайдит `mode`/global);
   * - `false` — cell никогда не участвует в DnD;
   * - `undefined` (default) — следует matrix-резолюции (`dnd` prop > `mode` >
   *   глобальный `useDndMode()`).
   */
  draggable?: boolean;
  swapGroup?: string;
  /**
   * Per-cell border override — участие cell в ВНУТРЕННИХ разделителях
   * (divider виден между парой соседей, если хотя бы один резолвится true
   * и между ними нет активной resize-ручки). Не карточный бордер.
   * `undefined` (default) — follows the Matrix-level `bordered` prop.
   */
  bordered?: boolean;
  /**
   * Fallback shown inside the per-cell `<Suspense>` boundary while the cell's
   * child is suspended (e.g. a lazy Widget chunk that hasn't resolved yet).
   *
   * Defaults to a full-cell pulse placeholder (`h-full w-full` muted bg).
   * Threaded from SlotValue.skeleton through preset → ICell by the resolvers.
   */
  skeleton?: JSX.Element;
  // -------------------------------------------------------------------------
  // Packing-zone props (ADR 022) — все опциональны.
  // -------------------------------------------------------------------------
  /**
   * Минимальная ширина cell (px) для пакинга/wrap-reflow.
   * Используется только в зонах с `wrap` или `orientation:'vertical'`.
   * Активирует packing render-path для родительской зоны.
   */
  minW?: number;
  /**
   * Минимальная высота cell (px) для пакинга в вертикальных зонах.
   * Используется только в зонах с `orientation:'vertical'`.
   */
  minH?: number;
  /**
   * Метка группы для `accepts` предиката insert-drop.
   * Обобщает `swapGroup` на insert-режим.
   * Зона принимает cell только если `row.accepts ∋ cell.group`
   * (или `row.accepts` не задан).
   */
  group?: string;
  // -------------------------------------------------------------------------
  // Grid-canvas props (ADR 026) — опциональны.
  // -------------------------------------------------------------------------
  /**
   * Позиция и размер в grid-зоне (grid-юниты, 0-based).
   * Игнорируется в flow-зонах. Обязателен для cells, уже размещённых в grid-зоне.
   * Устанавливается движком при rail→grid материализации.
   */
  grid?: { x: number; y: number; w: number; h: number };
  /**
   * Размер по умолчанию при drag'е из rail в grid-зону (ADR 026).
   * Если не задан — используется fallback { w: 2, h: 2 }.
   */
  defaultGrid?: { w: number; h: number };
}

// ---------------------------------------------------------------------------
// Preset registry — расширяется через ./presets
// ---------------------------------------------------------------------------

/**
 * Реестр встроенных пресетов. Ключ — имя пресета, значение — тип `slots`.
 * Расширяется по мере добавления новых built-in пресетов.
 */
export interface LayoutPresets {
  'app-shell': {
    header?: SlotValue;
    sidebar?: SlotValue;
    main: SlotValue;
    rightBar?: SlotValue;
    footer?: SlotValue;
  };
  // Будущие: 'split-2', 'split-3', 'dashboard-grid', ...
}

// ---------------------------------------------------------------------------
// DnD / mode types
// ---------------------------------------------------------------------------

/**
 * DnD kind for the Matrix `dnd` prop.
 * - `'swap'` — drag to swap positions between cells in the same swapGroup.
 * - `'insert'` — drag to insert cells into a zone (grid or packing).
 */
export type MatrixDndKind = 'swap' | 'insert';

export type LayoutChangeEvent =
  | { kind: 'swap'; a: string; b: string }
  | { kind: 'insert'; id: string; toRow: number; toIndex: number }
  | { kind: 'grid'; id: string; zone: string; x: number; y: number; w: number; h: number };

/**
 * Event-map для Shell.Matrix (ADR 032).
 *
 * Значение каждого ключа — тип payload'а, который кладётся в `target.payload`
 * при `emit('onLayoutChange', { payload: e })`. Используется:
 *   - `MatrixController.__events` (phantom phantom-поле) — чтобы `EventsOf<typeof Shell.Matrix>` работал.
 *   - `Feature<Shell.Matrix.Events>((s) => ({ onLayoutChange({ target }) { target.payload } }))`
 *     → `target.payload` типизируется как `LayoutChangeEvent | undefined`.
 */
export interface IMatrixEvents {
  onLayoutChange: LayoutChangeEvent;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IMatrixCommonProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * Sugar shortcut for static (non-interactive) and fully interactive layouts.
   *
   * - `'view'` — locks **both** resize and DnD **off**, regardless of global signals.
   *   Replaces the verbose `dnd={false} resize={false}` pattern used on static
   *   shell layouts (cards, workspace panels that should never be user-resizable).
   * - `'edit'` — locks **both** resize and DnD **on** (DnD kind = 'swap'), regardless
   *   of global signals.
   * - `undefined` (default) — no override; granular `resize`/`dnd` props and global
   *   signals apply as usual.
   *
   * **Precedence (highest → lowest):**
   * 1. Granular `resize` / `dnd` props (explicit per-axis override).
   * 2. `mode` prop (both-axes shortcut).
   * 3. Global `useResizeMode()` / `useDndMode()` signals from `@capsuletech/web-style`.
   *
   * Examples:
   * ```tsx
   * // Static layout — no resize, no DnD:
   * <Matrix mode="view" preset="app-shell" slots={...} />
   *
   * // Fully interactive:
   * <Matrix mode="edit" rows={rows} />
   *
   * // Mixed: DnD on (from mode="edit"), resize explicitly off:
   * <Matrix mode="edit" resize={false} rows={rows} />
   * ```
   */
  mode?: 'view' | 'edit';
  /**
   * DnD mode prop — controls whether drag-and-drop is enabled and which kind.
   *
   * - `undefined` — follow global `useDndMode()` signal (from `@capsuletech/web-style`).
   *   Kind defaults to `'swap'` when enabled.
   * - `false` — DnD permanently disabled on this Matrix, regardless of global signal.
   * - `'swap'` — DnD permanently enabled in swap mode.
   * - `'insert'` — DnD permanently enabled in insert mode.
   *
   * Resolved in mode.ts (createMatrixModes):
   *   dndEnabled = (dnd !== undefined) ? dnd !== false
   *              : (mode !== undefined) ? mode === 'edit'
   *              : globalDnd()
   *   dndKind    = (dnd === 'insert') ? 'insert' : 'swap'
   */
  dnd?: false | MatrixDndKind;
  /**
   * Resize mode prop — controls whether resize handles are active.
   *
   * - `undefined` — follow global `useResizeMode()` signal (from `@capsuletech/web-style`).
   * - `true` — resize permanently enabled on this Matrix, regardless of global signal.
   * - `false` — resize permanently disabled on this Matrix.
   *
   * Per-cell/per-row: явный `resizable` на слоте оверрайдит эту резолюцию
   * для своей ручки (tri-state, см. ICell.resizable).
   *
   * Resolved in mode.ts (createMatrixModes):
   *   resizeEnabled = resize ?? (mode !== undefined ? mode === 'edit' : globalResize())
   */
  resize?: boolean;
  onLayoutChange?: (event: LayoutChangeEvent) => void;
  /**
   * **Matrix-level outer axis** — controls how rows (zones) are laid out
   * relative to each other. This is the **outer** axis; each zone's
   * `orientation` / `wrap` remain the **inner** packing axis (ADR 022).
   *
   * - `'vertical'` (default) — rows stack top-to-bottom (vertical Flex /
   *   corvu). `row.height` controls the vertical size of each zone. This is
   *   the pre-existing behaviour; nothing changes.
   *
   * - `'horizontal'` — zones are placed **side by side** left-to-right (a
   *   horizontal Flex / corvu column). In this mode `row.height` is
   *   **re-interpreted as the zone's width** (fraction 0..1 or `'fr'`).
   *   This lets the consumer pass a "main" zone (large, `height:'fr'`) next
   *   to a "rightbar" zone (narrow, `height: 0.25`) without any additional
   *   prop. The resize handle between zones is horizontal (cursor ew-resize).
   *
   * **Scope note:** this is a single-level split only. True 2D nesting (a
   * zone inside another zone) is out of scope for ADR 022 and planned as a
   * future ADR.
   *
   * @default 'vertical'
   */
  direction?: 'vertical' | 'horizontal';
  /**
   * Single source of truth для ВНУТРЕННИХ разделителей Matrix (hairline между
   * слотами). Слоты — общее пространство, разделённое линиями, не независимые
   * карточки: внешнего бордера и скруглений у ячеек нет. Divider между парой
   * соседей виден, когда пара резолвится bordered И между ними не рисуется
   * активная resize-ручка (линия ручки сама служит разделителем — двойной
   * линии не бывает). Per-slot override: `slots.X.bordered` / `cell.bordered`.
   *
   * @default true
   */
  bordered?: boolean;
}

/**
 * Raw rows mode — передаёт rows напрямую, без пресета.
 */
export interface IMatrixRawProps extends IMatrixCommonProps {
  rows: IRow[];
  preset?: never;
  slots?: never;
}

/**
 * Preset mode — именованный пресет + типизированные slots.
 */
export interface IMatrixPresetProps<P extends keyof LayoutPresets = keyof LayoutPresets>
  extends IMatrixCommonProps {
  preset: P;
  slots: LayoutPresets[P];
  rows?: never;
}

/**
 * Discriminated union: либо raw rows, либо preset+slots.
 */
export type IMatrixProps = IMatrixRawProps | IMatrixPresetProps;
