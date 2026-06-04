/**
 * Group primitive — behaviour tests.
 *
 * Group wraps Flex in wrapper-mode.  The empty-container contract is exercised
 * here through the wrapper-mode path (children): empty → inline style
 * `min-height: var(--size-slot)` via Flex delegation.  Verified NOT to apply
 * to batch-mode (data + itemAs), since batch-mode is not an "empty container".
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Group } from '../group';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

// ---------------------------------------------------------------------------
// 1. Base rendering
// ---------------------------------------------------------------------------

describe('Group — base rendering', () => {
  it('renders children in wrapper mode', () => {
    cleanup = render(
      () => (
        <Group>
          <button type="button" data-testid="btn-a">
            A
          </button>
          <button type="button" data-testid="btn-b">
            B
          </button>
        </Group>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="btn-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="btn-b"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. empty container min-height via Flex delegation (wrapper-mode only)
// ---------------------------------------------------------------------------

describe('Group — empty wrapper-mode gets inline min-height via Flex delegation', () => {
  it('root element gets style.min-height=var(--size-slot) when no children are provided (wrapper mode)', () => {
    cleanup = render(() => <Group />, container);

    // Group delegates to Flex in wrapper-mode; Flex detects empty and sets inline min-height.
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('var(--size-slot)');
  });

  it('root element gets style.min-height=var(--size-slot) when children is explicitly null (wrapper mode)', () => {
    cleanup = render(() => <Group>{null}</Group>, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('var(--size-slot)');
  });

  it('does NOT set inline min-height when children are present (wrapper mode)', () => {
    cleanup = render(
      () => (
        <Group>
          <button type="button">click me</button>
        </Group>
      ),
      container,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minHeight).toBe('');
  });

  it('does NOT carry min-h-slot class (class replaced by inline style)', () => {
    cleanup = render(() => <Group />, container);

    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('min-h-slot')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Batch mode — empty-state min-height must NOT appear (data prop signals intent)
// ---------------------------------------------------------------------------

describe('Group — batch mode does NOT get empty-state min-height', () => {
  it('does not apply min-height inline style in spaced batch mode', () => {
    const data = [{ label: 'A' }, { label: 'B' }];
    const ItemBtn = (p: { label: string }) => <button type="button">{p.label}</button>;

    cleanup = render(
      () => (
        <Group
          data={data}
          itemAs={ItemBtn}
          itemProps={(it: { label: string }) => ({ label: it.label })}
        />
      ),
      container,
    );

    // Spaced batch mode goes through Flex items-mode (StaticItemsFlex).
    // No element in the subtree should carry the empty-state min-height.
    const allEls = container.querySelectorAll('*');
    for (const el of allEls) {
      expect((el as HTMLElement).style.minHeight).not.toBe('var(--size-slot)');
    }
  });

  it('does not apply min-height inline style in attached batch mode', () => {
    const data = [{ label: 'X' }, { label: 'Y' }];
    const ItemBtn = (p: { label: string }) => <button type="button">{p.label}</button>;

    cleanup = render(
      () => (
        <Group
          variant="attached"
          data={data}
          itemAs={ItemBtn}
          itemProps={(it: { label: string }) => ({ label: it.label })}
        />
      ),
      container,
    );

    // Attached batch renders a plain <div> with <For> — no empty-state min-height.
    const allEls = container.querySelectorAll('*');
    for (const el of allEls) {
      expect((el as HTMLElement).style.minHeight).not.toBe('var(--size-slot)');
    }
  });
});
