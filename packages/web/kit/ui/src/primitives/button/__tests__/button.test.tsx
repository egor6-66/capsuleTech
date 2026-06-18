/* @vitest-environment jsdom */

/**
 * Button primitive — presentational props tests.
 *
 * Covers: fullWidth, polymorphic `as`, backward compatibility smoke,
 * reactivity contract (variant/size/class/fullWidth update at runtime).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { Button } from '../button';

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
// fullWidth prop
// ---------------------------------------------------------------------------

describe('Button — fullWidth prop', () => {
  it('adds w-full class when fullWidth=true', () => {
    cleanup = render(
      () => <Button fullWidth data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    expect(el?.className).toContain('w-full');
  });

  it('does NOT add w-full when fullWidth is not provided', () => {
    cleanup = render(
      () => <Button data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    expect(el?.className).not.toContain('w-full');
  });

  it('does NOT add w-full when fullWidth=false', () => {
    cleanup = render(
      () => <Button fullWidth={false} data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    expect(el?.className).not.toContain('w-full');
  });

  it('fullWidth combines with variant classes', () => {
    cleanup = render(
      () => <Button fullWidth variant="outline" data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    expect(el?.className).toContain('w-full');
    expect(el?.className).toContain('border');
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility
// ---------------------------------------------------------------------------

describe('Button — backward compatibility', () => {
  it('renders a <button> by default', () => {
    cleanup = render(
      () => <Button data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector('[data-testid="btn"]');
    expect(el?.tagName.toLowerCase()).toBe('button');
  });

  it('renders an <a> when as="a"', () => {
    cleanup = render(
      () => <Button as="a" href="/foo" data-testid="btn">Link</Button>,
      container,
    );
    const el = container.querySelector('[data-testid="btn"]');
    expect(el?.tagName.toLowerCase()).toBe('a');
  });

  it('forwards custom class', () => {
    cleanup = render(
      () => <Button class="my-class" data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    expect(el?.className).toContain('my-class');
  });

  it('renders loading spinner when loading=true', () => {
    cleanup = render(
      () => <Button loading data-testid="btn">Sign in</Button>,
      container,
    );
    const el = container.querySelector('[data-testid="btn"]');
    // Loading replaces children with Loader2 — no "Sign in" text
    expect(el?.textContent).not.toContain('Sign in');
    // button should be disabled
    expect((el as HTMLButtonElement)?.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reactivity contract — variant/size/class/fullWidth must update at runtime
// ---------------------------------------------------------------------------

describe('Button — reactivity contract', () => {
  it('updates CVA class when variant signal changes', () => {
    const [variant, setVariant] = createSignal<'default' | 'outline'>('default');
    cleanup = render(
      () => <Button variant={variant()} data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    // default variant includes bg-primary
    expect(el?.className).toContain('bg-primary');

    // switch to outline — should gain 'border' and lose 'bg-primary'
    setVariant('outline');
    expect(el?.className).toContain('border');
    expect(el?.className).not.toContain('bg-primary');
  });

  it('updates CVA class when size signal changes', () => {
    const [size, setSize] = createSignal<'default' | 'lg'>('default');
    cleanup = render(
      () => <Button size={size()} data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    const initialClass = el?.className ?? '';

    setSize('lg');
    expect(el?.className).not.toBe(initialClass);
    // lg adds h-10
    expect(el?.className).toContain('h-10');
  });

  it('updates class when fullWidth signal changes', () => {
    const [fw, setFw] = createSignal(false);
    cleanup = render(
      () => <Button fullWidth={fw()} data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    expect(el?.className).not.toContain('w-full');

    setFw(true);
    expect(el?.className).toContain('w-full');
  });

  it('updates class when class signal changes', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(
      () => <Button class={cls()} data-testid="btn">Click</Button>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="btn"]');
    expect(el?.className).not.toContain('my-dynamic');

    setCls('my-dynamic');
    expect(el?.className).toContain('my-dynamic');
  });
});
