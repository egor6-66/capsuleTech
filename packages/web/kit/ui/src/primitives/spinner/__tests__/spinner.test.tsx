/* @vitest-environment jsdom */

/**
 * Spinner primitive — smoke + reactivity contract tests.
 *
 * Covers:
 *   - Renders role=status span.
 *   - size variant classes update at runtime (reactivity contract).
 *   - class prop merges and updates reactively.
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Spinner } from '../spinner';

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

describe('Spinner — smoke', () => {
  it('renders a span with role=status', () => {
    cleanup = render(() => <Spinner />, container);
    const el = container.querySelector('[role="status"]');
    expect(el).not.toBeNull();
  });

  it('applies size=sm class', () => {
    cleanup = render(() => <Spinner size="sm" />, container);
    // The inner span carries the CVA class (aria-hidden)
    const inner = container.querySelector('[aria-hidden="true"]');
    expect(inner?.className).toContain('h-4');
    expect(inner?.className).toContain('w-4');
  });

  it('applies size=lg class', () => {
    cleanup = render(() => <Spinner size="lg" />, container);
    const inner = container.querySelector('[aria-hidden="true"]');
    expect(inner?.className).toContain('h-8');
    expect(inner?.className).toContain('w-8');
  });
});

// ---------------------------------------------------------------------------
// Reactivity contract
// ---------------------------------------------------------------------------

describe('Spinner — reactivity contract', () => {
  it('updates size class when size signal changes', () => {
    const [size, setSize] = createSignal<'sm' | 'lg'>('sm');
    cleanup = render(() => <Spinner size={size()} />, container);
    const inner = container.querySelector('[aria-hidden="true"]')!;
    expect(inner.className).toContain('h-4');

    setSize('lg');
    expect(inner.className).toContain('h-8');
    expect(inner.className).not.toContain('h-4');
  });

  it('updates class when class signal changes', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(() => <Spinner class={cls()} />, container);
    const inner = container.querySelector('[aria-hidden="true"]')!;
    expect(inner.className).not.toContain('my-dynamic');

    setCls('my-dynamic');
    expect(inner.className).toContain('my-dynamic');
  });
});
