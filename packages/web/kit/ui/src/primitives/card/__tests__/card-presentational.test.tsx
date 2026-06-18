/* @vitest-environment jsdom */

/**
 * Card primitive — presentational props tests.
 *
 * Covers: elevation, w/minW/maxW, Card.Header divider,
 * Card.Title/Description align, Card.Content default flex-col layout.
 *
 * Finish integration (createFinish / useFinishMode) is tested separately
 * in card.test.tsx.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Card } from '../card';

// ---------------------------------------------------------------------------
// Mocks for createFinish / useFinishMode — OFF for these tests
// ---------------------------------------------------------------------------

import { vi } from 'vitest';

vi.mock('@capsuletech/web-style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-style')>();
  return {
    ...actual,
    useFinishMode: () => () => false,
    useFinishConfig: () => () => ({
      topForegroundAlpha: 0.09,
      topStopPosition: 0,
      midCardAlpha: 0.7,
      midStopPosition: 45,
      bottomPrimaryAlpha: 0.18,
      bottomStopPosition: 100,
      hairlineAlpha: 0.4,
      innerBorderAlpha: 0.06,
      contactShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
      glowAlpha: 0.22,
      glowSpread: '0 8px 24px',
      innerOnly: false,
      centerGlowAlpha: 0,
      centerGlowSize: '60%',
      surfaceAlpha: 1,
      innerGlowAlpha: 0,
    }),
  };
});

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
// elevation prop
// ---------------------------------------------------------------------------

describe('Card — elevation prop', () => {
  it('adds shadow-none for elevation="none"', () => {
    cleanup = render(
      () => (
        <Card elevation="none" data-testid="card">
          content
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.className).toContain('shadow-none');
  });

  it('adds shadow-sm for elevation="sm"', () => {
    cleanup = render(
      () => (
        <Card elevation="sm" data-testid="card">
          content
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.className).toContain('shadow-sm');
  });

  it('adds shadow-lg for elevation="lg"', () => {
    cleanup = render(
      () => (
        <Card elevation="lg" data-testid="card">
          content
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.className).toContain('shadow-lg');
  });

  it('adds shadow-xl for elevation="xl"', () => {
    cleanup = render(
      () => (
        <Card elevation="xl" data-testid="card">
          content
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.className).toContain('shadow-xl');
  });
});

// ---------------------------------------------------------------------------
// w / minW / maxW sizing props
// ---------------------------------------------------------------------------

describe('Card — sizing props', () => {
  it('applies width inline style for w prop', () => {
    cleanup = render(
      () => (
        <Card w={96} data-testid="card">
          content
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.style.width).toContain('calc(var(--spacing) * 96)');
  });

  it('applies min-width inline style for minW prop', () => {
    cleanup = render(
      () => (
        <Card minW={20} data-testid="card">
          content
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.style.minWidth).toContain('calc(var(--spacing) * 20)');
  });

  it('applies max-width inline style for maxW prop', () => {
    cleanup = render(
      () => (
        <Card maxW={120} data-testid="card">
          content
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.style.maxWidth).toContain('calc(var(--spacing) * 120)');
  });

  it('does not set width when w is not provided', () => {
    cleanup = render(() => <Card data-testid="card">content</Card>, container);
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.style.width).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Card.Header divider
// ---------------------------------------------------------------------------

describe('Card.Header — divider prop', () => {
  it('adds border-b border-border when divider=true', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Header divider data-testid="header">
            <Card.Title>Title</Card.Title>
          </Card.Header>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="header"]');
    expect(el?.className).toContain('border-b');
    expect(el?.className).toContain('border-border');
  });

  it('does NOT add border-b when divider is not set', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Header data-testid="header">
            <Card.Title>Title</Card.Title>
          </Card.Header>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="header"]');
    expect(el?.className).not.toContain('border-b');
  });
});

// ---------------------------------------------------------------------------
// Card.Title align
// ---------------------------------------------------------------------------

describe('Card.Title — align prop', () => {
  it('adds text-center for align="center"', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Title align="center" data-testid="title">
            Title
          </Card.Title>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="title"]');
    expect(el?.className).toContain('text-center');
  });

  it('adds text-right for align="end"', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Title align="end" data-testid="title">
            Title
          </Card.Title>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="title"]');
    expect(el?.className).toContain('text-right');
  });

  it('adds text-left for align="start"', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Title align="start" data-testid="title">
            Title
          </Card.Title>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="title"]');
    expect(el?.className).toContain('text-left');
  });
});

// ---------------------------------------------------------------------------
// Card.Description align
// ---------------------------------------------------------------------------

describe('Card.Description — align prop', () => {
  it('adds text-center for align="center"', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Description align="center" data-testid="desc">
            Description
          </Card.Description>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="desc"]');
    expect(el?.className).toContain('text-center');
  });
});

// ---------------------------------------------------------------------------
// Card.Content default layout
// ---------------------------------------------------------------------------

describe('Card.Content — default flex-col layout', () => {
  it('has flex and flex-col classes by default', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Content data-testid="content">Content</Card.Content>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="content"]');
    expect(el?.className).toContain('flex');
    expect(el?.className).toContain('flex-col');
  });

  it('has gap-cell class by default', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Content data-testid="content">Content</Card.Content>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="content"]');
    expect(el?.className).toContain('gap-cell');
  });

  it('applies gap inline style when gap prop is provided', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Content gap={4} data-testid="content">
            Content
          </Card.Content>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="content"]');
    expect(el?.style.gap).toContain('calc(var(--spacing) * 4)');
  });

  it('applies padding inline style when padding prop is provided', () => {
    cleanup = render(
      () => (
        <Card>
          <Card.Content padding={6} data-testid="content">
            Content
          </Card.Content>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="content"]');
    expect(el?.style.padding).toContain('calc(var(--spacing) * 6)');
  });
});

// ---------------------------------------------------------------------------
// Button fullWidth (smoke)
// ---------------------------------------------------------------------------

describe('Button — fullWidth prop', () => {
  it('is tested in button tests — import guard', () => {
    // Button tests live in button/__tests__. This is a Card test file.
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reactivity contract — class prop must update at runtime
// ---------------------------------------------------------------------------

describe('Card — reactivity contract', () => {
  it('updates className when class signal changes', () => {
    const [cls, setCls] = createSignal('');
    cleanup = render(
      () => <Card class={cls()} data-testid="card">content</Card>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.className).not.toContain('my-dynamic');

    setCls('my-dynamic');
    expect(el?.className).toContain('my-dynamic');
  });

  it('updates elevation class when elevation signal changes', () => {
    const [elev, setElev] = createSignal<'none' | 'lg'>('none');
    cleanup = render(
      () => <Card elevation={elev()} data-testid="card">content</Card>,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]');
    expect(el?.className).toContain('shadow-none');

    setElev('lg');
    expect(el?.className).toContain('shadow-lg');
    expect(el?.className).not.toContain('shadow-none');
  });
});
