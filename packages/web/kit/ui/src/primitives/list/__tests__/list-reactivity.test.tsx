/* @vitest-environment jsdom */

/**
 * List primitive — DOM render + reactivity contract tests.
 *
 * Covers:
 *   - Render-prop mode renders items.
 *   - Semantic mode renders <ul>.
 *   - variant/orientation/class update at runtime (reactivity contract).
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { List } from '../list';

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

describe('List — render-prop mode smoke', () => {
  it('renders items via children render function', () => {
    cleanup = render(
      () => (
        <List
          items={['a', 'b', 'c']}
          children={(item) => <li data-testid={`item-${item}`}>{item}</li>}
        />
      ),
      container,
    );
    expect(container.querySelector('[data-testid="item-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="item-b"]')).not.toBeNull();
  });
});

describe('List — semantic mode smoke', () => {
  it('renders a <ul> element', () => {
    cleanup = render(
      () => (
        <List>
          <li>item</li>
        </List>
      ),
      container,
    );
    expect(container.querySelector('ul')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Reactivity contract
// ---------------------------------------------------------------------------

describe('List — reactivity contract (semantic mode)', () => {
  it('updates class when class signal changes', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(
      () => (
        <List class={cls()}>
          <li>item</li>
        </List>
      ),
      container,
    );
    const el = container.querySelector('ul')!;
    expect(el.className).not.toContain('my-dynamic');

    setCls('my-dynamic');
    expect(el.className).toContain('my-dynamic');
  });
});

describe('List — reactivity contract (render-prop mode)', () => {
  it('updates class when class signal changes', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(
      () => <List items={['a']} class={cls()} children={(item) => <div>{item}</div>} />,
      container,
    );
    // render-prop mode renders a <div> container
    const el = container.firstElementChild as HTMLElement;
    expect(el?.className).not.toContain('my-dynamic');

    setCls('my-dynamic');
    expect(el?.className).toContain('my-dynamic');
  });
});

// ---------------------------------------------------------------------------
// Batch mode — item.props reactivity to an external signal (brief:
// ui-batch-reactivity-and-app-props-gaps, Part 1). `item.props` is a spread
// (`{...getItemProps(item)}`) inside a `<For>` callback that runs once per
// item — Solid's compiler wraps component spreads in a reactive mergeProps
// getter, so each downstream prop-read re-invokes `getItemProps(item)`. This
// test locks that contract: selection changes must reach the correct item
// only, without scrambling sibling content.
// ---------------------------------------------------------------------------

describe('List — batch mode item.props reacts to external signal (no content scramble)', () => {
  it('updates selected on the targeted item only; other items keep their own content', () => {
    const [selectedId, setSelectedId] = createSignal<number | null>(null);
    const data = [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ];
    const ItemTpl = (p: { id: number; label: string; selected: boolean }) => (
      <div data-testid={`item-${p.id}`} data-selected={String(p.selected)}>
        {p.label}
      </div>
    );

    cleanup = render(
      () => (
        <List
          data={data}
          item={{
            use: ItemTpl,
            props: (it) => ({ id: it.id, label: it.label, selected: selectedId() === it.id }),
          }}
        />
      ),
      container,
    );

    const get = (id: number) => container.querySelector(`[data-testid="item-${id}"]`)!;
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('false');

    setSelectedId(2);
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('true');
    expect(get(3).getAttribute('data-selected')).toBe('false');
    expect(get(1).textContent).toBe('A');
    expect(get(2).textContent).toBe('B');
    expect(get(3).textContent).toBe('C');

    setSelectedId(3);
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('false');
    expect(get(3).getAttribute('data-selected')).toBe('true');
    expect(get(1).textContent).toBe('A');
    expect(get(2).textContent).toBe('B');
    expect(get(3).textContent).toBe('C');
  });
});
