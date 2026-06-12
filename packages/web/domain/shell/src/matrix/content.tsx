/**
 * content.tsx — MatrixContent, rowsToVerticalItems, hasVerticalResizable, SizesMap.
 *
 * Inner component that lives INSIDE DnDProvider.
 */
import type { ISortableZone } from '@capsuletech/web-dnd';
import { useDnD } from '@capsuletech/web-dnd';
import { Flex, type IFlex } from '@capsuletech/web-ui';
import type { Accessor, JSX } from 'solid-js';
import { createMemo, createSignal, For, Show, Suspense } from 'solid-js';
import { type ICellDndState, MatrixCellFallback, NOOP_REF } from './cell';
import { DragBadge } from './dnd/drag-badge';
import { createInsertEngine } from './dnd/insert';
import { createSwapEngine } from './dnd/swap';
import type { ICell, IRow, LayoutChangeEvent, MatrixDndKind } from './interfaces';
import { renderRow } from './rows/flex-row';
import type { IGridOpts } from './rows/grid-row';

// ---------------------------------------------------------------------------
// SizesMap — session-only persistence of user-resized panel sizes.
// ---------------------------------------------------------------------------

type SizesMap = Record<string, number[]>;

// ---------------------------------------------------------------------------
// IMatrixContentProps
// ---------------------------------------------------------------------------

export interface IMatrixContentProps {
  rows: Accessor<IRow[]>;
  resizeEnabled: Accessor<boolean>;
  dndEnabled: Accessor<boolean>;
  dndKind: Accessor<MatrixDndKind>;
  onLayoutChange: ((e: LayoutChangeEvent) => void) | undefined;
  /**
   * Matrix-level outer axis (ADR 022).
   */
  direction: 'vertical' | 'horizontal';
}

// ---------------------------------------------------------------------------
// rowsToVerticalItems
// ---------------------------------------------------------------------------

