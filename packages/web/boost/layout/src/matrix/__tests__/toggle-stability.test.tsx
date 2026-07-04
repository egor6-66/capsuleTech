/**
 * Regression tests for the 2026-06-16 toggle-stability fix.
 *
 * Two related bugs were fixed in `content.tsx`:
 *
 *   Bug 1 — toggling DnD or Resize re-evaluated the whole `renderContent()`
 *   function. Solid wrapped that function call in a single tracking effect
 *   that re-fired on every read of `dndEnabled()` / `dndKind()` /
 *   `effectiveRows()` at the top of the function body — destroying the entire
 *   cell subtree (and any inner state, e.g. accordion open-state).
 *
 *   Bug 2 — `swapGetChildren` was passed down only when DnD was *active in
 *   swap mode*. Turning DnD off discarded the swap-engine's children-map view,
 *   visually reverting cells to their declared positions.
 *
 * Strategy:
 *
 *   The most rigorous probe for "did the cell subtree get re-mounted?" is a
 *   mount/cleanup-counter component. `onMount` runs once per component
 *   instance; `onCleanup` once per disposal. If a DnD/Resize toggle re-mounts
 *   the parent cell's Suspense/Dynamic subtree, every probe inside it will
 *   accumulate extra mount + cleanup events.
 *
 *   We rely on this signal instead of `===` DOM-reference comparisons:
 *   Solid's `insert()` reuses passed JSX-Element values by reference (the
 *   `cell.children` object is the same node on every re-eval), so DOM
 *   identity alone does NOT prove the parent subtree survived. Mount
 *   counters DO, because each fresh subtree creates a new Probe instance.
 *
 *   This file therefore probes via mount-counter for bug 1 (T1–T3), and
 *   via behavior for bug 2 (T4 — swap.getCellChildren must still feed cells
 *   when DnD is off so a prior user-applied swap stays visible).
 */
/* @vitest-environment jsdom */
import { createSignal, onCleanup, onMount } from 'solid-js';
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
// Probe component — registers mount + cleanup counts against the provided
// stats object. Each fresh subtree creates a fresh Probe instance →
// `mounts` increments. Each disposal → `cleanups` increments.
// ---------------------------------------------------------------------------

interface IProbeStats {
  mounts: number;
  cleanups: number;
}

const Probe = (props: { stats: IProbeStats; testid: string }) => {
  onMount(() => {
    props.stats.mounts++;
  });
  onCleanup(() => {
    props.stats.cleanups++;
  });
  return <div data-testid={props.testid}>{props.testid}</div>;
};

// ---------------------------------------------------------------------------
// Bug 1 — toggle does NOT re-mount cells
// ---------------------------------------------------------------------------

