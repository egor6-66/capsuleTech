/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Badge } from '../badge';

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

const badge = () => container.querySelector('[data-slot="badge"]') as HTMLElement;

describe('Badge — static', () => {
  it('renders a span with the label + data-slot="badge"', () => {
    cleanup = render(() => <Badge>#core</Badge>, container);

    expect(badge().tagName).toBe('SPAN');
    expect(badge().textContent).toBe('#core');
  });

  it('defaults to tone="muted" size="sm" and is not interactive', () => {
    cleanup = render(() => <Badge>x</Badge>, container);

    expect(badge().getAttribute('data-tone')).toBe('muted');
    expect(badge().getAttribute('data-size')).toBe('sm');
    expect(badge().getAttribute('role')).toBeNull();
    expect(badge().getAttribute('tabindex')).toBeNull();
    expect(badge().getAttribute('data-interactive')).toBeNull();
  });

  it('reflects tone/size props', () => {
    cleanup = render(
      () => (
        <Badge tone="accent" size="md">
          x
        </Badge>
      ),
      container,
    );

    expect(badge().getAttribute('data-tone')).toBe('accent');
    expect(badge().getAttribute('data-size')).toBe('md');
    expect(badge().classList.contains('bg-primary')).toBe(true);
  });

  it('ignores onClick when not interactive (no click handler wired)', () => {
    const onClick = vi.fn();
    cleanup = render(() => <Badge onClick={onClick}>x</Badge>, container);

    badge().click();

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Badge — interactive chip', () => {
  it('exposes role="button" + tabIndex when interactive', () => {
    cleanup = render(
      () => (
        <Badge interactive onClick={() => {}}>
          chip
        </Badge>
      ),
      container,
    );

    expect(badge().getAttribute('role')).toBe('button');
    expect(badge().getAttribute('tabindex')).toBe('0');
    expect(badge().getAttribute('data-interactive')).toBe('');
  });

  it('fires onClick on click', () => {
    const onClick = vi.fn();
    cleanup = render(
      () => (
        <Badge interactive onClick={onClick}>
          chip
        </Badge>
      ),
      container,
    );

    badge().click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates via Enter and Space keys', () => {
    const onClick = vi.fn();
    cleanup = render(
      () => (
        <Badge interactive onClick={onClick}>
          chip
        </Badge>
      ),
      container,
    );

    badge().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    badge().dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('reflects selected via aria-pressed + data-selected + accent highlight', () => {
    cleanup = render(
      () => (
        <Badge tone="outline" interactive selected onClick={() => {}}>
          chip
        </Badge>
      ),
      container,
    );

    expect(badge().getAttribute('aria-pressed')).toBe('true');
    expect(badge().getAttribute('data-selected')).toBe('');
    // accent-акцент выбранного чипа перекрывает tone (twMerge last-wins).
    expect(badge().classList.contains('bg-primary')).toBe(true);
  });

  it('unselected interactive chip → aria-pressed="false", no data-selected', () => {
    cleanup = render(
      () => (
        <Badge interactive onClick={() => {}}>
          chip
        </Badge>
      ),
      container,
    );

    expect(badge().getAttribute('aria-pressed')).toBe('false');
    expect(badge().getAttribute('data-selected')).toBeNull();
  });
});
