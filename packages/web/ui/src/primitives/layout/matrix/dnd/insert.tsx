/**
 * createInsertEngine — insert-mode DnD engine for Matrix (Phase 1.3).
 *
 * Mental model: rows-of-cells where cells can be reordered within a row OR
 * moved across rows. Cell carries its own properties (width, tag, children)
 * with it. Layout structure (rows) stays stable — only the cell membership
 * within each row mutates.
 *
 * Implementation:
 * - Local `localRows` signal tracks the effective layout state.
 * - Each row gets a `createSortable` (web-dnd) for in-row reorder.
 * - Each row also gets a `createDroppable` whose `accepts` predicate
 *   allows items from OTHER sortables (cross-row insert).
 * - Bindings snapshot rows once at construction (same simplification as
 *   swap engine; rows changes via parent unmount/remount).
 *
 * MUST be called inside DnDProvider tree (createSortable / createDroppable
 * call useDnD internally).
 */
import { createDroppable, createSortable, type IDroppable } from '@capsuletech/web-dnd';
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
   * Bind drag+drop ref to a cell element.
   * Signature matches swap engine: `(cell, rowId)` (rowId currently unused
   * here, since createSortable already knows the row from createItem).
   */
  bindCell: (cell: ICell, rowId?: string) => (el: HTMLElement) => void;
  /** Bind cross-row drop target ref to a row element. */
  bindRow: (rowId: string) => (el: HTMLElement) => void;
}

const NOOP_REF = (_el: HTMLElement): void => {};

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
  // Helpers
  // -------------------------------------------------------------------------

  const findCell = (cellId: string, rows: IRow[]): { rIdx: number; cIdx: number } | null => {
    for (let r = 0; r < rows.length; r++) {
      const c = rows[r].cells.findIndex((cell) => cell.id === cellId);
      if (c !== -1) return { rIdx: r, cIdx: c };
    }
    return null;
  };

  // -------------------------------------------------------------------------
  // In-row reorder handler (called from createSortable.onReorder)
  // -------------------------------------------------------------------------

  const handleInRowReorder = (rowId: string, newOrder: string[]): void => {
    const prev = localRows();
    const rIdx = prev.findIndex((r) => r.id === rowId);
    if (rIdx === -1) return;

    const oldOrder = prev[rIdx].cells.map((c) => c.id);
    if (oldOrder.length !== newOrder.length) return;
    if (oldOrder.every((id, i) => id === newOrder[i])) return; // no-op

    // Find the moved item (first index where order differs).
    const movedId = newOrder.find((id, i) => oldOrder[i] !== id);
    if (movedId === undefined) return;

    const newCells = newOrder
      .map((id) => prev[rIdx].cells.find((c) => c.id === id))
      .filter((c): c is ICell => c !== undefined);

    setLocalRows((rs) => rs.map((r, i) => (i === rIdx ? { ...r, cells: newCells } : r)));

    const newIdx = newOrder.indexOf(movedId);
    opts.onLayoutChange?.({ kind: 'insert', id: movedId, toRow: rIdx, toIndex: newIdx });
  };

  // -------------------------------------------------------------------------
  // Cross-row drop handler (called from row-level createDroppable.onDrop)
  // -------------------------------------------------------------------------

  const handleCrossRowDrop = (cellId: string, targetRowId: string, ratioY: number): void => {
    const prev = localRows();
    const src = findCell(cellId, prev);
    if (!src) return;
    const targetRowIdx = prev.findIndex((r) => r.id === targetRowId);
    if (targetRowIdx === -1 || src.rIdx === targetRowIdx) return;

    const movedCell = prev[src.rIdx].cells[src.cIdx];
    const sourceCells = prev[src.rIdx].cells.filter((_, i) => i !== src.cIdx);
    const targetCells = prev[targetRowIdx].cells;
    // Insert position: top half → beginning, bottom half → end.
    // Proportional insert (`Math.round(ratioY * targetCells.length)`) would
    // be a finer UX, but row geometry varies — top/end is more predictable.
    const insertIdx = ratioY < 0.5 ? 0 : targetCells.length;
    const newTargetCells = [
      ...targetCells.slice(0, insertIdx),
      movedCell,
      ...targetCells.slice(insertIdx),
    ];

    setLocalRows((rs) =>
      rs.map((r, i) => {
        if (i === src.rIdx) return { ...r, cells: sourceCells };
        if (i === targetRowIdx) return { ...r, cells: newTargetCells };
        return r;
      }),
    );
    opts.onLayoutChange?.({
      kind: 'insert',
      id: cellId,
      toRow: targetRowIdx,
      toIndex: insertIdx,
    });
  };

  // -------------------------------------------------------------------------
  // Per-row sortable + droppable bindings — snapshot at construction.
  //
  // createSortable / createDroppable use createMemo / createEffect internally
  // and must run at component construction time (inside a Solid root with an
  // active owner). We snapshot rows() once and never re-bind. Adding cells
  // dynamically without unmounting Matrix is unsupported in v1.
  // -------------------------------------------------------------------------

  // For each row.id, store a per-cell ref-factory from createSortable.
  const cellRefMap = new Map<string, (el: HTMLElement) => void>();
  const rowDropMap = new Map<string, IDroppable>();

  const rowsSnapshot = opts.rows();

  for (const row of rowsSnapshot) {
    if (!row.id) continue; // rows without id can't participate in insert mode
    const rowId = row.id;

    // Per-row sortable — handles in-row reorder.
    const sortable = createSortable({
      id: rowId,
      items: () =>
        localRows()
          .find((r) => r.id === rowId)
          ?.cells.map((c) => c.id) ?? [],
      onReorder: (newOrder) => handleInRowReorder(rowId, newOrder),
    });

    for (const cell of row.cells) {
      if (cell.draggable) {
        const item = sortable.createItem(cell.id);
        cellRefMap.set(cell.id, item.ref);
      }
    }

    // Per-row droppable — handles cross-row insert.
    const rowDrop = createDroppable({
      id: `insert-row:${rowId}`,
      accepts: (data) => {
        const d = data as { __sortable?: string; itemId?: string };
        return (
          opts.enabled() &&
          typeof d.__sortable === 'string' &&
          d.__sortable !== rowId &&
          typeof d.itemId === 'string'
        );
      },
      onDrop: (data, info) => {
        const d = data as { itemId?: string };
        if (typeof d.itemId === 'string') {
          handleCrossRowDrop(d.itemId, rowId, info.ratio.y);
        }
      },
      disabled: () => !opts.enabled(),
    });
    rowDropMap.set(rowId, rowDrop);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const bindCell = (cell: ICell, _rowId?: string): ((el: HTMLElement) => void) => {
    if (!cell.draggable) return NOOP_REF;
    return cellRefMap.get(cell.id) ?? NOOP_REF;
  };

  const bindRow = (rowId: string): ((el: HTMLElement) => void) => {
    const drop = rowDropMap.get(rowId);
    return drop?.ref ?? NOOP_REF;
  };

  return { rows: localRows, bindCell, bindRow };
};
