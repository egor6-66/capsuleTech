/**
 * Menu composite tests.
 *
 * `Menu.Dropdown` wraps the container-agnostic `Menu` list in the `Dropdown`
 * primitive, which portal-mounts its content to document.body via Kobalte —
 * so all queries against open-menu content use document.body.
 *
 * Covered:
 *   - action item → 1 menuitem role + onSelect fires
 *   - disabled action suppresses onSelect
 *   - separator renders
 *   - label heading renders
 *   - toggle item renders a switch reflecting `checked` + fires onChange
 *   - submenu: SubTrigger visible, click opens nested items
 *   - expandable: render-slot body appears when sub opens
 *   - icon resolved from a string name (IconName → component)
 */
/* @vitest-environment jsdom */

import { vi } from 'vitest';

// Mock @capsuletech/web-style so createFinish (used in Dropdown.Content /
// SubContent) can resolve useFinishMode / useFinishConfig without a real browser.
vi.mock('@capsuletech/web-style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-style')>();
  return {
    ...actual,
    useFinishMode: () => () => false,
    useFinishConfig: () => () => ({
      topForegroundAlpha: 0.09, topStopPosition: 0,
      midCardAlpha: 0.7, midStopPosition: 45,
      bottomPrimaryAlpha: 0.18, bottomStopPosition: 100,
      hairlineAlpha: 0.4, innerBorderAlpha: 0.06,
      contactShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
      glowAlpha: 0.22, glowSpread: '0 8px 24px',
      innerOnly: false, centerGlowAlpha: 0, centerGlowSize: '60%', surfaceAlpha: 1,
    }),
  };
});

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Button } from '../../../primitives/button';
import { Menu } from '../menu';
import type { MenuItem } from '../interfaces';

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

const waitFor = (predicate: () => boolean, ms = 300): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > ms) return reject(new Error('waitFor timeout'));
      setTimeout(check, 10);
    };
    check();
  });

const renderDropdown = (items: MenuItem[]) => {
  cleanup = render(
    () => <Menu.Dropdown trigger={<Button data-testid="trigger">Open</Button>} items={items} />,
    container,
  );
};

const openMenu = async () => {
  const trigger = container.querySelector('[data-testid="trigger"]')!;
  click(trigger);
  await waitFor(() => document.body.querySelector('[role="menu"]') !== null);
};

describe('Menu composite', () => {
  describe('action item', () => {
    it('renders 1 menuitem and fires onSelect on activation', async () => {
      const onSelect = vi.fn();
      renderDropdown([{ type: 'action', id: 'a', label: 'Do it', onSelect }]);

      await openMenu();
      const items = document.body.querySelectorAll('[role="menuitem"]');
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toContain('Do it');

      click(items[0]);
      await waitFor(() => onSelect.mock.calls.length > 0);
      expect(onSelect).toHaveBeenCalledOnce();
    });

    it('disabled action does not fire onSelect', async () => {
      const onSelect = vi.fn();
      renderDropdown([{ type: 'action', id: 'a', label: 'Nope', disabled: true, onSelect }]);

      await openMenu();
      click(document.body.querySelector('[role="menuitem"]')!);
      await new Promise((r) => setTimeout(r, 50));
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('structural items', () => {
    it('renders a separator', async () => {
      renderDropdown([
        { type: 'action', id: 'a', label: 'A' },
        { type: 'separator', id: 's' },
        { type: 'action', id: 'b', label: 'B' },
      ]);
      await openMenu();
      expect(document.body.querySelector('hr')).not.toBeNull();
    });

    it('renders a label heading', async () => {
      renderDropdown([
        { type: 'label', id: 'h', label: 'Account' },
        { type: 'action', id: 'a', label: 'Profile' },
      ]);
      await openMenu();
      expect(document.body.textContent ?? '').toContain('Account');
    });
  });

  describe('toggle item', () => {
    it('reflects checked and fires onChange', async () => {
      const onChange = vi.fn();
      renderDropdown([
        { type: 'toggle', id: 't', icon: 'moon', label: 'Dark', checked: true, onChange },
      ]);
      await openMenu();

      const sw = document.body.querySelector('[role="switch"]');
      expect(sw).not.toBeNull();
      expect(sw!.getAttribute('aria-checked')).toBe('true');

      click(sw!);
      await waitFor(() => onChange.mock.calls.length > 0);
      expect(onChange).toHaveBeenCalledWith(false);
    });
  });

  describe('submenu', () => {
    it('SubTrigger visible and opens nested items on click', async () => {
      renderDropdown([
        {
          type: 'submenu',
          id: 'theme',
          icon: 'palette',
          label: 'Theme',
          items: [
            { type: 'action', id: 'black', label: 'Black' },
            { type: 'action', id: 'ocean', label: 'Ocean' },
          ],
        },
      ]);
      await openMenu();
      expect(document.body.textContent ?? '').toContain('Theme');

      const trigger = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((el) =>
        el.textContent?.includes('Theme'),
      );
      click(trigger!);
      await waitFor(() => {
        const t = document.body.textContent ?? '';
        return t.includes('Black') && t.includes('Ocean');
      });
    });
  });

  describe('expandable', () => {
    it('renders the slot body when the sub panel opens', async () => {
      renderDropdown([
        {
          type: 'expandable',
          id: 'fon',
          icon: 'image',
          label: 'Фон',
          render: () => <div data-testid="slot-body">slot content</div>,
        },
      ]);
      await openMenu();

      const trigger = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((el) =>
        el.textContent?.includes('Фон'),
      );
      click(trigger!);
      await waitFor(() => document.body.querySelector('[data-testid="slot-body"]') !== null);
      expect(document.body.querySelector('[data-testid="slot-body"]')!.textContent).toBe(
        'slot content',
      );
    });
  });

  describe('icon by name', () => {
    it('resolves a string IconName to an <svg> in the row', async () => {
      renderDropdown([{ type: 'action', id: 'a', icon: 'log-out', label: 'Выйти' }]);
      await openMenu();
      const item = document.body.querySelector('[role="menuitem"]');
      expect(item!.querySelector('svg')).not.toBeNull();
    });
  });
});
