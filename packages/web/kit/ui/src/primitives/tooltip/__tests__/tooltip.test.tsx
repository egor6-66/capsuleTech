/**
 * Tooltip primitive tests.
 *
 * The Tooltip renders its content inside a Portal (teleported to
 * document.body). This means the panel is NOT a descendant of the render
 * container — tests query document.body directly when the tooltip is open.
 *
 * Covered:
 *   - Trigger renders in the DOM.
 *   - Panel is absent from DOM before interaction.
 *   - Compound statics exist: Tooltip.Trigger, Tooltip.Content, Tooltip.Arrow.
 *   - Named re-exports exist: TooltipTrigger, TooltipContent, TooltipArrow.
 *   - Panel mounts into document.body (Portal), not the render container.
 *   - `cursorTracking` prop is accepted (no runtime error).
 *   - Pointer-move tracking updates the cursor anchor without throwing
 *     (jsdom does not compute pixel positions — structural check).
 *   - `disabled` prop prevents the panel from appearing on pointer events.
 *   - `onOpenChange` fires on open.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from '../tooltip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
});

/** Fires pointer-enter + pointer-move on an element (Kobalte uses pointerenter to open). */
const hoverEnter = (el: Element) => {
  el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, cancelable: true }));
  el.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 200,
    }),
  );
};

/** Polls until predicate is true or timeout. */
const waitFor = (predicate: () => boolean, ms = 400): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > ms) return reject(new Error('waitFor timeout'));
      setTimeout(check, 16);
    };
    check();
  });

// ---------------------------------------------------------------------------
// Compound & named exports
// ---------------------------------------------------------------------------

