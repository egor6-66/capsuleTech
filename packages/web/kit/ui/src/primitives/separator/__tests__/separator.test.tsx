/* @vitest-environment jsdom */

/**
 * Separator primitive — smoke + reactivity contract tests.
 *
 * Covers:
 *   - Renders with default horizontal orientation.
 *   - CVA variant class differs between horizontal/vertical.
 *   - orientation/variant props update at runtime (reactivity contract).
 *   - class prop merges and updates reactively.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
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
// Reactivity contract
// ---------------------------------------------------------------------------

describe('Separator — reactivity contract', () => {
  it('updates CVA class when orientation signal changes', () => {
    const [orientation, setOrientation] = createSignal<'horizontal' | 'vertical'>('horizontal');
    cleanup = render(
      () => <Separator orientation={orientation()} />,
      container,
    );
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
