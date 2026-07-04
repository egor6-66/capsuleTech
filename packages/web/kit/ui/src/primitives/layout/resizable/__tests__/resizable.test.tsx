/**
 * Resizable primitive — behaviour tests.
 *
 * Tests are organised in groups:
 * 1. items-mode tests (migrated from flex.test.tsx, adapted Flex->Resizable, IFlexItem->IResizableItem).
 * 2. children-mode smoke tests (new in Resizable).
 *
 * The vitest config includes vite-plugin-solid, so .tsx tests with JSX are fully supported.
 */
/* @vitest-environment jsdom */
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IResizableItem } from '../interfaces';
import { Resizable } from '../resizable';

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
  document.body.removeChild(container);
});

describe('Resizable — items without resizable:true renders as plain flex (no corvu)', () => {
  it('does not render corvu resizable panels', () => {
    const items: IResizableItem[] = [
      { children: <div data-testid="item-a">A</div> },
      { children: <div data-testid="item-b">B</div> },
    ];

    cleanup = render(() => <Resizable items={items} />, container);

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBe(0);
  });

  it("renders each item's children inside a div wrapper", () => {
    const items: IResizableItem[] = [
      { children: <div data-testid="item-a">A</div> },
      { children: <div data-testid="item-b">B</div> },
    ];

    cleanup = render(() => <Resizable items={items} />, container);

    expect(container.querySelector('[data-testid="item-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="item-b"]')).not.toBeNull();
  });

  it('explicit resizable:false on all items stays in plain flex mode', () => {
    const items: IResizableItem[] = [
      { children: <span data-testid="x">X</span>, resizable: false },
      { children: <span data-testid="y">Y</span>, resizable: false },
    ];

    cleanup = render(() => <Resizable items={items} />, container);

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBe(0);
    expect(container.querySelector('[data-testid="x"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="y"]')).not.toBeNull();
  });
});

describe('Resizable — items with resizable:true renders corvu Resizable', () => {
  it('renders corvu resizable panels when all items have resizable:true', () => {
    const items: IResizableItem[] = [
      { children: <div data-testid="panel-a">A</div>, resizable: true, initialSize: 0.4 },
      { children: <div data-testid="panel-b">B</div>, resizable: true, initialSize: 0.6 },
    ];

    cleanup = render(() => <Resizable items={items} />, container);

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });

  it('panel content is rendered inside corvu panels', () => {
    const items: IResizableItem[] = [
      { children: <div data-testid="panel-a">A</div>, resizable: true, initialSize: 0.5 },
      { children: <div data-testid="panel-b">B</div>, resizable: true, initialSize: 0.5 },
    ];

    cleanup = render(() => <Resizable items={items} />, container);

    expect(container.querySelector('[data-testid="panel-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="panel-b"]')).not.toBeNull();
  });
});

describe('Resizable — items mixed (some resizable, some not) uses corvu mode', () => {
  it('enters corvu mode when at least one item has resizable:true', () => {
    const items: IResizableItem[] = [
      { children: <div data-testid="fixed">Fixed</div>, resizable: false, initialSize: 0.2 },
      { children: <div data-testid="flex-a">A</div>, resizable: true, initialSize: 0.4 },
      { children: <div data-testid="flex-b">B</div>, resizable: true, initialSize: 0.4 },
    ];

    cleanup = render(() => <Resizable items={items} />, container);

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    // All three items become panels inside corvu root
    expect(panels.length).toBeGreaterThanOrEqual(3);
  });

  it('all item children are rendered even when mixing resizable flags', () => {
    const items: IResizableItem[] = [
      { children: <div data-testid="fixed">Fixed</div>, resizable: false, initialSize: 0.2 },
      { children: <div data-testid="flex-a">A</div>, resizable: true, initialSize: 0.8 },
    ];

    cleanup = render(() => <Resizable items={items} />, container);

    expect(container.querySelector('[data-testid="fixed"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="flex-a"]')).not.toBeNull();
  });

  it('handle is NOT placed between a non-resizable item and its neighbour', () => {
    // Item 0: resizable:false → Item 1: resizable:true
    // The handle-show condition: both THIS item and the NEXT item must have
    // resizable !== false.  So no handle should appear after item 0.
    const items: IResizableItem[] = [
      { children: <div>Fixed</div>, resizable: false, initialSize: 0.3 },
      { children: <div>A</div>, resizable: true, initialSize: 0.7 },
    ];

    cleanup = render(() => <Resizable items={items} withHandle />, container);

    // Handles are rendered as [data-corvu-resizable-handle].
    // With 2 items where first is resizable:false, there should be 0 handles.
    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    expect(handles.length).toBe(0);
  });
});

