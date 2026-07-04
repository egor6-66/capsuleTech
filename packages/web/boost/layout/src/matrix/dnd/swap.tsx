/**
 * createSwapEngine — swap-mode DnD engine for Matrix.
 *
 * MUST be called at component construction time (inside a Solid component
 * function body) because createDraggable / createDroppable call createMemo /
 * createEffect internally — these require an active reactive owner.
 *
 * v2 badge-UX changes:
 * - Drag is triggered ONLY via DragBadge (pointerdown on badge → dnd.startDrag).
 * - Cell element is registered as draggable but with disabled=true so the cell
 *   surface itself does not start a drag.
 * - Drop targets show a ring highlight when a drag is active and the cell is a
 *   valid target (isOver + canDrop).
 *
 * v3 per-cell enable resolution (2026-07-04):
 * - The engine no longer takes a single matrix-wide `enabled` accessor. The
 *   caller passes `isCellEnabled(cell)` — a reactive resolver encoding the
 *   full precedence chain: explicit `cell.draggable` > `mode` prop > global
 *   `useDndMode()` signal (+ kind === 'swap' gating).
 * - Badge visibility is per-cell and group-aware (`getShowBadge`): a badge
 *   shows only when the cell is enabled AND at least one other enabled cell
 *   shares its swapGroup. Previously the 2+ threshold counted ALL draggable
 *   cells across groups — a cell could start a drag that no target could
 *   ever accept (drag-without-drop bug, learn app-shell pages 2026-07-04).
 */

import type { IDraggable, IDroppable } from '@capsuletech/web-dnd';
import { createDraggable, createDroppable, useDnD } from '@capsuletech/web-dnd';
import { type Accessor, createEffect, createMemo, createSignal, type JSX } from 'solid-js';
import type { ICell, IRow, LayoutChangeEvent } from '../interfaces';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ISwapEngineOptions {
  rows: Accessor<IRow[]>;
  /**
   * Reactive per-cell resolver: is swap-DnD active for this cell right now.
   *
   * Encodes the full precedence chain (highest → lowest):
   *   1. explicit `cell.draggable` (true → always on, false → always off),
   *   2. matrix `mode` prop ('view' → off, 'edit' → on),
   *   3. global `useDndMode()` signal,
   * plus the `dndKind() === 'swap'` gate. Must read signals at call time
   * (called inside memos) — do not snapshot.
   */
  isCellEnabled: (cell: ICell) => boolean;
  onLayoutChange?: (e: LayoutChangeEvent) => void;
}

