/* @vitest-environment jsdom */

/**
 * SelectableItem (`Ui.List.Item`) — DOM render + interaction contract.
 *
 * Covers:
 *   - Renders label as an accessible option button.
 *   - Click fires onSelect.
 *   - Enter / Space fire onSelect (keyboard a11y).
 *   - selected → aria-selected + accent highlight class.
 *   - icon renders a leading node; trailing renders a right slot.
 *   - Extra button attrs (data-*) pass through.
 */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { List } from '../index';
import { SelectableItem } from '../selectableItem';

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

const press = (el: Element, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('SelectableItem', () => {
  it('is exposed as List.Item', () => {
    expect(List.Item).toBe(SelectableItem);
  });

  it('renders the label inside an option button', () => {
    cleanup = render(
      () => (
        <SelectableItem onSelect={() => {}} data-testid="leaf">
          Button — primary
        </SelectableItem>
      ),
      container,
    );
    const btn = container.querySelector('[data-testid="leaf"]')!;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('role')).toBe('option');
    expect(btn.textContent).toContain('Button — primary');
  });

  it('click fires onSelect', () => {
    const onSelect = vi.fn();
    cleanup = render(
      () => (
        <SelectableItem onSelect={onSelect} data-testid="leaf">
          Leaf
        </SelectableItem>
      ),
      container,
    );
    (container.querySelector('[data-testid="leaf"]') as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('Enter and Space fire onSelect', () => {
    const onSelect = vi.fn();
    cleanup = render(
      () => (
        <SelectableItem onSelect={onSelect} data-testid="leaf">
          Leaf
        </SelectableItem>
      ),
      container,
    );
    const btn = container.querySelector('[data-testid="leaf"]')!;
    press(btn, 'Enter');
    press(btn, ' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('selected → aria-selected true + accent highlight', () => {
    cleanup = render(
      () => (
        <SelectableItem selected onSelect={() => {}} data-testid="leaf">
          Leaf
        </SelectableItem>
      ),
      container,
    );
    const btn = container.querySelector('[data-testid="leaf"]')!;
    expect(btn.getAttribute('aria-selected')).toBe('true');
    expect(btn.classList.contains('bg-accent')).toBe(true);
    expect(btn.hasAttribute('data-selected')).toBe(true);
  });

  it('not selected → aria-selected false, no highlight, no data-selected', () => {
    cleanup = render(
      () => (
        <SelectableItem onSelect={() => {}} data-testid="leaf">
          Leaf
        </SelectableItem>
      ),
      container,
    );
    const btn = container.querySelector('[data-testid="leaf"]')!;
    expect(btn.getAttribute('aria-selected')).toBe('false');
    expect(btn.hasAttribute('data-selected')).toBe(false);
  });

  it('renders a leading icon and a trailing slot', () => {
    const Icon = () => <svg data-testid="icon" />;
    cleanup = render(
      () => (
        <SelectableItem
          icon={Icon}
          trailing={<span data-testid="trail">9</span>}
          onSelect={() => {}}
          data-testid="leaf"
        >
          Leaf
        </SelectableItem>
      ),
      container,
    );
    expect(container.querySelector('[data-testid="icon"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="trail"]')).not.toBeNull();
  });
});
