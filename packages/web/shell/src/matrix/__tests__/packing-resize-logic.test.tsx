/**
 * ADR 026 Phase 2a — Characterization tests: packing resize signal + min-floor clamp.
 *
 * PURPOSE: Lock the CURRENT packing-zone resize-handle behavior so the ADR 026
 * grid-canvas path addition cannot silently break it.
 *
 * What's tested here:
 *   R1. cellSizeMap signal: after a pointerdown+pointermove sequence on a
 *       packing resize handle, the cell's explicit px size is written into the
 *       reactive signal and reflected in the cell's style attribute.
 *   R2. Min-floor clamp: the resize handle enforces Math.max(minFloor, startPx + delta).
 *       In jsdom, offsetWidth/offsetHeight are always 0, so startPx = 0.
 *       Positive delta → new size = delta (no floor hit).
 *       Negative delta + minW floor → size = minW (floor holds).
 *   R3. setCellSize independence: resizing cell A does not affect cell B's style.
 *   R4. Min-floor is cell.minW (horizontal) / cell.minH (vertical).
 *       Horizontal handle uses offsetWidth; vertical uses offsetHeight.
 *       Both are 0 in jsdom, so startPx = 0 for all cases.
 *
 * NOTE on jsdom limits:
 *   jsdom does not measure layout. offsetWidth and offsetHeight always return 0.
 *   Therefore:
 *     - startPx is always 0 for all pointer events in these tests.
 *     - Actual pixel sizes after a real browser resize will differ.
 *     - This is intentional: we are testing the LOGIC (signal write + clamp),
 *       not the visual geometry.
 *
 *   Pixel-level resize geometry (what the user sees when dragging) is browser-only
 *   and is part of the Phase 3 manual pass, not covered here.
 *
 * NOTE on what we cannot test here:
 *   - Visual panel size after corvu resize (corvu measures DOM; jsdom gives 0).
 *   - The ew-resize / ns-resize cursor visual (CSS only, not DOM-queryable by class).
 *   - setPointerCapture (not implemented in jsdom) — handle.setPointerCapture?.()
 *     is called with optional-chaining so absence doesn't throw.
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
// Helper: fire a pointerdown+pointermove+pointerup sequence on a handle element.
// jsdom does not implement setPointerCapture, but the handle uses ?.() so no throw.
// ---------------------------------------------------------------------------

function fireResizeDrag(
  handle: HTMLElement,
  startX: number,
  endX: number,
  startY = 0,
  endY = 0,
): void {
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      clientX: startX,
      clientY: startY,
    }),
  );
  // pointermove is on handle (registered by the onPointerDown handler)
  handle.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      clientX: endX,
      clientY: endY,
    }),
  );
  handle.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
    }),
  );
}

// ---------------------------------------------------------------------------
// R1. cellSizeMap signal: explicit px size written to cell style after drag
// ---------------------------------------------------------------------------

describe('packing resize handle — cellSizeMap signal update (R1)', () => {
  it('R1a: dragging horizontal handle by +200px writes explicit width to cell style', () => {
    // jsdom: offsetWidth = 0, so startPx = 0.
    // pointermove delta = endX - startX = 200 - 0 = 200.
    // Math.max(minFloor=0, 0 + 200) = 200.
    // cellSizeMap.set(cellId, 200) → cell style: width=200px, flex-shrink=0, flex-grow=0.
    // Two cells needed to avoid centroid shortcut (which has no resize handle).
    cleanup = render(
      () => (
        <Matrix
          dnd="insert"
          resize={true}
          rows={[
            {
              id: 'h-zone',
              wrap: true,
              cells: [
                {
                  id: 'cell-target',
                  children: <div data-testid="target">Target</div>,
                  minW: 50,
                  draggable: true,
                },
                {
                  id: 'cell-other',
                  children: <div data-testid="other">Other</div>,
                  minW: 50,
                  draggable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handle = container.querySelector('.cursor-ew-resize') as HTMLElement | null;
    expect(handle).not.toBeNull();

    // Before drag: cell uses flex:1 (no explicit width set)
    const cellEl = handle!.parentElement as HTMLElement;
    const styleBefore = cellEl.getAttribute('style') ?? '';
    // Before drag: flex:1 (or equivalent — no explicit px width)
    expect(styleBefore).not.toContain('200px');

    // Drag +200px
    fireResizeDrag(handle!, 0, 200);

    // After drag: cell style has explicit width = 200px
    const styleAfter = cellEl.getAttribute('style') ?? '';
    expect(styleAfter).toContain('200px');
  });

  it('R1b: handle renders in packing zone with minW cells (edit mode gate)', () => {
    // Ensure the handle is created by renderPackingRow (not renderRow).
    // Two cells with minW → isPackingZone=true → renderPackingRow → resize handle.
    cleanup = render(
      () => (
        <Matrix
          resize={true}
          rows={[
            {
              id: 'minw-packing',
              wrap: false,
              cells: [
                {
                  id: 'ca',
                  children: <div data-testid="ca-r1b">A</div>,
                  minW: 100,
                },
                {
                  id: 'cb',
                  children: <div data-testid="cb-r1b">B</div>,
                  minW: 100,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="ca-r1b"]')).not.toBeNull();
    // Resize handles present (edit mode, packing zone)
    const handles = container.querySelectorAll('.cursor-ew-resize');
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it('R1c: NO handle when resize=false (resize guard)', () => {
    cleanup = render(
      () => (
        <Matrix
          resize={false}
          rows={[
            {
              id: 'view-pack',
              wrap: true,
              cells: [
                { id: 'v1', children: <div>V1</div>, minW: 100 },
                { id: 'v2', children: <div>V2</div>, minW: 100 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('.cursor-ew-resize')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// R2. Min-floor clamp: Math.max(minFloor, startPx + delta)
// ---------------------------------------------------------------------------

describe('packing resize handle — min-floor clamp (R2)', () => {
  it('R2a: positive delta beyond minW → cell gets delta as explicit width', () => {
    // startPx = 0 (jsdom). delta = +300. minW = 80. Math.max(80, 0+300) = 300.
    // Cell style should have width: 300px.
    cleanup = render(
      () => (
        <Matrix
          dnd="insert"
          resize={true}
          rows={[
            {
              id: 'clamp-zone',
              wrap: true,
              cells: [
                {
                  id: 'clamp-a',
                  children: <div data-testid="clamp-a-pos">A</div>,
                  minW: 80,
                  draggable: true,
                },
                {
                  id: 'clamp-b',
                  children: <div data-testid="clamp-b-pos">B</div>,
                  minW: 80,
                  draggable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Find handle for the first cell (first cursor-ew-resize element)
    const handles = container.querySelectorAll('.cursor-ew-resize');
    expect(handles.length).toBeGreaterThanOrEqual(1);
    const handle = handles[0] as HTMLElement;
    const cellEl = handle.parentElement as HTMLElement;

    // Drag to x=300 (delta=300, startX=0)
    fireResizeDrag(handle, 0, 300);

    const styleAfter = cellEl.getAttribute('style') ?? '';
    // 300 > minW(80) → Math.max(80, 0+300) = 300
    expect(styleAfter).toContain('300px');
  });

  it('R2b: large negative delta → clamped to minW floor (not below minimum)', () => {
    // startPx = 0 (jsdom). delta = -999. minW = 120. Math.max(120, 0+(-999)) = 120.
    // Cell width must be 120px (the floor), not negative or zero.
    cleanup = render(
      () => (
        <Matrix
          dnd="insert"
          resize={true}
          rows={[
            {
              id: 'floor-zone',
              wrap: true,
              cells: [
                {
                  id: 'floor-a',
                  children: <div data-testid="floor-a">A</div>,
                  minW: 120,
                  draggable: true,
                },
                {
                  id: 'floor-b',
                  children: <div data-testid="floor-b">B</div>,
                  minW: 120,
                  draggable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handles = container.querySelectorAll('.cursor-ew-resize');
    const handle = handles[0] as HTMLElement;
    const cellEl = handle.parentElement as HTMLElement;

    // Drag far left (delta = -999)
    fireResizeDrag(handle, 0, -999);

    const styleAfter = cellEl.getAttribute('style') ?? '';
    // Clamped to minW=120: Math.max(120, 0 + (-999)) = 120
    expect(styleAfter).toContain('120px');
    // Must NOT contain negative sizes
    expect(styleAfter).not.toMatch(/-\d+px/);
  });

  it('R2c: minW=0 (no floor) → large negative delta results in 0px size', () => {
    // When cell.minW is absent: minFloor = 0. Math.max(0, 0 + (-50)) = 0.
    // The cell gets explicit width: 0px (edge case; real browser would have native min-content).
    cleanup = render(
      () => (
        <Matrix
          dnd="insert"
          resize={true}
          rows={[
            {
              id: 'zero-floor-zone',
              wrap: true,
              cells: [
                {
                  id: 'zf-a',
                  children: <div data-testid="zf-a">A</div>,
                  // minW absent → minFloor=0 in the handle
                  draggable: true,
                },
                {
                  id: 'zf-b',
                  children: <div data-testid="zf-b">B</div>,
                  draggable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handles = container.querySelectorAll('.cursor-ew-resize');
    const handle = handles[0] as HTMLElement;
    const cellEl = handle.parentElement as HTMLElement;

    // Drag: delta = -50, minFloor = 0 (no minW). Math.max(0, 0-50) = 0.
    fireResizeDrag(handle, 0, -50);

    const styleAfter = cellEl.getAttribute('style') ?? '';
    // Result: 0px (Math.max(0, -50) = 0)
    expect(styleAfter).toContain('0px');
  });

  it('R2d: vertical handle — ns-resize, minH floor clamped (delta on Y axis)', () => {
    // Vertical packing zone: handle is cursor-ns-resize, measures Y-axis.
    // startPx = offsetHeight = 0 (jsdom). startY = 0, endY = 250.
    // Math.max(minH=60, 0 + 250) = 250.
    cleanup = render(
      () => (
        <Matrix
          dnd="insert"
          resize={true}
          rows={[
            {
              id: 'vert-floor-zone',
              orientation: 'vertical',
              cells: [
                {
                  id: 'vf-a',
                  children: <div data-testid="vf-a">A</div>,
                  minH: 60,
                  draggable: true,
                },
                {
                  id: 'vf-b',
                  children: <div data-testid="vf-b">B</div>,
                  minH: 60,
                  draggable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handles = container.querySelectorAll('.cursor-ns-resize');
    expect(handles.length).toBeGreaterThanOrEqual(1);
    const handle = handles[0] as HTMLElement;
    const cellEl = handle.parentElement as HTMLElement;

    // Drag down 250px on Y axis
    fireResizeDrag(handle, 0, 0, 0, 250);

    const styleAfter = cellEl.getAttribute('style') ?? '';
    // 250 > minH(60) → height = 250px
    expect(styleAfter).toContain('250px');
  });

  it('R2e: vertical handle — negative Y delta clamped to minH floor', () => {
    // Drag up -999px. minH = 80. Math.max(80, 0 + (-999)) = 80.
    cleanup = render(
      () => (
        <Matrix
          resize={true}
          rows={[
            {
              id: 'vert-neg-zone',
              orientation: 'vertical',
              cells: [
                {
                  id: 'vn-a',
                  children: <div data-testid="vn-a">A</div>,
                  minH: 80,
                },
                {
                  id: 'vn-b',
                  children: <div data-testid="vn-b">B</div>,
                  minH: 80,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handles = container.querySelectorAll('.cursor-ns-resize');
    const handle = handles[0] as HTMLElement;
    const cellEl = handle.parentElement as HTMLElement;

    // Drag far up (delta Y = -999)
    fireResizeDrag(handle, 0, 0, 0, -999);

    const styleAfter = cellEl.getAttribute('style') ?? '';
    // Clamped to minH=80
    expect(styleAfter).toContain('80px');
    expect(styleAfter).not.toMatch(/-\d+px/);
  });
});

// ---------------------------------------------------------------------------
// R3. setCellSize independence: resizing cell A does not affect cell B
// ---------------------------------------------------------------------------

describe('packing resize handle — per-cell independence (R3)', () => {
  it('R3: resizing cell A leaves cell B with flex:1 (unset explicit size)', () => {
    // setCellSizeMap creates a new Map on each call (immutable update).
    // Updating cellId='a' only modifies the entry for 'a'; 'b' remains absent.
    // Cell B style still has flex:1 (no explicit width set).
    cleanup = render(
      () => (
        <Matrix
          dnd="insert"
          resize={true}
          rows={[
            {
              id: 'indep-zone',
              wrap: true,
              cells: [
                {
                  id: 'indep-a',
                  children: <div data-testid="ia">A</div>,
                  minW: 100,
                  draggable: true,
                },
                {
                  id: 'indep-b',
                  children: <div data-testid="ib">B</div>,
                  minW: 100,
                  draggable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handles = container.querySelectorAll('.cursor-ew-resize');
    expect(handles.length).toBe(2); // one per cell

    const handleA = handles[0] as HTMLElement;
    const cellAEl = handleA.parentElement as HTMLElement;
    const handleB = handles[1] as HTMLElement;
    const cellBEl = handleB.parentElement as HTMLElement;

    // Verify cells are distinct DOM nodes
    expect(cellAEl).not.toBe(cellBEl);

    // Drag handle A by 200px
    fireResizeDrag(handleA, 0, 200);

    const styleA = cellAEl.getAttribute('style') ?? '';
    const styleB = cellBEl.getAttribute('style') ?? '';

    // A has explicit width set
    expect(styleA).toContain('200px');

    // B is NOT affected — still has flex:1 (explicit not set)
    // In Solid's reactive system, setCellSizeMap only updates the signal for the
    // cell that called setCellSize; reading getCellSize('indep-b') returns undefined.
    // cellStyle() for B then returns { flex: '1' } (the else branch).
    expect(styleB).not.toContain('200px');
    // B style should have flex (either '1' or the flex shorthand for flex:1)
    expect(styleB).toContain('1');
  });

  it('R3b: each handle is a sibling of its cell (not a child of another cell)', () => {
    // Architecture: resize handle lives inside the cell's Dynamic component.
    // This confirms that handle[0].parentElement === first cell and
    // handle[1].parentElement === second cell (not the same parent).
    cleanup = render(
      () => (
        <Matrix
          resize={true}
          rows={[
            {
              id: 'sib-zone',
              wrap: true,
              cells: [
                { id: 'sib-1', children: <div data-testid="s1">S1</div>, minW: 80 },
                { id: 'sib-2', children: <div data-testid="s2">S2</div>, minW: 80 },
                { id: 'sib-3', children: <div data-testid="s3">S3</div>, minW: 80 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handles = container.querySelectorAll('.cursor-ew-resize');
    expect(handles.length).toBe(3); // one per cell

    // Each handle's parent must be distinct (each handle is inside its own cell)
    const parents = Array.from(handles).map((h) => h.parentElement);
    const uniqueParents = new Set(parents);
    expect(uniqueParents.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// R4. data-dnd-cancel attribute on handle (prevents drag interference)
// ---------------------------------------------------------------------------

describe('packing resize handle — data-dnd-cancel marker (R4)', () => {
  it('R4: resize handle has data-dnd-cancel attribute (prevents drag engine from intercepting)', () => {
    // The handle element has data-dnd-cancel="" so createDraggable's pointerdown
    // handler bails out before starting a drag (DnD checks closest('[data-dnd-cancel]')).
    // This is a stability marker: removing it would break resize-during-edit UX.
    cleanup = render(
      () => (
        <Matrix
          dnd="insert"
          resize={true}
          rows={[
            {
              id: 'dnd-cancel-zone',
              wrap: true,
              cells: [
                {
                  id: 'dc-1',
                  children: <div data-testid="dc1">DC1</div>,
                  minW: 100,
                  draggable: true,
                },
                {
                  id: 'dc-2',
                  children: <div data-testid="dc2">DC2</div>,
                  minW: 100,
                  draggable: true,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handle = container.querySelector('.cursor-ew-resize') as HTMLElement | null;
    expect(handle).not.toBeNull();
    // data-dnd-cancel attribute must be present (value is empty string "")
    expect(handle!.hasAttribute('data-dnd-cancel')).toBe(true);
  });

  it('R4b: vertical handle also has data-dnd-cancel', () => {
    cleanup = render(
      () => (
        <Matrix
          resize={true}
          rows={[
            {
              id: 'vert-cancel-zone',
              orientation: 'vertical',
              cells: [
                { id: 'vc-1', children: <div>VC1</div>, minH: 80 },
                { id: 'vc-2', children: <div>VC2</div>, minH: 80 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const handle = container.querySelector('.cursor-ns-resize') as HTMLElement | null;
    expect(handle).not.toBeNull();
    expect(handle!.hasAttribute('data-dnd-cancel')).toBe(true);
  });
});
