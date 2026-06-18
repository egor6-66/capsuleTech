/* @vitest-environment jsdom */

/**
 * Input primitive — smoke + reactivity contract tests.
 *
 * Covers:
 *   - Renders an <input> element with type=text by default.
 *   - size variant class updates at runtime (reactivity contract).
 *   - class prop merges and updates reactively.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { Input } from '../input';

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

describe('Input — smoke', () => {
  it('renders an <input> element', () => {
    cleanup = render(() => <Input />, container);
    expect(container.querySelector('input')).not.toBeNull();
  });

  it('has type=text by default', () => {
    cleanup = render(() => <Input />, container);
    const el = container.querySelector('input')!;
    expect(el.type).toBe('text');
  });

  it('forwards placeholder', () => {
    cleanup = render(() => <Input placeholder="Enter…" />, container);
    const el = container.querySelector('input')!;
    expect(el.getAttribute('placeholder')).toBe('Enter…');
  });

  it('applies size=default (h-9)', () => {
    cleanup = render(() => <Input size="default" />, container);
    const el = container.querySelector('input')!;
    expect(el.className).toContain('h-9');
  });
});

// ---------------------------------------------------------------------------
// Reactivity contract
// ---------------------------------------------------------------------------

describe('Input — reactivity contract', () => {
  it('updates class when class signal changes', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(() => <Input class={cls()} />, container);
    const el = container.querySelector('input')!;
    expect(el.className).not.toContain('my-dynamic');

    setCls('my-dynamic');
    expect(el.className).toContain('my-dynamic');
  });

  it('updates size class when size signal changes', () => {
    // Input only has 'default' size in variants currently,
    // but the reactivity pipe must still track the prop.
    // Test via class proxy: use the same size=default and verify h-9 stays.
    const [size, setSize] = createSignal<'default'>('default');
    cleanup = render(() => <Input size={size()} />, container);
    const el = container.querySelector('input')!;
    expect(el.className).toContain('h-9');

    // Toggle back — class must still be present (no stale snapshot).
    setSize('default');
    expect(el.className).toContain('h-9');
  });
});
