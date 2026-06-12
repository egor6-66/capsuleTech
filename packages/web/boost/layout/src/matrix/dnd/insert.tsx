/**
 * createInsertEngine — insert-mode DnD engine for Matrix (ADR 025 Phase 2).
 *
 * Rebuilt on top of `createSortableGroup` from `@capsuletech/web-dnd`.
 * Architectural crux (ADR 025): items are draggable-only; the ONLY droppable
 * is the zone container. No nested droppables → no shadowing bug.
 * Insertion index is computed geometrically from rects snapshotted at
 * drag-start (resting positions).
 *
 * Mental model: rows-of-cells where cells can be reordered within a zone OR
 * moved across zones. Cell carries its own properties (width, tag, children)
 * with it. Layout structure (rows) stays stable — only cell membership mutates.
 *
 * ADR 026 Phase 2b extension: grid zones participate in the SAME sortable group.
 * When an item drops into a grid zone, `placeItem` / `moveItem` from web-dnd
 * grid math is used to assign {x,y,w,h} coordinates. Cross-zone rail↔grid
 * and grid↔rail transitions are handled here; within-grid moves use
 * `moveItem` with coordinates derived from the live pointer at drop time.
 *
 * MUST be called inside DnDProvider tree (createSortableGroup calls useDnD).
 */
import {
  createSortableGroup,
  type IGridLayout,
  type ISortableZone,
  moveItem,
  placeItem,
  pointToCell,
  resizeItem,
  useDnD,
} from '@capsuletech/web-dnd';
import { type Accessor, createEffect, createSignal } from 'solid-js';
import type { ICell, IRow, LayoutChangeEvent } from '../interfaces';

// ---------------------------------------------------------------------------
// Default grid dimensions (ADR 026)
//
// Granularity rationale: 24 cols × 20px row-height gives ~33px per col unit
// (at 800px container) and 20px per row unit. This is fine-grained enough
// that a small drag crosses at least one unit boundary — making resize and
// move feel smooth. The old defaults (12 / 64) gave ~80px / 64px units which
// caused "nothing changes" UX on short drags.
// ---------------------------------------------------------------------------

const DEFAULT_COLS = 24;
const DEFAULT_ROW_HEIGHT = 20;
const DEFAULT_COMPACT = 'none' as const;
const DEFAULT_GRID_W = 2;
const DEFAULT_GRID_H = 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IInsertEngineOptions {
  rows: Accessor<IRow[]>;
  /** True when dnd='insert' (or global dndMode enabled + kind='insert'). */
  enabled: Accessor<boolean>;
  onLayoutChange?: (e: LayoutChangeEvent) => void;
}

export interface IInsertEngine {
  /** Effective rows (mirrors props.rows, mutated on drops). */
  rows: Accessor<IRow[]>;
  /**
   * Returns the ISortableZone for a given rowId so the caller can wire
   * `zone.containerRef` to the zone container and call `zone.createItem(cellId)`
   * inside the <For> render scope of each cell.
   *
   * Calling createItem in render scope ties the draggable lifecycle to the DOM
   * element — no stale listeners after cross-zone moves.
   *
   * Returns undefined for rows without an id (not participating in DnD).
   */
  getZone: (rowId: string) => ISortableZone | undefined;
  /**
   * ADR 026: Registers the grid container HTMLElement for a given grid zone.
   * Called by the grid render-path so that `onDrop` can measure the container
   * rect + compute `pointToCell` at drop time.
   *
   * Returns undefined for non-grid zones (no-op safe to call always).
   */
  registerGridContainer: (rowId: string, el: HTMLElement | null) => void;
  /**
   * ADR 026: Called by the grid render-path during pointermove for a grid-cell
   * drag to commit an in-grid move immediately (on pointerup within the grid).
   * This updates localRows via moveItem so the preview cell materializes on drop.
   */
  commitGridMove: (rowId: string, cellId: string, pointer: { x: number; y: number }) => void;
  /**
   * ADR 026 Phase 2c: Called by the grid resize handle (SE/E/S) on each pointermove to
   * grow/shrink a cell's {w,h} in grid units. Neighbor cells are displaced by
   * resizeItem (the resized cell's x/y NEVER change — invariant). Updates only
   * the reactive coord signal (not localRows) so the cell DOM does not remount
   * mid-drag. Call `finalizeGridResize` on pointerup to persist to localRows.
   *
   * @param rowId  - id of the grid zone row
   * @param cellId - id of the cell being resized
   * @param size   - new {w, h} in grid units (floor 1 each)
   */
  commitGridResize: (rowId: string, cellId: string, size: { w: number; h: number }) => void;
  /**
   * ADR 026 Phase 2c: Called on pointerup after a resize drag completes.
   * Persists the live coord signal values back to localRows so cross-zone
   * DnD and onLayoutChange see the final layout. No-op if no live resize
   * is in progress for the given cell.
   *
   * @param rowId  - id of the grid zone row
   * @param cellId - id of the cell that was resized
   */
  finalizeGridResize: (rowId: string, cellId: string) => void;
  /**
   * ADR 026 Phase 2c: Reactive getter for the live grid coordinates of a cell
   * during a resize drag. Returns undefined when no live resize is in progress
   * (render path then falls back to cell.grid from localRows).
   *
   * Backed by a separate signal — updating it does NOT cause <For> to remount
   * the cell, enabling smooth live resize without DOM destruction.
   */
  getLiveGridCoords: (cellId: string) => { x: number; y: number; w: number; h: number } | undefined;
}