const rowsToVerticalItems = (
  rows: IRow[],
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  bindCell: ((cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void) | undefined,
  /** ADR 025: Zone lookup for insert mode. undefined → swap/view mode. */
  getZone: ((rowId: string) => ISortableZone | undefined) | undefined,
  getCellDndState: ((cell: ICell) => ICellDndState | undefined) | undefined,
  /** Saved vertical panel sizes (index-aligned). */
  savedVerticalSizes: number[] | undefined,
  /** Per-row saved horizontal sizes. Key = rowId ?? "r<index>". */
  getRowSavedSizes: ((rowKey: string) => number[] | undefined) | undefined,
  /** Called when a horizontal row's corvu sizes change. Key = rowId ?? "r<index>". */
  onRowSizesChange: ((rowKey: string, sizes: number[]) => void) | undefined,
  isDragging: Accessor<boolean>,
  resizeEnabled: Accessor<boolean>,
  dndEnabled: Accessor<boolean>,
  /** ADR 022: Getter for per-cell explicit px sizes (packing resize handle). */
  getCellSize: (cellId: string) => number | undefined,
  /** ADR 022: Setter for per-cell explicit px sizes (packing resize handle). */
  setCellSize: (cellId: string, px: number) => void,
  /** ADR 026: Grid-zone bindings (insert mode only). */
  gridOpts?: IGridOpts,
): IFlex.IFlexItem[] => {
  return rows.map((row, i) => {
    const heightIsNumber = typeof row.height === 'number';
    const isResizable = row.resizable ?? true;
    const rowKey = row.id ?? `r${i}`;
    const rowSaved = getRowSavedSizes ? getRowSavedSizes(rowKey) : undefined;
    const rowOnChange = onRowSizesChange
      ? (sizes: number[]) => onRowSizesChange(rowKey, sizes)
      : undefined;
    const resolvedHeight =
      savedVerticalSizes?.[i] ?? (heightIsNumber ? (row.height as number) : undefined);
    const zone = getZone && row.id ? getZone(row.id) : undefined;
    return {
      children: renderRow(
        row,
        getSwappedChildren,
        bindCell,
        zone,
        getCellDndState,
        rowSaved,
        rowOnChange,
        isDragging,
        resizeEnabled,
        dndEnabled,
        getCellSize,
        setCellSize,
        gridOpts,
      ),
      resizable: isResizable,
      initialSize: resolvedHeight,
      minSize: row.minHeight,
    };
  });
};

const hasVerticalResizable = (rows: IRow[]): boolean =>
  rows.some((r) => r.resizable === true || typeof r.height === 'number');

// ---------------------------------------------------------------------------
// MatrixContent
// ---------------------------------------------------------------------------

export const MatrixContent = (props: IMatrixContentProps) => {
  const dnd = useDnD();
  const isDragging = createMemo(() => dnd.state.activeId() !== null);

  // DnD gating by both enabled flag and kind.
  const swapEnabled = createMemo(() => props.dndEnabled() && props.dndKind() === 'swap');
  const insertEnabled = createMemo(() => props.dndEnabled() && props.dndKind() === 'insert');

  const sizesSnapshot: SizesMap = {};

  const getSavedSizes = (key: string): number[] | undefined => sizesSnapshot[key];

  const saveSizes = (key: string, sizes: number[]): void => {
    const prev = sizesSnapshot[key];
    if (prev !== undefined && sizes.length < prev.length) return;
    sizesSnapshot[key] = sizes;
  };

  const getRowSavedSizes = (rowKey: string): number[] | undefined => getSavedSizes(`h:${rowKey}`);

  const onRowSizesChange = (rowKey: string, sizes: number[]): void => {
    saveSizes(`h:${rowKey}`, sizes);
  };

  const onVerticalSizesChange = (sizes: number[]): void => {
    saveSizes('v', sizes);
  };

  const [cellSizeMap, setCellSizeMap] = createSignal<Map<string, number>>(new Map(), {
    equals: false,
  });

  const getCellSize = (cellId: string): number | undefined => cellSizeMap().get(cellId);

  const setCellSize = (cellId: string, px: number): void => {
    setCellSizeMap((prev) => {
      const next = new Map(prev);
      next.set(cellId, px);
      return next;
    });
  };

  const swap = createSwapEngine({
    rows: props.rows,
    enabled: swapEnabled,
    onLayoutChange: props.onLayoutChange,
  });

  const insert = createInsertEngine({
    rows: props.rows,
    enabled: insertEnabled,
    onLayoutChange: props.onLayoutChange,
  });

  // Badge shown only when DnD/swap is active and 2+ draggable cells exist.
  const showBadges = createMemo(
    () => props.dndEnabled() && swap.draggableCount >= 2 && props.dndKind() === 'swap',
  );

  const effectiveRows = createMemo(() =>
    props.dndKind() === 'insert' ? insert.rows() : props.rows(),
  );

  // Build getCellDndState — returns per-cell badge + highlight state.
  const getCellDndState = (cell: ICell): ICellDndState | undefined => {
    // Per-cell draggable: opt-out default true. DnD must be swap-enabled.
    if (!(cell.draggable ?? true) || props.dndKind() !== 'swap' || !props.dndEnabled())
      return undefined;
    const { isOver, canDrop, canAccept } = swap.getCellDropState(cell.id);
    return {
      draggableId: swap.getDraggableId(cell.id),
      isOver,
      canDrop,
      canAccept,
      showBadge: showBadges(),
    };
  };

  const renderContent = (): JSX.Element => {
    const rows = effectiveRows();

    if (rows.length === 0) return null;

    const isSwap = props.dndKind() === 'swap' && props.dndEnabled();
    const isInsert = props.dndKind() === 'insert' && props.dndEnabled();
    const swapGetChildren = isSwap ? swap.getCellChildren : undefined;
    const swapBind = isSwap ? swap.bindCell : undefined;
    const insertGetZone = isInsert
      ? (rowId: string): ISortableZone | undefined => insert.getZone(rowId)
      : undefined;
    const cellDndState = isSwap ? getCellDndState : undefined;

    const insertGridOpts: IGridOpts | undefined = isInsert
      ? {
          registerGridContainer: insert.registerGridContainer,
          commitGridMove: insert.commitGridMove,
          commitGridResize: insert.commitGridResize,
          finalizeGridResize: insert.finalizeGridResize,
          getLiveGridCoords: insert.getLiveGridCoords,
        }
      : undefined;

    // Single row, single cell (centroid shortcut)
    if (rows.length === 1 && rows[0].cells.length === 1 && !rows[0].resizable) {
      const cell = rows[0].cells[0];
      if (!rows[0].height || rows[0].height === 'fr') {
        const children = swapGetChildren ? swapGetChildren(cell.id) : cell.children;
        const cellRef =
          cell.draggable !== false && swapBind ? swapBind(cell, rows[0].id) : NOOP_REF;
        const dndState = cellDndState ? cellDndState(cell) : undefined;
        // vt-route-content: named View Transition region "capsule-content" (web-style/index.css).
        // Applied when cell.id='main' so the main content animates on routing while
        // chrome (header/sidebar/footer) stays static. Ensures uniqueness — only
        // one cell carries view-transition-name at a time.
        const isMainCell = cell.id === 'main';
        return (
          <div
            ref={cellRef}
            class={`relative flex h-full w-full items-center justify-center${isMainCell ? ' vt-route-content' : ''}`}
          >
            <div
              class="absolute inset-0 overflow-auto flex items-center justify-center"
              classList={{ 'pointer-events-none': isDragging() }}
            >
              <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>{children}</Suspense>
            </div>
            <Show
              when={dndState && (dndState.canAccept() || dndState.canDrop() || dndState.isOver())}
            >
              <div
                class="pointer-events-none absolute inset-0 z-30 transition-colors duration-150"
                classList={{
                  'border-2 border-primary/30 bg-primary/5':
                    (dndState?.canAccept() ?? false) && !(dndState?.canDrop() ?? false),
                  'border-2 border-primary bg-primary/15': dndState?.canDrop() ?? false,
                  'border-2 border-border':
                    (dndState?.isOver() ?? false) &&
                    !(dndState?.canDrop() ?? false) &&
                    !(dndState?.canAccept() ?? false),
                }}
              />
            </Show>
            {dndState?.showBadge && <DragBadge draggableId={dndState.draggableId} />}
          </div>
        );
      }
    }

    // ---------------------------------------------------------------------------
    // direction='horizontal' — zones placed side-by-side (columns).
    // ---------------------------------------------------------------------------
    if (props.direction === 'horizontal') {
      const hasResizableZones = rows.some((r) => r.resizable === true);

      const zoneItems = rows.map((row, i): IFlex.IFlexItem => {
        const rowKey = row.id ?? `r${i}`;
        const zone = insertGetZone && row.id ? insertGetZone(row.id) : undefined;
        const widthFraction = typeof row.height === 'number' ? row.height : undefined;
        return {
          children: (
            <div class="relative h-full min-w-0 flex-1 overflow-hidden">
              {renderRow(
                row,
                swapGetChildren,
                swapBind,
                zone,
                cellDndState,
                getRowSavedSizes(rowKey),
                (sizes) => onRowSizesChange(rowKey, sizes),
                isDragging,
                props.resizeEnabled,
                props.dndEnabled,
                getCellSize,
                setCellSize,
                insertGridOpts,
              )}
            </div>
          ),
          resizable: row.resizable ?? false,
          initialSize: getSavedSizes(`hz:${rowKey}`)?.[0] ?? widthFraction,
          minSize: row.minHeight,
        };
      });

      if (hasResizableZones) {
        return (
          <div class="relative h-full w-full overflow-hidden">
            <div class="absolute inset-0">
              <Flex
                orientation="horizontal"
                items={zoneItems}
                withHandle={props.resizeEnabled()}
                handleDisabled={!props.resizeEnabled()}
                onSizesChange={(sizes) => {
                  for (let k = 0; k < rows.length; k++) {
                    const rk = rows[k].id ?? `r${k}`;
                    if (sizes[k] !== undefined) saveSizes(`hz:${rk}`, [sizes[k]]);
                  }
                }}
              />
            </div>
          </div>
        );
      }

      return (
        <div class="relative h-full w-full overflow-hidden">
          <div class="absolute inset-0 flex flex-row overflow-hidden">
            <For each={rows}>
              {(row, i) => {
                const rowKey = row.id ?? `r${i()}`;
                const zone = insertGetZone && row.id ? insertGetZone(row.id) : undefined;
                const colStyle = (): JSX.CSSProperties => {
                  if (row.height === 'auto') {
                    return { flex: '0 0 auto', 'min-width': '0' };
                  }
                  if (typeof row.height === 'number') {
                    return { flex: `0 0 ${row.height * 100}%`, 'min-width': '0' };
                  }
                  return { flex: '1', 'min-width': '0' };
                };
                return (
                  <div class="relative h-full overflow-hidden" style={colStyle()}>
                    {renderRow(
                      row,
                      swapGetChildren,
                      swapBind,
                      zone,
                      cellDndState,
                      getRowSavedSizes(rowKey),
                      (sizes) => onRowSizesChange(rowKey, sizes),
                      isDragging,
                      props.resizeEnabled,
                      props.dndEnabled,
                      getCellSize,
                      setCellSize,
                      insertGridOpts,
                    )}
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      );
    }

    // ---------------------------------------------------------------------------
    // direction='vertical' (default) — existing behaviour, unchanged.
    // ---------------------------------------------------------------------------
    const useVertical = hasVerticalResizable(rows);

    if (useVertical) {
      const hasAutoRows = rows.some((r) => r.height === 'auto');

      if (!hasAutoRows) {
        const verticalItems = rowsToVerticalItems(
          rows,
          swapGetChildren,
          swapBind,
          insertGetZone,
          cellDndState,
          getSavedSizes('v'),
          getRowSavedSizes,
          onRowSizesChange,
          isDragging,
          props.resizeEnabled,
          props.dndEnabled,
          getCellSize,
          setCellSize,
          insertGridOpts,
        );
        return (
          <div class="relative h-full w-full overflow-hidden">
            <div class="absolute inset-0">
              <Flex
                orientation="vertical"
                items={verticalItems}
                withHandle={props.resizeEnabled()}
                handleDisabled={!props.resizeEnabled()}
                onSizesChange={onVerticalSizesChange}
              />
            </div>
          </div>
        );
      }

      const resizableRows = rows.filter((r) => r.height !== 'auto');
      const verticalItems = rowsToVerticalItems(
        resizableRows,
        swapGetChildren,
        swapBind,
        insertGetZone,
        cellDndState,
        getSavedSizes('v'),
        getRowSavedSizes,
        onRowSizesChange,
        isDragging,
        props.resizeEnabled,
        props.dndEnabled,
        getCellSize,
        setCellSize,
        insertGridOpts,
      );

      let resizableBlockEmitted = false;
      const elements: JSX.Element[] = rows.map((row, _i) => {
        if (row.height === 'auto') {
          const rowKey = row.id ?? `r${_i}`;
          const zone = insertGetZone && row.id ? insertGetZone(row.id) : undefined;
          return (
            <div class="w-full shrink-0">
              {renderRow(
                row,
                swapGetChildren,
                swapBind,
                zone,
                cellDndState,
                getRowSavedSizes(rowKey),
                (sizes) => onRowSizesChange(rowKey, sizes),
                isDragging,
                props.resizeEnabled,
                props.dndEnabled,
                getCellSize,
                setCellSize,
                insertGridOpts,
              )}
            </div>
          );
        }
        if (resizableBlockEmitted) return null;
        resizableBlockEmitted = true;
        return (
          <div class="relative min-h-0 flex-1 overflow-hidden">
            <div class="absolute inset-0">
              <Flex
                orientation="vertical"
                items={verticalItems}
                withHandle={props.resizeEnabled()}
                handleDisabled={!props.resizeEnabled()}
                onSizesChange={onVerticalSizesChange}
              />
            </div>
          </div>
        );
      });

      return <div class="flex h-full w-full flex-col overflow-hidden">{elements}</div>;
    }

    return (
      <div class="flex h-full w-full flex-col overflow-hidden">
        <For each={rows}>
          {(row, i) => {
            const rowKey = row.id ?? `r${i()}`;
            const zone = insertGetZone && row.id ? insertGetZone(row.id) : undefined;
            if (row.height === 'auto' || (row.height === undefined && rows.length > 1)) {
              return (
                <div class="w-full shrink-0">
                  {renderRow(
                    row,
                    swapGetChildren,
                    swapBind,
                    zone,
                    cellDndState,
                    getRowSavedSizes(rowKey),
                    (sizes) => onRowSizesChange(rowKey, sizes),
                    isDragging,
                    props.resizeEnabled,
                    props.dndEnabled,
                    getCellSize,
                    setCellSize,
                    insertGridOpts,
                  )}
                </div>
              );
            }
            return renderRow(
              row,
              swapGetChildren,
              swapBind,
              zone,
              cellDndState,
              getRowSavedSizes(rowKey),
              (sizes) => onRowSizesChange(rowKey, sizes),
              isDragging,
              props.resizeEnabled,
              props.dndEnabled,
              getCellSize,
              setCellSize,
              insertGridOpts,
            );
          }}
        </For>
      </div>
    );
  };

  return <>{renderContent()}</>;
};
