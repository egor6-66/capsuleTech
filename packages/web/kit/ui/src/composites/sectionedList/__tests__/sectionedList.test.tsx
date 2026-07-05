/**
 * SectionedList composite tests.
 *
 * Kobalte Accordion renders content inline (not in a Portal), so DOM queries
 * work on the render container.
 *
 * Covered:
 *   - section headers render (label + muted subtitle stack).
 *   - defaultOpen="all" expands every section.
 *   - selectedId highlights the matching row (aria-selected / data-selected).
 *   - clicking a row fires onSelect with the item id.
 *   - itemPreview does not break row interaction (Tooltip wrapper is transparent).
 *   - manifest registration: ui.SectionedList + ui.Accordion (+ parts) present.
 */
/* @vitest-environment jsdom */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllManifests } from '../../../manifest';
import type { ISectionedListSection } from '../interfaces';
import { SectionedList } from '../sectionedList';

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

const SECTIONS: ISectionedListSection[] = [
  {
    value: 'concepts',
    label: 'Понятия',
    subtitle: 'Ключевые сущности',
    items: [
      { id: 'uiproxy', label: 'UiProxy' },
      { id: 'bridge', label: 'Bridge' },
    ],
  },
  {
    value: 'rules',
    label: 'Правила',
    items: [{ id: 'no-upward', label: 'No upward' }],
  },
];

describe('SectionedList', () => {
  it('renders every section header with its label + subtitle', () => {
    cleanup = render(() => <SectionedList sections={SECTIONS} defaultOpen="all" />, container);
    expect(container.textContent).toContain('Понятия');
    expect(container.textContent).toContain('Правила');
    // The subtitle renders as a muted caption inside the trigger's stack.
    const caption = container.querySelector('.flex-col .text-muted-foreground');
    expect(caption?.textContent).toBe('Ключевые сущности');
  });

  it('defaultOpen="all" expands every section', () => {
    cleanup = render(() => <SectionedList sections={SECTIONS} defaultOpen="all" />, container);
    // One data-expanded per open item (2 sections).
    expect(container.querySelectorAll('[data-expanded]').length).toBeGreaterThanOrEqual(2);
  });

  it('no defaultOpen → all sections collapsed', () => {
    cleanup = render(() => <SectionedList sections={SECTIONS} />, container);
    expect(container.querySelector('[data-expanded]')).toBeNull();
  });

  it('renders items as selectable option rows', () => {
    cleanup = render(() => <SectionedList sections={SECTIONS} defaultOpen="all" />, container);
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3); // 2 + 1 items
  });

  it('selectedId highlights the matching row', () => {
    cleanup = render(
      () => <SectionedList sections={SECTIONS} selectedId="bridge" defaultOpen="all" />,
      container,
    );
    const selected = container.querySelector('[role="option"][aria-selected="true"]');
    expect(selected).not.toBeNull();
    expect(selected?.textContent).toContain('Bridge');
    expect(selected?.hasAttribute('data-selected')).toBe(true);
  });

  it('clicking a row fires onSelect with the item id', () => {
    const onSelect = vi.fn();
    cleanup = render(
      () => <SectionedList sections={SECTIONS} onSelect={onSelect} defaultOpen="all" />,
      container,
    );
    const rows = container.querySelectorAll('[role="option"]');
    click(rows[0]);
    expect(onSelect).toHaveBeenCalledWith('uiproxy');
  });

  it('itemPreview keeps the row interactive (Tooltip wrapper is transparent)', () => {
    const onSelect = vi.fn();
    cleanup = render(
      () => (
        <SectionedList
          sections={SECTIONS}
          onSelect={onSelect}
          defaultOpen="all"
          itemPreview={(id) => <div data-testid="preview">{id}</div>}
        />
      ),
      container,
    );
    const rows = container.querySelectorAll('[role="option"]');
    expect(rows.length).toBe(3);
    click(rows[2]);
    expect(onSelect).toHaveBeenCalledWith('no-upward');
  });
});

describe('SectionedList / Accordion manifests', () => {
  const types = getAllManifests().map((m) => m.type);

  it('registers ui.SectionedList', () => {
    expect(types).toContain('ui.SectionedList');
  });

  it('registers ui.Accordion container + compound parts', () => {
    expect(types).toContain('ui.Accordion');
    expect(types).toContain('ui.Accordion.Item');
    expect(types).toContain('ui.Accordion.Trigger');
    expect(types).toContain('ui.Accordion.Content');
  });

  it('ui.SectionedList carries a reference preset', () => {
    const m = getAllManifests().find((x) => x.type === 'ui.SectionedList');
    expect(m?.presets?.some((p) => p.id === 'reference')).toBe(true);
  });
});
