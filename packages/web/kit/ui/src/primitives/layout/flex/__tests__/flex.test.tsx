/**
 * Flex primitive — behaviour tests.
 *
 * Tests are organised in two groups:
 *
 * 1. Interface/structural contracts (.ts-style, no DOM render needed).
 * 2. Render-level behaviour (jsdom + solid render).
 *
 * The vitest config now includes `vite-plugin-solid`, so .tsx tests with JSX
 * are fully supported.  The `/* @vitest-environment jsdom *\/` comment below
 * activates the jsdom environment for this file.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Flex } from '../flex';
import type { IFlexItem } from '../interfaces';

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
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. children-only mode
// ---------------------------------------------------------------------------

describe('Flex — children-only mode', () => {
  it('renders children when no items prop is provided', () => {
    cleanup = render(
      () => (
        <Flex>
          <div data-testid="child-a">A</div>
          <div data-testid="child-b">B</div>
        </Flex>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="child-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="child-b"]')).not.toBeNull();
  });

  it('root element is a <div> with flex class', () => {
    cleanup = render(
      () => (
        <Flex>
          <span>hello</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('div');
    expect(root.classList.contains('flex')).toBe(true);
  });

  it('no corvu resizable panels are rendered in children mode', () => {
    cleanup = render(
      () => (
        <Flex>
          <div>content</div>
        </Flex>
      ),
      container,
    );

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. items without any resizable flag → plain CSS flex
// ---------------------------------------------------------------------------

describe('Flex — items without resizable:true renders as plain flex (no corvu)', () => {
  it('does not render corvu resizable panels', () => {
    const items: IFlexItem[] = [
      { children: <div data-testid="item-a">A</div> },
      { children: <div data-testid="item-b">B</div> },
    ];

    cleanup = render(() => <Flex items={items} />, container);

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBe(0);
  });

  it("renders each item's children inside a div wrapper", () => {
    const items: IFlexItem[] = [
      { children: <div data-testid="item-a">A</div> },
      { children: <div data-testid="item-b">B</div> },
    ];

    cleanup = render(() => <Flex items={items} />, container);

    expect(container.querySelector('[data-testid="item-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="item-b"]')).not.toBeNull();
  });

  it('explicit resizable:false on all items stays in plain flex mode', () => {
    const items: IFlexItem[] = [
      { children: <span data-testid="x">X</span>, resizable: false },
      { children: <span data-testid="y">Y</span>, resizable: false },
    ];

    cleanup = render(() => <Flex items={items} />, container);

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBe(0);
    expect(container.querySelector('[data-testid="x"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="y"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. items with resizable:true → corvu Resizable mode
// ---------------------------------------------------------------------------

describe('Flex — items with resizable:true renders corvu Resizable', () => {
  it('renders corvu resizable panels when all items have resizable:true', () => {
    const items: IFlexItem[] = [
      { children: <div data-testid="panel-a">A</div>, resizable: true, initialSize: 0.4 },
      { children: <div data-testid="panel-b">B</div>, resizable: true, initialSize: 0.6 },
    ];

    cleanup = render(() => <Flex items={items} />, container);

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
  });

  it('panel content is rendered inside corvu panels', () => {
    const items: IFlexItem[] = [
      { children: <div data-testid="panel-a">A</div>, resizable: true, initialSize: 0.5 },
      { children: <div data-testid="panel-b">B</div>, resizable: true, initialSize: 0.5 },
    ];

    cleanup = render(() => <Flex items={items} />, container);

    expect(container.querySelector('[data-testid="panel-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="panel-b"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. items mixed (some resizable, some not) → corvu mode
//    Non-resizable items participate in layout but no handle is placed
//    adjacent to them.
// ---------------------------------------------------------------------------

describe('Flex — items mixed (some resizable, some not) uses corvu mode', () => {
  it('enters corvu mode when at least one item has resizable:true', () => {
    const items: IFlexItem[] = [
      { children: <div data-testid="fixed">Fixed</div>, resizable: false, initialSize: 0.2 },
      { children: <div data-testid="flex-a">A</div>, resizable: true, initialSize: 0.4 },
      { children: <div data-testid="flex-b">B</div>, resizable: true, initialSize: 0.4 },
    ];

    cleanup = render(() => <Flex items={items} />, container);

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    // All three items become panels inside corvu root
    expect(panels.length).toBeGreaterThanOrEqual(3);
  });

  it('all item children are rendered even when mixing resizable flags', () => {
    const items: IFlexItem[] = [
      { children: <div data-testid="fixed">Fixed</div>, resizable: false, initialSize: 0.2 },
      { children: <div data-testid="flex-a">A</div>, resizable: true, initialSize: 0.8 },
    ];

    cleanup = render(() => <Flex items={items} />, container);

    expect(container.querySelector('[data-testid="fixed"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="flex-a"]')).not.toBeNull();
  });

  it('handle is NOT placed between a non-resizable item and its neighbour', () => {
    // Item 0: resizable:false → Item 1: resizable:true
    // The handle-show condition: both THIS item and the NEXT item must have
    // resizable !== false.  So no handle should appear after item 0.
    const items: IFlexItem[] = [
      { children: <div>Fixed</div>, resizable: false, initialSize: 0.3 },
      { children: <div>A</div>, resizable: true, initialSize: 0.7 },
    ];

    cleanup = render(() => <Flex items={items} withHandle />, container);

    // Handles are rendered as [data-corvu-resizable-handle].
    // With 2 items where first is resizable:false, there should be 0 handles.
    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    expect(handles.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. items array of plain domain objects (no children/resizable fields)
//    → fallback to children prop + dev warning
// ---------------------------------------------------------------------------

describe('Flex — plain object array (no children/resizable) falls back to children', () => {
  it('emits a console.warn in dev when items have no children or resizable field', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Simulate domain data accidentally bound to `items`
    const domainData = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ] as unknown as IFlexItem[];

    cleanup = render(
      () => (
        <Flex items={domainData}>
          <div data-testid="fallback-child">fallback</div>
        </Flex>
      ),
      container,
    );

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('[Flex]');
    expect(warnSpy.mock.calls[0][0]).toContain('items');
  });

  it('falls back to rendering children when items is a plain domain array', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const domainData = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ] as unknown as IFlexItem[];

    cleanup = render(
      () => (
        <Flex items={domainData}>
          <div data-testid="fallback-child">fallback</div>
        </Flex>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="fallback-child"]')).not.toBeNull();
  });

  it('does not render corvu panels when falling back from a plain domain array', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const domainData = [
      { id: 1, label: 'X' },
      { id: 2, label: 'Y' },
    ] as unknown as IFlexItem[];

    cleanup = render(
      () => (
        <Flex items={domainData}>
          <div>child</div>
        </Flex>
      ),
      container,
    );

    const panels = container.querySelectorAll('[data-corvu-resizable-panel]');
    expect(panels.length).toBe(0);
  });

  it('does not warn when items is an empty array', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    cleanup = render(
      () => (
        <Flex items={[]}>
          <div data-testid="child">child</div>
        </Flex>
      ),
      container,
    );

    // Empty array: isValidItemsArray returns false (length === 0), falls through
    // to children-mode silently — no warning because it's an intentional empty state.
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. empty container min-height via inline style
// ---------------------------------------------------------------------------

describe('Flex — empty container gets inline min-height, non-empty does not', () => {
  it('sets style.min-height to var(--size-slot) when no children are provided', () => {
    cleanup = render(() => <Flex />, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('var(--size-slot)');
  });

  it('sets style.min-height to var(--size-slot) when children is explicitly null', () => {
    cleanup = render(() => <Flex>{null}</Flex>, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('var(--size-slot)');
  });

  it('does NOT set style.min-height when children are present', () => {
    cleanup = render(
      () => (
        <Flex>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('');
  });

  it('does NOT set min-height inline style in items-mode (items-mode is never "empty" in the slot sense)', () => {
    const items: IFlexItem[] = [{ children: <div>A</div> }, { children: <div>B</div> }];

    cleanup = render(() => <Flex items={items} />, container);

    // items-mode renders either StaticItemsFlex or ResizableFlex — neither should
    // carry the empty-state min-height (the slot-visibility concern is children-mode only).
    const allEls = container.querySelectorAll('*');
    for (const el of allEls) {
      expect((el as HTMLElement).style.minHeight).not.toBe('var(--size-slot)');
    }
  });

  it('does NOT set min-height inline style in resizable items-mode', () => {
    const items: IFlexItem[] = [
      { children: <div data-testid="a">A</div>, resizable: true, initialSize: 0.5 },
      { children: <div data-testid="b">B</div>, resizable: true, initialSize: 0.5 },
    ];

    cleanup = render(() => <Flex items={items} />, container);

    const allEls = container.querySelectorAll('*');
    for (const el of allEls) {
      expect((el as HTMLElement).style.minHeight).not.toBe('var(--size-slot)');
    }
  });

  it('does NOT carry min-h-slot class (class replaced by inline style)', () => {
    cleanup = render(() => <Flex />, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('min-h-slot')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Sizing props → inline style calc(var(--spacing) * N)
// ---------------------------------------------------------------------------

describe('Flex — sizing props apply as inline-style calc(var(--spacing) * N)', () => {
  it('h prop sets height inline style', () => {
    cleanup = render(
      () => (
        <Flex h={10}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe('calc(var(--spacing) * 10)');
  });

  it('w prop sets width inline style', () => {
    cleanup = render(
      () => (
        <Flex w={20}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe('calc(var(--spacing) * 20)');
  });

  it('maxH prop sets max-height inline style', () => {
    cleanup = render(
      () => (
        <Flex maxH={40}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.maxHeight).toBe('calc(var(--spacing) * 40)');
  });

  it('maxW prop sets max-width inline style', () => {
    cleanup = render(
      () => (
        <Flex maxW={80}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.maxWidth).toBe('calc(var(--spacing) * 80)');
  });

  it('minW prop sets min-width inline style', () => {
    cleanup = render(
      () => (
        <Flex minW={5}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minWidth).toBe('calc(var(--spacing) * 5)');
  });

  it('minH prop sets min-height inline style', () => {
    cleanup = render(
      () => (
        <Flex minH={6}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('calc(var(--spacing) * 6)');
  });

  it('explicit minH overrides the auto var(--size-slot) on empty container', () => {
    cleanup = render(() => <Flex minH={8} />, container);

    const root = container.firstElementChild as HTMLElement;
    // Must be the spacing formula, NOT the fallback var(--size-slot)
    expect(root.style.minHeight).toBe('calc(var(--spacing) * 8)');
    expect(root.style.minHeight).not.toBe('var(--size-slot)');
  });

  it('all six sizing props can be applied together', () => {
    cleanup = render(
      () => (
        <Flex h={20} minH={6} maxH={40} w={30} minW={5} maxW={80}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe('calc(var(--spacing) * 20)');
    expect(root.style.minHeight).toBe('calc(var(--spacing) * 6)');
    expect(root.style.maxHeight).toBe('calc(var(--spacing) * 40)');
    expect(root.style.width).toBe('calc(var(--spacing) * 30)');
    expect(root.style.minWidth).toBe('calc(var(--spacing) * 5)');
    expect(root.style.maxWidth).toBe('calc(var(--spacing) * 80)');
  });

  it('fluid prop sets flex shorthand inline style', () => {
    cleanup = render(
      () => (
        <Flex fluid={400}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.flex).toBe('1 1 400px');
  });

  it('fluid and h can coexist independently', () => {
    cleanup = render(
      () => (
        <Flex fluid={300} h={20}>
          <span>content</span>
        </Flex>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.flex).toBe('1 1 300px');
    expect(root.style.height).toBe('calc(var(--spacing) * 20)');
  });

  it('sizing props do not affect items-mode (no inline styles leaked)', () => {
    // items-mode renders ResizableFlex or StaticItemsFlex — sizing props are
    // only consumed in CSS-flex mode; they must not appear on items-mode roots.
    const items: IFlexItem[] = [{ children: <div>A</div> }, { children: <div>B</div> }];

    cleanup = render(() => <Flex items={items} h={10} w={20} minH={6} />, container);

    // items-mode root does not carry Flex's computed() styles
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe('');
    expect(root.style.width).toBe('');
    expect(root.style.minHeight).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 8. ResizableHandle withHandle layout-stability regression
//    GripIcon mount/unmount must not shift handle dimensions (1px stays 1px).
// ---------------------------------------------------------------------------

describe('ResizableHandle — withHandle toggle does not cause layout shift', () => {
  const resizableItems: IFlexItem[] = [
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
    cleanup = render(() => <Flex orientation="horizontal" items={resizableItems} />, container);

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
      () => <Flex orientation="horizontal" items={resizableItems} withHandle />,
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
      () => <Flex orientation="horizontal" items={resizableItems} withHandle />,
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
      () => <Flex orientation="horizontal" items={resizableItems} withHandle />,
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
      () => <Flex orientation="horizontal" items={resizableItems} withHandle />,
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
      () => <Flex orientation="horizontal" items={resizableItems} withHandle />,
      container,
    );

    const handles = container.querySelectorAll('[data-corvu-resizable-handle]');
    const firstHandle = handles[0] as HTMLElement;
    // Tailwind `after:w-1` compiles to a class string; the raw class token is
    // what appears in classList (Tailwind v4 uses atomic classname passthrough).
    expect(firstHandle.className).toContain('after:w-1');
  });
});
