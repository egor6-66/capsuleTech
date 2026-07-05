/**
 * Accordion primitive tests.
 *
 * Kobalte Accordion renders content inline (NOT in a Portal), so DOM queries
 * work directly on the render container.
 *
 * Covered:
 *   - Trigger is rendered in DOM.
 *   - Content is hidden before trigger click.
 *   - Clicking trigger shows content.
 *   - Multiple mode: two items can be open simultaneously.
 *   - Collapsible mode: clicking the open trigger closes it.
 *   - Disabled item cannot be expanded.
 *   - Accordion.Item + Accordion.Trigger + Accordion.Content render without error.
 *   - defaultValue: item is expanded on mount.
 *   - bordered / rounded: independent opt-in stroke + radius (both off by default).
 */
/* @vitest-environment jsdom */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Accordion } from '../accordion';

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

/** Fires pointer-down + pointer-up + click on an element. */
const click = (el: Element) => {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

/** Polls until predicate is true or `ms` milliseconds elapse. */
const waitFor = (predicate: () => boolean, ms = 400): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > ms) return reject(new Error('waitFor timeout'));
      setTimeout(check, 10);
    };
    check();
  });

describe('Accordion', () => {
  describe('rendering', () => {
    it('renders triggers in the DOM', () => {
      cleanup = render(
        () => (
          <Accordion>
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      expect(container.querySelector('[data-testid="trigger-a"]')).not.toBeNull();
    });

    it('content is hidden (collapsed) before trigger click', () => {
      cleanup = render(
        () => (
          <Accordion>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content data-testid="content-a">Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      // Kobalte renders but marks with data-closed; aria-hidden or similar
      const content = container.querySelector('[data-testid="content-a"]');
      // Content element exists in DOM but item should not be expanded
      const item = container.querySelector('[data-expanded]');
      expect(item).toBeNull();
    });
  });

  describe('expand / collapse', () => {
    it('clicking trigger expands the content (data-expanded on item)', async () => {
      cleanup = render(
        () => (
          <Accordion>
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content data-testid="content-a">Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      const trigger = container.querySelector('[data-testid="trigger-a"]')!;
      click(trigger);

      await waitFor(() => container.querySelector('[data-expanded]') !== null);
      expect(container.querySelector('[data-expanded]')).not.toBeNull();
    });

    it('collapsible: clicking open trigger closes it', async () => {
      cleanup = render(
        () => (
          <Accordion collapsible>
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      const trigger = container.querySelector('[data-testid="trigger-a"]')!;

      // Open
      click(trigger);
      await waitFor(() => container.querySelector('[data-expanded]') !== null);
      expect(container.querySelector('[data-expanded]')).not.toBeNull();

      // Close
      click(trigger);
      await waitFor(() => container.querySelector('[data-expanded]') === null);
      expect(container.querySelector('[data-expanded]')).toBeNull();
    });
  });

  describe('multiple mode', () => {
    it('two items can be expanded simultaneously', async () => {
      cleanup = render(
        () => (
          <Accordion multiple>
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger data-testid="trigger-b">Section B</Accordion.Trigger>
              <Accordion.Content>Content B</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      click(container.querySelector('[data-testid="trigger-a"]')!);
      await waitFor(() => container.querySelectorAll('[data-expanded]').length >= 1);

      click(container.querySelector('[data-testid="trigger-b"]')!);
      await waitFor(() => container.querySelectorAll('[data-expanded]').length >= 2);

      expect(container.querySelectorAll('[data-expanded]').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('disabled item', () => {
    it('disabled item does not expand on click', async () => {
      cleanup = render(
        () => (
          <Accordion>
            <Accordion.Item value="a" disabled>
              <Accordion.Trigger data-testid="trigger-disabled">Disabled</Accordion.Trigger>
              <Accordion.Content>Cannot see this</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      click(container.querySelector('[data-testid="trigger-disabled"]')!);

      // Allow time for any async updates
      await new Promise((r) => setTimeout(r, 80));
      expect(container.querySelector('[data-expanded]')).toBeNull();
    });

    it('disabled trigger has data-disabled attribute', () => {
      cleanup = render(
        () => (
          <Accordion>
            <Accordion.Item value="a" disabled>
              <Accordion.Trigger data-testid="trigger-disabled">Disabled</Accordion.Trigger>
              <Accordion.Content>Content</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      const trigger = container.querySelector('[data-testid="trigger-disabled"]')!;
      expect(trigger.hasAttribute('data-disabled')).toBe(true);
    });
  });

  describe('defaultValue', () => {
    it('item with value in defaultValue is expanded on mount', async () => {
      cleanup = render(
        () => (
          <Accordion multiple defaultValue={['item-a']}>
            <Accordion.Item value="item-a">
              <Accordion.Trigger>Item A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="item-b">
              <Accordion.Trigger>Item B</Accordion.Trigger>
              <Accordion.Content>Content B</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      // Wait a tick for Solid reactivity to settle
      await new Promise((r) => setTimeout(r, 20));
      expect(container.querySelector('[data-expanded]')).not.toBeNull();
    });
  });

  describe('bordered / rounded', () => {
    it('neither stroke nor radius by default', () => {
      cleanup = render(
        () => (
          <Accordion>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      const root = container.firstElementChild!;
      // `divide-border` is always present; the standalone `border` token is not.
      expect(root.classList.contains('border')).toBe(false);
      expect(root.classList.contains('rounded-md')).toBe(false);
    });

    it('bordered=true adds the stroke only (no radius)', () => {
      cleanup = render(
        () => (
          <Accordion bordered>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      const root = container.firstElementChild!;
      expect(root.classList.contains('border')).toBe(true);
      expect(root.classList.contains('rounded-md')).toBe(false);
      expect(root.classList.contains('overflow-hidden')).toBe(false);
    });

    it('rounded=true adds the radius only (no stroke)', () => {
      cleanup = render(
        () => (
          <Accordion rounded>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      const root = container.firstElementChild!;
      expect(root.classList.contains('rounded-md')).toBe(true);
      expect(root.classList.contains('overflow-hidden')).toBe(true);
      expect(root.classList.contains('border')).toBe(false);
    });

    it('bordered + rounded compose', () => {
      cleanup = render(
        () => (
          <Accordion bordered rounded>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );

      const root = container.firstElementChild!;
      expect(root.classList.contains('border')).toBe(true);
      expect(root.classList.contains('rounded-md')).toBe(true);
    });
  });

  describe('density', () => {
    it('default density → trigger has py-3', () => {
      cleanup = render(
        () => (
          <Accordion>
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );
      const trigger = container.querySelector('[data-testid="trigger-a"]')!;
      expect(trigger.classList.contains('py-3')).toBe(true);
      expect(trigger.classList.contains('py-2')).toBe(false);
    });

    it('density="compact" → trigger tightens to py-2 (px stays px-4)', () => {
      cleanup = render(
        () => (
          <Accordion density="compact">
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );
      const trigger = container.querySelector('[data-testid="trigger-a"]')!;
      expect(trigger.classList.contains('py-2')).toBe(true);
      expect(trigger.classList.contains('py-3')).toBe(false);
      expect(trigger.classList.contains('px-4')).toBe(true);
    });
  });

  describe('nested indent', () => {
    it('no indent by default', () => {
      cleanup = render(
        () => (
          <Accordion>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );
      expect(container.firstElementChild!.classList.contains('pl-3')).toBe(false);
    });

    it('nested=true adds pl-3 on the root', () => {
      cleanup = render(
        () => (
          <Accordion nested>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );
      expect(container.firstElementChild!.classList.contains('pl-3')).toBe(true);
    });

    it('nested composes with the fluid layout branch', () => {
      cleanup = render(
        () => (
          <Accordion nested fluid={250}>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );
      const root = container.firstElementChild! as HTMLElement;
      expect(root.classList.contains('pl-3')).toBe(true);
      expect(root.getAttribute('style')).toContain('1 1 250px');
    });
  });

  describe('segmented preset', () => {
    it('applies bordered + compact triggers in one word', () => {
      cleanup = render(
        () => (
          <Accordion preset="segmented">
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );
      const root = container.firstElementChild!;
      const trigger = container.querySelector('[data-testid="trigger-a"]')!;
      expect(root.classList.contains('border')).toBe(true);
      expect(trigger.classList.contains('py-2')).toBe(true);
    });

    it('segmented enables multiple-open mode', async () => {
      cleanup = render(
        () => (
          <Accordion preset="segmented">
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger data-testid="trigger-b">Section B</Accordion.Trigger>
              <Accordion.Content>Content B</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );
      click(container.querySelector('[data-testid="trigger-a"]')!);
      await waitFor(() => container.querySelectorAll('[data-expanded]').length >= 1);
      click(container.querySelector('[data-testid="trigger-b"]')!);
      await waitFor(() => container.querySelectorAll('[data-expanded]').length >= 2);
      expect(container.querySelectorAll('[data-expanded]').length).toBeGreaterThanOrEqual(2);
    });

    it('explicit prop overrides the preset (density="default" restores py-3)', () => {
      cleanup = render(
        () => (
          <Accordion preset="segmented" density="default">
            <Accordion.Item value="a">
              <Accordion.Trigger data-testid="trigger-a">Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        ),
        container,
      );
      const trigger = container.querySelector('[data-testid="trigger-a"]')!;
      expect(trigger.classList.contains('py-3')).toBe(true);
      expect(trigger.classList.contains('py-2')).toBe(false);
      // stroke still comes from the preset.
      expect(container.firstElementChild!.classList.contains('border')).toBe(true);
    });
  });

  describe('compound structure', () => {
    it('Accordion.Item + Trigger + Content render without error', () => {
      expect(() => {
        cleanup = render(
          () => (
            <Accordion>
              <Accordion.Item value="test">
                <Accordion.Trigger>Test</Accordion.Trigger>
                <Accordion.Content>Test content</Accordion.Content>
              </Accordion.Item>
            </Accordion>
          ),
          container,
        );
      }).not.toThrow();
    });
  });
});
