/**
 * flex-row.tsx — renderRow, rowToFlexItems, rowHasResizable.
 *
 * Standard corvu-flex render-path for rows.
 */
import type { ISortableZone } from '@capsuletech/web-dnd';
import { type IResizable, Layout } from '@capsuletech/web-ui';
import type { Accessor, JSX } from 'solid-js';
import { For } from 'solid-js';
import { type ICellDndState, NOOP_REF, renderCell } from '../cell';
import type { ICell, IRow } from '../interfaces';
import { cellResizeActive, dividerBetweenCells } from '../utils';
import type { IGridOpts } from './grid-row';
import { renderGridRow } from './grid-row';
import { isPackingZone, renderPackingRow } from './packing-row';

// ---------------------------------------------------------------------------
// rowToFlexItems
// ---------------------------------------------------------------------------

export const rowToFlexItems = (
  row: IRow,
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  bindCell: ((cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void) | undefined,
  getCellDndState: ((cell: ICell) => ICellDndState | undefined) | undefined,
  /** Saved sizes for this row's horizontal panels (index-aligned). */
  savedSizes: number[] | undefined,
  isDragging: Accessor<boolean>,
  resizeEnabled: Accessor<boolean>,
  bordered: Accessor<boolean>,
): IResizable.IResizableItem[] => {
  const rowIsAutoHeight = row.height === 'auto';
  return row.cells.map((cell, i) => {
    const widthIsNumber = typeof cell.width === 'number';
    const cellRef = cell.draggable !== false && bindCell ? bindCell(cell, row.id) : NOOP_REF;
    const dndState = getCellDndState ? getCellDndState(cell) : undefined;
    // Prefer session-persisted size; fall back to declared cell.width.
    const resolvedSize = savedSizes?.[i] ?? (widthIsNumber ? (cell.width as number) : undefined);
    // Divider слева от cell (i>0): пара bordered И ручка между ними не активна.
    // handleBetween — структурное наличие corvu-handle (оба соседа resizable !== false).
    const prev = i > 0 ? row.cells[i - 1] : undefined;
    const handleBetween =
      !!prev && (prev.resizable ?? true) !== false && (cell.resizable ?? true) !== false;
    const leftDivider = prev
      ? (): boolean => dividerBetweenCells(prev, cell, bordered, resizeEnabled, handleBetween)
      : undefined;
    return {
      children: renderCell(
        cell,
        getSwappedChildren,
        cellRef,
        dndState,
        isDragging,
        rowIsAutoHeight,
        leftDivider,
      ),
      // resizable — СТРУКТУРНЫЙ флаг: false убирает handle из DOM. Не gate'ится
      // по resizeEnabled: иначе все items станут resizable=false, Resizable
      // переключится в Static-путь и cells схлопнутся. АКТИВНОСТЬ ручки —
      // реактивный per-item handleActive (web-ui ANDит соседей): явный
      // cell.resizable оверрайдит mode/global (пер-слот контракт 2026-07-04).
      resizable: cell.resizable ?? true,
      handleActive: (): boolean => cellResizeActive(cell, resizeEnabled),
      initialSize: resolvedSize,
      minSize: undefined,
      maxSize: undefined,
    };
  });
};

export const rowHasResizable = (row: IRow): boolean =>
  row.cells.some((c) => (c.resizable ?? true) === true);

// ---------------------------------------------------------------------------
// renderRow
// ---------------------------------------------------------------------------

export const renderRow = (
  row: IRow,
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  bindCell: ((cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void) | undefined,
  /**
   * ADR 025: Optional ISortableZone for insert mode.
   */
  zone: ISortableZone | undefined,
  getCellDndState: ((cell: ICell) => ICellDndState | undefined) | undefined,
  /** Saved horizontal panel sizes for this row (index-aligned, session-persisted). */
  savedSizes: number[] | undefined,
  /** Called when corvu reports new horizontal sizes for this row. */
  onRowSizesChange: ((sizes: number[]) => void) | undefined,
  isDragging: Accessor<boolean>,
  resizeEnabled: Accessor<boolean>,
  dndEnabled: Accessor<boolean>,
  /** ADR 022: Getter for per-cell explicit px sizes (packing resize handle). */
  getCellSize: (cellId: string) => number | undefined,
  /** ADR 022: Setter for per-cell explicit px sizes (packing resize handle). */
  setCellSize: (cellId: string, px: number) => void,
  /**
   * ADR 026: Grid-zone bindings. Only passed in insert mode when row.grid is set.
   */
  gridOpts?: IGridOpts,
  bordered: Accessor<boolean> = () => true,
  /**
   * Видимость ВЕРХНЕГО divider'а этой row (hairline между ней и предыдущей).
   * Вычисляется в content.tsx (нужен контекст соседней row). undefined —
   * первая row / divider не нужен.
   */
  topDivider?: Accessor<boolean>,
): JSX.Element => {
  // ADR 026: Grid-canvas render-path.
  if (zone && row.grid && gridOpts && row.id) {
    return renderGridRow(
      row,
      getSwappedChildren,
      zone,
      isDragging,
      resizeEnabled,
      gridOpts,
      bordered,
    );
  }

  // ADR 022: Packing zones use a separate render-path.
  if (isPackingZone(row)) {
    return renderPackingRow(
      row,
      getSwappedChildren,
      bindCell,
      zone,
      isDragging,
      resizeEnabled,
      dndEnabled,
      getCellSize,
      setCellSize,
      bordered,
    );
  }

  const hasResizable = rowHasResizable(row);
  const rowContainerRef = zone ? zone.containerRef : NOOP_REF;
  const rowRejectsDrag: Accessor<boolean> = zone ? zone.rejects : () => false;
  const rowIsTarget: Accessor<boolean> = zone ? zone.isTarget : () => false;
  const rowCanAccept: Accessor<boolean> = zone ? zone.canAccept : () => false;

  if (hasResizable) {
    const items = rowToFlexItems(
      row,
      getSwappedChildren,
      bindCell,
      getCellDndState,
      savedSizes,
      isDragging,
      resizeEnabled,
      bordered,
    );
    // Активность ручек — per-item `handleActive` в items (web-ui ANDит соседей);
    // контейнерный гейт `handleDisabled` больше не используется, иначе он бы
    // глушил per-slot override (`resizable: true` при mode="view").
    // `withHandle` — константа: grip рисуется только на АКТИВНОЙ ручке (web-ui).
    return (
      <div
        ref={rowContainerRef}
        class="relative h-full min-h-0 flex-1 overflow-hidden"
        classList={{
          'border-t border-border/60': topDivider ? topDivider() : false,
          'ring-2 ring-inset ring-destructive/50': rowRejectsDrag(),
          'ring-2 ring-inset ring-primary/40 bg-primary/5':
            rowCanAccept() && !rowIsTarget() && !rowRejectsDrag(),
          'ring-2 ring-inset ring-primary bg-primary/10': rowIsTarget() && !rowRejectsDrag(),
        }}
      >
        <div class="absolute inset-0">
          <Layout.Resizable
            orientation="horizontal"
            items={items}
            withHandle
            onSizesChange={onRowSizesChange}
          />
        </div>
      </div>
    );
  }

  const rowIsAutoHeight = row.height === 'auto';
  return (
    <div
      ref={rowContainerRef}
      class="flex h-full min-h-0 w-full overflow-hidden"
      classList={{
        'border-t border-border/60': topDivider ? topDivider() : false,
        'flex-1': row.height === 'fr' || row.height === undefined,
        'ring-2 ring-inset ring-destructive/50': rowRejectsDrag(),
        'ring-2 ring-inset ring-primary/40 bg-primary/5':
          rowCanAccept() && !rowIsTarget() && !rowRejectsDrag(),
        'ring-2 ring-inset ring-primary bg-primary/10': rowIsTarget() && !rowRejectsDrag(),
      }}
    >
      <For each={row.cells}>
        {(cell, i) => {
          const cellRef = cell.draggable !== false && bindCell ? bindCell(cell, row.id) : NOOP_REF;
          const dndState = getCellDndState ? getCellDndState(cell) : undefined;
          // Plain-flex путь — corvu-ручек нет (handleBetween=false), divider
          // определяется только парой bordered.
          const prev = i() > 0 ? row.cells[i() - 1] : undefined;
          const leftDivider = prev
            ? (): boolean => dividerBetweenCells(prev, cell, bordered, resizeEnabled, false)
            : undefined;
          return renderCell(
            cell,
            getSwappedChildren,
            cellRef,
            dndState,
            isDragging,
            rowIsAutoHeight,
            leftDivider,
          );
        }}
      </For>
    </div>
  );
};
