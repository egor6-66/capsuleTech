/* @vitest-environment jsdom */

/**
 * Card primitive — entity (data-driven) mode + baked-in a11y.
 *
 * Covers: slot rendering + gating, tags/badge/meta, align, the interactive→button
 * a11y contract (role/tabIndex/Enter/Space), and that compound (children) mode is
 * untouched.
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Card } from '../card';

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

const key = (el: Element, k: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

describe('Card — entity mode: slot rendering', () => {
  it('renders every set slot; renders p-card (entity default padding)', () => {
    cleanup = render(
      () => (
        <Card
          data-testid="card"
          title="cat"
          subtitle="/kæt/"
          translation="кошка"
          definition="a small mammal"
        />
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(el.textContent).toContain('cat');
    expect(el.textContent).toContain('/kæt/');
    expect(el.textContent).toContain('кошка');
    expect(el.textContent).toContain('a small mammal');
    // Entity mode supplies inner padding by default (no Card.Content to pad).
    expect(el.className).toContain('p-card');
  });

  it('absent slot renders nothing (no empty box)', () => {
    cleanup = render(() => <Card data-testid="card" title="only title" />, container);
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(el.textContent).toContain('only title');
    // No badge / meta artifacts when those slots are absent.
    expect(el.querySelector('[data-slot="badge"]')).toBeNull();
  });

  it('tags render one muted Badge each', () => {
    cleanup = render(
      () => <Card data-testid="card" title="cat" tags={['noun', 'A1', 'animals']} />,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    const badges = el.querySelectorAll('[data-slot="badge"]');
    expect(badges.length).toBe(3);
    expect(badges[0].getAttribute('data-tone')).toBe('muted');
  });

  it('badge slot renders a single Badge near the title', () => {
    cleanup = render(
      () => <Card data-testid="card" title="Present Simple" badge="A2" />,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    const badges = el.querySelectorAll('[data-slot="badge"]');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toBe('A2');
  });

  it('meta renders key:value lines', () => {
    cleanup = render(
      () => (
        <Card
          data-testid="card"
          title="cat"
          meta={[
            { key: 'часть речи', value: 'сущ.' },
            { key: 'частота', value: 'высокая' },
          ]}
        />
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(el.textContent).toContain('часть речи');
    expect(el.textContent).toContain('сущ.');
    expect(el.textContent).toContain('частота');
  });
});

describe('Card — entity mode: align', () => {
  it('align="center" centers the stack', () => {
    cleanup = render(() => <Card data-testid="card" title="cat" align="center" />, container);
    const stack = container.querySelector<HTMLElement>('[data-testid="card"] > div')!;
    expect(stack.className).toContain('items-center');
    expect(stack.className).toContain('text-center');
  });

  it('default align is start', () => {
    cleanup = render(() => <Card data-testid="card" title="cat" />, container);
    const stack = container.querySelector<HTMLElement>('[data-testid="card"] > div')!;
    expect(stack.className).toContain('items-start');
    expect(stack.className).toContain('text-left');
  });
});

describe('Card — baked-in a11y (interactive + onClick → button)', () => {
  it('sets role="button" + tabIndex=0 when interactive with onClick', () => {
    cleanup = render(
      () => <Card data-testid="card" interactive onClick={() => {}} title="x" />,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('does NOT set role when not interactive (even with onClick)', () => {
    cleanup = render(() => <Card data-testid="card" onClick={() => {}} title="x" />, container);
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('does NOT set role when interactive but no onClick', () => {
    cleanup = render(() => <Card data-testid="card" interactive title="x" />, container);
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('Enter and Space activate onClick', () => {
    const onClick = vi.fn();
    cleanup = render(
      () => <Card data-testid="card" interactive onClick={onClick} title="x" />,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    key(el, 'Enter');
    key(el, ' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('explicit role wins over the auto button role', () => {
    cleanup = render(
      () => <Card data-testid="card" interactive onClick={() => {}} role="option" title="x" />,
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(el.getAttribute('role')).toBe('option');
  });
});

describe('Card — compound mode untouched', () => {
  it('renders children (no entity slots) with no auto role/padding', () => {
    cleanup = render(
      () => (
        <Card data-testid="card">
          <Card.Content data-testid="content">hello</Card.Content>
        </Card>
      ),
      container,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(container.querySelector('[data-testid="content"]')?.textContent).toBe('hello');
    // Compound Card keeps chrome-only root (no p-card on the root itself).
    expect(el.className).not.toContain('p-card');
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('reactively toggles into entity mode when a slot appears', () => {
    const [title, setTitle] = createSignal<string | undefined>(undefined);
    cleanup = render(
      () => (
        <Card data-testid="card" title={title()}>
          <Card.Content data-testid="content">compound</Card.Content>
        </Card>
      ),
      container,
    );
    // Initially compound — children shown.
    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
    setTitle('now an entity');
    // Entity slot set → entity layout replaces children.
    const el = container.querySelector<HTMLElement>('[data-testid="card"]')!;
    expect(el.textContent).toContain('now an entity');
    expect(container.querySelector('[data-testid="content"]')).toBeNull();
  });
});