describe('ResizableHandle — withHandle toggle does not cause layout shift', () => {
  const resizableItems: IResizableItem[] = [
    {
      children: (
        <div data-testid="panel-a" style="width:100%;height:100%">
          A
        </div>
      ),
      resizable: true,
      initialSize: 0.5,
    },
    {
      children: (
        <div data-testid="panel-b" style="width:100%;height:100%">
          B
        </div>
      ),
      resizable: true,
      initialSize: 0.5,
    },
  ];

  it('handle element is present when withHandle=false (no grip in DOM)', () => {
    cleanup = render(
      () => <Resizable orientation="horizontal" items={resizableItems} />,
      container,
    );

    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    expect(handles.length).toBeGreaterThanOrEqual(1);

    // No grip wrapper (the absolute-positioned div inside handle) when withHandle is absent
    for (const handle of handles) {
      // GripIcon renders a div with absolute positioning; when Show's condition is
      // false the div should not be in the DOM at all.
      const gripDivs = handle.querySelectorAll('div');
      expect(gripDivs.length).toBe(0);
    }
  });

  it('GripIcon div is in DOM when withHandle=true', () => {
    cleanup = render(
      () => <Resizable orientation="horizontal" items={resizableItems} withHandle />,
      container,
    );

    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    expect(handles.length).toBeGreaterThanOrEqual(1);

    // With withHandle=true the GripIcon div must be rendered inside the handle
    const firstHandle = handles[0];
    const gripDivs = firstHandle.querySelectorAll('div');
    expect(gripDivs.length).toBeGreaterThanOrEqual(1);
  });

  it('GripIcon div carries absolute positioning classes (out of flow)', () => {
    cleanup = render(
      () => <Resizable orientation="horizontal" items={resizableItems} withHandle />,
      container,
    );

    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    const firstHandle = handles[0];
    // The GripIcon outer div must have `absolute` class so it is out of flex-flow.
    // jsdom does not compute layout, but we can assert the class is present.
    const gripDiv = firstHandle.querySelector('div');
    expect(gripDiv).not.toBeNull();
    expect(gripDiv!.classList.contains('absolute')).toBe(true);
  });

  it('handle does not carry flex/items-center/justify-center classes (no min-content sizing)', () => {
    cleanup = render(
      () => <Resizable orientation="horizontal" items={resizableItems} withHandle />,
      container,
    );

    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    const firstHandle = handles[0] as HTMLElement;

    // These classes were removed in the layout-shift fix; if they reappear the
    // bug will regress because flex min-content expands the 1px handle.
    expect(firstHandle.classList.contains('flex')).toBe(false);
    expect(firstHandle.classList.contains('items-center')).toBe(false);
    expect(firstHandle.classList.contains('justify-center')).toBe(false);
  });

  it('handle still carries relative class (required for absolute GripIcon anchor)', () => {
    cleanup = render(
      () => <Resizable orientation="horizontal" items={resizableItems} withHandle />,
      container,
    );

    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    const firstHandle = handles[0] as HTMLElement;
    expect(firstHandle.classList.contains('relative')).toBe(true);
  });

  it('hit-area after-pseudo overlay class is present (after:w-1 kept)', () => {
    // The wider click-target is provided by the `after:` pseudo-element utility
    // classes on the handle element. jsdom cannot compute pseudo-elements, but
    // we can assert the Tailwind class is present so it will be included in the
    // stylesheet at build time.
    cleanup = render(
      () => <Resizable orientation="horizontal" items={resizableItems} withHandle />,
      container,
    );

    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    const firstHandle = handles[0] as HTMLElement;
    // Tailwind `after:w-1` compiles to a class string; the raw class token is
    // what appears in classList (Tailwind v4 uses atomic classname passthrough).
    expect(firstHandle.className).toContain('after:w-1');
  });
});
// ---------------------------------------------------------------------------
// children-mode smoke tests
// ---------------------------------------------------------------------------