// ---------------------------------------------------------------------------
// accepts predicate helper (model-level, pure)
// ---------------------------------------------------------------------------

/**
 * Returns true if `targetRow` accepts a cell with the given `group`.
 * When `row.accepts` is undefined → accepts any group.
 * When `group` is undefined AND `row.accepts` is defined → rejected (no match).
 */
export const rowAcceptsGroup = (row: IRow, group: string | undefined): boolean => {
  if (!row.accepts || row.accepts.length === 0) return true;
  if (group === undefined) return false;
  return row.accepts.includes(group);
};

// ---------------------------------------------------------------------------
// wrap-fit helper (model-level, pure)
// ---------------------------------------------------------------------------

/**
 * Given a container width (px) and an array of cell minW values (px),
 * returns true when ALL cells fit on a single line (no wrap needed).
 * If no cell has minW, always returns true (no constraint).
 */
export const cellsFitOnOneLine = (containerWidth: number, minWidths: number[]): boolean => {
  if (minWidths.length === 0) return true;
  const total = minWidths.reduce((s, w) => s + w, 0);
  return total <= containerWidth;
};

// ---------------------------------------------------------------------------
// axis mapping helper (model-level, pure — exported for tests)
// ---------------------------------------------------------------------------

/**
 * Maps an IRow to the sortable zone axis.
 * - orientation:'vertical' → 'y'
 * - wrap:true (horizontal wrap grid) → 'grid'
 * - otherwise (flat horizontal row) → 'x'
 *
 * ADR 026: grid-canvas zones (row.grid present) use 'grid' axis so
 * cross-zone drops work via the sortable group's nearest-center logic.
 */
export const rowToAxis = (row: IRow): 'x' | 'y' | 'grid' => {
  if (row.grid) return 'grid';
  if (row.orientation === 'vertical') return 'y';
  if (row.wrap) return 'grid';
  return 'x';
};

// ---------------------------------------------------------------------------
// Grid layout helpers (model-level, pure — for testability)
// ---------------------------------------------------------------------------

/**
 * Extract the current IGridLayout from the cells of a grid-zone row.
 * Only cells that have a `grid` coordinate are included.
 */
export const rowToGridLayout = (row: IRow): IGridLayout =>
  row.cells
    .filter((c): c is ICell & { grid: NonNullable<ICell['grid']> } => c.grid !== undefined)
    .map((c) => ({ id: c.id, x: c.grid.x, y: c.grid.y, w: c.grid.w, h: c.grid.h }));

/**
 * Apply a new IGridLayout back onto the cells of a grid-zone row.
 * Cells absent from the layout (no grid coords) are left unchanged.
 */
export const applyGridLayout = (row: IRow, layout: IGridLayout): IRow => ({
  ...row,
  cells: row.cells.map((cell) => {
    const item = layout.find((l) => l.id === cell.id);
    if (!item) return cell;
    return { ...cell, grid: { x: item.x, y: item.y, w: item.w, h: item.h } };
  }),
});

// ---------------------------------------------------------------------------
// createInsertEngine
// ---------------------------------------------------------------------------

