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
 * MUST be called inside DnDProvider tree (createSortableGroup calls useDnD).
 */
import { createSortableGroup, type ISortableZone } from '@capsuletech/web-dnd';
import { type Accessor, createEffect, createSignal } from 'solid-js';
import type { ICell, IRow, LayoutChangeEvent } from '../interfaces';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IInsertEngineOptions {
  rows: Accessor<IRow[]>;
  /** True when layoutMode === 'edit' && dndMode === 'insert'. */
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
 */
export const rowToAxis = (row: IRow): 'x' | 'y' | 'grid' => {
  if (row.orientation === 'vertical') return 'y';
  if (row.wrap) return 'grid';
  return 'x';
};

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

        // Remove the cell from its source position first.
        // Insert it at toIndex into the target zone's cell array.
        // This uniform rule is correct for both same-zone reorder and
        // cross-zone move (ADR 025 §«toIndex is computed against items EXCLUDING
        // the dragged cell»).
        const sourceCells = prev[srcRowIdx].cells.filter((_, i) => i !== srcCellIdx);
        const targetCellsBeforeInsert =
          srcRowIdx === tgtRowIdx ? sourceCells : prev[tgtRowIdx].cells;
        const newTargetCells = [
          ...targetCellsBeforeInsert.slice(0, toIndex),
          movedCell,
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
  // Public API
  // -------------------------------------------------------------------------

  const getZone = (rowId: string): ISortableZone | undefined => zoneMap.get(rowId);

  return { rows: localRows, getZone };
};
