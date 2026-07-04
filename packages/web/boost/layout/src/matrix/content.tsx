/**
 * content.tsx — MatrixContent, rowsToVerticalItems, hasVerticalResizable, SizesMap.
 *
 * Inner component that lives INSIDE DnDProvider.
 */
import type { ISortableZone } from '@capsuletech/web-dnd';
import { useDnD } from '@capsuletech/web-dnd';
import { type IResizable, Layout } from '@capsuletech/web-ui';
import type { Accessor, JSX } from 'solid-js';
import { createMemo, createSignal, For, Match, Show, Suspense, Switch } from 'solid-js';
import { type ICellDndState, MatrixCellFallback, NOOP_REF } from './cell';
import { DragBadge } from './dnd/drag-badge';
import { createInsertEngine } from './dnd/insert';
import { createSwapEngine } from './dnd/swap';
import type { ICell, IRow, LayoutChangeEvent, MatrixDndKind } from './interfaces';
import { renderRow } from './rows/flex-row';
import type { IGridOpts } from './rows/grid-row';
import { MatrixPresetContext, MatrixSlot, traceSlotRender } from './slot';

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
  /**
   * Single source of truth for the Matrix cell border. Independent of `resizeEnabled`/
   * `dndEnabled` — resize only activates the interactive handle (+ badge), it never
   * implies a border by itself.
   */
  bordered: Accessor<boolean>;
  onLayoutChange: ((e: LayoutChangeEvent) => void) | undefined;
  /**
   * Matrix-level outer axis (ADR 022).
   */
  direction: 'vertical' | 'horizontal';
  /**
   * Preset name (or undefined for raw-rows mode) — ambient tag for slot traces
   * (ADR 062). Instrumentation only; does not affect rendering.
   */
  preset: string | undefined;
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
  gridOpts: IGridOpts | undefined,
  /** Single source of truth for the cell border — independent of resize/DnD. */
  bordered: Accessor<boolean>,
): IResizable.IResizableItem[] => {
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
        bordered,
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
  //
  // STABILITY CONTRACT (2026-06-16 fix): the returned object must be present
  // whenever the cell is *structurally* draggable (opt-out default true). The
  // reactive accessors (`isOver`, `canDrop`, `canAccept`, `showBadge`) already
  // gate themselves to `false` when DnD is off — so toggling `dnd`/`mode` no
  // longer flips this function's return between `undefined` and `state`.
  //
  // Why this matters: returning `undefined` previously made `renderCell` pick
  // the non-DnD branch (different DOM shape) → DnD toggle re-mounted the cell
  // and lost inner state (e.g. accordion open-state). With a stable shape per
  // cell-identity, toggling DnD only flips overlay/badge visibility.
  const getCellDndState = (cell: ICell): ICellDndState | undefined => {
    if (!(cell.draggable ?? true)) return undefined;
    const { isOver, canDrop, canAccept } = swap.getCellDropState(cell.id);
    return {
      draggableId: swap.getDraggableId(cell.id),
      isOver,
      canDrop,
      canAccept,
      // `showBadges` already encodes (dndEnabled && kind==='swap' && count>=2)
      // reactively — pass the accessor through so badge mount/unmount is a
      // local <Show> flip, not a cell re-render.
      showBadge: showBadges,
    };
  };

  // ---------------------------------------------------------------------------
  // Toggle-stable bindings (2026-06-16 fix).
  //
  // BUG 1 — content.tsx used to compute these inside `renderContent()` based on
  // `props.dndEnabled()` / `props.dndKind()`. Toggling DnD/Resize flipped them
  // between `undefined` and a real value, which forced renderCell to swap its
  // DOM branch → entire cell subtree was destroyed + recreated, including any
  // inner state (accordion, scroll position, focus).
  //
  // BUG 2 — `swapGetChildren` was gated on `isSwap` (dndEnabled && kind==='swap').
  // Turning DnD off discarded the swap children-map view, snapping cells back to
  // their original positions. The swap-engine state lives forever as long as the
  // component is alive — its `getCellChildren` output must be the source of
  // truth for cell content whenever swap *could* be the active layout source.
  //
  // Fix:
  // - `swapBind` is always `swap.bindCell`. The engine internally registers each
  //   draggable with `disabled: () => true` (badge starts drag, not cell surface)
  //   and `droppable.accepts` reads `enabled()` reactively → no drag-time
  //   side effect when DnD is off.
  // - `swapGetChildren` is `swap.getCellChildren` whenever `dndKind !== 'insert'`
  //   (view + swap modes). Insert reshapes the row list itself (`insert.rows()`),
  //   so swap-children would conflict — return undefined there. (Per task spec.)
  // - `cellDndState` is `getCellDndState`. It returns populated state for any
  //   structurally-draggable cell (`cell.draggable !== false`); overlay/badge
  //   visibility flips through the inner accessors, not by `undefined↔value`.
  // - Insert-only bindings (`insertGetZone`, `insertGridOpts`) stay gated on
  //   `isInsert` — switching modes IS a structural change (corvu-Flex ↔ grid).
  // ---------------------------------------------------------------------------

  const swapBind = swap.bindCell;
  const cellDndState = getCellDndState;

  const swapGetChildren = createMemo(() =>
    props.dndKind() === 'insert' ? undefined : swap.getCellChildren,
  );

  const isInsert = createMemo(() => props.dndKind() === 'insert' && props.dndEnabled());

  const insertGetZone = createMemo(() =>
    isInsert() ? (rowId: string): ISortableZone | undefined => insert.getZone(rowId) : undefined,
  );

  const insertGridOpts = createMemo<IGridOpts | undefined>(() =>
    isInsert()
      ? {
          registerGridContainer: insert.registerGridContainer,
          commitGridMove: insert.commitGridMove,
          commitGridResize: insert.commitGridResize,
          finalizeGridResize: insert.finalizeGridResize,
          getLiveGridCoords: insert.getLiveGridCoords,
        }
      : undefined,
  );

  // ---------------------------------------------------------------------------
  // Structural derivations — depend on `effectiveRows()` + `props.direction`
  // ONLY. Toggling DnD/Resize must NOT cause any of these to fire.
  // ---------------------------------------------------------------------------

  const isCentroid = createMemo(() => {
    const rs = effectiveRows();
    if (rs.length !== 1 || rs[0].cells.length !== 1 || rs[0].resizable) return false;
    return !rs[0].height || rs[0].height === 'fr';
  });

  const isHorizontal = createMemo(() => props.direction === 'horizontal');
  const hasHorizontalResizableZones = createMemo(() =>
    effectiveRows().some((r) => r.resizable === true),
  );

  const useVertical = createMemo(() => hasVerticalResizable(effectiveRows()));
  const hasAutoRows = createMemo(() => effectiveRows().some((r) => r.height === 'auto'));

  // ---------------------------------------------------------------------------
  // JSX-tree (was `renderContent()` function-call).
  //
  // Each <Match> body is evaluated by Solid inside its own effect — toggling
  // resize/DnD signals does not re-evaluate a branch unless its `when` flips.
  // ---------------------------------------------------------------------------

  return (
    <MatrixPresetContext.Provider value={props.preset}>
      <Switch>
        <Match when={effectiveRows().length === 0}>{null}</Match>

      {/* Branch 1: centroid shortcut (single non-resizable cell). */}
      <Match when={isCentroid()}>
        {(() => {
          const rs = effectiveRows();
          const row = rs[0];
          const cell = row.cells[0];
          const cellRef = cell.draggable !== false ? swapBind(cell, row.id) : NOOP_REF;
          const dndState = cell.draggable !== false ? cellDndState(cell) : undefined;
          const children = (): JSX.Element => {
            traceSlotRender(cell.id);
            const getSwapped = swapGetChildren();
            return getSwapped ? getSwapped(cell.id) : cell.children;
          };
          return (
            <div ref={cellRef} class="relative flex h-full w-full items-center justify-center">
              <div
                class="absolute inset-0 overflow-auto flex items-center justify-center"
                classList={{ 'pointer-events-none': isDragging() }}
              >
                <MatrixSlot slot={cell.id}>
                  <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>
                    {children()}
                  </Suspense>
                </MatrixSlot>
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
              <Show when={dndState?.showBadge() ?? false}>
                <DragBadge draggableId={dndState!.draggableId} />
              </Show>
            </div>
          );
        })()}
      </Match>

      {/* Branch 2a: direction=horizontal + resizable zones (corvu Flex). */}
      <Match when={isHorizontal() && hasHorizontalResizableZones()}>
        {(() => {
          const rs = effectiveRows();
          const zoneItems = rs.map((row, i): IResizable.IResizableItem => {
            const rowKey = row.id ?? `r${i}`;
            const getZoneFn = insertGetZone();
            const zone = getZoneFn && row.id ? getZoneFn(row.id) : undefined;
            const widthFraction = typeof row.height === 'number' ? row.height : undefined;
            return {
              children: (
                <div class="relative h-full min-w-0 flex-1 overflow-hidden">
                  {renderRow(
                    row,
                    swapGetChildren(),
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
                    insertGridOpts(),
                    props.bordered,
                  )}
                </div>
              ),
              resizable: row.resizable ?? false,
              initialSize: getSavedSizes(`hz:${rowKey}`)?.[0] ?? widthFraction,
              minSize: row.minHeight,
            };
          });
          return (
            <div class="relative h-full w-full overflow-hidden">
              <div class="absolute inset-0">
                <Layout.Resizable
                  orientation="horizontal"
                  items={zoneItems}
                  withHandle={props.resizeEnabled()}
                  handleDisabled={!props.resizeEnabled()}
                  onSizesChange={(sizes) => {
                    for (let k = 0; k < rs.length; k++) {
                      const rk = rs[k].id ?? `r${k}`;
                      if (sizes[k] !== undefined) saveSizes(`hz:${rk}`, [sizes[k]]);
                    }
                  }}
                />
              </div>
            </div>
          );
        })()}
      </Match>

      {/* Branch 2b: direction=horizontal + no resizable zones (plain flex-row). */}
      <Match when={isHorizontal()}>
        <div class="relative h-full w-full overflow-hidden">
          <div class="absolute inset-0 flex flex-row overflow-hidden">
            <For each={effectiveRows()}>
              {(row, i) => {
                const rowKey = row.id ?? `r${i()}`;
                const getZoneFn = insertGetZone();
                const zone = getZoneFn && row.id ? getZoneFn(row.id) : undefined;
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
                      swapGetChildren(),
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
                      insertGridOpts(),
                      props.bordered,
                    )}
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Match>

      {/* Branch 3a: vertical resizable + no auto rows (single vertical Flex). */}
      <Match when={useVertical() && !hasAutoRows()}>
        {(() => {
          const rs = effectiveRows();
          const verticalItems = rowsToVerticalItems(
            rs,
            swapGetChildren(),
            swapBind,
            insertGetZone(),
            cellDndState,
            getSavedSizes('v'),
            getRowSavedSizes,
            onRowSizesChange,
            isDragging,
            props.resizeEnabled,
            props.dndEnabled,
            getCellSize,
            setCellSize,
            insertGridOpts(),
            props.bordered,
          );
          return (
            <div class="relative h-full w-full overflow-hidden">
              <div class="absolute inset-0">
                <Layout.Resizable
                  orientation="vertical"
                  items={verticalItems}
                  withHandle={props.resizeEnabled()}
                  handleDisabled={!props.resizeEnabled()}
                  onSizesChange={onVerticalSizesChange}
                />
              </div>
            </div>
          );
        })()}
      </Match>

      {/* Branch 3b: vertical resizable + mixed auto rows. */}
      <Match when={useVertical() && hasAutoRows()}>
        {(() => {
          const rs = effectiveRows();
          const resizableRows = rs.filter((r) => r.height !== 'auto');
          const verticalItems = rowsToVerticalItems(
            resizableRows,
            swapGetChildren(),
            swapBind,
            insertGetZone(),
            cellDndState,
            getSavedSizes('v'),
            getRowSavedSizes,
            onRowSizesChange,
            isDragging,
            props.resizeEnabled,
            props.dndEnabled,
            getCellSize,
            setCellSize,
            insertGridOpts(),
            props.bordered,
          );
          let resizableBlockEmitted = false;
          const elements: JSX.Element[] = rs.map((row, _i) => {
            if (row.height === 'auto') {
              const rowKey = row.id ?? `r${_i}`;
              const getZoneFn = insertGetZone();
              const zone = getZoneFn && row.id ? getZoneFn(row.id) : undefined;
              return (
                <div class="w-full shrink-0">
                  {renderRow(
                    row,
                    swapGetChildren(),
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
                    insertGridOpts(),
                    props.bordered,
                  )}
                </div>
              );
            }
            if (resizableBlockEmitted) return null;
            resizableBlockEmitted = true;
            return (
              <div class="relative min-h-0 flex-1 overflow-hidden">
                <div class="absolute inset-0">
                  <Layout.Resizable
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
        })()}
      </Match>

      {/* Branch 4 (default): plain vertical flex-col (no vertical resize). */}
      <Match when={true}>
        <div class="flex h-full w-full flex-col overflow-hidden">
          <For each={effectiveRows()}>
            {(row, i) => {
              const rowKey = row.id ?? `r${i()}`;
              const getZoneFn = insertGetZone();
              const zone = getZoneFn && row.id ? getZoneFn(row.id) : undefined;
              const rowsSnap = effectiveRows();
              if (row.height === 'auto' || (row.height === undefined && rowsSnap.length > 1)) {
                return (
                  <div class="w-full shrink-0">
                    {renderRow(
                      row,
                      swapGetChildren(),
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
                      insertGridOpts(),
                      props.bordered,
                    )}
                  </div>
                );
              }
              return renderRow(
                row,
                swapGetChildren(),
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
                insertGridOpts(),
                props.bordered,
              );
            }}
          </For>
        </div>
      </Match>
      </Switch>
    </MatrixPresetContext.Provider>
  );
};
