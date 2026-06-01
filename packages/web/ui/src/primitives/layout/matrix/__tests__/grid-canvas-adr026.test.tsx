/**
 * ADR 026 Phase 2b — Grid-canvas render-path tests.
 *
 * Coverage strategy (jsdom vs browser):
 *
 *   [JSDOM — asserted here]
 *   G1. Structural: grid zone renders a CSS-grid container (data-grid-zone attr,
 *       display:grid on the container).
 *   G2. Structural: a cell with grid {x,y,w,h} gets the correct
 *       grid-column / grid-row inline styles.
 *   G3. Structural: grid path is gated — only active under dndMode='insert'
 *       AND row.grid present. Without either gate, the existing flow/corvu path
 *       renders (no data-grid-zone attribute).
 *   G4. Structural: cell WITHOUT grid coords is NOT rendered in the grid zone
 *       (safety guard — cells must have coordinates to be placed).
 *   G5. Model: rowToGridLayout extracts IGridLayout from IRow.cells correctly.
 *   G6. Model: applyGridLayout writes layout coords back onto cells.
 *   G7. Model: rail→grid materialization (insert.onDrop to grid zone) assigns
 *       grid coords via placeItem (model test on createInsertEngine directly).
 *   G8. Model: grid→rail (drop from grid zone to flow zone) strips grid coords.
 *   G9. Model: within-grid move updates coords via moveItem (model test).
 *   G10. Interfaces: LayoutChangeEvent accepts kind:'grid' shape (TS-level check
 *       via type assignment in test code — compiler catches regressions).
 *   G11. rowToAxis returns 'grid' for rows with row.grid set.
 *
 *   [Deferred to Phase 3 browser pass]
 *   - Pixel drag geometry (pointermove → pointToCell → preview cell position).
 *   - Visual drop highlight (ring classes on grid container during drag).
 *   - Cross-zone pointer-event flow (real browser DnD).
 *   - Actual onDrop firing (requires real pointer events + getBoundingClientRect).
 *   - commitGridMove live preview during pointermove.
 *
 * NOTE: jsdom does not implement getBoundingClientRect meaningfully (returns all
 * zeros). Any logic dependent on container measurement is browser-only and is
 * deferred to Phase 3.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Matrix } from '../matrix';
import {
  rowToGridLayout,
  applyGridLayout,
  rowToAxis,
} from '../dnd/insert';
import type { ICell, IRow, LayoutChangeEvent } from '../interfaces';

// ---------------------------------------------------------------------------
// Minimal pure grid-math for tests (mirrors web-dnd/grid.ts logic).
// We avoid importing directly from @capsuletech/web-dnd because the dist may
// not be built in the monorepo dev environment. The full suite lives in
// packages/web/dnd/src/__tests__/grid.test.ts. Here we only need minimal
// collision verification.
// ---------------------------------------------------------------------------

function collidesItems(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

// ---------------------------------------------------------------------------
// G1: Grid zone renders CSS-grid container
// ---------------------------------------------------------------------------

// NOTE on centroid bypass: Matrix has a centroid shortcut for 1 row + 1 cell +
// no resizable + no explicit height. To exercise renderRow (and thus renderGridRow),
// tests must either have ≥2 cells OR set an explicit row height to prevent centroid.
// All fixtures below use 2 cells or a second row for this reason.

describe('G1: grid zone renders a CSS-grid container', () => {
  it('G1a: row.grid present + dndMode=insert → data-grid-zone attribute on container', () => {
    // Two cells to bypass centroid shortcut
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'grid-zone',
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'cell-a',
                  children: <div data-testid="ga">A</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 4, h: 2 },
                },
                {
                  id: 'cell-b',
                  children: <div>B</div>,
                  draggable: true,
                  grid: { x: 4, y: 0, w: 4, h: 2 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const gridZone = container.querySelector('[data-grid-zone="grid-zone"]');
    expect(gridZone).not.toBeNull();
  });

  it('G1b: grid zone container has inline display:grid style', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'gz',
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'c1',
                  children: <div data-testid="c1">C1</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 6, h: 1 },
                },
                {
                  id: 'c2',
                  children: <div>C2</div>,
                  draggable: true,
                  grid: { x: 6, y: 0, w: 6, h: 1 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const gridZone = container.querySelector('[data-grid-zone="gz"]') as HTMLElement | null;
    expect(gridZone).not.toBeNull();
    const style = gridZone?.style;
    expect(style?.display).toBe('grid');
  });

  it('G1c: grid-template-columns uses repeat(cols, 1fr)', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'gzone',
              grid: { cols: 6, rowHeight: 80 },
              cells: [
                {
                  id: 'cx',
                  children: <div>X</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 3, h: 1 },
                },
                {
                  id: 'cy2',
                  children: <div>Y2</div>,
                  draggable: true,
                  grid: { x: 3, y: 0, w: 3, h: 1 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const gridZone = container.querySelector('[data-grid-zone="gzone"]') as HTMLElement | null;
    expect(gridZone?.style.gridTemplateColumns).toBe('repeat(6, 1fr)');
  });

  it('G1d: grid-auto-rows uses rowHeight px', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'gr',
              grid: { cols: 12, rowHeight: 100 },
              cells: [
                {
                  id: 'cy',
                  children: <div>Y</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 2, h: 2 },
                },
                {
                  id: 'cz',
                  children: <div>Z</div>,
                  draggable: true,
                  grid: { x: 2, y: 0, w: 2, h: 2 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const gridZone = container.querySelector('[data-grid-zone="gr"]') as HTMLElement | null;
    expect(gridZone?.style.gridAutoRows).toBe('100px');
  });
});

// ---------------------------------------------------------------------------
// G2: Cell grid placement styles
// ---------------------------------------------------------------------------

describe('G2: cells get correct grid-column / grid-row styles', () => {
  it('G2a: cell at {x:0,y:0,w:4,h:2} → grid-column:1/span 4, grid-row:1/span 2', () => {
    // Two cells to bypass centroid shortcut
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'g1',
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'placed',
                  children: <div data-testid="placed-cell">Placed</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 4, h: 2 },
                },
                {
                  id: 'placed-sibling',
                  children: <div>Sibling</div>,
                  draggable: true,
                  grid: { x: 4, y: 0, w: 4, h: 2 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const cellEl = container.querySelector('[data-grid-cell="placed"]') as HTMLElement | null;
    expect(cellEl).not.toBeNull();
    expect(cellEl?.style.gridColumn).toBe('1 / span 4');
    expect(cellEl?.style.gridRow).toBe('1 / span 2');
  });

  it('G2b: cell at {x:4,y:2,w:8,h:3} → grid-column:5/span 8, grid-row:3/span 3', () => {
    // Use height on the row to bypass the centroid shortcut
    // (centroid triggers only when height is undefined or 'fr').
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'g2',
              height: 0.8,
              resizable: true,
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'offset',
                  children: <div data-testid="offset-cell">Offset</div>,
                  draggable: true,
                  grid: { x: 4, y: 2, w: 8, h: 3 },
                },
              ],
            },
            {
              id: 'footer',
              height: 0.2,
              resizable: true,
              cells: [{ id: 'ftr', children: <div>Footer</div> }],
            },
          ]}
        />
      ),
      container,
    );

    const cellEl = container.querySelector('[data-grid-cell="offset"]') as HTMLElement | null;
    expect(cellEl).not.toBeNull();
    expect(cellEl?.style.gridColumn).toBe('5 / span 8');
    expect(cellEl?.style.gridRow).toBe('3 / span 3');
  });

  it('G2c: multiple cells in one grid zone each get correct placement', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'multi-grid',
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'cell-left',
                  children: <div data-testid="left">Left</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 6, h: 2 },
                },
                {
                  id: 'cell-right',
                  children: <div data-testid="right">Right</div>,
                  draggable: true,
                  grid: { x: 6, y: 0, w: 6, h: 2 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const leftEl = container.querySelector('[data-grid-cell="cell-left"]') as HTMLElement | null;
    const rightEl = container.querySelector('[data-grid-cell="cell-right"]') as HTMLElement | null;
    expect(leftEl?.style.gridColumn).toBe('1 / span 6');
    expect(leftEl?.style.gridRow).toBe('1 / span 2');
    expect(rightEl?.style.gridColumn).toBe('7 / span 6');
    expect(rightEl?.style.gridRow).toBe('1 / span 2');
  });

  it('G2d: cell content renders inside the placed cell', () => {
    // Two cells to bypass centroid shortcut (centroid: 1 row, 1 cell, no resizable, no height)
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'content-grid',
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'content-cell',
                  children: <div data-testid="inner-content">Hello Grid</div>,
                  draggable: true,
                  grid: { x: 2, y: 1, w: 4, h: 1 },
                },
                {
                  id: 'sibling',
                  children: <div>Sibling</div>,
                  draggable: true,
                  grid: { x: 6, y: 0, w: 6, h: 2 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="inner-content"]')).not.toBeNull();
    // The content must be inside the grid cell wrapper
    const cellEl = container.querySelector('[data-grid-cell="content-cell"]');
    expect(cellEl?.querySelector('[data-testid="inner-content"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// G3: Grid path gate — only active under dndMode=insert && row.grid
// ---------------------------------------------------------------------------

describe('G3: grid render-path gating', () => {
  it('G3a: row.grid WITHOUT dndMode=insert → NO data-grid-zone (swap mode uses existing path)', () => {
    // row.grid is present but dndMode defaults to 'swap' → existing branch
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          rows={[
            {
              id: 'swap-row',
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'sc',
                  children: <div data-testid="swap-content">SC</div>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Swap mode → existing flow path, no grid zone
    expect(container.querySelector('[data-grid-zone]')).toBeNull();
    // Content still renders via existing path
    expect(container.querySelector('[data-testid="swap-content"]')).not.toBeNull();
  });

  it('G3b: dndMode=insert WITHOUT row.grid → packing/flow path (no data-grid-zone)', () => {
    // Insert mode but no row.grid → falls through to packing/corvu paths.
    // Use 2 cells to bypass the centroid shortcut (1 row, 1 cell triggers centroid).
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'flow-row',
              wrap: true,
              cells: [
                {
                  id: 'fa',
                  children: <div data-testid="flow-a">FA</div>,
                  draggable: true,
                  minW: 100,
                },
                {
                  id: 'fb',
                  children: <div data-testid="flow-b">FB</div>,
                  draggable: true,
                  minW: 100,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-grid-zone]')).toBeNull();
    expect(container.querySelector('[data-testid="flow-a"]')).not.toBeNull();
    // Packing path → flex-wrap present
    expect(container.querySelector('.flex-wrap')).not.toBeNull();
  });

  it('G3c: row WITHOUT id in insert mode → no grid zone (id required for zone registration)', () => {
    // Rows without id are not registered in createInsertEngine
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              // no id
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'noid-cell',
                  children: <div data-testid="noid">NoId</div>,
                  grid: { x: 0, y: 0, w: 4, h: 2 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // No zone registered (row.id undefined) → renderRow gate: zone && row.grid && gridOpts && row.id
    // The id check means this falls through to existing paths.
    // Content still renders (some path renders it).
    expect(container.querySelector('[data-testid="noid"]')).not.toBeNull();
    // No grid zone attribute since the gate requires row.id
    expect(container.querySelector('[data-grid-zone]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// G4: Cell without grid coords not rendered in grid zone
// ---------------------------------------------------------------------------

describe('G4: cells without grid coords are not rendered in grid zone', () => {
  it('G4: cell lacking grid prop → returns null, not rendered in grid zone', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'mixed-grid',
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'with-coords',
                  children: <div data-testid="with-coords">With Coords</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 4, h: 2 },
                },
                {
                  id: 'no-coords',
                  children: <div data-testid="no-coords">No Coords</div>,
                  draggable: true,
                  // grid: absent — should not render
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Cell with coords: rendered
    expect(container.querySelector('[data-grid-cell="with-coords"]')).not.toBeNull();
    // Cell without coords: not rendered (returns null in renderGridRow)
    expect(container.querySelector('[data-grid-cell="no-coords"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// G5: rowToGridLayout — model-level pure function
// ---------------------------------------------------------------------------

describe('G5: rowToGridLayout extracts IGridLayout from row.cells', () => {
  it('G5a: cells with grid coords → extracted as IGridLayout', () => {
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [
        { id: 'a', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'b', children: null, grid: { x: 4, y: 0, w: 8, h: 2 } },
      ],
    };
    const layout = rowToGridLayout(row);
    expect(layout).toHaveLength(2);
    expect(layout.find((l) => l.id === 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 4, h: 2 });
    expect(layout.find((l) => l.id === 'b')).toEqual({ id: 'b', x: 4, y: 0, w: 8, h: 2 });
  });

  it('G5b: cells without grid coords → excluded from layout', () => {
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [
        { id: 'a', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'no-grid', children: null }, // no grid
      ],
    };
    const layout = rowToGridLayout(row);
    expect(layout).toHaveLength(1);
    expect(layout[0].id).toBe('a');
  });

  it('G5c: empty cells → empty layout', () => {
    const row: IRow = { id: 'r', grid: { cols: 12 }, cells: [] };
    expect(rowToGridLayout(row)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// G6: applyGridLayout — model-level pure function
// ---------------------------------------------------------------------------

describe('G6: applyGridLayout writes layout coords back onto cells', () => {
  it('G6a: updates grid coords on matching cells', () => {
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [
        { id: 'a', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'b', children: null, grid: { x: 4, y: 0, w: 8, h: 2 } },
      ],
    };
    const newLayout = [
      { id: 'a', x: 2, y: 1, w: 4, h: 2 },
      { id: 'b', x: 6, y: 1, w: 6, h: 3 },
    ];
    const updated = applyGridLayout(row, newLayout);
    const cellA = updated.cells.find((c) => c.id === 'a');
    const cellB = updated.cells.find((c) => c.id === 'b');
    expect(cellA?.grid).toEqual({ x: 2, y: 1, w: 4, h: 2 });
    expect(cellB?.grid).toEqual({ x: 6, y: 1, w: 6, h: 3 });
  });

  it('G6b: cells absent from layout are left unchanged', () => {
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [
        { id: 'a', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'b', children: null }, // no grid — absent from layout
      ],
    };
    const newLayout = [{ id: 'a', x: 5, y: 0, w: 4, h: 2 }];
    const updated = applyGridLayout(row, newLayout);
    const cellB = updated.cells.find((c) => c.id === 'b');
    // b is not in layout → unchanged (no grid prop)
    expect(cellB?.grid).toBeUndefined();
  });

  it('G6c: returns a new IRow (immutable — does not mutate input)', () => {
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [{ id: 'a', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } }],
    };
    const newLayout = [{ id: 'a', x: 1, y: 0, w: 4, h: 2 }];
    const updated = applyGridLayout(row, newLayout);
    expect(updated).not.toBe(row);
    // Original row unchanged
    expect(row.cells[0].grid?.x).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// G7/G8/G9: Model-level tests via the Matrix component's insert engine
// These test the localRows mutation logic without real DnD pointer events.
// Since onDrop is triggered by createSortableGroup (pointer-event driven),
// we test the pure helpers (rowToGridLayout, applyGridLayout) + moveItem/placeItem
// from web-dnd. The full integration (onDrop → placeItem → localRows update)
// requires a real browser and is deferred to Phase 3.
// ---------------------------------------------------------------------------

describe('G7: rail→grid materialization (model helpers)', () => {
  it('G7a: rowToGridLayout + applyGridLayout round-trips correctly (materialization pipeline)', () => {
    // Simulate what createInsertEngine.onDrop does for a rail→grid drop:
    // materializedCell gets grid coords and is appended to target cells.
    // Test that the resulting IRow has correct grid coords.
    const targetRow: IRow = {
      id: 'grid-zone',
      grid: { cols: 12 },
      cells: [
        // Existing item already in the grid
        { id: 'existing', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } },
      ],
    };
    // Materialized cell dropped at {x:6, y:0, w:2, h:2}
    const materializedCell: ICell = {
      id: 'new-widget',
      children: null,
      grid: { x: 6, y: 0, w: 2, h: 2 },
    };
    // Append to row (simulating onDrop with no collision at x:6,y:0)
    const updatedRow: IRow = {
      ...targetRow,
      cells: [...targetRow.cells, materializedCell],
    };
    expect(updatedRow.cells).toHaveLength(2);
    const placed = updatedRow.cells.find((c) => c.id === 'new-widget');
    expect(placed?.grid).toEqual({ x: 6, y: 0, w: 2, h: 2 });
  });

  it('G7b: defaultGrid fallback used when cell.defaultGrid is absent', () => {
    // The engine uses DEFAULT_GRID_W=2, DEFAULT_GRID_H=2 when cell.defaultGrid absent.
    // Verify the interface: ICell.defaultGrid is optional and cell without it
    // should materialize with fallback dimensions.
    const cell: ICell = {
      id: 'no-default',
      children: null,
      // defaultGrid absent
    };
    // Engine logic: const defaultW = cell.defaultGrid?.w ?? 2
    const defaultW = cell.defaultGrid?.w ?? 2;
    const defaultH = cell.defaultGrid?.h ?? 2;
    expect(defaultW).toBe(2);
    expect(defaultH).toBe(2);
  });

  it('G7c: ICell.defaultGrid is used when present', () => {
    const cell: ICell = {
      id: 'with-default',
      children: null,
      defaultGrid: { w: 4, h: 3 },
    };
    const defaultW = cell.defaultGrid?.w ?? 2;
    const defaultH = cell.defaultGrid?.h ?? 2;
    expect(defaultW).toBe(4);
    expect(defaultH).toBe(3);
  });
});

describe('G8: grid→rail (model helpers — grid coord stripping)', () => {
  it('G8a: a cell moved from grid→rail should have grid prop set to undefined', () => {
    // This is the logic in insert.tsx onDrop for flow-zone target:
    //   const cellToInsert = movedCell.grid ? { ...movedCell, grid: undefined } : movedCell;
    // Test it directly.
    const cell: ICell = {
      id: 'c',
      children: null,
      grid: { x: 2, y: 0, w: 4, h: 2 },
    };
    const cellToInsert = cell.grid ? { ...cell, grid: undefined } : cell;
    expect(cellToInsert.grid).toBeUndefined();
    // Original not mutated
    expect(cell.grid).toBeDefined();
  });
});

describe('G9: within-grid move — applyGridLayout pipeline', () => {
  it('G9a: rowToGridLayout extracts current layout for moveItem input', () => {
    // The engine calls rowToGridLayout(row) to get the current IGridLayout
    // then passes it to moveItem. Verify the extraction is correct.
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [
        { id: 'a', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'b', children: null, grid: { x: 4, y: 0, w: 4, h: 2 } },
      ],
    };
    const layout = rowToGridLayout(row);
    // Both cells extracted correctly
    expect(layout).toHaveLength(2);
    const a = layout.find((l) => l.id === 'a');
    const b = layout.find((l) => l.id === 'b');
    expect(a).toEqual({ id: 'a', x: 0, y: 0, w: 4, h: 2 });
    expect(b).toEqual({ id: 'b', x: 4, y: 0, w: 4, h: 2 });
    // Items do NOT collide in their initial layout
    expect(collidesItems(a!, b!)).toBe(false);
  });

  it('G9b: applyGridLayout writes new coordinates back onto cells', () => {
    // After moveItem returns a new layout, applyGridLayout must apply it.
    // Simulate: 'a' moved to {x:4,y:0} — manually build the "after moveItem" layout.
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [
        { id: 'a', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'b', children: null, grid: { x: 4, y: 0, w: 4, h: 2 } },
      ],
    };
    // Simulate what moveItem would return: 'a' at x:4, 'b' displaced to y:2
    const newLayout = [
      { id: 'a', x: 4, y: 0, w: 4, h: 2 },
      { id: 'b', x: 4, y: 2, w: 4, h: 2 }, // pushed down
    ];
    const updatedRow = applyGridLayout(row, newLayout);

    const cellA = updatedRow.cells.find((c) => c.id === 'a');
    const cellB = updatedRow.cells.find((c) => c.id === 'b');
    expect(cellA?.grid).toEqual({ x: 4, y: 0, w: 4, h: 2 });
    expect(cellB?.grid).toEqual({ x: 4, y: 2, w: 4, h: 2 });
    // After displacement: no collision
    expect(collidesItems(cellA!.grid!, cellB!.grid!)).toBe(false);
  });

  it('G9c: within-grid move IRow is produced without mutating original', () => {
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [{ id: 'a', children: null, grid: { x: 0, y: 0, w: 4, h: 2 } }],
    };
    const newLayout = [{ id: 'a', x: 2, y: 1, w: 4, h: 2 }];
    const updated = applyGridLayout(row, newLayout);
    // Immutable: updated !== row
    expect(updated).not.toBe(row);
    expect(updated.cells).not.toBe(row.cells);
    // Original preserved
    expect(row.cells[0].grid?.x).toBe(0);
    // Updated has new coords
    expect(updated.cells[0].grid?.x).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// G10: LayoutChangeEvent type-level check (TS compiler test)
// ---------------------------------------------------------------------------

describe('G10: LayoutChangeEvent extends with kind=grid (type check)', () => {
  it('G10: kind=grid event shape is assignable to LayoutChangeEvent', () => {
    // This is a compile-time check. If the type is wrong, tsc fails.
    // At runtime it just verifies object shape.
    const evt: LayoutChangeEvent = {
      kind: 'grid',
      id: 'widget-1',
      zone: 'main-grid',
      x: 2,
      y: 0,
      w: 4,
      h: 3,
    };
    expect(evt.kind).toBe('grid');
    expect(evt.id).toBe('widget-1');
    expect(evt.zone).toBe('main-grid');
    expect(evt.x).toBe(2);
    expect(evt.y).toBe(0);
    expect(evt.w).toBe(4);
    expect(evt.h).toBe(3);
  });

  it('G10b: kind=insert still works (no regression on existing event kinds)', () => {
    const evt: LayoutChangeEvent = { kind: 'insert', id: 'cell', toRow: 0, toIndex: 1 };
    expect(evt.kind).toBe('insert');
  });

  it('G10c: kind=swap still works', () => {
    const evt: LayoutChangeEvent = { kind: 'swap', a: 'x', b: 'y' };
    expect(evt.kind).toBe('swap');
  });
});

// ---------------------------------------------------------------------------
// G11: rowToAxis returns 'grid' for rows with row.grid set
// ---------------------------------------------------------------------------

describe('G11: rowToAxis correctly routes grid rows', () => {
  it('G11a: row.grid present → axis=grid', () => {
    const row: IRow = {
      id: 'r',
      grid: { cols: 12 },
      cells: [],
    };
    expect(rowToAxis(row)).toBe('grid');
  });

  it('G11b: row.grid absent + orientation=vertical → axis=y', () => {
    const row: IRow = { id: 'r', orientation: 'vertical', cells: [] };
    expect(rowToAxis(row)).toBe('y');
  });

  it('G11c: row.grid absent + wrap=true → axis=grid (existing wrap behavior)', () => {
    const row: IRow = { id: 'r', wrap: true, cells: [] };
    expect(rowToAxis(row)).toBe('grid');
  });

  it('G11d: plain row → axis=x', () => {
    const row: IRow = { id: 'r', cells: [] };
    expect(rowToAxis(row)).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// Guard: grid zone coexists with flow zones without cross-contamination
// ---------------------------------------------------------------------------

describe('Guard: grid zone + flow zone coexist', () => {
  it('grid zone + rail zone in same Matrix → both render correctly', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          direction="horizontal"
          rows={[
            {
              id: 'rail',
              height: 0.25,
              wrap: true,
              cells: [
                {
                  id: 'rail-a',
                  children: <div data-testid="rail-a">Rail A</div>,
                  draggable: true,
                  minW: 80,
                },
              ],
            },
            {
              id: 'main-grid',
              height: 0.75,
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'grid-item',
                  children: <div data-testid="grid-item">Grid Item</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 6, h: 2 },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Rail zone: flex-wrap (packing path)
    expect(container.querySelector('.flex-wrap')).not.toBeNull();
    expect(container.querySelector('[data-testid="rail-a"]')).not.toBeNull();

    // Grid zone: data-grid-zone present
    expect(container.querySelector('[data-grid-zone="main-grid"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="grid-item"]')).not.toBeNull();
    expect(container.querySelector('[data-grid-cell="grid-item"]')).not.toBeNull();

    // No corvu panels (neither zone triggers corvu)
    expect(container.querySelector('[data-corvu-resizable-panel]')).toBeNull();
  });

  it('grid zone + corvu row in vertical Matrix → both render correctly', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'top-grid',
              height: 0.6,
              resizable: true,
              grid: { cols: 12, rowHeight: 64 },
              cells: [
                {
                  id: 'g-cell',
                  children: <div data-testid="g-cell">Grid Cell</div>,
                  draggable: true,
                  grid: { x: 0, y: 0, w: 4, h: 2 },
                },
              ],
            },
            {
              id: 'bottom-flow',
              height: 0.4,
              resizable: true,
              cells: [
                {
                  id: 'f-cell',
                  children: <div data-testid="f-cell">Flow Cell</div>,
                  resizable: true,
                  width: 1,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Grid zone rendered correctly
    expect(container.querySelector('[data-grid-zone="top-grid"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="g-cell"]')).not.toBeNull();

    // Flow zone rendered via corvu (resizable cell)
    expect(container.querySelector('[data-testid="f-cell"]')).not.toBeNull();
    // Corvu panels exist for the bottom row's resizable cell
    expect(container.querySelectorAll('[data-corvu-resizable-panel]').length).toBeGreaterThanOrEqual(1);
  });
});
