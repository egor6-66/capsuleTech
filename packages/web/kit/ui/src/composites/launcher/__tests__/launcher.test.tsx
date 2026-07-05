/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Launcher } from '../launcher';

const ITEMS = [
  { id: 'lessons', label: 'Lessons', description: 'Step by step' },
  { id: 'library', label: 'Library' },
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

const cards = () => Array.from(container.querySelectorAll('[role="button"]')) as HTMLElement[];

describe('Launcher', () => {
  it('renders one card per item with label (+ description when present)', () => {
    cleanup = render(() => <Launcher items={ITEMS} onSelect={() => {}} />, container);

    expect(cards().length).toBe(2);
    expect(container.textContent).toContain('Lessons');
    expect(container.textContent).toContain('Step by step');
    expect(container.textContent).toContain('Library');
  });

  it('fires onSelect with the item id on click', () => {
    const onSelect = vi.fn();
    cleanup = render(() => <Launcher items={ITEMS} onSelect={onSelect} />, container);

    cards()[0].click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('lessons');
  });

  it('fires onSelect on Enter and Space keydown', () => {
    const onSelect = vi.fn();
    cleanup = render(() => <Launcher items={ITEMS} onSelect={onSelect} />, container);

    const card = cards()[0];
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, 'lessons');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'lessons');
  });

  it('renders the hero (title + description + hint) when provided', () => {
    cleanup = render(
      () => (
        <Launcher
          items={ITEMS}
          title="Welcome"
          description="Pick one"
          hint="Tip"
          onSelect={() => {}}
        />
      ),
      container,
    );

    expect(container.querySelector('h1')?.textContent).toBe('Welcome');
    expect(container.textContent).toContain('Pick one');
    expect(container.textContent).toContain('Tip');
  });

  it('omits the hero block when neither title nor description is given', () => {
    cleanup = render(() => <Launcher items={ITEMS} onSelect={() => {}} />, container);

    expect(container.querySelector('h1')).toBeNull();
  });
});
