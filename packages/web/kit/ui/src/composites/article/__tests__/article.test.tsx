/**
 * Article composite tests.
 *
 * Covered:
 *   - title + lead render.
 *   - body node slot renders as-is (kit only positions it).
 *   - examples render as entity cards (primary/secondary).
 *   - related items render as interactive badge chips (role="button").
 *   - clicking a chip fires onRelatedSelect with the item id.
 *   - absent slots render nothing (Show-gated).
 *   - manifest registration: ui.Article present with a preset.
 */
/* @vitest-environment jsdom */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllManifests } from '../../../manifest';
import { Article } from '../article';
import type { IArticleExample, IArticleRelated } from '../interfaces';

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

const click = (el: Element) => {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

const EXAMPLES: IArticleExample[] = [
  { primary: 'meta opt-in', secondary: 'Эффекты только при явном meta.' },
  { primary: 'onCleanup', secondary: 'Снятие регистрации при размонтаже.' },
];

const RELATED: IArticleRelated[] = [
  { id: 'no-upward', label: 'No upward imports' },
  { id: 'stateless-view', label: 'Stateless View' },
];

describe('Article', () => {
  it('renders title and lead', () => {
    cleanup = render(() => <Article title="UiProxy" lead="UI — тень логики." />, container);
    expect(container.textContent).toContain('UiProxy');
    expect(container.textContent).toContain('UI — тень логики.');
  });

  it('renders the body node slot as-is', () => {
    cleanup = render(
      () => <Article body={<div data-testid="body">rendered markdown</div>} />,
      container,
    );
    const body = container.querySelector('[data-testid="body"]');
    expect(body?.textContent).toBe('rendered markdown');
  });

  it('renders every example as an entity card', () => {
    cleanup = render(() => <Article examples={EXAMPLES} />, container);
    expect(container.textContent).toContain('meta opt-in');
    expect(container.textContent).toContain('Эффекты только при явном meta.');
    expect(container.textContent).toContain('onCleanup');
  });

  it('renders related items as interactive chips', () => {
    cleanup = render(() => <Article related={RELATED} relatedLabel="Смотри правила" />, container);
    expect(container.textContent).toContain('Смотри правила');
    const chips = container.querySelectorAll('[role="button"]');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('No upward imports');
  });

  it('clicking a related chip fires onRelatedSelect with its id', () => {
    const onRelatedSelect = vi.fn();
    cleanup = render(
      () => <Article related={RELATED} onRelatedSelect={onRelatedSelect} />,
      container,
    );
    const chips = container.querySelectorAll('[role="button"]');
    click(chips[1]);
    expect(onRelatedSelect).toHaveBeenCalledWith('stateless-view');
  });

  it('renders nothing for absent slots (empty article)', () => {
    cleanup = render(() => <Article />, container);
    expect(container.textContent).toBe('');
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it('hides the examples/related blocks when their arrays are empty', () => {
    cleanup = render(() => <Article title="X" examples={[]} related={[]} />, container);
    expect(container.textContent).toContain('X');
    expect(container.querySelector('[role="button"]')).toBeNull();
  });
});

describe('Article manifest', () => {
  const types = getAllManifests().map((m) => m.type);

  it('registers ui.Article', () => {
    expect(types).toContain('ui.Article');
  });

  it('ui.Article carries a concept preset', () => {
    const m = getAllManifests().find((x) => x.type === 'ui.Article');
    expect(m?.presets?.some((p) => p.id === 'concept')).toBe(true);
  });
});
