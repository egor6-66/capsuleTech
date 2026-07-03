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
 *   - decorative semantics (Radix/shadcn canon, implemented in our wrapper —
 *     Kobalte 0.13.11 has no such option): decorative=true (default) →
 *     role="none" removes the <hr> from the a11y tree; decorative=false →
 *     implicit separator semantics. The prop is NOT forwarded to the DOM.
 *   - orientation/variant props update at runtime (reactivity contract).
 *   - class prop merges and updates reactively.
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
// Decorative semantics (Radix/shadcn canon, implemented in our wrapper)
// ---------------------------------------------------------------------------

describe('Separator — decorative semantics', () => {
  it('default (decorative=true) → role="none", no raw `decorative` DOM attribute', () => {
    cleanup = render(() => <Separator />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.getAttribute('role')).toBe('none');
    expect(el?.hasAttribute('decorative')).toBe(false);
  });

  it('decorative=false → no role override, implicit <hr> separator semantics kept', () => {
    cleanup = render(() => <Separator decorative={false} />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.tagName).toBe('HR');
    expect(el?.hasAttribute('role')).toBe(false);
    expect(el?.hasAttribute('decorative')).toBe(false);
  });

  it('decorative=false + orientation=vertical → aria-orientation preserved', () => {
    cleanup = render(() => <Separator decorative={false} orientation="vertical" />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.hasAttribute('role')).toBe(false);
    expect(el?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('updates role when decorative signal changes (reactivity contract)', () => {
    const [decorative, setDecorative] = createSignal(true);
    cleanup = render(() => <Separator decorative={decorative()} />, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.getAttribute('role')).toBe('none');

    setDecorative(false);
    expect(el?.hasAttribute('role')).toBe(false);
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
