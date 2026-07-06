import type { Accessor, JSX } from 'solid-js';
import type { BorderSide, BorderValue, ICell, IRow, SlotValue } from './interfaces';

// ---------------------------------------------------------------------------
// Border model (border-1/border-2 briefs, 2026-07-05).
//
// `bordered` — opt-out (default true): внутренние hairline-разделители между
// слотами есть всегда, точечно гасятся Matrix-пропом или per-slot. Управление
// ПО СТОРОНАМ (`BorderSides`), не булево на весь слот: кейс двойного шва у
// вложенных фреймов гасится ОДНОЙ стороной. Типы контракта — в interfaces.ts.
//
// Единый токен: разделители рисуются полным `--border` (`border-border`), как
// ручка ресайза (web-ui) и Card/Input в ките — все бордеры в продукте один цвет.
// ---------------------------------------------------------------------------

/**
 * Резолвит ОДНУ сторону значения → `true | false | undefined`.
 * `undefined` (значение не задано целиком) = следовать Matrix-дефолту.
 * Объект: указанная сторона = её значение, неуказанная = `on` (true).
 */
const resolveSide = (value: BorderValue | undefined, side: BorderSide): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  return value[side] ?? true;
};

/**
 * Matrix-уровневый дефолт для ВНУТРЕННЕГО шва. Matrix `bordered` первично булев
 * (default true / opt-out false); per-side богатство — свойство СЛОТОВ, для
 * внутренних швов матричный объект трактуется как «включено».
 */
const matrixDefault = (bordered: BorderValue): boolean =>
  typeof bordered === 'boolean' ? bordered : true;

/**
 * Комбинирует две обращённые друг к другу стороны общего шва.
 * Kill-wins: явный `false` на любой из сторон гасит шов («гасим ОДНУ сторону»).
 * Явный `true` — рисует. Обе не заданы → Matrix-дефолт.
 */
const seamOn = (a: boolean | undefined, b: boolean | undefined, mDefault: boolean): boolean => {
  if (a === false || b === false) return false;
  if (a === true || b === true) return true;
  return mDefault;
};

/**
 * Агрегирует сторону ряда из его ячеек (ряд — горизонтальная полоса; его
 * top/bottom/left/right разделяют все cells). Kill-wins на уровне ряда: явный
 * `false` любой ячейки гасит сторону ряда; явный `true` — включает.
 */
const rowSideResolve = (row: IRow, side: BorderSide): boolean | undefined => {
  let sawTrue = false;
  for (const c of row.cells) {
    const r = resolveSide(c.bordered, side);
    if (r === false) return false;
    if (r === true) sawTrue = true;
  }
  return sawTrue ? true : undefined;
};

/** Любая сторона включена (для карточной border-модели packing/grid-зон). */
const anySideOn = (value: BorderValue): boolean =>
  typeof value === 'boolean'
    ? value
    : (['top', 'right', 'bottom', 'left'] as const).some((s) => value[s] ?? true);

// ---------------------------------------------------------------------------
// Effective-flag resolvers (2026-07-04).
//
// Precedence: явный per-slot флаг > matrix-резолюция (`resize`/`dnd` prop >
// `mode` > глобальный сигнал). `resizeEnabled` — уже разрезолвленный
// matrix-уровень (mode.ts). Читают сигналы в момент вызова — вызывать из
// реактивного скоупа (classList / handleActive-акцессоры).
// ---------------------------------------------------------------------------

/** Активность resize для cell: `cell.resizable ?? resizeEnabled()`. */
export const cellResizeActive = (cell: ICell, resizeEnabled: Accessor<boolean>): boolean =>
  cell.resizable ?? resizeEnabled();

/** Активность resize для row (вертикальная/зонная ручка). */
export const rowResizeActive = (row: IRow, resizeEnabled: Accessor<boolean>): boolean =>
  row.resizable ?? resizeEnabled();

/**
 * Активна ли resize-ручка МЕЖДУ двумя горизонтальными соседями (corvu ANDит
 * соседей — ручка активна когда активны ОБА). Активная ручка сама рисует линию
 * шва (`bg-border`, web-ui) — Matrix гасит свой divider на этой стороне.
 */
export const cellHandleActive = (
  prev: ICell,
  cell: ICell,
  resizeEnabled: Accessor<boolean>,
): boolean => cellResizeActive(prev, resizeEnabled) && cellResizeActive(cell, resizeEnabled);

/** То же для пары соседних rows / зон (вертикальная либо зонная ручка). */
export const rowHandleActive = (prev: IRow, row: IRow, resizeEnabled: Accessor<boolean>): boolean =>
  rowResizeActive(prev, resizeEnabled) && rowResizeActive(row, resizeEnabled);

/**
 * Карточный бордер ячейки для packing/grid-зон (insert-канвас сохраняет плитки).
 * Возвращает булево (any-side): per-side объект трактуется как «есть бордер».
 */
export const cellCardBordered = (cell: ICell, bordered: Accessor<BorderValue>): boolean =>
  cell.bordered !== undefined ? anySideOn(cell.bordered) : anySideOn(bordered());

