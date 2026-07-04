/**
 * Tests for swap-mode DnD in Matrix v2 — badge UX (Phase 1.2 v2).
 *
 * Badge-UX contract:
 * - A DragBadge (grip icon button) renders inside each draggable cell when
 *   2+ draggable cells exist (otherwise no swap target exists).
 * - No global edit badge / no edit-mode toggle.
 * - Drag is triggered via badge pointerdown → dnd.startDrag; cell surface
 *   itself does not initiate drag.
 * - Drop → onLayoutChange fires with { kind: 'swap', a, b }.
 * - swapGroup constraint enforced (badge still shown but drop rejected).
 *
 * Unit tests cover:
 *   1. Badge renders when 2+ ENABLED cells share a swapGroup (group-aware).
 *   2. Badge NOT rendered when a cell has no enabled same-group partner.
 *   3. Badge count matches enabled-partner cells.
 *   4. onLayoutChange handler wires without errors.
 *   5. Non-draggable cells render without badge.
 *   6. No crash on preset with only main slot (no draggable cells).
 *   7. Per-slot draggable override precedence (slot > mode/dnd prop > global).
 *   8. FULL drop flow (pointerdown → move → up) — web-dnd не использует
 *      pointer capture, цикл выполним в jsdom; хит-тест мокается через
 *      document.elementFromPoint (jsdom без layout'а). Браузерная геометрия
 *      остаётся e2e/Storybook concern'ом.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Matrix } from '../matrix';

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

describe('Matrix — badge-UX swap DnD', () => {
  it('badge renders on each draggable cell when 2+ draggable cells exist', () => {
    cleanup = render(
      () => (
        <Matrix
          dnd="swap"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div data-testid="cell-a">A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div data-testid="cell-b">B</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(2);
    // Cell content still renders
    expect(container.querySelector('[data-testid="cell-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="cell-b"]')).not.toBeNull();
  });

  it('badge NOT rendered when only 1 draggable cell (nothing to swap with)', () => {
    // Opt-out model: cell without draggable field is now draggable by default.
    // To explicitly exclude a cell, set draggable: false.
    cleanup = render(
      () => (
        <Matrix
          dnd="swap"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div>A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div>B</div>,
                  draggable: false, // explicit opt-out — excluded from swap engine
                  width: 0.5,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(0);
  });

  it('badge NOT rendered when no draggable cells at all', () => {
    cleanup = render(
      () => <Matrix preset="app-shell" slots={{ main: <div data-testid="m">M</div> }} />,
      container,
    );

    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(0);
    expect(container.querySelector('[data-testid="m"]')).not.toBeNull();
  });

  it('3 draggable cells → 3 badges', () => {
    cleanup = render(
      () => (
        <Matrix
          dnd="swap"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div>A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.33,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div>B</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.34,
                  resizable: true,
                },
                {
                  id: 'c',
                  children: <div>C</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.33,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(3);
  });

  it('badge has title="Drag to swap" for discoverability', () => {
    cleanup = render(
      () => (
        <Matrix
          dnd="swap"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div>A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div>B</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const badge = container.querySelector('[aria-label="Drag to swap cell"]');
    expect(badge?.getAttribute('title')).toBe('Drag to swap');
  });

  it('no global edit-mode badge rendered', () => {
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                { id: 'a', children: <div>A</div>, draggable: true, swapGroup: 'g' },
                { id: 'b', children: <div>B</div>, draggable: true, swapGroup: 'g' },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Old EditBadge used aria-label="Toggle layout edit mode" — must be gone
    expect(container.querySelector('button[aria-label="Toggle layout edit mode"]')).toBeNull();
  });

  it('non-draggable cells in same row render without badge', () => {
    cleanup = render(
      () => (
        <Matrix
          dnd="swap"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div data-testid="cell-a">A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div data-testid="cell-b">B</div>,
                  draggable: false, // explicit opt-out — no badge
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'c',
                  children: <div data-testid="cell-c">C</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.0,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // 2 draggable cells → 2 badges; non-draggable cell 'b' has no badge
    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(2);
    expect(container.querySelector('[data-testid="cell-b"]')).not.toBeNull();
  });

  it('onLayoutChange handler wires without errors', () => {
    const onLayoutChange = vi.fn();
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            dnd="swap"
            onLayoutChange={onLayoutChange}
            rows={[
              {
                cells: [
                  { id: 'a', children: <div>A</div>, draggable: true, swapGroup: 'g' },
                  { id: 'b', children: <div>B</div>, draggable: true, swapGroup: 'g' },
                ],
              },
            ]}
          />
        ),
        container,
      );
    }).not.toThrow();
    // No pointer events fired — callback not invoked yet
    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('cells in DIFFERENT swapGroups (no partner) → NO badges even with DnD on', () => {
    // Root of the drag-without-drop bug (learn app-shell pages, 2026-07-04):
    // the old 2+ threshold counted ALL draggable cells regardless of group, so
    // a drag could start with no cell able to accept it. Badge is now
    // group-aware — a lone cell in its group gets no badge.
    cleanup = render(
      () => (
        <Matrix
          dnd="swap"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div>A</div>,
                  draggable: true,
                  swapGroup: 'g1',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div>B</div>,
                  draggable: true,
                  swapGroup: 'g2',
                  width: 0.5,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(0);
  });

  it('preset app-shell default: header + main share the "shell" group → 2 badges', () => {
    // Preset slots now default to one shared swapGroup 'shell' — any slot can
    // swap with any other when DnD is on. Previously header='band' vs
    // main='middle-row' partitioned every learn page into partner-less groups.
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          dnd="swap"
          slots={{
            header: { children: <div data-testid="hdr">H</div> },
            main: { children: <div data-testid="mn">M</div> },
          }}
        />
      ),
      container,
    );

    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(2);
  });

  it('preset app-shell with draggable sidebar + rightBar, locked main → 2 badges', () => {
    // Opt-out model: main must be explicitly locked with draggable: false to prevent
    // it from entering the swap engine. sidebar + rightBar are explicitly draggable: true.
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          dnd="swap"
          slots={{
            main: {
              children: <div data-testid="main">M</div>,
              draggable: false, // explicit opt-out — main stays fixed
            },
            sidebar: {
              children: <div data-testid="sidebar">S</div>,
              draggable: true,
              swapGroup: 'aside',
            },
            rightBar: {
              children: <div data-testid="rightBar">R</div>,
              draggable: true,
              swapGroup: 'aside',
            },
          }}
        />
      ),
      container,
    );

    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(2);
    expect(container.querySelector('[data-testid="main"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sidebar"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Per-slot draggable override — precedence: cell.draggable > mode/dnd > global
// ---------------------------------------------------------------------------

describe('Matrix — per-slot draggable override', () => {
  const twoCells = (draggable: boolean | undefined) => [
    {
      id: 'r',
      resizable: true,
      cells: [
        {
          id: 'a',
          children: <div data-testid="ov-a">A</div>,
          draggable,
          swapGroup: 'g',
          width: 0.5,
          resizable: true,
        },
        {
          id: 'b',
          children: <div data-testid="ov-b">B</div>,
          draggable,
          swapGroup: 'g',
          width: 0.5,
          resizable: true,
        },
      ],
    },
  ];

  it('mode="view" + no explicit flags → NO badges (mode disables DnD)', () => {
    cleanup = render(() => <Matrix mode="view" rows={twoCells(undefined)} />, container);
    expect(container.querySelectorAll('[aria-label="Drag to swap cell"]').length).toBe(0);
  });

  it('mode="view" + slot draggable:true on both → badges show (slot overrides mode)', () => {
    cleanup = render(() => <Matrix mode="view" rows={twoCells(true)} />, container);
    expect(container.querySelectorAll('[aria-label="Drag to swap cell"]').length).toBe(2);
  });

  it('dnd={false} + slot draggable:true → badges show (slot is most specific)', () => {
    cleanup = render(() => <Matrix dnd={false} rows={twoCells(true)} />, container);
    expect(container.querySelectorAll('[aria-label="Drag to swap cell"]').length).toBe(2);
  });

  it('mode="edit" + slot draggable:false → NO badges (slot lock wins over mode)', () => {
    cleanup = render(() => <Matrix mode="edit" rows={twoCells(false)} />, container);
    expect(container.querySelectorAll('[aria-label="Drag to swap cell"]').length).toBe(0);
  });

  it('mode="view" + only ONE slot draggable:true → NO badges (no enabled partner)', () => {
    cleanup = render(
      () => (
        <Matrix
          mode="view"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div>A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div>B</div>,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );
    expect(container.querySelectorAll('[aria-label="Drag to swap cell"]').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Full swap drop flow — pointer simulation (A7/A8 from the characterization
// suite). web-dnd uses window-level listeners without setPointerCapture, so
// the full cycle runs in jsdom; only hit-testing (document.elementFromPoint)
// needs a mock because jsdom has no layout.
// ---------------------------------------------------------------------------

describe('Matrix — full swap drop flow', () => {
  const origElementFromPoint = document.elementFromPoint;

  afterEach(() => {
    document.elementFromPoint = origElementFromPoint;
  });

  const pointer = (type: string, target: EventTarget, x: number, y: number) => {
    target.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y }),
    );
  };

  const dragAtoB = (): { cellA: HTMLElement; cellB: HTMLElement } => {
    const droppables = container.querySelectorAll<HTMLElement>('[data-dnd-droppable]');
    expect(droppables.length).toBe(2);
    const cellA = droppables[0];
    const cellB = droppables[1];
    const badgeA = cellA.querySelector<HTMLElement>('[aria-label="Drag to swap cell"]');
    expect(badgeA).not.toBeNull();

    // jsdom has no layout — hit-test always "lands" on cell B.
    document.elementFromPoint = () => cellB;

    pointer('pointerdown', badgeA!, 10, 10);
    pointer('pointermove', window, 300, 10);
    pointer('pointerup', window, 300, 10);
    return { cellA, cellB };
  };

  it('drop on same-group partner → onLayoutChange({kind:swap}) + children swapped (A7+A8)', () => {
    const onLayoutChange = vi.fn();
    cleanup = render(
      () => (
        <Matrix
          dnd="swap"
          onLayoutChange={onLayoutChange}
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div data-testid="content-a">A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div data-testid="content-b">B</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const { cellA, cellB } = dragAtoB();

    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange).toHaveBeenCalledWith({ kind: 'swap', a: 'a', b: 'b' });
    // A8: children visually swapped between the two cells
    expect(cellA.querySelector('[data-testid="content-b"]')).not.toBeNull();
    expect(cellB.querySelector('[data-testid="content-a"]')).not.toBeNull();
  });

  it('mode="view" + both slots draggable:true → drop still works (override end-to-end)', () => {
    const onLayoutChange = vi.fn();
    cleanup = render(
      () => (
        <Matrix
          mode="view"
          onLayoutChange={onLayoutChange}
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div data-testid="content-a">A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <div data-testid="content-b">B</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const { cellA, cellB } = dragAtoB();

    expect(onLayoutChange).toHaveBeenCalledWith({ kind: 'swap', a: 'a', b: 'b' });
    expect(cellA.querySelector('[data-testid="content-b"]')).not.toBeNull();
    expect(cellB.querySelector('[data-testid="content-a"]')).not.toBeNull();
  });

  it('preset app-shell (header + main, default groups) → header↔main drop works', () => {
    const onLayoutChange = vi.fn();
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          dnd="swap"
          onLayoutChange={onLayoutChange}
          slots={{
            header: { children: <div data-testid="content-h">H</div> },
            main: { children: <div data-testid="content-m">M</div> },
          }}
        />
      ),
      container,
    );

    const droppables = container.querySelectorAll<HTMLElement>('[data-dnd-droppable]');
    expect(droppables.length).toBe(2);
    const headerCell = droppables[0];
    const mainCell = droppables[1];
    const headerBadge = headerCell.querySelector<HTMLElement>('[aria-label="Drag to swap cell"]');
    expect(headerBadge).not.toBeNull();

    document.elementFromPoint = () => mainCell;
    pointer('pointerdown', headerBadge!, 10, 10);
    pointer('pointermove', window, 300, 300);
    pointer('pointerup', window, 300, 300);

    expect(onLayoutChange).toHaveBeenCalledWith({ kind: 'swap', a: 'header', b: 'main' });
    expect(headerCell.querySelector('[data-testid="content-m"]')).not.toBeNull();
    expect(mainCell.querySelector('[data-testid="content-h"]')).not.toBeNull();
  });
});