export interface ISwapEngine {
  /** Reactive getter of children for a given cellId (reflects swap state). */
  getCellChildren: (cellId: string) => JSX.Element;
  /**
   * Returns a ref callback for the cell element — registers it as a draggable
   * source + droppable target. The cell element itself does NOT trigger drag
   * (disabled=true); drag starts from the DragBadge via dnd.startDrag.
   */
  bindCell: (cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void;
  /**
   * Returns reactive drop-highlight state for a cell.
   * `isOver`    — pointer is over this cell during an active drag.
   * `canDrop`   — isOver && this cell accepts the active drag payload.
   * `canAccept` — a drag is active AND this cell would accept the active payload
   *               (regardless of whether the pointer is currently over it).
   *               Used for the "soft highlight all accepting targets" UX.
   */
  getCellDropState: (cellId: string) => {
    isOver: Accessor<boolean>;
    canDrop: Accessor<boolean>;
    canAccept: Accessor<boolean>;
  };
  /** Draggable id string for a given cellId — used by DragBadge. */
  getDraggableId: (cellId: string) => string;
  /**
   * Reactive per-cell badge visibility: cell is enabled AND at least one other
   * enabled cell shares its swapGroup (i.e. a valid drop target exists).
   * MUST be an accessor — badge mount/unmount on toggle is a local <Show>
   * flip inside renderCell, not a cell re-render (toggle-stability contract).
   */
  getShowBadge: (cellId: string) => Accessor<boolean>;
  /** Number of structurally-draggable cells registered (diagnostics). */
  draggableCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolves the swapGroup for a cell. */
const resolveGroup = (cell: ICell, rowId: string | undefined): string =>
  cell.swapGroup ?? rowId ?? cell.id;

interface ICellEntry {
  cell: ICell;
  rowId: string | undefined;
}

/** Flat list of all draggable cells from rows snapshot. */
const flatDraggableCells = (rows: IRow[]): ICellEntry[] => {
  const result: ICellEntry[] = [];
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.draggable !== false) {
        result.push({ cell, rowId: row.id });
      }
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// createSwapEngine
// ---------------------------------------------------------------------------

export const createSwapEngine = (opts: ISwapEngineOptions): ISwapEngine => {
  // -------------------------------------------------------------------------
  // DnD context — gives us access to activeData for canAccept computation.
  // Safe to call here because createSwapEngine is always invoked inside
  // MatrixContent (a Solid component body with DnDProvider as ancestor).
  // -------------------------------------------------------------------------
  const dnd = useDnD();

  // -------------------------------------------------------------------------
  // Children map
  // -------------------------------------------------------------------------

  const buildInitialMap = (rows: IRow[]): Record<string, JSX.Element> => {
    const map: Record<string, JSX.Element> = {};
    for (const row of rows) {
      for (const cell of row.cells) {
        map[cell.id] = cell.children;
      }
    }
    return map;
  };

  const [childrenMap, setChildrenMap] = createSignal<Record<string, JSX.Element>>(
    buildInitialMap(opts.rows()),
  );

  // Re-build map when rows change. Intentionally resets swap state.
  // ADR 016: "if parent re-creates rows with same ids — swap state is lost. OK for v1."
  createEffect(() => {
    const rows = opts.rows();
    setChildrenMap(buildInitialMap(rows));
  });

  // -------------------------------------------------------------------------
  // doSwap
  // -------------------------------------------------------------------------

  const doSwap = (aId: string, bId: string): void => {
    setChildrenMap((prev) => {
      const next = { ...prev };
      const tmp = next[aId];
      next[aId] = next[bId];
      next[bId] = tmp;
      return next;
    });
    opts.onLayoutChange?.({ kind: 'swap', a: aId, b: bId });
  };

  // -------------------------------------------------------------------------
  // Per-cell bindings — created at engine construction time.
  //
  // createDraggable / createDroppable must be called at top-level component
  // scope (they use createMemo / createEffect internally).
  //
  // We snapshot rows() once at construction. If rows change (e.g. preset
  // receives new slots), the parent <Matrix> re-renders and createSwapEngine
  // is called fresh — so the binding set refreshes automatically.
  // -------------------------------------------------------------------------

  interface ICellBinding {
    draggable: IDraggable;
    droppable: IDroppable;
  }

  const bindingMap = new Map<string, ICellBinding>();
  /** Maps cellId → swapGroup string; used by getCellDropState.canAccept. */
  const _cellGroups = new Map<string, string>();
  /** Maps cellId → cell entry; needed to resolve isCellEnabled per cell. */
  const _cellEntries = new Map<string, ICellEntry>();

  for (const entry of flatDraggableCells(opts.rows())) {
    const { cell, rowId } = entry;
    const group = resolveGroup(cell, rowId);
    const cellId = cell.id;
    _cellGroups.set(cellId, group);
    _cellEntries.set(cellId, entry);

    // disabled=true: badge calls dnd.startDrag directly; the cell element
    // is registered so the DnD context can track it, but pointerdown on the
    // cell surface itself does not start a drag.
    const draggable = createDraggable({
      id: `cell:${cellId}`,
      data: () => ({ cellId, swapGroup: group }),
      disabled: () => true,
    });

    const droppable = createDroppable({
      id: `cell:${cellId}`,
      accepts: (data) => {
        const d = data as { cellId?: string; swapGroup?: string };
        return (
          opts.isCellEnabled(cell) &&
          typeof d.swapGroup === 'string' &&
          d.swapGroup === group &&
          d.cellId !== cellId
        );
      },
      onDrop: (data) => {
        const d = data as { cellId?: string };
        if (typeof d.cellId === 'string') {
          doSwap(d.cellId, cellId);
        }
      },
    });

    bindingMap.set(cellId, { draggable, droppable });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const getCellChildren = (cellId: string): JSX.Element => childrenMap()[cellId];

  const bindCell =
    (cell: ICell, _rowId: string | undefined): ((el: HTMLElement) => void) =>
    (el: HTMLElement) => {
      const binding = bindingMap.get(cell.id);
      if (!binding) return; // non-draggable cell — no-op ref
      binding.draggable.ref(el);
      binding.droppable.ref(el);
    };

  const getCellDropState = (
    cellId: string,
  ): { isOver: Accessor<boolean>; canDrop: Accessor<boolean>; canAccept: Accessor<boolean> } => {
    const binding = bindingMap.get(cellId);
    const entry = _cellEntries.get(cellId);
    if (!binding || !entry) {
      return { isOver: () => false, canDrop: () => false, canAccept: () => false };
    }
    // canAccept: a drag is active AND this cell would accept the active payload
    // (regardless of pointer position). Mirrors the accepts() logic registered
    // in createDroppable, derived from the same _cellGroups snapshot.
    const canAccept: Accessor<boolean> = createMemo(() => {
      const data = dnd.state.activeData();
      if (!data) return false;
      const d = data as { cellId?: string; swapGroup?: string };
      return (
        opts.isCellEnabled(entry.cell) &&
        typeof d.swapGroup === 'string' &&
        d.cellId !== cellId &&
        d.swapGroup === _cellGroups.get(cellId)
      );
    });
    return { isOver: binding.droppable.isOver, canDrop: binding.droppable.canDrop, canAccept };
  };

  const getDraggableId = (cellId: string): string => `cell:${cellId}`;

  // Badge shows only when a drag started from this cell can actually land
  // somewhere: the cell itself is enabled AND another enabled cell shares its
  // swapGroup. Group-aware — a lone cell in its group never gets a badge.
  const getShowBadge = (cellId: string): Accessor<boolean> => {
    const entry = _cellEntries.get(cellId);
    if (!entry) return () => false;
    const group = _cellGroups.get(cellId);
    return createMemo(() => {
      if (!opts.isCellEnabled(entry.cell)) return false;
      for (const [otherId, other] of _cellEntries) {
        if (otherId === cellId) continue;
        if (_cellGroups.get(otherId) === group && opts.isCellEnabled(other.cell)) return true;
      }
      return false;
    });
  };

  return {
    getCellChildren,
    bindCell,
    getCellDropState,
    getDraggableId,
    getShowBadge,
    draggableCount: bindingMap.size,
  };
};
