/* @vitest-environment jsdom */

/**
 * Typography primitive — presentational props tests.
 *
 * Covers: align, tone, size, dim new props.
 * Existing variant/color CVA contract is stable — only smoke tests here.
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Typography } from '../typography';

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
// align prop
// ---------------------------------------------------------------------------

describe('Typography — align prop', () => {
  it('adds text-left for align="start"', () => {
    cleanup = render(
      () => (
        <Typography align="start" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-left');
  });

  it('adds text-center for align="center"', () => {
    cleanup = render(
      () => (
        <Typography align="center" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-center');
  });

  it('adds text-right for align="end"', () => {
    cleanup = render(
      () => (
        <Typography align="end" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-right');
  });

  it('does not add alignment class when align is not provided', () => {
    cleanup = render(() => <Typography data-testid="t">Hello</Typography>, container);
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).not.toContain('text-left');
    expect(el?.className).not.toContain('text-center');
    expect(el?.className).not.toContain('text-right');
  });
});

// ---------------------------------------------------------------------------
// tone prop
// ---------------------------------------------------------------------------

describe('Typography — tone prop', () => {
  it('adds text-foreground for tone="default"', () => {
    cleanup = render(
      () => (
        <Typography tone="default" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-foreground');
  });

  it('adds text-muted-foreground for tone="muted"', () => {
    cleanup = render(
      () => (
        <Typography tone="muted" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-muted-foreground');
  });

  it('adds text-destructive for tone="destructive"', () => {
    cleanup = render(
      () => (
        <Typography tone="destructive" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-destructive');
  });

  it('adds text-primary for tone="primary"', () => {
    cleanup = render(
      () => (
        <Typography tone="primary" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-primary');
  });
});

// ---------------------------------------------------------------------------
// size prop
// ---------------------------------------------------------------------------

describe('Typography — size override prop', () => {
  it('adds text-xs for size="xs"', () => {
    cleanup = render(
      () => (
        <Typography size="xs" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-xs');
  });

  it('adds text-2xl for size="2xl"', () => {
    cleanup = render(
      () => (
        <Typography size="2xl" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-2xl');
  });

  it('does not add a size class when size is not provided', () => {
    cleanup = render(
      () => (
        <Typography variant="p" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    // p variant has text-base in base string, not via size prop
    // ensure no spurious text-xs/sm/2xl etc from size prop
    expect(el?.className).not.toContain('text-xs');
  });
});

// ---------------------------------------------------------------------------
// dim prop
// ---------------------------------------------------------------------------

describe('Typography — dim prop', () => {
  it('adds opacity-0 when dim=true', () => {
    cleanup = render(
      () => (
        <Typography dim data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('opacity-0');
  });

  it('adds opacity-100 when dim=false', () => {
    cleanup = render(
      () => (
        <Typography dim={false} data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('opacity-100');
  });

  it('always adds transition-opacity duration-200', () => {
    cleanup = render(() => <Typography data-testid="t">Hello</Typography>, container);
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('transition-opacity');
    expect(el?.className).toContain('duration-200');
  });

  it('adds opacity-100 by default (no dim prop)', () => {
    cleanup = render(() => <Typography data-testid="t">Hello</Typography>, container);
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('opacity-100');
    expect(el?.className).not.toContain('opacity-0');
  });
});

// ---------------------------------------------------------------------------
// weight prop
// ---------------------------------------------------------------------------

describe('Typography — weight override prop', () => {
  it('adds font-normal for weight="normal"', () => {
    cleanup = render(
      () => (
        <Typography weight="normal" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('font-normal');
  });

  it('adds font-extrabold for weight="extrabold"', () => {
    cleanup = render(
      () => (
        <Typography weight="extrabold" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('font-extrabold');
  });

  it('overrides the variant font-weight (h1 extrabold + weight="normal")', () => {
    cleanup = render(
      () => (
        <Typography variant="h1" weight="normal" data-testid="t">
          Title
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    // tailwind-merge drops the variant's font-extrabold, keeps font-normal
    expect(el?.className).toContain('font-normal');
    expect(el?.className).not.toContain('font-extrabold');
  });

  it('does not add a weight class when weight is not provided', () => {
    cleanup = render(
      () => (
        <Typography variant="p" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).not.toContain('font-thin');
    expect(el?.className).not.toContain('font-light');
  });
});

// ---------------------------------------------------------------------------
// mono prop
// ---------------------------------------------------------------------------

describe('Typography — mono prop', () => {
  it('adds font-mono when mono=true', () => {
    cleanup = render(
      () => (
        <Typography mono data-testid="t">
          GET /users
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('font-mono');
  });

  it('does not add font-mono when mono is not provided', () => {
    cleanup = render(
      () => (
        <Typography variant="p" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).not.toContain('font-mono');
  });
});

// ---------------------------------------------------------------------------
// overline variant
// ---------------------------------------------------------------------------

describe('Typography — overline variant', () => {
  it('applies eyebrow classes (uppercase + tracking + muted)', () => {
    cleanup = render(
      () => (
        <Typography variant="overline" data-testid="t">
          Section
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('uppercase');
    expect(el?.className).toContain('tracking-widest');
    expect(el?.className).toContain('text-muted-foreground');
  });

  it('renders as <p> (overline is not a real HTML tag)', () => {
    cleanup = render(
      () => (
        <Typography variant="overline" data-testid="t">
          Section
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.tagName.toLowerCase()).toBe('p');
  });
});

// ---------------------------------------------------------------------------
// variant-baked colour precedence (regression: color default must not clobber
// a variant's own text colour — see variants.ts ordering note)
// ---------------------------------------------------------------------------

describe('Typography — variant colour precedence', () => {
  it('muted variant keeps text-muted-foreground (not overridden by color default)', () => {
    cleanup = render(
      () => (
        <Typography variant="muted" data-testid="t">
          Hint
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-muted-foreground');
    expect(el?.className).not.toContain('text-foreground');
  });

  it('lead variant keeps text-muted-foreground', () => {
    cleanup = render(
      () => (
        <Typography variant="lead" data-testid="t">
          Intro
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-muted-foreground');
  });

  it('tone prop still overrides a variant-baked colour', () => {
    cleanup = render(
      () => (
        <Typography variant="muted" tone="primary" data-testid="t">
          Hint
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('text-primary');
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility smoke
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reactivity contract — variant/color/class must update at runtime
// ---------------------------------------------------------------------------

describe('Typography — reactivity contract', () => {
  it('updates CVA class when variant signal changes', () => {
    const [variant, setVariant] = createSignal<'p' | 'h1'>('p');
    cleanup = render(
      () => (
        <Typography variant={variant()} data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    // p: text-base in className; no text-4xl
    expect(container.querySelector('[data-testid="t"]')?.className).not.toContain('text-4xl');

    setVariant('h1');
    // Dynamic changes tag — re-query after signal update
    const el = container.querySelector<HTMLElement>('[data-testid="t"]');
    expect(el?.className).toContain('text-4xl');
    expect(el?.tagName.toLowerCase()).toBe('h1');
  });

  it('updates class when class signal changes', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(
      () => (
        <Typography class={cls()} data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="t"]');
    expect(el?.className).not.toContain('my-dynamic');

    setCls('my-dynamic');
    expect(el?.className).toContain('my-dynamic');
  });
});

describe('Typography — backward compatibility', () => {
  it('renders a <p> by default', () => {
    cleanup = render(() => <Typography data-testid="t">Hello</Typography>, container);
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.tagName.toLowerCase()).toBe('p');
  });

  it('renders correct tag for variant="h1"', () => {
    cleanup = render(
      () => (
        <Typography variant="h1" data-testid="t">
          Title
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.tagName.toLowerCase()).toBe('h1');
  });

  it('renders correct tag and size for variant="h3"', () => {
    cleanup = render(
      () => (
        <Typography variant="h3" data-testid="t">
          Subtitle
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.tagName.toLowerCase()).toBe('h3');
    expect(el?.className).toContain('text-2xl');
  });

  it('forwards custom class', () => {
    cleanup = render(
      () => (
        <Typography class="custom-class" data-testid="t">
          Hello
        </Typography>
      ),
      container,
    );
    const el = container.querySelector('[data-testid="t"]');
    expect(el?.className).toContain('custom-class');
  });
});