describe('Resizable - children mode', () => {
  it('renders 2 panels when given 2 JSX children', () => {
    cleanup = render(
      () => (
        <Resizable>
          <div data-testid="child-a">A</div>
          <div data-testid="child-b">B</div>
        </Resizable>
      ),
      container,
    );

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[data-testid="child-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="child-b"]')).not.toBeNull();
  });

  it('corvu root has data-orientation horizontal by default', () => {
    cleanup = render(
      () => (
        <Resizable>
          <div>A</div>
          <div>B</div>
        </Resizable>
      ),
      container,
    );

    const root = container.querySelector('[data-corvu-resizable-root]');
    expect(root).not.toBeNull();
    expect(root!.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('renders without errors when no children or items are provided', () => {
    expect(() => {
      cleanup = render(() => <Resizable />, container);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// handleActive — per-item reactive handle enable (hairline + pointer + grip)
// ---------------------------------------------------------------------------

describe('Resizable — handleActive per-item contract', () => {
  const getHandles = () =>
    Array.from(container.querySelectorAll('[data-corvu-resizable-handle]')) as HTMLElement[];

  it('default (no handleActive) — handle is active: bg-border present, no pointer-events-none', () => {
    const items: IResizableItem[] = [
      { children: <div>A</div>, resizable: true, initialSize: 0.5 },
      { children: <div>B</div>, resizable: true, initialSize: 0.5 },
    ];

    cleanup = render(() => <Resizable items={items} withHandle />, container);

    const handles = getHandles();
    expect(handles.length).toBe(1);
    expect(handles[0].classList.contains('bg-border')).toBe(true);
    expect(handles[0].classList.contains('pointer-events-none')).toBe(false);
    expect(handles[0].classList.contains('bg-transparent')).toBe(false);
  });

  it('handleActive:false on a neighbour — handle stays mounted but transparent, no grip', () => {
    // 3 panels → 2 handles. C has handleActive:false → handle B-C inactive,
    // handle A-B stays active.
    const items: IResizableItem[] = [
      { children: <div>A</div>, resizable: true, initialSize: 0.3 },
      { children: <div>B</div>, resizable: true, initialSize: 0.3 },
      { children: <div>C</div>, resizable: true, initialSize: 0.4, handleActive: false },
    ];

    cleanup = render(() => <Resizable items={items} withHandle />, container);

    const handles = getHandles();
    expect(handles.length).toBe(2);

    const [activeHandle, inactiveHandle] = handles;
    // Active handle: hairline + grip.
    expect(activeHandle.classList.contains('bg-border')).toBe(true);
    expect(activeHandle.querySelector('div')).not.toBeNull();
    // Inactive handle: mounted, but transparent, pointer-locked, corvu-disabled, no grip.
    expect(inactiveHandle.classList.contains('bg-border')).toBe(false);
    expect(inactiveHandle.classList.contains('bg-transparent')).toBe(true);
    expect(inactiveHandle.classList.contains('pointer-events-none')).toBe(true);
    expect(inactiveHandle.querySelector('div')).toBeNull();
  });

  it('container handleDisabled — every handle inactive (no hairline anywhere)', () => {
    const items: IResizableItem[] = [
      { children: <div>A</div>, resizable: true, initialSize: 0.3 },
      { children: <div>B</div>, resizable: true, initialSize: 0.3 },
      { children: <div>C</div>, resizable: true, initialSize: 0.4 },
    ];

    cleanup = render(() => <Resizable items={items} withHandle handleDisabled />, container);

    const handles = getHandles();
    expect(handles.length).toBe(2);
    for (const handle of handles) {
      expect(handle.classList.contains('bg-border')).toBe(false);
      expect(handle.classList.contains('pointer-events-none')).toBe(true);
      expect(handle.querySelector('div')).toBeNull();
    }
  });

  it('accessor live-flip toggles handle without remounting panels (DOM identity preserved)', () => {
    const [active, setActive] = createSignal(true);
    const items: IResizableItem[] = [
      { children: <div data-testid="panel-a">A</div>, resizable: true, initialSize: 0.5 },
      {
        children: <div data-testid="panel-b">B</div>,
        resizable: true,
        initialSize: 0.5,
        handleActive: active,
      },
    ];

    cleanup = render(() => <Resizable items={items} withHandle />, container);

    const handlesBefore = getHandles();
    expect(handlesBefore.length).toBe(1);
    const handle = handlesBefore[0];
    expect(handle.classList.contains('bg-border')).toBe(true);
    expect(handle.querySelector('div')).not.toBeNull();

    const panelsBefore = Array.from(container.querySelectorAll('[data-corvu-resizable-panel]'));
    const contentA = container.querySelector('[data-testid="panel-a"]');
    const contentB = container.querySelector('[data-testid="panel-b"]');

    setActive(false);

    // Handle element itself is NOT remounted — same node, new classes.
    const handlesAfter = getHandles();
    expect(handlesAfter.length).toBe(1);
    expect(handlesAfter[0]).toBe(handle);
    expect(handle.classList.contains('bg-border')).toBe(false);
    expect(handle.classList.contains('bg-transparent')).toBe(true);
    expect(handle.classList.contains('pointer-events-none')).toBe(true);
    expect(handle.querySelector('div')).toBeNull();

    // Panels and their children keep DOM identity (no remount).
    const panelsAfter = Array.from(container.querySelectorAll('[data-corvu-resizable-panel]'));
    expect(panelsAfter.length).toBe(panelsBefore.length);
    panelsAfter.forEach((panel, i) => {
      expect(panel).toBe(panelsBefore[i]);
    });
    expect(container.querySelector('[data-testid="panel-a"]')).toBe(contentA);
    expect(container.querySelector('[data-testid="panel-b"]')).toBe(contentB);

    // Flip back — handle re-activates in place.
    setActive(true);
    expect(getHandles()[0]).toBe(handle);
    expect(handle.classList.contains('bg-border')).toBe(true);
    expect(handle.querySelector('div')).not.toBeNull();
  });

  it('grip is hidden on inactive handle even with container withHandle', () => {
    const items: IResizableItem[] = [
      { children: <div>A</div>, resizable: true, initialSize: 0.5, handleActive: false },
      { children: <div>B</div>, resizable: true, initialSize: 0.5 },
    ];

    cleanup = render(() => <Resizable items={items} withHandle />, container);

    const handles = getHandles();
    expect(handles.length).toBe(1);
    expect(handles[0].querySelector('div')).toBeNull();
  });
});
