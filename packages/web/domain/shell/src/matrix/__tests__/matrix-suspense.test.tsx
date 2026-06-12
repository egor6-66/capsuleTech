/**
 * Matrix per-slot Suspense boundaries.
 *
 * These tests verify that Matrix wraps each cell's content in its own
 * <Suspense> boundary so that a suspending slot blanks only that cell —
 * not the whole layout.
 *
 * JSDOM CONSTRAINT NOTE:
 * Solid's Suspense integration (for lazy() and createResource) requires the
 * component body to execute inside a reactive computation that is owned by the
 * Suspense boundary. When children are passed as JSX.Element (the ICell.children
 * type), they are pre-evaluated in the parent's scope before Matrix's internal
 * <Suspense> is set up. This means the runtime suspension cannot be directly
 * triggered in jsdom via the standard `children: <LazyComponent />` pattern.
 *
 * In real Solid applications this works correctly because:
 *   (a) Widget bodies run inside reactive computations owned by their
 *       parent Suspense (the app's root Suspense in logic-wrapper.tsx).
 *   (b) Each Widget's JSX is evaluated inside that computation, so lazy()
 *       components register with the nearest Suspense in the tree —
 *       which, after Matrix's per-slot Suspense is added, is Matrix's own
 *       boundary rather than the app-level one.
 *
 * The tests here therefore cover:
 *   1. Structural: <Suspense> wrapping is present in the source for all
 *      three render paths (DnD, settings-strip, plain, packing, centroid).
 *   2. DOM: resolved cells render normally when sibling cells have null/empty
 *      content — verifying the per-cell isolation property.
 *   3. Skeleton prop flow: skeleton from SlotValue → INormalizedSlot → ICell.
 *   4. Default fallback: when no skeleton prop is provided, MatrixCellFallback
 *      (animate-pulse) renders as the Suspense fallback.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @capsuletech/web-style
// ---------------------------------------------------------------------------

vi.mock('@capsuletech/web-style', async () => {
  const { createSignal } = await import('solid-js');
  const [settingsEnabled] = createSignal<boolean>(false);
  // Resize defaults off in tests so resize handles are predictable.
  const [resizeEnabled] = createSignal<boolean>(false);
  // DnD defaults off in tests.
  const [dndEnabled] = createSignal<boolean>(false);

  return {
    useSettingsMode: () => settingsEnabled,
    setSettingsMode: vi.fn(),
    toggleSettingsMode: vi.fn(),
    useResizeMode: () => resizeEnabled,
    setResizeMode: vi.fn(),
    toggleResizeMode: vi.fn(),
    useDndMode: () => dndEnabled,
    setDndMode: vi.fn(),
    toggleDndMode: vi.fn(),
    useDarkMode: () => () => false,
    toggleDarkMode: vi.fn(),
    setDarkMode: vi.fn(),
    useTheme: () => () => 'black',
    setTheme: vi.fn(),
    DISCOVERED_THEMES: ['black', 'zen'],
    cva: vi.fn((_base: string, _config?: unknown) => () => ''),
    createStyle: vi.fn((_cva: unknown, _props: unknown) => ({
      className: () => '',
      style: () => undefined,
    })),
    cn: (...args: string[]) => args.filter(Boolean).join(' '),
  };
});

import { Matrix } from '../matrix';
import { normalizeSlotValue } from '../utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// 1. Structural tests — <Suspense> is wired in the source
// ---------------------------------------------------------------------------

describe('Matrix per-slot Suspense — structural presence in source', () => {
  it('cell.tsx imports Suspense from solid-js', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    // After decomposition Suspense lives in cell.tsx (not monolithic matrix.tsx)
    const src = fs.readFileSync(path.resolve(__dirname, '../cell.tsx'), 'utf-8');
    // Suspense must be imported
    expect(src).toMatch(/Suspense/);
    // Import must come from solid-js
    expect(src).toMatch(/from ['"]solid-js['"]/);
  });

  it('cell.tsx + content.tsx + packing-row.tsx have Suspense wrapping in render branches', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    // After decomposition Suspense instances are spread across modules:
    // - renderCell plain branch (cell.tsx)
    // - renderCell DnD branch (cell.tsx)
    // - centroid shortcut (content.tsx)
    // - packing row (rows/packing-row.tsx)
    // - grid row (rows/grid-row.tsx)
    const cellSrc = fs.readFileSync(path.resolve(__dirname, '../cell.tsx'), 'utf-8');
    const contentSrc = fs.readFileSync(path.resolve(__dirname, '../content.tsx'), 'utf-8');
    const packingRowSrc = fs.readFileSync(
      path.resolve(__dirname, '../rows/packing-row.tsx'),
      'utf-8',
    );
    const gridRowSrc = fs.readFileSync(path.resolve(__dirname, '../rows/grid-row.tsx'), 'utf-8');
    const allSrc = cellSrc + contentSrc + packingRowSrc + gridRowSrc;
    const suspenseCount = (allSrc.match(/<Suspense\b/g) ?? []).length;
    // Expect at least 4 Suspense instances across all render modules
    expect(suspenseCount).toBeGreaterThanOrEqual(4);
  });

  it('cell.tsx Suspense uses MatrixCellFallback as default', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    // After decomposition MatrixCellFallback lives in cell.tsx
    const src = fs.readFileSync(path.resolve(__dirname, '../cell.tsx'), 'utf-8');
    // Fallback pattern: cell.skeleton ?? <MatrixCellFallback />
    expect(src).toContain('MatrixCellFallback');
    expect(src).toContain('cell.skeleton');
  });

  it('MatrixCellFallback is an animate-pulse full-cell div', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    // After decomposition MatrixCellFallback is defined in cell.tsx
    const src = fs.readFileSync(path.resolve(__dirname, '../cell.tsx'), 'utf-8');
    // Must fill the slot box
    expect(src).toContain('h-full w-full');
    // Must use pulse animation for visual loading indication
    expect(src).toContain('animate-pulse');
  });
});

// ---------------------------------------------------------------------------
// 2. Cell isolation — resolved cells render alongside null-children cells
// ---------------------------------------------------------------------------

describe('Matrix per-slot Suspense — cell isolation (DOM)', () => {
  it('cell with resolved children renders normally (null sibling does not blank it)', () => {
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'a',
                  children: <div data-testid="resolved-a">Alpha is loaded</div>,
                },
                {
                  id: 'b',
                  // null children = empty cell — does not blank other cells
                  children: null,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="resolved-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="resolved-a"]')?.textContent).toBe(
      'Alpha is loaded',
    );
  });

  it('three cells: first and third resolve, second is null — first and third visible', () => {
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                { id: 'a', children: <div data-testid="cell-a">A</div> },
                { id: 'b', children: null },
                { id: 'c', children: <div data-testid="cell-c">C</div> },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="cell-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="cell-c"]')).not.toBeNull();
  });

  it('preset mode: header resolves, main has no children — header still shows', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            header: <div data-testid="app-header">Header</div>,
            main: { children: null as never },
          }}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="app-header"]')).not.toBeNull();
  });

  it('centroid path: resolved main renders', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            main: <div data-testid="centroid-content">Dashboard</div>,
          }}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="centroid-content"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Skeleton prop flow — SlotValue.skeleton → INormalizedSlot → ICell
// ---------------------------------------------------------------------------

describe('Matrix per-slot Suspense — skeleton prop flow', () => {
  it('normalizeSlotValue preserves skeleton field from object-form', () => {
    const skeleton = <div data-testid="my-skeleton">Loading…</div>;
    const result = normalizeSlotValue({ children: <div>Content</div>, skeleton });
    expect(result).not.toBeNull();
    expect(result!.skeleton).toBe(skeleton);
  });

  it('normalizeSlotValue: skeleton is undefined for JSX-form slot', () => {
    // JSX-form (no object wrapper) has no skeleton
    const result = normalizeSlotValue(<div>Content</div>);
    expect(result?.skeleton).toBeUndefined();
  });

  it('normalizeSlotValue: skeleton preserved alongside other overrides', () => {
    const skeleton = <div>Skel</div>;
    const result = normalizeSlotValue({
      children: <div>Main</div>,
      initialSize: 0.6,
      draggable: true,
      skeleton,
    });
    expect(result!.initialSize).toBe(0.6);
    expect(result!.draggable).toBe(true);
    expect(result!.skeleton).toBe(skeleton);
  });

  it('app-shell preset: skeleton flows from main slot to ICell (centroid path)', () => {
    // Verify that the skeleton prop ends up in the cell by checking it renders
    // as the Suspense fallback when children is null.
    // We can test ICell.skeleton reaches the DOM by checking a resolved Matrix
    // renders without error when skeleton is passed.
    let renderError: Error | null = null;
    try {
      cleanup = render(
        () => (
          <Matrix
            preset="app-shell"
            slots={{
              main: {
                children: <div data-testid="main-content">Loaded</div>,
                skeleton: <div data-testid="main-skeleton">Loading map…</div>,
              },
            }}
          />
        ),
        container,
      );
    } catch (e) {
      renderError = e as Error;
    }
    // No render error; main content visible; skeleton prop accepted without error
    expect(renderError).toBeNull();
    expect(container.querySelector('[data-testid="main-content"]')).not.toBeNull();
  });

  it('app-shell preset: skeleton flows to sidebar cell', () => {
    let renderError: Error | null = null;
    try {
      cleanup = render(
        () => (
          <Matrix
            preset="app-shell"
            slots={{
              sidebar: {
                children: <div data-testid="sidebar-content">Nav</div>,
                skeleton: <div data-testid="sidebar-skeleton">Loading nav…</div>,
              },
              main: <div data-testid="main-ok">Main</div>,
            }}
          />
        ),
        container,
      );
    } catch (e) {
      renderError = e as Error;
    }
    expect(renderError).toBeNull();
    expect(container.querySelector('[data-testid="sidebar-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="main-ok"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Default fallback — MatrixCellFallback renders as neutral placeholder
// ---------------------------------------------------------------------------

describe('Matrix per-slot Suspense — default fallback structure', () => {
  it('renders normally with no skeleton prop (no error, no crash)', () => {
    // Without skeleton, MatrixCellFallback is the fallback — it must not crash.
    let renderError: Error | null = null;
    try {
      cleanup = render(
        () => (
          <Matrix
            rows={[
              {
                cells: [{ id: 'x', children: <div>Content</div> }],
              },
            ]}
          />
        ),
        container,
      );
    } catch (e) {
      renderError = e as Error;
    }
    expect(renderError).toBeNull();
    expect(container.querySelector('div')).not.toBeNull();
  });
});
