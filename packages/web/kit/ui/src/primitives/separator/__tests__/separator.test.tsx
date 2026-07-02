/* @vitest-environment jsdom */

/**
 * Separator primitive — smoke + reactivity contract tests.
 *
 * Covers:
 *   - Renders with default horizontal orientation.
 *   - CVA variant class differs between horizontal/vertical.
 *   - orientation flows to Kobalte SeparatorPrimitive (data-orientation /
 *     aria-orientation) — pins the contract-inspector field
 *     (`separator.contract.ts`) against silent breakage.
 *   - orientation/variant props update at runtime (reactivity contract).
 *   - class prop merges and updates reactively.
 *
 * NOT covered (known gap, surfaced 2026-07-02): `decorative` has no a11y
 * effect — Kobalte 0.13.11 Separator has no such option, the prop leaks to
 * the DOM as a raw `decorative` attribute. Element renders as `<hr>` (implicit
 * role=separator) regardless of the flag. Fix pending architect decision —
 * do not pin the broken behavior with a test.
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Separator } from '../separator';

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

describe('Separator — smoke', () => {
  it('renders an element in the DOM', () => {
    cleanup = render(() => <Separator />, container);
    expect(container.firstElementChild).not.toBeNull();
  });

  it('has horizontal CVA class by default (h-px)', () => {
    cleanup = render(() => <Separator />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.className).toContain('h-px');
  });

  it('has vertical CVA class when orientation=vertical', () => {
    cleanup = render(() => <Separator orientation="vertical" />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.className).toContain('w-px');
  });
});

// ---------------------------------------------------------------------------
// Kobalte pass-through contract (inspector fields from separator.contract.ts)
// ---------------------------------------------------------------------------

describe('Separator — orientation pass-through to Kobalte', () => {
  it('default orientation=horizontal → data-orientation="horizontal", no aria-orientation', () => {
    cleanup = render(() => <Separator />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.getAttribute('data-orientation')).toBe('horizontal');
    // aria-orientation is only set for vertical (horizontal is the implicit default)
    expect(el?.hasAttribute('aria-orientation')).toBe(false);
  });

  it('orientation="vertical" → data-orientation + aria-orientation="vertical"', () => {
    cleanup = render(() => <Separator orientation="vertical" />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.getAttribute('data-orientation')).toBe('vertical');
    expect(el?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('renders as <hr> (native separator semantics)', () => {
    cleanup = render(() => <Separator />, container);
    expect(container.firstElementChild?.tagName).toBe('HR');
  });
});

// ---------------------------------------------------------------------------
// Reactivity contract
// ---------------------------------------------------------------------------

describe('Separator — reactivity contract', () => {
  it('updates CVA class when orientation signal changes', () => {
    const [orientation, setOrientation] = createSignal<'horizontal' | 'vertical'>('horizontal');
    cleanup = render(() => <Separator orientation={orientation()} />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.className).toContain('h-px');

    setOrientation('vertical');
    expect(el?.className).toContain('w-px');
    expect(el?.className).not.toContain('h-px');
  });

  it('updates class when class signal changes', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(() => <Separator class={cls()} />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.className).not.toContain('my-dynamic');

    setCls('my-dynamic');
    expect(el?.className).toContain('my-dynamic');
  });
});