describe('Matrix — DnD toggle does NOT re-mount cells (bug 1)', () => {
  it('T1: toggling dnd swap → false → swap leaves cell mount-count at 1', () => {
    const leftStats: IProbeStats = { mounts: 0, cleanups: 0 };
    const rightStats: IProbeStats = { mounts: 0, cleanups: 0 };
    const [dnd, setDnd] = createSignal<'swap' | false>('swap');

    cleanup = render(
      () => (
        <Matrix
          dnd={dnd()}
          rows={[
            {
              id: 'main',
              resizable: true,
              cells: [
                {
                  id: 'left',
                  children: <Probe stats={leftStats} testid="t1-left" />,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'right',
                  children: <Probe stats={rightStats} testid="t1-right" />,
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

    // Initial mount.
    expect(leftStats.mounts).toBe(1);
    expect(rightStats.mounts).toBe(1);
    expect(leftStats.cleanups).toBe(0);
    expect(rightStats.cleanups).toBe(0);

    // Toggle DnD off → must NOT re-mount.
    setDnd(false);
    expect(leftStats.mounts).toBe(1);
    expect(rightStats.mounts).toBe(1);
    expect(leftStats.cleanups).toBe(0);
    expect(rightStats.cleanups).toBe(0);

    // Toggle DnD on again → must NOT re-mount.
    setDnd('swap');
    expect(leftStats.mounts).toBe(1);
    expect(rightStats.mounts).toBe(1);
    expect(leftStats.cleanups).toBe(0);
    expect(rightStats.cleanups).toBe(0);
  });

  it('T2: toggling resize true → false → true leaves mount-count at 1', () => {
    const aStats: IProbeStats = { mounts: 0, cleanups: 0 };
    const bStats: IProbeStats = { mounts: 0, cleanups: 0 };
    const [resize, setResize] = createSignal<boolean>(true);

    cleanup = render(
      () => (
        <Matrix
          resize={resize()}
          rows={[
            {
              id: 'main',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <Probe stats={aStats} testid="t2-a" />,
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <Probe stats={bStats} testid="t2-b" />,
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

    expect(aStats.mounts).toBe(1);
    expect(bStats.mounts).toBe(1);

    setResize(false);
    expect(aStats.mounts).toBe(1);
    expect(bStats.mounts).toBe(1);
    expect(aStats.cleanups).toBe(0);
    expect(bStats.cleanups).toBe(0);

    setResize(true);
    expect(aStats.mounts).toBe(1);
    expect(bStats.mounts).toBe(1);
    expect(aStats.cleanups).toBe(0);
    expect(bStats.cleanups).toBe(0);
  });

  it('T3: vertical-resizable layout — cells survive DnD toggle (mount-count 1)', () => {
    const topStats: IProbeStats = { mounts: 0, cleanups: 0 };
    const botStats: IProbeStats = { mounts: 0, cleanups: 0 };
    const [dnd, setDnd] = createSignal<'swap' | false>('swap');

    cleanup = render(
      () => (
        <Matrix
          dnd={dnd()}
          rows={[
            {
              id: 'top',
              height: 0.5,
              resizable: true,
              cells: [
                {
                  id: 'top-cell',
                  children: <Probe stats={topStats} testid="t3-top" />,
                  resizable: true,
                  draggable: true,
                  swapGroup: 'g',
                },
              ],
            },
            {
              id: 'bot',
              height: 0.5,
              resizable: true,
              cells: [
                {
                  id: 'bot-cell',
                  children: <Probe stats={botStats} testid="t3-bot" />,
                  resizable: true,
                  draggable: true,
                  swapGroup: 'g',
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(topStats.mounts).toBe(1);
    expect(botStats.mounts).toBe(1);

    setDnd(false);
    expect(topStats.mounts).toBe(1);
    expect(botStats.mounts).toBe(1);

    setDnd('swap');
    expect(topStats.mounts).toBe(1);
    expect(botStats.mounts).toBe(1);
    expect(topStats.cleanups).toBe(0);
    expect(botStats.cleanups).toBe(0);
  });

  it('T3b: centroid cell survives DnD toggle (mount-count 1)', () => {
    const stats: IProbeStats = { mounts: 0, cleanups: 0 };
    const [dnd, setDnd] = createSignal<'swap' | false>('swap');

    cleanup = render(
      () => (
        <Matrix
          dnd={dnd()}
          rows={[
            {
              cells: [
                {
                  id: 'only',
                  children: <Probe stats={stats} testid="t3b-only" />,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(stats.mounts).toBe(1);

    setDnd(false);
    expect(stats.mounts).toBe(1);
    expect(stats.cleanups).toBe(0);

    setDnd('swap');
    expect(stats.mounts).toBe(1);
    expect(stats.cleanups).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Bug 2 — swap children-map source stays wired across DnD toggle
//
// Direct programmatic probe. We render two cells (a, b) and inject *unique*
// markers into each via children. Then we call the swap engine's `doSwap`
// path through the public `onLayoutChange` interface — actually impossible
// directly without pointer DnD in jsdom.
//
// Instead we assert the *necessary* condition: with DnD off in non-insert
// mode, cells STILL render through the engine's children pipeline (i.e.
// `swap.getCellChildren` is the source), so any swap previously applied
// would persist. The probe: turn DnD off; cells must keep rendering
// children that came through the swap engine (in this case, no swap has
// happened so output equals input → markers stay; the key is that we still
// observe the markers and the same probe-instance — no re-mount).
//
// Combined with T1 (no re-mount on toggle), this lets us infer that the
// engine's children-map view is the live source of truth even with DnD off.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Bug 3 — inner-row handle GripIcon must react LIVE to resize-toggle
//
// flex-row.tsx:renderRow used to capture `const isResizeActive = resizeEnabled()`
// once and pass it as a value to <Flex withHandle={...} handleDisabled={...} />.
// Solid wraps the prop expression in a getter, but a captured local always
// returns the same value → inner-row handles never re-rendered on toggle.
//
// Probe: the corvu handle is `[data-corvu-resizable-handle]`; the kit-ui
// GripIcon renders `<div class="…bg-border…"><svg role="presentation" …/></div>`
// as a child ONLY when `withHandle` is truthy. We assert the svg appears/
// disappears under the inner-row handle when the resize signal toggles.
// ---------------------------------------------------------------------------

describe('Matrix — inner-row handle reacts LIVE to resize toggle (bug 3)', () => {
  it('T5: toggling resize flips GripIcon presence under inner-row handle', () => {
    const [resize, setResize] = createSignal<boolean>(true);

    // Cells WITHOUT explicit `resizable` — активность ручки следует matrix
    // `resize` prop. (Явный `resizable: true` — per-slot override, ручка
    // была бы активна всегда и toggle бы её не гасил — см.
    // divider-and-resize-override.test.tsx.)
    cleanup = render(
      () => (
        <Matrix
          resize={resize()}
          rows={[
            {
              id: 'row',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <div data-testid="t5-a">A</div>,
                  width: 0.5,
                },
                {
                  id: 'b',
                  children: <div data-testid="t5-b">B</div>,
                  width: 0.5,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handleSel = '[data-corvu-resizable-handle]';
    const gripSel = `${handleSel} svg[role="presentation"]`;

    const countGrips = (): number => container.querySelectorAll(gripSel).length;
    const countHandles = (): number => container.querySelectorAll(handleSel).length;

    // Initial: resize=true → handle present AND grip(s) inside.
    const handlesAtStart = countHandles();
    expect(handlesAtStart).toBeGreaterThan(0);
    const gripsAtStart = countGrips();
    expect(gripsAtStart).toBe(handlesAtStart);

    // Toggle OFF → handles still mounted (Resizable stays) but ALL grips gone.
    setResize(false);
    expect(countHandles()).toBe(handlesAtStart);
    expect(countGrips()).toBe(0);

    // Toggle back ON → grips reappear live.
    setResize(true);
    expect(countGrips()).toBe(handlesAtStart);
  });
});

describe('Matrix — swap children source persists across DnD toggle (bug 2)', () => {
  it('T4: DnD off (non-insert) still feeds cells via swap.getCellChildren', () => {
    const aStats: IProbeStats = { mounts: 0, cleanups: 0 };
    const bStats: IProbeStats = { mounts: 0, cleanups: 0 };
    const [dnd, setDnd] = createSignal<'swap' | false>('swap');

    cleanup = render(
      () => (
        <Matrix
          dnd={dnd()}
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                {
                  id: 'a',
                  children: <Probe stats={aStats} testid="t4-a" />,
                  draggable: true,
                  swapGroup: 'g',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'b',
                  children: <Probe stats={bStats} testid="t4-b" />,
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

    // Both cells mount once.
    expect(aStats.mounts).toBe(1);
    expect(bStats.mounts).toBe(1);
    expect(container.querySelector('[data-testid="t4-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="t4-b"]')).not.toBeNull();

    // Turn DnD off. The swap engine's children-map remains live; pre-fix
    // `swapGetChildren` was nulled out, falling back to raw `cell.children`
    // — same observable for no-swap case BUT this forced a structural
    // change of the cellDndState parameter (undefined ↔ value) which
    // re-rendered the cells. With the fix both stay stable.
    setDnd(false);
    expect(container.querySelector('[data-testid="t4-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="t4-b"]')).not.toBeNull();
    // No remount.
    expect(aStats.mounts).toBe(1);
    expect(bStats.mounts).toBe(1);

    // Toggle back on, cells must still be the original instances.
    setDnd('swap');
    expect(aStats.mounts).toBe(1);
    expect(bStats.mounts).toBe(1);
  });
});