export const createInsertEngine = (opts: IInsertEngineOptions): IInsertEngine => {
  // -------------------------------------------------------------------------
  // Local rows state (mutable)
  // -------------------------------------------------------------------------

  const [localRows, setLocalRows] = createSignal<IRow[]>(opts.rows());

  // When parent passes new rows (e.g. preset re-resolves), reset.
  // This loses any pending insert state — acceptable v1 simplification
  // (see ADR 016 «не делаем сейчас» — controlled mutable layout = future).
  createEffect(() => {
    setLocalRows(opts.rows());
  });

  // -------------------------------------------------------------------------
  // ADR 026: Per-grid-zone container element registry.
  // Keyed by rowId. Used at drop time to call getBoundingClientRect + pointToCell.
  // -------------------------------------------------------------------------

  const gridContainerEls = new Map<string, HTMLElement | null>();

  const registerGridContainer = (rowId: string, el: HTMLElement | null): void => {
    gridContainerEls.set(rowId, el);
  };

  // -------------------------------------------------------------------------
  // ADR 026 Phase 2c: Live grid-coord signal for smooth resize.
  //
  // During a resize drag, commitGridResize writes the running cell coords into
  // this Map signal INSTEAD of mutating localRows. The render path reads coords
  // via getLiveGridCoords() which is reactive to this signal — so grid-column /
  // grid-row styles update every pointermove frame without triggering a <For>
  // reconcile (no cell remount, no stale listener detach).
  //
  // On pointerup, finalizeGridResize() reads the accumulated final layout from
  // the live state (re-running resizeItem against current localRows) and commits
  // it to localRows once, then clears the live entries for those cells.
  //
  // Neighbor cells that were displaced during live preview are also tracked in
  // liveGridCoords so their styles update reactively too.
  // -------------------------------------------------------------------------

  type GridCoord = { x: number; y: number; w: number; h: number };
  const [liveGridCoords, setLiveGridCoords] = createSignal<Map<string, GridCoord>>(new Map(), {
    equals: false,
  });

  const getLiveGridCoords = (cellId: string): GridCoord | undefined => liveGridCoords().get(cellId);

  // -------------------------------------------------------------------------
  // useDnD — accessed here (inside DnDProvider) to read live pointer at drop time.
  // -------------------------------------------------------------------------

  const dnd = useDnD();

  // -------------------------------------------------------------------------
  // createSortableGroup — one group per Matrix instance (ADR 025).
  // -------------------------------------------------------------------------

  const group = createSortableGroup({ id: 'matrix-insert' });

  // -------------------------------------------------------------------------
  // Per-zone map — keyed by rowId, zones created once at construction time.
  //
  // The zone's items() accessor reads localRows() reactively so it always
  // reflects the current cell order regardless of cross-zone moves.
  //
  // Cell bindings (createItem) are NOT called here. They are called by the
  // consumer (matrix.tsx) inside the <For each={row.cells}> render scope so
  // that each cell's draggable lifecycle is tied to its DOM element's lifetime.
  // When <For> unmounts a cell (cross-zone move), onCleanup fires in createItem.
  // When <For> mounts the cell in the new zone, a fresh createItem call in the
  // new render scope registers it anew. This is the correct Solid lifecycle
  // pattern — no stale listeners after reorder or cross-zone move.
  // -------------------------------------------------------------------------

  const zoneMap = new Map<string, ISortableZone>();

  const rowsSnapshot = opts.rows();
  for (const row of rowsSnapshot) {
    if (!row.id) continue;
    const rowId = row.id;
    const isGridZone = !!row.grid;

    const zone = group.createZone({
      id: rowId,
      axis: rowToAxis(row),
      items: () =>
        localRows()
          .find((r) => r.id === rowId)
          ?.cells.map((c) => c.id) ?? [],
      accepts: (itemId, _data) => {
        if (!opts.enabled()) return false;
        // Find the cell in current localRows to get its group.
        const rows = localRows();
        for (const r of rows) {
          const cell = r.cells.find((c) => c.id === itemId);
          if (cell) {
            const targetRow = rows.find((r2) => r2.id === rowId);
            if (!targetRow) return false;
            return rowAcceptsGroup(targetRow, cell.group);
          }
        }
        return false;
      },
      onDrop: (e) => {
        const { itemId, fromZone, toZone, toIndex } = e;
        const prev = localRows();

        // Find source row index and cell
        const srcRowIdx = prev.findIndex((r) => r.id === fromZone);
        if (srcRowIdx === -1) return;
        const srcCellIdx = prev[srcRowIdx].cells.findIndex((c) => c.id === itemId);
        if (srcCellIdx === -1) return;
        const movedCell = prev[srcRowIdx].cells[srcCellIdx];

        // Find target row index
        const tgtRowIdx = prev.findIndex((r) => r.id === toZone);
        if (tgtRowIdx === -1) return;

        const tgtRow = prev[tgtRowIdx];

        // -----------------------------------------------------------------------
        // ADR 026 — Grid zone drop handling
        // -----------------------------------------------------------------------
        if (isGridZone) {
          const cols = tgtRow.grid?.cols ?? DEFAULT_COLS;
          const rowHeight = tgtRow.grid?.rowHeight ?? DEFAULT_ROW_HEIGHT;
          const compact = tgtRow.grid?.compact ?? DEFAULT_COMPACT;

          // Compute target grid cell from live pointer + container rect.
          // At drop time the pointer signal is still populated (it clears after).
          const pointer = dnd.state.pointer();
          const containerEl = gridContainerEls.get(toZone) ?? null;

          let targetCell = { x: 0, y: 0 };
          if (pointer && containerEl) {
            const rect = containerEl.getBoundingClientRect();
            targetCell = pointToCell(pointer, rect, cols, rowHeight);
          }

          // Build current grid layout (cells already in the grid zone)
          const sourceCells = prev[srcRowIdx].cells.filter((_, i) => i !== srcCellIdx);

          const isWithinGrid = srcRowIdx === tgtRowIdx;

          if (isWithinGrid && movedCell.grid) {
            // ---------------------------------------------------------------
            // Within-grid move: use moveItem to displace neighbors.
            // ---------------------------------------------------------------
            const currentLayout = rowToGridLayout(tgtRow);
            const newLayout = moveItem(currentLayout, itemId, targetCell, cols, compact);
            const updatedTgtRow = applyGridLayout(tgtRow, newLayout);

            setLocalRows((rs) => rs.map((r, i) => (i === tgtRowIdx ? updatedTgtRow : r)));

            // Find the moved item's new coords for the event
            const newItem = newLayout.find((l) => l.id === itemId);
            if (newItem) {
              opts.onLayoutChange?.({
                kind: 'grid',
                id: itemId,
                zone: toZone,
                x: newItem.x,
                y: newItem.y,
                w: newItem.w,
                h: newItem.h,
              });
            }
            return;
          }

          // ---------------------------------------------------------------
          // Cross-zone → grid: materialize the cell (rail→grid).
          // Use placeItem with defaultGrid size (or fallback).
          // Strip the cell's grid coords if it had any (shouldn't, but safe).
          // ---------------------------------------------------------------
          const defaultW = movedCell.defaultGrid?.w ?? DEFAULT_GRID_W;
          const defaultH = movedCell.defaultGrid?.h ?? DEFAULT_GRID_H;

          const incomingItem = {
            id: itemId,
            x: targetCell.x,
            y: targetCell.y,
            w: defaultW,
            h: defaultH,
          };

          // Current grid layout = existing grid-zone cells (excluding the incoming cell if it was already there)
          const existingGridCells = isWithinGrid ? sourceCells : prev[tgtRowIdx].cells;
          const currentLayout: IGridLayout = existingGridCells
            .filter((c): c is ICell & { grid: NonNullable<ICell['grid']> } => c.grid !== undefined)
            .map((c) => ({ id: c.id, x: c.grid.x, y: c.grid.y, w: c.grid.w, h: c.grid.h }));

          const newLayout = placeItem(currentLayout, incomingItem, cols, compact);

          // Reassign grid coords from layout back to cells
          const materializedCell: ICell = {
            ...movedCell,
            grid: {
              x: targetCell.x,
              y: targetCell.y,
              w: defaultW,
              h: defaultH,
            },
          };

          // Target cells = existing grid cells + materialized cell, with updated coords
          const baseCells = isWithinGrid ? sourceCells : prev[tgtRowIdx].cells;
          const updatedCells = [
            ...baseCells.map((cell) => {
              const item = newLayout.find((l) => l.id === cell.id);
              if (!item) return cell;
              return { ...cell, grid: { x: item.x, y: item.y, w: item.w, h: item.h } };
            }),
            materializedCell,
          ];

          // Find the materialized item's final coords in the layout
          const finalItem = newLayout.find((l) => l.id === itemId) ?? incomingItem;

          setLocalRows((rs) =>
            rs.map((r, i) => {
              if (i === srcRowIdx && i === tgtRowIdx) {
                return { ...r, cells: updatedCells };
              }
              if (i === srcRowIdx) {
                return { ...r, cells: sourceCells };
              }
              if (i === tgtRowIdx) {
                return { ...r, cells: updatedCells };
              }
              return r;
            }),
          );

          opts.onLayoutChange?.({
            kind: 'grid',
            id: itemId,
            zone: toZone,
            x: finalItem.x,
            y: finalItem.y,
            w: finalItem.w,
            h: finalItem.h,
          });
          return;
        }

        // -----------------------------------------------------------------------
        // Flow-zone drop handling (unchanged from ADR 025, + grid→rail cleanup)
        // -----------------------------------------------------------------------

        // Remove the cell from its source position first.
        // If the cell was in a grid zone, strip its grid coords (it's now in a flow zone).
        const cellToInsert: ICell = movedCell.grid ? { ...movedCell, grid: undefined } : movedCell;

        const sourceCells = prev[srcRowIdx].cells.filter((_, i) => i !== srcCellIdx);
        const targetCellsBeforeInsert =
          srcRowIdx === tgtRowIdx ? sourceCells : prev[tgtRowIdx].cells;
        const newTargetCells = [
          ...targetCellsBeforeInsert.slice(0, toIndex),
          cellToInsert,
          ...targetCellsBeforeInsert.slice(toIndex),
        ];

        setLocalRows((rs) =>
          rs.map((r, i) => {
            if (i === srcRowIdx && i === tgtRowIdx) {
              // Same-zone reorder
              return { ...r, cells: newTargetCells };
            }
            if (i === srcRowIdx) {
              return { ...r, cells: sourceCells };
            }
            if (i === tgtRowIdx) {
              return { ...r, cells: newTargetCells };
            }
            return r;
          }),
        );

        opts.onLayoutChange?.({
          kind: 'insert',
          id: itemId,
          toRow: tgtRowIdx,
          toIndex,
        });
      },
    });

    zoneMap.set(rowId, zone);
  }

  // -------------------------------------------------------------------------
  // commitGridMove — called by render layer during pointermove for within-grid drags.
  // This allows the render layer to show a live preview and commit on pointer-up.
  // Since createSortableGroup handles the actual onDrop, this is an alternative
  // path for "pre-commit" preview updates in the grid.
  //
  // NOTE: In Phase 2b we keep this simple — the real commit happens in onDrop
  // above via pointToCell at drop time. commitGridMove is exposed for the render
  // layer to implement a live preview (ghost cell) without mutating localRows.
  // Phase 2c (resize) will extend this.
  // -------------------------------------------------------------------------

  const commitGridMove = (
    rowId: string,
    cellId: string,
    pointer: { x: number; y: number },
  ): void => {
    const prev = localRows();
    const rowIdx = prev.findIndex((r) => r.id === rowId);
    if (rowIdx === -1) return;
    const row = prev[rowIdx];
    if (!row.grid) return;

    const cols = row.grid.cols ?? DEFAULT_COLS;
    const rowHeight = row.grid.rowHeight ?? DEFAULT_ROW_HEIGHT;
    const compact = row.grid.compact ?? DEFAULT_COMPACT;

    const containerEl = gridContainerEls.get(rowId) ?? null;
    if (!containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    const targetCell = pointToCell(pointer, rect, cols, rowHeight);

    const currentLayout = rowToGridLayout(row);
    const newLayout = moveItem(currentLayout, cellId, targetCell, cols, compact);
    const updatedRow = applyGridLayout(row, newLayout);

    setLocalRows((rs) => rs.map((r, i) => (i === rowIdx ? updatedRow : r)));

    const newItem = newLayout.find((l) => l.id === cellId);
    if (newItem) {
      opts.onLayoutChange?.({
        kind: 'grid',
        id: cellId,
        zone: rowId,
        x: newItem.x,
        y: newItem.y,
        w: newItem.w,
        h: newItem.h,
      });
    }
  };

  // -------------------------------------------------------------------------
  // commitGridResize — ADR 026 Phase 2c.
  // Called by the grid resize handle (SE/E/S) on each pointermove.
  // resizeItem NEVER changes x/y of the resized cell — only w/h grow.
  // Displaced neighbors are pushed downward (compact:'none' default).
  //
  // SMOOTH RESIZE: updates liveGridCoords signal (not localRows) on each frame
  // so only the cell's CSS style changes reactively — no <For> remount, no stale
  // pointermove listener detachment. finalizeGridResize() persists to localRows
  // on pointerup.
  // -------------------------------------------------------------------------

  const commitGridResize = (
    rowId: string,
    cellId: string,
    size: { w: number; h: number },
  ): void => {
    const prev = localRows();
    const rowIdx = prev.findIndex((r) => r.id === rowId);
    if (rowIdx === -1) return;
    const row = prev[rowIdx];
    if (!row.grid) return;

    const cols = row.grid.cols ?? DEFAULT_COLS;
    const compact = row.grid.compact ?? DEFAULT_COMPACT;

    // Use liveGridCoords as the base layout during a drag so neighbors reflect
    // the accumulated live state (not the stale localRows snapshot).
    const baseLayout = rowToGridLayout(row).map((item) => {
      const live = liveGridCoords().get(item.id);
      return live ? { ...item, ...live } : item;
    });

    const newLayout = resizeItem(baseLayout, cellId, size, cols, compact);

    // Write all changed coords into the live signal. The render path reads from
    // liveGridCoords reactively, so grid-column/grid-row styles update immediately
    // without touching localRows (prevents <For> from seeing new cell object
    // references and remounting the cell DOM).
    setLiveGridCoords((prev) => {
      const next = new Map(prev);
      for (const item of newLayout) {
        next.set(item.id, { x: item.x, y: item.y, w: item.w, h: item.h });
      }
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // finalizeGridResize — ADR 026 Phase 2c.
  // Called on pointerup to commit live coords to localRows and fire onLayoutChange.
  // Clears liveGridCoords entries for all cells in the affected row.
  // -------------------------------------------------------------------------

  const finalizeGridResize = (rowId: string, cellId: string): void => {
    const prev = localRows();
    const rowIdx = prev.findIndex((r) => r.id === rowId);
    if (rowIdx === -1) return;
    const row = prev[rowIdx];
    if (!row.grid) return;

    const live = liveGridCoords();
    // Check if any live coords exist for cells in this row
    const haslive = row.cells.some((c) => live.has(c.id));
    if (!haslive) return;

    const cols = row.grid.cols ?? DEFAULT_COLS;
    const compact = row.grid.compact ?? DEFAULT_COMPACT;

    // Re-run resizeItem on localRows base to produce the canonical final layout.
    // This ensures the committed layout is consistent (not accumulating live drift).
    const liveCoord = live.get(cellId);
    if (!liveCoord) return;

    const currentLayout = rowToGridLayout(row);
    const newLayout = resizeItem(
      currentLayout,
      cellId,
      { w: liveCoord.w, h: liveCoord.h },
      cols,
      compact,
    );
    const updatedRow = applyGridLayout(row, newLayout);

    setLocalRows((rs) => rs.map((r, i) => (i === rowIdx ? updatedRow : r)));

    // Clear live coords for this row's cells
    setLiveGridCoords((prev) => {
      const next = new Map(prev);
      for (const cell of row.cells) next.delete(cell.id);
      return next;
    });

    const newItem = newLayout.find((l) => l.id === cellId);
    if (newItem) {
      opts.onLayoutChange?.({
        kind: 'grid',
        id: cellId,
        zone: rowId,
        x: newItem.x,
        y: newItem.y,
        w: newItem.w,
        h: newItem.h,
      });
    }
  };

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const getZone = (rowId: string): ISortableZone | undefined => zoneMap.get(rowId);

  return {
    rows: localRows,
    getZone,
    registerGridContainer,
    commitGridMove,
    commitGridResize,
    finalizeGridResize,
    getLiveGridCoords,
  };
};
