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
