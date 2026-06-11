/**
 * vt-route-content.test.tsx
 *
 * Verifies that the main slot (cell.id='main') carries the `vt-route-content`
 * CSS class in all render paths, and that non-main cells do NOT carry it.
 *
 * Also verifies depth-scoped view-transition-name per ADR 045 #3:
 * main-cell inline style must be `capsule-content-${depth}` where depth comes
 * from useRouteDepth() (web-router). web-style 5c will update the CSS selector
 * to match `capsule-content-*` pattern.
 *
 * `vt-route-content` CSS class is kept for backwards-compat with the existing
 * web-style selector during the gap between 5b and 5c merge.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Matrix } from '../matrix';

// ---------------------------------------------------------------------------
// Mock useRouteDepth (default depth = 0, root app-shell level)
// ---------------------------------------------------------------------------

vi.mock('@capsuletech/web-router', () => ({
  useRouteDepth: () => () => 0,
}));

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
// Preset path: app-shell centroid (only main)
// ---------------------------------------------------------------------------

describe('vt-route-content — preset app-shell centroid (only main)', () => {
  it('main cell carries vt-route-content class (centroid path)', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            main: <div data-testid="centroid-main">Main</div>,
          }}
        />
      ),
      container,
    );

    // Centroid path: single-row single-cell no-resizable → renders a plain <div>
    // (not a <main>), but the outer wrapper div carries vt-route-content.
    const content = container.querySelector('[data-testid="centroid-main"]');
    expect(content).not.toBeNull();

    // Walk up to find the vt-route-content wrapper
    const vtEl = content?.closest('.vt-route-content');
    expect(vtEl).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Preset path: app-shell full (header + sidebar + main + footer)
// ---------------------------------------------------------------------------

describe('vt-route-content — preset app-shell full layout', () => {
  it('only main cell carries vt-route-content; header/sidebar/footer do not', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            header: <div data-testid="vt-hdr">Header</div>,
            sidebar: <div data-testid="vt-side">Sidebar</div>,
            main: <div data-testid="vt-main">Main</div>,
            footer: <div data-testid="vt-ftr">Footer</div>,
          }}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="vt-main"]')).not.toBeNull();

    // Exactly one element with vt-route-content
    const vtEls = container.querySelectorAll('.vt-route-content');
    expect(vtEls.length).toBe(1);

    // That one element is <main>
    expect(vtEls[0].tagName.toLowerCase()).toBe('main');

    // Non-main semantic elements do NOT carry the class
    const headerEl = container.querySelector('header');
    expect(headerEl?.classList.contains('vt-route-content')).toBe(false);

    const footerEl = container.querySelector('footer');
    expect(footerEl?.classList.contains('vt-route-content')).toBe(false);

    const asideEl = container.querySelector('aside');
    expect(asideEl?.classList.contains('vt-route-content')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Raw rows: cell with id='main' also gets the class (convention applies)
// ---------------------------------------------------------------------------

describe('vt-route-content — raw rows with cell id=main', () => {
  it('raw rows single-cell: cell id=main carries vt-route-content (centroid path)', () => {
    // Single row, single cell, no resizable → centroid path in content.tsx.
    // Centroid renders a <div> (not a semantic element) but still carries the class.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'main',
                  tag: 'main',
                  children: <div data-testid="raw-main">Main</div>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const content = container.querySelector('[data-testid="raw-main"]');
    expect(content).not.toBeNull();
    const vtEl = content?.closest('.vt-route-content');
    expect(vtEl).not.toBeNull();
  });

  it('raw rows multi-cell resizable: cell id=main carries vt-route-content via renderCell', () => {
    // Two cells → NOT centroid → goes through renderRow → renderCell.
    // renderCell applies vt-route-content on the <Dynamic> element for id='main'.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              resizable: true,
              cells: [
                {
                  id: 'sidebar',
                  tag: 'aside',
                  children: <div data-testid="raw-sidebar">Sidebar</div>,
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'main',
                  tag: 'main',
                  children: <div data-testid="raw-main-2">Main</div>,
                  width: 0.75,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="raw-main-2"]')).not.toBeNull();

    // <main> tag with vt-route-content
    const mainEl = container.querySelector('main');
    expect(mainEl).not.toBeNull();
    expect(mainEl?.classList.contains('vt-route-content')).toBe(true);

    // <aside> does NOT carry it
    const asideEl = container.querySelector('aside');
    expect(asideEl?.classList.contains('vt-route-content')).toBe(false);
  });

  it('raw rows: cell id≠main does NOT carry vt-route-content', () => {
    // Two cells, neither named 'main' → neither gets the class.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              resizable: true,
              cells: [
                {
                  id: 'sidebar',
                  tag: 'aside',
                  children: <div data-testid="raw-sidebar-2">Sidebar</div>,
                  width: 0.3,
                  resizable: true,
                },
                {
                  id: 'content',
                  tag: 'section',
                  children: <div data-testid="raw-content">Content</div>,
                  width: 0.7,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="raw-content"]')).not.toBeNull();
    const vtEls = container.querySelectorAll('.vt-route-content');
    expect(vtEls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ADR 045 #3 — depth-scoped view-transition-name
//
// useRouteDepth() is mocked to () => 0 at module level (root depth).
// Tests verify inline style `view-transition-name: capsule-content-${depth}`.
// ---------------------------------------------------------------------------

describe('depth-scoped vt-name — centroid path (depth=0)', () => {
  it('main cell inline style carries capsule-content-0 at root depth', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            main: <div data-testid="depth-main-centroid">Main</div>,
          }}
        />
      ),
      container,
    );

    const content = container.querySelector('[data-testid="depth-main-centroid"]');
    expect(content).not.toBeNull();

    const vtEl = content?.closest('.vt-route-content') as HTMLElement | null;
    expect(vtEl).not.toBeNull();
    expect(vtEl?.style.getPropertyValue('view-transition-name')).toBe('capsule-content-0');
  });
});

describe('depth-scoped vt-name — multi-cell renderCell path (depth=0)', () => {
  it('main cell in resizable row carries capsule-content-0', () => {
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              resizable: true,
              cells: [
                {
                  id: 'sidebar',
                  tag: 'aside',
                  children: <div data-testid="depth-sidebar">Sidebar</div>,
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'main',
                  tag: 'main',
                  children: <div data-testid="depth-main-resize">Main</div>,
                  width: 0.75,
                  resizable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const mainEl = container.querySelector('main') as HTMLElement | null;
    expect(mainEl).not.toBeNull();
    expect(mainEl?.classList.contains('vt-route-content')).toBe(true);
    expect(mainEl?.style.getPropertyValue('view-transition-name')).toBe('capsule-content-0');

    // Non-main cell must not carry the style
    const asideEl = container.querySelector('aside') as HTMLElement | null;
    expect(asideEl?.style.getPropertyValue('view-transition-name')).toBeFalsy();
  });
});
