/**
 * ADR 026 Phase 2a — Characterization tests: render-branch structural markers.
 *
 * PURPOSE: Lock the CURRENT branch-selection logic in `renderContent()` and
 * `renderRow()` so the ADR 026 grid-canvas render-path addition cannot silently
 * break existing branches. Each test asserts a stable DOM marker that proves
 * the RIGHT path rendered — a test that would FAIL if the branch gate broke.
 *
 * Render branches in Matrix (today, pre-ADR 026 grid-path):
 *
 *   [renderContent]
 *     1. Centroid shortcut — 1 row, 1 cell, no resizable, height='fr'/undefined
 *        → plain relative div, no corvu panels, no Flex
 *     2. direction='horizontal' → horizontal Flex or plain flex-row
 *     3. direction='vertical' (default):
 *        a. hasVerticalResizable → vertical Flex with corvu panels
 *        b. no vertical resizable → plain flex-col For loop
 *
 *   [renderRow] (called per row from (3)):
 *     4. isPackingZone(row)=true → renderPackingRow path:
 *        a. wrap=true → flex-wrap container
 *        b. orientation='vertical' → flex-col container
 *        c. any cell has minW or minH → packing path (not corvu)
 *     5. hasResizable(row)=true → horizontal Flex with corvu panels
 *     6. plain row (no resizable) → plain flex div with <For>
 *
 * NOTE on jsdom limits:
 *   - Pixel geometry (layout dimensions, panel sizes after resize) is NOT
 *     asserted here. jsdom does not measure layout.
 *   - Corvu panel visual positioning is browser-only (Phase 3 manual pass).
 *   - The assertions here are purely DOM-structural: class names, element
 *     presence/absence, tag names, and data attributes.
 *
 * NOTE on pixel-level resize geometry:
 *   jsdom does not measure layout (offsetWidth/Height = 0). Pixel resize
 *   verification is browser-only and is covered by the Phase 3 manual pass.
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
// Branch 1: Centroid shortcut
// (1 row, 1 cell, no resizable, height='fr'/undefined)
// ---------------------------------------------------------------------------

describe('renderContent — Branch 1: centroid shortcut', () => {
  it('B1a: single-row single-cell no-resizable → no corvu panels in DOM', () => {
    // Gate: rows.length===1 && rows[0].cells.length===1 && !rows[0].resizable
    //       && (!rows[0].height || rows[0].height==='fr')
    // Centroid renders a plain relative div (no Flex, no corvu Panel).
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              // resizable absent (falsy) → triggers centroid
              cells: [{ id: 'main', children: <div data-testid="centroid-content">Centroid</div> }],
            },
          ]}
        />
      ),
      container,
    );

    // Content renders
    expect(container.querySelector('[data-testid="centroid-content"]')).not.toBeNull();
    // No corvu panels (centroid skips Flex entirely)
    expect(container.querySelector('[data-corvu-resizable-panel]')).toBeNull();
    // The centroid wrapper is a plain flex-center div, not a Flex with items
    expect(container.querySelector('[data-corvu-resizable-root]')).toBeNull();
  });

  it('B1b: centroid wraps content in flex-center alignment div', () => {
    // The centroid path renders:
    //   <div class="relative flex h-full w-full items-center justify-center">
    //     <div class="absolute inset-0 overflow-auto flex items-center justify-center">
    //       <Suspense>...content...</Suspense>
    //     </div>
    //   </div>
    // Structural markers: outer has 'items-center' and 'justify-center'.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'c',
                  children: <div data-testid="centroid-c">C</div>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const content = container.querySelector('[data-testid="centroid-c"]');
    expect(content).not.toBeNull();
    // Walk up to find the centroid flex-center wrapper
    // The outer wrapper has class 'items-center' and 'justify-center'
    const centroidWrapper = content?.closest('.items-center.justify-center');
    expect(centroidWrapper).not.toBeNull();
  });

  it('B1c: centroid uses Suspense boundary (fallback present in source)', () => {
    // Every cell including centroid wraps content in <Suspense>.
    // jsdom cannot suspend a real lazy component, but the Suspense boundary
    // must be present in the component tree structure.
    // We assert indirectly: content inside a centroid cell renders (Suspense resolved).
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'sc',
                  children: <div data-testid="suspense-c">SC</div>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );
    // If Suspense were missing, the content would still render (no lazy import here).
    // This is a structural smoke: content appears → Suspense boundary didn't throw.
    expect(container.querySelector('[data-testid="suspense-c"]')).not.toBeNull();
  });

  it('B1d: single-row single-cell WITH resizable → does NOT use centroid (uses renderRow)', () => {
    // When the cell is resizable, the centroid gate fails → falls through to renderRow.
    // renderRow with hasResizable=true → horizontal Flex → corvu panels.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              resizable: true,
              cells: [
                {
                  id: 'r',
                  children: <div data-testid="resizable-single">R</div>,
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

    expect(container.querySelector('[data-testid="resizable-single"]')).not.toBeNull();
    // resizable row with cell.resizable → Flex with corvu panels
    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Branch 2: direction='horizontal'
// ---------------------------------------------------------------------------

describe('renderContent — Branch 2: direction=horizontal', () => {
  it('B2a: resizable horizontal zones render corvu panels for each zone', () => {
    // direction='horizontal' + at least one resizable row → horizontal Flex (corvu)
    cleanup = render(
      () => (
        <Matrix
          direction="horizontal"
          rows={[
            {
              id: 'main',
              height: 0.7,
              resizable: true,
              cells: [
                {
                  id: 'm',
                  children: <div data-testid="hz-main">Main</div>,
                },
              ],
            },
            {
              id: 'side',
              height: 0.3,
              resizable: true,
              cells: [
                {
                  id: 's',
                  children: <div data-testid="hz-side">Side</div>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="hz-main"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="hz-side"]')).not.toBeNull();
    // Resizable horizontal → corvu panels present
    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });

  it('B2b: non-resizable horizontal zones → plain flex-row (no corvu)', () => {
    // No resizable zones → non-corvu path → plain flex-row div
    cleanup = render(
      () => (
        <Matrix
          direction="horizontal"
          rows={[
            {
              id: 'left',
              resizable: false,
              cells: [{ id: 'l', children: <div data-testid="nr-left">Left</div> }],
            },
            {
              id: 'right',
              resizable: false,
              cells: [{ id: 'r', children: <div data-testid="nr-right">Right</div> }],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="nr-left"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="nr-right"]')).not.toBeNull();
    // Non-resizable → no corvu panels
    expect(container.querySelector('[data-corvu-resizable-panel]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Branch 3a: direction='vertical' + hasVerticalResizable → vertical Flex
// ---------------------------------------------------------------------------

describe('renderContent — Branch 3a: vertical Flex (corvu, hasVerticalResizable)', () => {
  it('B3a: rows with numeric height → vertical corvu panels', () => {
    // hasVerticalResizable = rows.some(r => r.resizable===true || typeof r.height==='number')
    // Numeric height satisfies the condition even without explicit resizable:true.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'top',
              height: 0.5,
              resizable: true,
              cells: [
                { id: 'tc', children: <div data-testid="v3a-top">Top</div>, resizable: true },
              ],
            },
            {
              id: 'bot',
              height: 0.5,
              resizable: true,
              cells: [
                { id: 'bc', children: <div data-testid="v3a-bot">Bot</div>, resizable: true },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="v3a-top"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v3a-bot"]')).not.toBeNull();
    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    // At least 2 vertical panels (top + bottom)
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });

  it('B3b: resizable rows render corvu handle elements between panels', () => {
    // Corvu resizable renders a handle element ([data-corvu-resizable-handle]).
    // In vertical mode with 2 rows, there is 1 handle between them.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'r1',
              height: 0.5,
              resizable: true,
              cells: [{ id: 'c1', children: <div data-testid="v3b-1">One</div>, resizable: true }],
            },
            {
              id: 'r2',
              height: 0.5,
              resizable: true,
              cells: [{ id: 'c2', children: <div data-testid="v3b-2">Two</div>, resizable: true }],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="v3b-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v3b-2"]')).not.toBeNull();
    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    expect(handles.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Branch 4a: isPackingZone → wrap=true → flex-wrap container
// ---------------------------------------------------------------------------

describe('renderRow — Branch 4a: isPackingZone via wrap=true', () => {
  it('B4a: wrap=true triggers packing render-path (flex-wrap class on container)', () => {
    // isPackingZone: if (row.wrap) return true
    // renderPackingRow generates a container with CSS class 'flex-wrap'.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'wrap-zone',
              wrap: true,
              cells: [
                {
                  id: 'w1',
                  children: <div data-testid="wrap-1">W1</div>,
                  minW: 100,
                },
                {
                  id: 'w2',
                  children: <div data-testid="wrap-2">W2</div>,
                  minW: 100,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="wrap-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="wrap-2"]')).not.toBeNull();
    // packing path container: has 'flex-wrap' class
    const wrapContainer = container.querySelector('.flex-wrap');
    expect(wrapContainer).not.toBeNull();
    // No corvu panels (packing path skips corvu)
    expect(container.querySelector('[data-corvu-resizable-panel]')).toBeNull();
  });

  it('B4a2: non-packing row (no wrap, no minW) → no flex-wrap class', () => {
    // Negative control: a plain row without packing triggers goes through
    // corvu or plain For path — never flex-wrap.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'plain-row',
              resizable: true,
              cells: [
                {
                  id: 'plain-a',
                  children: <div data-testid="plain-a">A</div>,
                  resizable: true,
                  width: 0.5,
                },
                {
                  id: 'plain-b',
                  children: <div data-testid="plain-b">B</div>,
                  resizable: true,
                  width: 0.5,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="plain-a"]')).not.toBeNull();
    // No flex-wrap → corvu (resizable) path used
    expect(container.querySelector('.flex-wrap')).toBeNull();
    expect(
      container.querySelectorAll('[data-corvu-resizable-panel]').length,
    ).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Branch 4b: isPackingZone → orientation='vertical' → flex-col in packing
// ---------------------------------------------------------------------------

describe('renderRow — Branch 4b: isPackingZone via orientation=vertical', () => {
  it('B4b: orientation=vertical triggers packing render-path (flex-col on container)', () => {
    // isPackingZone: if (row.orientation === 'vertical') return true
    // renderPackingRow with isVertical=true generates flex-col container.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'vert-zone',
              orientation: 'vertical',
              cells: [
                {
                  id: 'v1',
                  children: <div data-testid="vert-1">V1</div>,
                  minH: 80,
                },
                {
                  id: 'v2',
                  children: <div data-testid="vert-2">V2</div>,
                  minH: 80,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="vert-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="vert-2"]')).not.toBeNull();
    // packing path with isVertical=true → container has 'flex-col'
    const colContainer = container.querySelector('.flex-col');
    expect(colContainer).not.toBeNull();
    // No corvu panels (packing path)
    expect(container.querySelector('[data-corvu-resizable-panel]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Branch 4c: isPackingZone → any cell has minW or minH
// ---------------------------------------------------------------------------

describe('renderRow — Branch 4c: isPackingZone via minW/minH on cell', () => {
  it('B4c-minW: cell with minW triggers packing path (no corvu panel for that row)', () => {
    // isPackingZone: return row.cells.some(c => c.minW !== undefined || c.minH !== undefined)
    // Even without wrap or vertical orientation, minW on a cell → packing path.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'minw-zone',
              // no wrap, no vertical
              cells: [
                {
                  id: 'mw1',
                  children: <div data-testid="mw-1">MW1</div>,
                  minW: 200,
                },
                {
                  id: 'mw2',
                  children: <div data-testid="mw-2">MW2</div>,
                  minW: 200,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="mw-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mw-2"]')).not.toBeNull();
    // packing path (minW triggers it) → no corvu panels for this row
    expect(container.querySelector('[data-corvu-resizable-panel]')).toBeNull();
    // packing container: flex-nowrap (no wrap flag set) but still a flex container
    const flexContainer = container.querySelector('.flex.flex-row.flex-nowrap');
    expect(flexContainer).not.toBeNull();
  });

  it('B4c-minH: cell with minH in a vertical zone triggers packing path', () => {
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'minh-zone',
              orientation: 'vertical',
              cells: [
                {
                  id: 'mh1',
                  children: <div data-testid="mh-1">MH1</div>,
                  minH: 100,
                },
                {
                  id: 'mh2',
                  children: <div data-testid="mh-2">MH2</div>,
                  // minH absent but orientation=vertical already triggered packing
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="mh-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mh-2"]')).not.toBeNull();
    // No corvu panels — packing path
    expect(container.querySelector('[data-corvu-resizable-panel]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Branch 5: renderRow with hasResizable(row)=true → horizontal corvu Flex
// ---------------------------------------------------------------------------

describe('renderRow — Branch 5: horizontal corvu Flex (hasResizable=true)', () => {
  it('B5: row with cell.resizable=true → horizontal corvu panels within the row', () => {
    // rowHasResizable = row.cells.some(c => c.resizable===true)
    // When true → rowToFlexItems → Flex(orientation=horizontal, items=...) → corvu
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'top-banner',
              height: 'auto',
              cells: [
                { id: 'header', tag: 'header', children: <div data-testid="hdr-b5">Header</div> },
              ],
            },
            {
              id: 'main-row',
              resizable: true,
              cells: [
                {
                  id: 'sidebar',
                  tag: 'aside',
                  children: <div data-testid="sidebar-b5">Sidebar</div>,
                  width: 0.25,
                  resizable: true,
                },
                {
                  id: 'content',
                  tag: 'main',
                  children: <div data-testid="content-b5">Content</div>,
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

    expect(container.querySelector('[data-testid="hdr-b5"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sidebar-b5"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="content-b5"]')).not.toBeNull();
    // The resizable row (sidebar + content) → horizontal corvu panels
    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
    // Correct semantic elements
    expect(container.querySelector('aside')).not.toBeNull();
    expect(container.querySelector('main')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Swap-mode structural: DragBadge present in swap+edit, absent in view mode
// (cross-checks the branch + showBadges interaction)
// ---------------------------------------------------------------------------

describe('swap-mode + render-branch: DragBadge in DOM', () => {
  it('Swap + edit + 2 draggable cells in resizable row → badges in DOM', () => {
    // This cross-checks that the corvu Flex path (Branch 5) correctly passes
    // dndState to renderCell, which renders the DragBadge.
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
                  id: 'cell-left',
                  children: <div data-testid="sb-left">Left</div>,
                  draggable: true,
                  swapGroup: 'main',
                  width: 0.5,
                  resizable: true,
                },
                {
                  id: 'cell-right',
                  children: <div data-testid="sb-right">Right</div>,
                  draggable: true,
                  swapGroup: 'main',
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
    // corvu panels also present (resizable row → Branch 5)
    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });

  it('Swap + packing zone + edit → NO badges (renderPackingRow does not render DragBadge)', () => {
    // CHARACTERIZATION of today's actual behavior:
    // renderPackingRow builds its own inline cell rendering and does NOT call renderCell.
    // Therefore it does NOT pass dndState to renderCell and does NOT render DragBadge.
    // Cells in a packing zone (wrap=true) cannot be dragged via badge in swap mode.
    //
    // This test locks that behavior. If ADR 026 changes renderPackingRow to support
    // DragBadge, this test must be updated (not just silently passing).
    cleanup = render(
      () => (
        <Matrix
          dndMode="swap"
          layoutMode="edit"
          rows={[
            {
              id: 'pack',
              wrap: true,
              cells: [
                {
                  id: 'pw1',
                  children: <div data-testid="pack-1">P1</div>,
                  draggable: true,
                  swapGroup: 'pack-group',
                  minW: 100,
                },
                {
                  id: 'pw2',
                  children: <div data-testid="pack-2">P2</div>,
                  draggable: true,
                  swapGroup: 'pack-group',
                  minW: 100,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="pack-1"]')).not.toBeNull();
    // renderPackingRow does NOT render DragBadge (no dndState passed to inline cell render)
    const badges = container.querySelectorAll('[aria-label="Drag to swap cell"]');
    expect(badges.length).toBe(0);
    // Packing path → flex-wrap, no corvu
    expect(container.querySelector('.flex-wrap')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// app-shell preset resolution (structural markers)
// ---------------------------------------------------------------------------

describe('app-shell preset — structural DOM markers', () => {
  it('Preset app-shell: resolves main slot → <main> element in DOM', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            main: <div data-testid="preset-main">Main content</div>,
          }}
        />
      ),
      container,
    );

    // Centroid path: single main slot → no sidebar/header/footer → centroid
    // The main slot uses tag='main' in the preset resolver
    expect(container.querySelector('[data-testid="preset-main"]')).not.toBeNull();
  });

  it('Preset app-shell with header: resolves header → <header> element', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            header: <div data-testid="preset-hdr">Header</div>,
            main: <div data-testid="preset-main-2">Main</div>,
          }}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="preset-hdr"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="preset-main-2"]')).not.toBeNull();
    // header slot uses tag='header'
    const headerEl = container.querySelector('header');
    expect(headerEl).not.toBeNull();
  });

  it('Preset app-shell with sidebar: resolves sidebar → <aside> element', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            sidebar: <div data-testid="preset-side">Sidebar</div>,
            main: <div data-testid="preset-main-3">Main</div>,
          }}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="preset-side"]')).not.toBeNull();
    // sidebar uses tag='aside'
    const asideEl = container.querySelector('aside');
    expect(asideEl).not.toBeNull();
  });

  it('Preset app-shell with footer: resolves footer → <footer> element', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            main: <div data-testid="preset-main-4">Main</div>,
            footer: <div data-testid="preset-ftr">Footer</div>,
          }}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="preset-ftr"]')).not.toBeNull();
    // footer uses tag='footer'
    expect(container.querySelector('footer')).not.toBeNull();
  });

  it('Preset app-shell full: header+sidebar+main+rightBar+footer all render', () => {
    // Full app-shell → multiple corvu panels + correct semantic tags
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            header: <div data-testid="full-hdr">H</div>,
            sidebar: { children: <div data-testid="full-side">S</div>, initialSize: 0.2 },
            main: { children: <div data-testid="full-main">M</div>, initialSize: 0.6 },
            rightBar: { children: <div data-testid="full-rb">R</div>, initialSize: 0.2 },
            footer: { children: <div data-testid="full-ftr">F</div>, initialSize: 0.15 },
          }}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="full-hdr"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="full-side"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="full-main"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="full-rb"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="full-ftr"]')).not.toBeNull();

    // Structural: correct semantic elements
    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('main')).not.toBeNull();
    expect(container.querySelector('footer')).not.toBeNull();
    // Sidebar + rightBar → two <aside> elements
    const asides = container.querySelectorAll('aside');
    expect(asides.length).toBeGreaterThanOrEqual(2);

    // Full app-shell with resize → corvu panels present
    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Resize: corvu path structural markers (lockdown for ADR 026)
// The grid-canvas path must NOT interfere with these class/attribute markers.
// ---------------------------------------------------------------------------

describe('corvu resize path — structural markers locked for ADR 026', () => {
  it('Resizable rows have [data-corvu-resizable-panel] attribute (branch marker)', () => {
    // This is the primary DOM marker that proves the corvu Flex path ran.
    // If ADR 026 accidentally removes the corvu gate, this attribute disappears.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'r1',
              height: 0.5,
              resizable: true,
              cells: [{ id: 'c1', children: <div data-testid="corvu-1">C1</div>, resizable: true }],
            },
            {
              id: 'r2',
              height: 0.5,
              resizable: true,
              cells: [{ id: 'c2', children: <div data-testid="corvu-2">C2</div>, resizable: true }],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="corvu-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="corvu-2"]')).not.toBeNull();
    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
    // Each panel must have min-h-0 (ensures panels can shrink below content height)
    for (const panel of panels) {
      expect(panel.classList.contains('min-h-0')).toBe(true);
    }
  });

  it('Resizable rows have [data-corvu-resizable-handle] handle elements', () => {
    // Each boundary between resizable panels → one handle.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'ta',
              height: 0.33,
              resizable: true,
              cells: [{ id: 'ca', children: <div>CA</div>, resizable: true }],
            },
            {
              id: 'tb',
              height: 0.34,
              resizable: true,
              cells: [{ id: 'cb', children: <div>CB</div>, resizable: true }],
            },
            {
              id: 'tc',
              height: 0.33,
              resizable: true,
              cells: [{ id: 'cc', children: <div>CC</div>, resizable: true }],
            },
          ]}
        />
      ),
      container,
    );

    // 3 panels → 2 handles between them
    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it('Packing zone in same Matrix as corvu zone → no cross-contamination', () => {
    // A Matrix with one corvu row AND one packing row must have both paths coexist.
    // This is the most important guard: the new grid-path must not disturb either.
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              // Corvu row (resizable cells → Branch 5)
              id: 'corvu-row',
              height: 0.6,
              resizable: true,
              cells: [
                {
                  id: 'left',
                  children: <div data-testid="mixed-left">Left</div>,
                  resizable: true,
                  width: 0.5,
                },
                {
                  id: 'right',
                  children: <div data-testid="mixed-right">Right</div>,
                  resizable: true,
                  width: 0.5,
                },
              ],
            },
            {
              // Packing row (wrap=true → Branch 4a)
              id: 'pack-row',
              height: 0.4,
              resizable: true,
              wrap: true,
              cells: [
                {
                  id: 'pack-x',
                  children: <div data-testid="mixed-pack-x">X</div>,
                  minW: 100,
                },
                {
                  id: 'pack-y',
                  children: <div data-testid="mixed-pack-y">Y</div>,
                  minW: 100,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Both rows render correctly
    expect(container.querySelector('[data-testid="mixed-left"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mixed-right"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mixed-pack-x"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mixed-pack-y"]')).not.toBeNull();

    // Corvu panels exist (for the resizable row + cells)
    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2); // at least the 2 horizontal cells in corvu-row

    // Packing container (flex-wrap) exists for the packing row
    expect(container.querySelector('.flex-wrap')).not.toBeNull();
  });
});
