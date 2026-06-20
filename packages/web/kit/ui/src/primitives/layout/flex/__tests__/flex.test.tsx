/**
 * Flex primitive — behaviour tests (CSS-flex mode only).
 *
 * Items-mode and resizable tests live in resizable/__tests__/resizable.test.tsx.
 *
 * The vitest config now includes `vite-plugin-solid`, so .tsx tests with JSX
 * are fully supported.  The `/* @vitest-environment jsdom *\/` comment below
 * activates the jsdom environment for this file.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Flex } from '../flex';

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
// 2. empty container min-height via inline style
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

  it('does NOT carry min-h-slot class (class replaced by inline style)', () => {
    cleanup = render(() => <Flex />, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('min-h-slot')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Sizing props → inline style calc(var(--spacing) * N)
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
});