describe('Tooltip exports', () => {
  it('Tooltip has Trigger, Content, Arrow statics', () => {
    expect(typeof Tooltip.Trigger).toBe('function');
    expect(typeof Tooltip.Content).toBe('function');
    expect(typeof Tooltip.Arrow).toBe('function');
  });

  it('named re-exports TooltipTrigger, TooltipContent, TooltipArrow exist', () => {
    expect(typeof TooltipTrigger).toBe('function');
    expect(typeof TooltipContent).toBe('function');
    expect(typeof TooltipArrow).toBe('function');
  });

  it('Tooltip.Trigger === TooltipTrigger (same reference)', () => {
    expect(Tooltip.Trigger).toBe(TooltipTrigger);
  });

  it('Tooltip.Content === TooltipContent (same reference)', () => {
    expect(Tooltip.Content).toBe(TooltipContent);
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('Tooltip rendering', () => {
  it('trigger renders in the DOM', () => {
    cleanup = render(
      () => (
        <Tooltip>
          <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
          <Tooltip.Content>Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="trigger"]')).not.toBeNull();
  });

  it('panel is absent from DOM before hover', () => {
    cleanup = render(
      () => (
        <Tooltip>
          <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
          <Tooltip.Content data-testid="panel">Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    expect(document.body.querySelector('[data-testid="panel"]')).toBeNull();
  });

  it('panel appears in document.body (portal) after hover', async () => {
    // Kobalte tooltip has an openDelay (default 700ms). We override it to 0.
    cleanup = render(
      () => (
        <Tooltip openDelay={0}>
          <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
          <Tooltip.Content data-testid="panel">Tip text</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    hoverEnter(container.querySelector('[data-testid="trigger"]')!);

    await waitFor(() => document.body.querySelector('[data-testid="panel"]') !== null);

    const panel = document.body.querySelector('[data-testid="panel"]')!;
    expect(panel).not.toBeNull();
    expect(panel.textContent).toBe('Tip text');
  });

  it('panel is in document.body, NOT inside the render container', async () => {
    cleanup = render(
      () => (
        <Tooltip openDelay={0}>
          <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
          <Tooltip.Content data-testid="panel">Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    hoverEnter(container.querySelector('[data-testid="trigger"]')!);
    await waitFor(() => document.body.querySelector('[data-testid="panel"]') !== null);

    const panel = document.body.querySelector('[data-testid="panel"]')!;
    expect(document.body.contains(panel)).toBe(true);
    expect(container.contains(panel)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cursorTracking prop
// ---------------------------------------------------------------------------

describe('Tooltip cursorTracking', () => {
  it('accepts cursorTracking={true} without error', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Tooltip cursorTracking={true} openDelay={0}>
            <Tooltip.Trigger data-testid="trigger">Hover</Tooltip.Trigger>
            <Tooltip.Content>Tip</Tooltip.Content>
          </Tooltip>
        ),
        container,
      );
    }).not.toThrow();
  });

  it('accepts cursorTracking={false} without error', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Tooltip cursorTracking={false} openDelay={0}>
            <Tooltip.Trigger data-testid="trigger">Hover</Tooltip.Trigger>
            <Tooltip.Content>Tip</Tooltip.Content>
          </Tooltip>
        ),
        container,
      );
    }).not.toThrow();
  });

  it('panel still opens when cursorTracking={false}', async () => {
    cleanup = render(
      () => (
        <Tooltip cursorTracking={false} openDelay={0}>
          <Tooltip.Trigger data-testid="trigger">Hover</Tooltip.Trigger>
          <Tooltip.Content data-testid="panel">Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    hoverEnter(container.querySelector('[data-testid="trigger"]')!);
    await waitFor(() => document.body.querySelector('[data-testid="panel"]') !== null);
    expect(document.body.querySelector('[data-testid="panel"]')).not.toBeNull();
  });

  it('pointermove on trigger does not throw when cursorTracking is active', async () => {
    cleanup = render(
      () => (
        <Tooltip openDelay={0}>
          <Tooltip.Trigger data-testid="trigger">Hover</Tooltip.Trigger>
          <Tooltip.Content>Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    const trigger = container.querySelector('[data-testid="trigger"]')!;
    expect(() => {
      trigger.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: 150,
          clientY: 250,
        }),
      );
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// disabled prop
// ---------------------------------------------------------------------------

describe('Tooltip disabled', () => {
  it('panel does not appear when disabled=true', async () => {
    cleanup = render(
      () => (
        <Tooltip disabled openDelay={0}>
          <Tooltip.Trigger data-testid="trigger">Hover</Tooltip.Trigger>
          <Tooltip.Content data-testid="panel">Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    hoverEnter(container.querySelector('[data-testid="trigger"]')!);

    // Wait a bit — panel should NOT appear
    await new Promise((r) => setTimeout(r, 100));
    expect(document.body.querySelector('[data-testid="panel"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// onOpenChange callback
// ---------------------------------------------------------------------------

describe('Tooltip onOpenChange', () => {
  it('onOpenChange fires with true when tooltip opens', async () => {
    const onOpenChange = vi.fn();
    cleanup = render(
      () => (
        <Tooltip openDelay={0} onOpenChange={onOpenChange}>
          <Tooltip.Trigger data-testid="trigger">Hover</Tooltip.Trigger>
          <Tooltip.Content>Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    hoverEnter(container.querySelector('[data-testid="trigger"]')!);
    await waitFor(() => onOpenChange.mock.calls.length > 0);

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------
// Polymorphic as
// ---------------------------------------------------------------------------

describe('Tooltip.Trigger polymorphic', () => {
  it('renders as <span> when as="span"', () => {
    cleanup = render(
      () => (
        <Tooltip>
          <Tooltip.Trigger as="span" data-testid="trigger">
            Hover
          </Tooltip.Trigger>
          <Tooltip.Content>Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    const trigger = container.querySelector('[data-testid="trigger"]');
    expect(trigger?.tagName.toLowerCase()).toBe('span');
  });

  it('renders as <button> by default', () => {
    cleanup = render(
      () => (
        <Tooltip>
          <Tooltip.Trigger data-testid="trigger">Hover</Tooltip.Trigger>
          <Tooltip.Content>Tip</Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    const trigger = container.querySelector('[data-testid="trigger"]');
    expect(trigger?.tagName.toLowerCase()).toBe('button');
  });
});

// ---------------------------------------------------------------------------
// Arrow
// ---------------------------------------------------------------------------

describe('Tooltip.Arrow', () => {
  it('Arrow renders inside open panel', async () => {
    cleanup = render(
      () => (
        <Tooltip openDelay={0}>
          <Tooltip.Trigger data-testid="trigger">Hover</Tooltip.Trigger>
          <Tooltip.Content data-testid="panel">
            Tip
            <Tooltip.Arrow data-testid="arrow" />
          </Tooltip.Content>
        </Tooltip>
      ),
      container,
    );

    hoverEnter(container.querySelector('[data-testid="trigger"]')!);
    await waitFor(() => document.body.querySelector('[data-testid="panel"]') !== null);

    // Arrow is inside the panel
    const panel = document.body.querySelector('[data-testid="panel"]')!;
    expect(panel.querySelector('[data-testid="arrow"]')).not.toBeNull();
  });
});