// ---------------------------------------------------------------------------
// Divider resolvers (внутренние разделители общего пространства, НЕ карточки).
//
// Инверсия resize-стыка (border-2 бриф, 2026-07-05): когда на шве активна
// resize-ручка, её hairline (`bg-border`, web-ui после снятия ghost) И ЕСТЬ
// divider — Matrix гасит СВОЙ бордер на этой стороне (иначе двойная линия, см.
// img_9/img_10). `resizeActive` передаётся только на путях с ручкой
// (Resizable-ветки); на plain-путях опускается (`undefined` → нет подавления).
// ---------------------------------------------------------------------------

const seamDivider = (
  prevSide: boolean | undefined,
  curSide: boolean | undefined,
  bordered: Accessor<BorderValue>,
  resizeActive: Accessor<boolean> | undefined,
): boolean => {
  if (resizeActive?.()) return false; // активная ручка сама рисует линию шва
  return seamOn(prevSide, curSide, matrixDefault(bordered()));
};

/**
 * Divider между двумя горизонтальными соседями-cells (вертикальная линия слева
 * от правой ячейки). Виден когда пара bordered (either-rule со сторонами:
 * `prev.right` / `cell.left`, kill-wins) И на шве нет активной resize-ручки.
 */
export const dividerBetweenCells = (
  prev: ICell,
  cell: ICell,
  bordered: Accessor<BorderValue>,
  resizeActive?: Accessor<boolean>,
): boolean =>
  seamDivider(
    resolveSide(prev.bordered, 'right'),
    resolveSide(cell.bordered, 'left'),
    bordered,
    resizeActive,
  );

/**
 * Divider между двумя вертикальными соседями-rows (горизонтальная линия сверху
 * нижнего ряда). Стороны: `prev.bottom` / `row.top`.
 */
export const dividerBetweenRows = (
  prev: IRow,
  row: IRow,
  bordered: Accessor<BorderValue>,
  resizeActive?: Accessor<boolean>,
): boolean =>
  seamDivider(rowSideResolve(prev, 'bottom'), rowSideResolve(row, 'top'), bordered, resizeActive);

/**
 * Divider между двумя горизонтальными соседями-зонами (direction=horizontal:
 * зоны стоят бок-о-бок, линия вертикальная слева от правой зоны). Стороны:
 * `prev.right` / `row.left`.
 */
export const dividerBetweenZones = (
  prev: IRow,
  row: IRow,
  bordered: Accessor<BorderValue>,
  resizeActive?: Accessor<boolean>,
): boolean =>
  seamDivider(rowSideResolve(prev, 'right'), rowSideResolve(row, 'left'), bordered, resizeActive);

/**
 * Нормализованный slot — всегда объект с `children` + размерами + `draggable`.
 */
export interface INormalizedSlot {
  children: JSX.Element;
  initialSize?: number;
  minSize?: number;
  maxSize?: number;
  /**
   * Per-slot draggable override.
   * `undefined` = not set (opt-out model: engine treats as draggable when DnD is active).
   * `false` = explicit opt-out (cell is never draggable).
   * `true` = explicit opt-in (redundant with default, but valid).
   */
  draggable?: boolean;
  /** Свап-группа (передаётся в preset → ICell.swapGroup). */
  swapGroup?: string;
  /** Explicit resizable override — undefined = preset применяет свой default. */
  resizable?: boolean;
  /**
   * Per-slot border override — undefined = follows the Matrix-level `bordered` prop.
   * Boolean = весь слот; `BorderSides` = точечно по сторонам (T/R/B/L). `false`
   * на обращённой к соседу стороне гасит шов (kill-wins).
   */
  bordered?: BorderValue;
  /**
   * Per-slot Suspense fallback — forwarded to ICell.skeleton.
   * Shown while the slot's child is suspended (lazy chunk loading).
   */
  skeleton?: JSX.Element;
}

/**
 * Нормализует SlotValue в INormalizedSlot.
 *
 * Heuristic: если у значения есть собственный ключ `children` — это object-форма.
 * Иначе — JSX-элемент (строка / функция / массив / число / boolean / null).
 *
 * Это покрывает все realistic cases:
 * - `<Header />` — функция без `children` → JSX-форма
 * - `"text"` — строка → JSX-форма
 * - `{ children: <Header />, initialSize: 0.2 }` → object-форма
 * - `{ children: <Header /> }` — объект с `children`, без size → object-форма
 *
 * Returns `null` для `undefined`/`null`.
 */
export const normalizeSlotValue = (slot: SlotValue | undefined): INormalizedSlot | null => {
  if (slot === undefined || slot === null) return null;

  // Object-форма: любой plain-object с ключом `children`
  if (typeof slot === 'object' && !Array.isArray(slot) && Object.hasOwn(slot, 'children')) {
    const config = slot as {
      children: JSX.Element;
      initialSize?: number;
      minSize?: number;
      maxSize?: number;
      draggable?: boolean;
      swapGroup?: string;
      resizable?: boolean;
      bordered?: BorderValue;
      skeleton?: JSX.Element;
    };
    return {
      children: config.children,
      initialSize: config.initialSize,
      minSize: config.minSize,
      maxSize: config.maxSize,
      draggable: config.draggable,
      swapGroup: config.swapGroup,
      resizable: config.resizable,
      bordered: config.bordered,
      skeleton: config.skeleton,
    };
  }

  // JSX-форма: строка, число, boolean, функция, массив, или любой другой объект
  return {
    children: slot as JSX.Element,
    draggable: undefined,
  };
};
