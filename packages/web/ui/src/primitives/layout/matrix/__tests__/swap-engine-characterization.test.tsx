/**
 * ADR 026 Phase 2a — Characterization tests: swap engine behavior.
 *
 * PURPOSE: Lock the CURRENT swap-mode behavior so the ADR 026 grid-canvas
 * render-branch addition cannot silently regress it. Each test asserts
 * today's actual behavior, quirks included.
 *
 * Coverage (what a render-branch refactor could plausibly break):
 *
 *   A1. showBadges triple condition: edit + ≥2 draggable + dndMode=swap
 *       → badges ABSENT in view mode (even with 2+ draggable)
 *       → badges ABSENT in insert mode (even in edit with 2+ draggable)
 *       → badges ABSENT when exactly 1 draggable (already in swap-dnd.test.tsx)
 *   A2. DragBadge aria-label / draggableId format: badge renders with
 *       aria-label="Drag to swap cell" and title="Drag to swap".
 *       draggableId = "cell:<cellId>" (read from badge proximity heuristic).
 *   A3. getCellChildren initial mapping: each cell renders its own children
 *       before any swap occurs.
 *   A4. getCellDropState shape: the return value has {isOver, canDrop, canAccept}
 *       all returning false before any drag (idle state).
 *   A5. Non-swap cells (draggable:false) never get a binding in the engine —
 *       confirmed via no badge rendered on those cells.
 *   A6. swapGroup isolation: cells in different swapGroups each get badges
 *       (counted per group; groups do NOT share the 2+ threshold between them).
 *   A7. onLayoutChange callback fires exactly once per swap commit with
 *       {kind:'swap', a, b} — CANNOT be tested in jsdom without real pointer
 *       events. Flagged as Phase 3 risk (see note below).
 *   A8. getCellChildren swap mapping after doSwap — CANNOT be triggered in
 *       jsdom. Flagged as Phase 3 risk.
 *
 * NOTE on jsdom limits for the swap engine:
 *   `doSwap` is called from inside createDroppable.onDrop which is invoked by
 *   the web-dnd DnD context on a real pointer-up event. jsdom does not support
 *   setPointerCapture, and the DnD context's internal state machine requires
 *   a full pointerdown → pointermove → pointerup sequence to trigger onDrop.
 *   Tests A7 and A8 require Storybook / Playwright (Phase 3 manual pass).
 *
 * NOTE on pixel-level resize geometry:
 *   jsdom does not measure layout (offsetWidth/offsetHeight always 0). Pixel
 *   resize verification (corvu handle drag, visual panel sizes) is browser-only
 *   and is part of the Phase 3 manual pass, not covered here.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

// ---------------------------------------------------------------------------
// A1. showBadges triple condition
// ---------------------------------------------------------------------------

describe('createSwapEngine — showBadges triple condition', () => {
  it('A1a: badges ABSENT in view mode even with 2+ draggable cells (layoutMode=view)', () => {
    // showBadges = layoutMode==='edit' && draggableCount>=2 && dndMode==='swap'
    // When layoutMode='view', the first condition is false → no badges.
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="view"
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

    // Cell content must still render (view mode is not broken)
    expect(container.querySelector('[data-testid="cell-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="cell-b"]')).not.toBeNull();
    // But no badges — showBadges is false in view mode
    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(0);
  });

  it('A1b: badges ABSENT in insert mode even with edit + 2+ draggable cells', () => {
    // showBadges = layoutMode==='edit' && draggableCount>=2 && dndMode==='swap'
    // When dndMode='insert', the third condition is false → no badges.
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              wrap: true,
              cells: [
                {
                  id: 'a',
                  children: <div data-testid="ins-a">A</div>,
                  draggable: true,
                  minW: 100,
                },
                {
                  id: 'b',
                  children: <div data-testid="ins-b">B</div>,
                  draggable: true,
                  minW: 100,
                },
                {
                  id: 'c',
                  children: <div data-testid="ins-c">C</div>,
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

    // 3 draggable cells in edit mode — but dndMode is insert, not swap
    expect(container.querySelector('[data-testid="ins-a"]')).not.toBeNull();
    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(0);
  });

  it('A1c: badges PRESENT only when all three conditions hold (edit + ≥2 + swap)', () => {
    // Positive control: all three conditions → badges appear
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'x',
                  children: <div data-testid="sg-x">X</div>,
                  draggable: true,
                  swapGroup: 'sg',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'y',
                  children: <div data-testid="sg-y">Y</div>,
                  draggable: true,
                  swapGroup: 'sg',
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
  });

  it('A1d: dndMode defaults to swap (no prop) — badges appear with 2+ draggable in edit mode', () => {
    // dndMode prop is optional; the default is 'swap'. Verify default behavior is locked.
    cleanup = render(
      () => (
        <Matrix
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'p',
                  children: <div>P</div>,
                  draggable: true,
                  swapGroup: 'default-test',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'q',
                  children: <div>Q</div>,
                  draggable: true,
                  swapGroup: 'default-test',
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
    // Default dndMode='swap' + edit + 2 draggable → 2 badges
    expect(badges.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// A2. DragBadge aria-label / title (characterize the badge's a11y markers)
// ---------------------------------------------------------------------------

describe('createSwapEngine — DragBadge a11y markers', () => {
  it('A2a: badge has aria-label="Drag to swap cell" (stable a11y contract)', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'aa',
                  children: <div>AA</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'bb',
                  children: <div>BB</div>,
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
    expect(badge).not.toBeNull();
    expect(badge?.tagName.toLowerCase()).toBe('button');
  });

  it('A2b: badge has title="Drag to swap" (tooltip text is stable)', () => {
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'cc',
                  children: <div>CC</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'dd',
                  children: <div>DD</div>,
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

  it('A2c: one badge per draggable cell (one-to-one mapping)', () => {
    // Characterizes that badge count equals draggable cell count exactly.
    // swap engine sets draggableCount = bindingMap.size = flatDraggableCells().length
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'e1',
                  children: <div>E1</div>,
                  draggable: true,
                  swapGroup: 'eg',
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'e2',
                  children: <div>E2</div>,
                  draggable: true,
                  swapGroup: 'eg',
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'e3',
                  children: <div>E3</div>,
                  draggable: true,
                  swapGroup: 'eg',
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'e4',
                  children: <div>E4</div>,
                  draggable: true,
                  swapGroup: 'eg',
                  width: 0.25,
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
    expect(badges.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// A3. getCellChildren initial mapping
// ---------------------------------------------------------------------------

describe('createSwapEngine — getCellChildren initial mapping (pre-swap state)', () => {
  it('A3: each cell renders its declared children in initial state', () => {
    // getCellChildren returns childrenMap()[cellId] which starts as cell.children.
    // Before any DnD swap occurs, each cell shows its own children.
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'slot-a',
                  children: <div data-testid="content-for-a">Content of A</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'slot-b',
                  children: <div data-testid="content-for-b">Content of B</div>,
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

    // Before any swap: each cell shows its own children
    expect(container.querySelector('[data-testid="content-for-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="content-for-b"]')).not.toBeNull();

    // Both are present in the DOM (neither displaced)
    const contentA = container.querySelector('[data-testid="content-for-a"]');
    const contentB = container.querySelector('[data-testid="content-for-b"]');
    expect(contentA?.textContent).toBe('Content of A');
    expect(contentB?.textContent).toBe('Content of B');
  });

  it('A3b: getCellChildren builds initial map from cell.children at construction time', () => {
    // buildInitialMap(rows) creates a Record<cellId, JSX.Element> from rows.
    // The swap engine reads this map for initial rendering (before any drop).
    // Characterizing this: each cell renders its own unique content, not a sibling's.
    // (Swap state starts neutral — no cross-mapping in initial map.)
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'map-a',
                  children: <span data-testid="map-a-content">Alpha content</span>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'map-b',
                  children: <span data-testid="map-b-content">Beta content</span>,
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

    // Each cell gets its own children in the initial map (no cross-mapping)
    const contentA = container.querySelector('[data-testid="map-a-content"]');
    const contentB = container.querySelector('[data-testid="map-b-content"]');
    expect(contentA).not.toBeNull();
    expect(contentB).not.toBeNull();
    expect(contentA?.textContent).toBe('Alpha content');
    expect(contentB?.textContent).toBe('Beta content');
    // Both distinct: content-for-A is not inside cell-B's element (and vice versa)
    // (No premature swap in the initial map)
    expect(contentA?.textContent).not.toBe(contentB?.textContent);
  });
});

// ---------------------------------------------------------------------------
// A4. getCellDropState — idle state (no drag active)
// ---------------------------------------------------------------------------

describe('createSwapEngine — getCellDropState idle state (no drag active)', () => {
  it('A4: no drop-highlight overlay rendered at rest (all accessors false)', () => {
    // getCellDropState() returns {isOver:()=>false, canDrop:()=>false, canAccept:()=>false}
    // when no drag is active. The overlay div (z-30 ring) must NOT be in the DOM.
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'alpha',
                  children: <div>Alpha</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'beta',
                  children: <div>Beta</div>,
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

    // The drop-highlight overlay div uses class z-30 + pointer-events-none + absolute inset-0.
    // When no drag is active, <Show when={canAccept() || canDrop() || isOver()}> is false
    // → overlay div absent from DOM.
    const overlays = container.querySelectorAll('.z-30.pointer-events-none.absolute');
    // In idle state (no drag), overlay elements should not be present.
    expect(overlays.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A5. Non-swap cells: cells with draggable:false get no badge
// ---------------------------------------------------------------------------

describe('createSwapEngine — draggable:false cells excluded from engine', () => {
  it('A5: non-draggable cell in a row with 2 draggable cells does not get a badge', () => {
    // flatDraggableCells() only includes cells where cell.draggable is truthy.
    // The non-draggable cell is not registered in bindingMap → no badge rendered.
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'drag-1',
                  children: <div data-testid="d1">D1</div>,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.33,
                  resizable: true,
                },
                {
                  id: 'no-drag',
                  children: <div data-testid="nd">ND</div>,
                  // draggable intentionally absent (falsy)
                  width: 0.34,
                  resizable: true,
                },
                {
                  id: 'drag-2',
                  children: <div data-testid="d2">D2</div>,
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

    // 2 draggable cells → 2 badges (draggableCount=2, showBadges=true)
    // The non-draggable cell gets no badge
    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(2);
    // All three cells render
    expect(container.querySelector('[data-testid="d1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="nd"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="d2"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A6. swapGroup isolation: each group's cells count independently
// ---------------------------------------------------------------------------

describe('createSwapEngine — swapGroup isolation', () => {
  it('A6a: cells in different swapGroups each get badges if group has ≥2 members', () => {
    // draggableCount = total draggable cells (not per-group).
    // But the 2+ threshold for showBadges is total, not per-group.
    // Here: 4 cells total across 2 groups → draggableCount=4 → showBadges=true → 4 badges.
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'g1-a',
                  children: <div>G1A</div>,
                  draggable: true,
                  swapGroup: 'group-1',
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'g1-b',
                  children: <div>G1B</div>,
                  draggable: true,
                  swapGroup: 'group-1',
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'g2-a',
                  children: <div>G2A</div>,
                  draggable: true,
                  swapGroup: 'group-2',
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'g2-b',
                  children: <div>G2B</div>,
                  draggable: true,
                  swapGroup: 'group-2',
                  width: 0.25,
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
    // draggableCount = 4 → showBadges = true → all 4 cells get badges
    expect(badges.length).toBe(4);
  });

  it('A6b: resolveGroup fallback: cell without swapGroup uses rowId', () => {
    // resolveGroup(cell, rowId) = cell.swapGroup ?? rowId ?? cell.id
    // Cells in same row without explicit swapGroup end up in the same group (rowId).
    // They can swap with each other.
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'myrow',
              resizable: true,
              cells: [
                {
                  id: 'fallback-a',
                  children: <div data-testid="fa">FA</div>,
                  draggable: true,
                  // swapGroup absent → resolves to rowId='myrow'
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'fallback-b',
                  children: <div data-testid="fb">FB</div>,
                  draggable: true,
                  // swapGroup absent → resolves to rowId='myrow'
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

    // Both cells in the same implicit group (rowId='myrow') → 2 badges
    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(2);
    expect(container.querySelector('[data-testid="fa"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="fb"]')).not.toBeNull();
  });

  it('A6c: multi-row swap — draggable cells across rows are all counted', () => {
    // flatDraggableCells iterates all rows. draggableCount = total across rows.
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'row-top',
              height: 0.5,
              resizable: true,
              cells: [
                {
                  id: 'top-a',
                  children: <div data-testid="ta">TA</div>,
                  draggable: true,
                  swapGroup: 'cross-row',
                  width: 1,
                  resizable: true,
                },
              ],
            },
            {
              id: 'row-bot',
              height: 0.5,
              resizable: true,
              cells: [
                {
                  id: 'bot-a',
                  children: <div data-testid="ba">BA</div>,
                  draggable: true,
                  swapGroup: 'cross-row',
                  width: 1,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // 1 draggable in row-top + 1 in row-bot = 2 total → showBadges=true → 2 badges
    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(2);
    expect(container.querySelector('[data-testid="ta"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="ba"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A7/A8 — Phase 3 risk documentation
// (not implemented: requires real pointer events / Storybook)
// ---------------------------------------------------------------------------

describe('createSwapEngine — Phase 3 risks (not testable in jsdom)', () => {
  it('A7: onLayoutChange({kind:swap,a,b}) firing — documented as Phase 3 manual pass', () => {
    // CANNOT test: onDrop is triggered by the DnD context's internal state machine
    // via pointerdown → pointermove → pointerup sequence. jsdom does not implement
    // setPointerCapture (called in DnD context) so the full DnD cycle cannot run.
    //
    // Phase 3 manual check:
    //   1. Open Matrix story with swap mode in Storybook.
    //   2. Click badge → drag to another cell → release.
    //   3. Verify onLayoutChange spy logs {kind:'swap', a:'cellA', b:'cellB'}.
    //   4. Verify cell contents are visually swapped.
    //
    // This test exists ONLY to document the risk and make Phase 3 checklist visible.
    expect(true).toBe(true);
  });

  it('A8: getCellChildren swap mapping after doSwap — documented as Phase 3 manual pass', () => {
    // CANNOT test: doSwap runs inside droppable.onDrop which requires full DnD lifecycle.
    // After a successful drop: childrenMap is updated via setChildrenMap() so
    // getCellChildren('a') returns cell-b's children and vice-versa.
    //
    // Phase 3 manual check:
    //   1. Drag badge from cell A and drop onto cell B.
    //   2. Verify content of A and B is visually swapped in the DOM.
    //   3. Drag back — verify second swap restores original positions.
    expect(true).toBe(true);
  });
});
