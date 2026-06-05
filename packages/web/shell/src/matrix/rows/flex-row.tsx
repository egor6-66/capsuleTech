/**
 * flex-row.tsx — renderRow, rowToFlexItems, rowHasResizable.
 *
 * Standard corvu-flex render-path for rows.
 */
import type { ISortableZone } from '@capsuletech/web-dnd';
import { Flex, type IFlex } from '@capsuletech/web-ui';
import type { Accessor, JSX } from 'solid-js';
import { For } from 'solid-js';
import { type ICellDndState, NOOP_REF, renderCell } from '../cell';
import type { ICell, IRow } from '../interfaces';
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
  _resizeEnabled: Accessor<boolean>,
): IFlex.IFlexItem[] => {
  const rowIsAutoHeight = row.height === 'auto';
  return row.cells.map((cell, i) => {
    const widthIsNumber = typeof cell.width === 'number';
    const cellRef = cell.draggable !== false && bindCell ? bindCell(cell, row.id) : NOOP_REF;
    const dndState = getCellDndState ? getCellDndState(cell) : undefined;
    // Prefer session-persisted size; fall back to declared cell.width.
    const resolvedSize = savedSizes?.[i] ?? (widthIsNumber ? (cell.width as number) : undefined);
    return {
      children: renderCell(
        cell,
        getSwappedChildren,
        cellRef,
        dndState,
        isDragging,
        rowIsAutoHeight,
      ),
      // resizable не gate'ится по resizeEnabled здесь: иначе все items станут resizable=false,
      // Flex переключится в StaticItemsFlex (без corvu Panel) и cells схлопнутся в 0.
      // Режим включён/выключен через `withHandle` + `handleDisabled` (см. вызовы Flex ниже).
      resizable: cell.resizable ?? true,
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
): JSX.Element => {
  // ADR 026: Grid-canvas render-path.
  if (zone && row.grid && gridOpts && row.id) {
    return renderGridRow(row, getSwappedChildren, zone, isDragging, resizeEnabled, gridOpts);
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
    );
    const isResizeActive = resizeEnabled();
    return (
      <div
        ref={rowContainerRef}
        class="relative h-full min-h-0 flex-1 overflow-hidden"
        classList={{
          'ring-2 ring-inset ring-destructive/50': rowRejectsDrag(),
          'ring-2 ring-inset ring-primary/40 bg-primary/5':
            rowCanAccept() && !rowIsTarget() && !rowRejectsDrag(),
          'ring-2 ring-inset ring-primary bg-primary/10': rowIsTarget() && !rowRejectsDrag(),
        }}
      >
        <div class="absolute inset-0">
          <Flex
            orientation="horizontal"
            items={items}
            withHandle={isResizeActive}
            handleDisabled={!isResizeActive}
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
        'flex-1': row.height === 'fr' || row.height === undefined,
        'ring-2 ring-inset ring-destructive/50': rowRejectsDrag(),
        'ring-2 ring-inset ring-primary/40 bg-primary/5':
          rowCanAccept() && !rowIsTarget() && !rowRejectsDrag(),
        'ring-2 ring-inset ring-primary bg-primary/10': rowIsTarget() && !rowRejectsDrag(),
      }}
    >
      <For each={row.cells}>
        {(cell) => {
          const cellRef = cell.draggable !== false && bindCell ? bindCell(cell, row.id) : NOOP_REF;
          const dndState = getCellDndState ? getCellDndState(cell) : undefined;
          return renderCell(
            cell,
            getSwappedChildren,
            cellRef,
            dndState,
            isDragging,
            rowIsAutoHeight,
          );
        }}
      </For>
    </div>
  );
};
