/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SegmentedBar } from '../segmentedBar';

const ITEMS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

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

const buttons = () =>
  Array.from(container.querySelectorAll('[data-slot="button"]')) as HTMLElement[];
const byLabel = (label: string) => buttons().find((b) => b.textContent === label)!;

describe('SegmentedBar', () => {
  it('renders one button per item, in order, with its label', () => {
    cleanup = render(() => <SegmentedBar items={ITEMS} onSelect={() => {}} />, container);

    expect(buttons().length).toBe(3);
    expect(buttons().map((b) => b.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('fires onSelect with the clicked item id', () => {
    const onSelect = vi.fn();
    cleanup = render(() => <SegmentedBar items={ITEMS} onSelect={onSelect} />, container);

    byLabel('Beta').click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('marks the active segment with aria-current="page", others unset', () => {
    cleanup = render(
      () => <SegmentedBar items={ITEMS} activeId="b" onSelect={() => {}} />,
      container,
    );

    expect(byLabel('Beta').getAttribute('aria-current')).toBe('page');
    expect(byLabel('Alpha').getAttribute('aria-current')).toBeNull();
    expect(byLabel('Gamma').getAttribute('aria-current')).toBeNull();
  });

  it('active segment is primary + pointer-events-none; inactive is ghost + clickable', () => {
    cleanup = render(
      () => <SegmentedBar items={ITEMS} activeId="a" onSelect={() => {}} />,
      container,
    );

    const active = byLabel('Alpha');
    const inactive = byLabel('Beta');

    expect(active.getAttribute('data-variant')).toBe('default');
    expect(active.classList.contains('pointer-events-none')).toBe(true);

    expect(inactive.getAttribute('data-variant')).toBe('ghost');
    expect(inactive.classList.contains('pointer-events-none')).toBe(false);
  });
});
