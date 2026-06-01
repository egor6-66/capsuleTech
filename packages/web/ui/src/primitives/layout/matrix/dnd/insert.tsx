/**
 * createInsertEngine — insert-mode DnD engine for Matrix (Phase 1.3 / ADR 022).
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
 * - Cell bindings (createItem) are called IN THE RENDER SCOPE of each <For>
 *   item in matrix.tsx, NOT in an engine effect. This ties each cell's
 *   draggable/droppable lifecycle to the DOM element's lifetime — when Solid's
 *   <For> unmounts a cell (cross-row move), onCleanup fires; when it mounts
 *   the cell in the new row, a fresh createItem runs. No stale listeners.
 *
 * ADR 022 additions:
 * - `accepts`/`group` constraint: cross-row drop accepted only when the
 *   target row's `accepts` array contains `cell.group` (or `accepts` is
 *   undefined). Rejected drops emit a `cannot-drop` highlight signal.
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
  /**
   * Matrix-level outer axis (ADR 022 `direction` prop).
   *
   * - `'vertical'` (default): rows are stacked top→bottom. Cross-zone drop
   *   insert position is determined by `ratio.y` (top half → start, bottom
   *   half → end of zone).
   * - `'horizontal'`: zones are placed left→right. Cross-zone drop insert
   *   position is determined by `ratio.x` (left half → start, right half
   *   → end of zone), which is geometrically correct when the droppable
   *   container is a column.
   */
  direction?: 'vertical' | 'horizontal';
}

export interface IInsertEngine {
  /** Effective rows (mirrors props.rows, mutated on drops). */
  rows: Accessor<IRow[]>;
  /**
   * Returns the stable sortable for a given rowId so the caller can invoke
   * `getSortable(rowId)?.createItem(cellId)` inside the <For> render scope
   * of each cell. Calling createItem in render scope ties the draggable
   * lifecycle to the DOM element — no stale listeners after cross-row moves.
   *
   * Returns undefined for rows without an id (not participanting in DnD).
   */
  getSortable: (rowId: string) => ReturnType<typeof createSortable> | undefined;
  /** Bind cross-row drop target ref to a row element. */
  bindRow: (rowId: string) => (el: HTMLElement) => void;
}

const NOOP_REF = (_el: HTMLElement): void => {};

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

  const handleCrossRowDrop = (
    cellId: string,
    targetRowId: string,
    ratioY: number,
    ratioX: number,
  ): void => {
    const prev = localRows();
    const src = findCell(cellId, prev);
    if (!src) return;
    const targetRowIdx = prev.findIndex((r) => r.id === targetRowId);
    if (targetRowIdx === -1 || src.rIdx === targetRowIdx) return;

    const movedCell = prev[src.rIdx].cells[src.cIdx];

    // ADR 022: accepts-constraint check before mutating state.
    const targetRow = prev[targetRowIdx];
    if (!rowAcceptsGroup(targetRow, movedCell.group)) {
      // Drop rejected — state unchanged, highlight handled by rowRejectsDrag.
      return;
    }

    const sourceCells = prev[src.rIdx].cells.filter((_, i) => i !== src.cIdx);
    const targetCells = prev[targetRowIdx].cells;
    // Insert position depends on the Matrix outer axis (direction):
    //   vertical   → ratio.y determines top-half (→ start) vs bottom-half (→ end)
    //   horizontal → ratio.x determines left-half (→ start) vs right-half (→ end)
    // This is geometrically correct: in horizontal mode zones are columns, so
    // "top vs bottom" within a column maps to left vs right at the Matrix level.
    const splitRatio = opts.direction === 'horizontal' ? ratioX : ratioY;
    const insertIdx = splitRatio < 0.5 ? 0 : targetCells.length;
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
  // Per-row sortable + droppable bindings.
  //
  // One stable sortable and one stable droppable per rowId, created once at
  // engine construction time. The sortable's items() accessor reads
  // localRows() reactively so it always reflects the current cell order
  // regardless of cross-row moves — no rebuild needed.
  //
  // Cell bindings (createItem) are NOT called here. They are called by the
  // consumer (matrix.tsx) inside the <For each={row.cells}> render scope so
  // that each cell's draggable/droppable lifecycle is tied to its DOM
  // element. When <For> unmounts a cell (cross-row move), onCleanup fires
  // and removes the pointerdown listener + unregisters the draggable.
  // When <For> mounts the cell in the new row, a fresh createItem call in
  // the new render scope registers it anew. This is the correct Solid
  // lifecycle pattern — no stale listeners after reorder or cross-row move.
  //
  // New rows dynamically added without a Matrix remount are still not
  // supported (same as v1).
  // -------------------------------------------------------------------------

  // Stable per-row sortables (keyed by rowId, created once).
  const sortableMap = new Map<string, ReturnType<typeof createSortable>>();
  // Stable per-row droppables for cross-row insert.
  const rowDropMap = new Map<string, IDroppable>();

  const rowsSnapshot = opts.rows();

  for (const row of rowsSnapshot) {
    if (!row.id) continue;
    const rowId = row.id;

    const sortable = createSortable({
      id: rowId,
      items: () =>
        localRows()
          .find((r) => r.id === rowId)
          ?.cells.map((c) => c.id) ?? [],
      onReorder: (newOrder) => handleInRowReorder(rowId, newOrder),
    });
    sortableMap.set(rowId, sortable);

    const rowDrop = createDroppable({
      id: `insert-row:${rowId}`,
      accepts: (data) => {
        const d = data as { __sortable?: string; itemId?: string };
        if (!opts.enabled()) return false;
        if (typeof d.__sortable !== 'string' || d.__sortable === rowId) return false;
        if (typeof d.itemId !== 'string') return false;
        // ADR 022: accepts-constraint check.
        // Find the cell in current localRows to get its group.
        const cellId = d.itemId;
        const rows = localRows();
        const found = findCell(cellId, rows);
        if (!found) return false;
        const movedCell = rows[found.rIdx].cells[found.cIdx];
        const targetRow = rows.find((r) => r.id === rowId);
        if (!targetRow) return false;
        return rowAcceptsGroup(targetRow, movedCell.group);
      },
      onDrop: (data, info) => {
        const d = data as { itemId?: string };
        if (typeof d.itemId === 'string') {
          handleCrossRowDrop(d.itemId, rowId, info.ratio.y, info.ratio.x);
        }
      },
      disabled: () => !opts.enabled(),
    });
    rowDropMap.set(rowId, rowDrop);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const getSortable = (rowId: string): ReturnType<typeof createSortable> | undefined =>
    sortableMap.get(rowId);

  const bindRow = (rowId: string): ((el: HTMLElement) => void) => {
    const drop = rowDropMap.get(rowId);
    return drop?.ref ?? NOOP_REF;
  };

  return { rows: localRows, getSortable, bindRow };
};
