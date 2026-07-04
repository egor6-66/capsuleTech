import type { Accessor, JSX } from 'solid-js';
import type { ICell, IRow, SlotValue } from './interfaces';

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

/** Row считается bordered, если хотя бы одна его cell резолвится в true. */
export const rowBordered = (row: IRow, bordered: Accessor<boolean>): boolean =>
  row.cells.some((c) => c.bordered ?? bordered());

/**
 * Divider между двумя соседними cells (внутренний разделитель общего
 * пространства, НЕ карточный бордер). Виден когда:
 *   - хотя бы один из соседей резолвится bordered, И
 *   - между ними НЕ рисуется активная resize-ручка (её hairline сам служит
 *     разделителем — иначе двойная линия).
 * `handleBetween` — структурное наличие corvu-handle между парой
 * (false в plain-flex путях, где ручек нет вовсе).
 */
export const dividerBetweenCells = (
  prev: ICell,
  cell: ICell,
  bordered: Accessor<boolean>,
  resizeEnabled: Accessor<boolean>,
  handleBetween: boolean,
): boolean =>
  ((prev.bordered ?? bordered()) || (cell.bordered ?? bordered())) &&
  !(
    handleBetween &&
    cellResizeActive(prev, resizeEnabled) &&
    cellResizeActive(cell, resizeEnabled)
  );

/** То же для пары соседних rows (горизонтальный divider между зонами). */
export const dividerBetweenRows = (
  prev: IRow,
  row: IRow,
  bordered: Accessor<boolean>,
  resizeEnabled: Accessor<boolean>,
  handleBetween: boolean,
): boolean =>
  (rowBordered(prev, bordered) || rowBordered(row, bordered)) &&
  !(handleBetween && rowResizeActive(prev, resizeEnabled) && rowResizeActive(row, resizeEnabled));

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
   * `true`/`false` forces this slot's border regardless of the Matrix-level flag.
   */
  bordered?: boolean;
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
      bordered?: boolean;
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
