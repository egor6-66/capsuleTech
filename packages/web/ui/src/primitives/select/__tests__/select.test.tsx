/**
 * Select primitive tests.
 *
 * Kobalte Select renders its listbox inside a Portal (teleported to
 * document.body). Query document.body when the popover is open.
 *
 * Covered:
 *   - Trigger renders in DOM.
 *   - Listbox is absent before trigger interaction.
 *   - Clicking trigger opens listbox (popover visible).
 *   - Options from `options` prop are rendered inside open listbox.
 *   - Trigger is rendered as a button element.
 *   - Disabled select — trigger has disabled attribute.
 *   - Content is portal-mounted (not inside the render container).
 *   - Compound mode: Select.Trigger + Select.Content render without error.
 *   - ISelectOption interface: value/label/disabled fields (structural).
 *   - Placeholder text is visible in trigger before selection.
 */
/* @vitest-environment jsdom */

// Mock @capsuletech/web-style so createFinish (used in Select.Content) can
// resolve useFinishMode / useFinishConfig without a real browser signal.
import { vi } from 'vitest';
vi.mock('@capsuletech/web-style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-style')>();
  return {
    ...actual,
    useFinishMode: () => () => false,
    useFinishConfig: () => () => ({
      topForegroundAlpha: 0.09, topStopPosition: 0,
      midCardAlpha: 0.70, midStopPosition: 45,
      bottomPrimaryAlpha: 0.18, bottomStopPosition: 100,
      hairlineAlpha: 0.40, innerBorderAlpha: 0.06,
      contactShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
      glowAlpha: 0.22, glowSpread: '0 8px 24px',
      innerOnly: false, centerGlowAlpha: 0, centerGlowSize: '60%', surfaceAlpha: 1,
    }),
  };
});

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ISelectOption } from '../interfaces';
import { Select } from '../select';

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

const OPTS: ISelectOption[] = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C', disabled: true },
];

describe('Select', () => {
  describe('ISelectOption interface', () => {
    it('accepts value + label + optional disabled (structural)', () => {
      const opt: ISelectOption = { value: 'x', label: 'X' };
      expect(opt.value).toBe('x');
      expect(opt.label).toBe('X');
      expect(opt.disabled).toBeUndefined();
    });

    it('accepts disabled: true', () => {
      const opt: ISelectOption = { value: 'x', label: 'X', disabled: true };
      expect(opt.disabled).toBe(true);
    });
  });

  describe('closed state', () => {
    it('trigger is rendered in DOM', () => {
      cleanup = render(() => <Select options={OPTS} placeholder="Choose…" />, container);
      expect(container.querySelector('button')).not.toBeNull();
    });

    it('listbox is absent from DOM before opening', () => {
      cleanup = render(() => <Select options={OPTS} placeholder="Choose…" />, container);
      expect(document.body.querySelector('[role="listbox"]')).toBeNull();
    });

    it('placeholder text is visible in trigger', () => {
      cleanup = render(() => <Select options={OPTS} placeholder="Pick one…" />, container);
      expect(container.textContent).toContain('Pick one…');
    });
  });

  describe('opening', () => {
    it('clicking trigger shows listbox', async () => {
      cleanup = render(() => <Select options={OPTS} placeholder="Choose…" />, container);

      click(container.querySelector('button')!);

      await waitFor(() => document.body.querySelector('[role="listbox"]') !== null);
      expect(document.body.querySelector('[role="listbox"]')).not.toBeNull();
    });

    it('options from `options` prop are rendered as list items', async () => {
      cleanup = render(() => <Select options={OPTS} placeholder="Choose…" />, container);

      click(container.querySelector('button')!);
      await waitFor(() => document.body.querySelector('[role="listbox"]') !== null);

      const items = document.body.querySelectorAll('[role="option"]');
      expect(items.length).toBeGreaterThanOrEqual(OPTS.length);
    });

    it('option labels are visible inside the listbox', async () => {
      cleanup = render(() => <Select options={OPTS} placeholder="Choose…" />, container);

      click(container.querySelector('button')!);
      await waitFor(() => document.body.querySelector('[role="listbox"]') !== null);

      const body = document.body.textContent ?? '';
      expect(body).toContain('Option A');
      expect(body).toContain('Option B');
    });
  });

  describe('disabled', () => {
    it('disabled select renders trigger with disabled attribute', () => {
      cleanup = render(() => <Select options={OPTS} disabled placeholder="Disabled" />, container);
      const btn = container.querySelector('button')!;
      expect(btn.disabled).toBe(true);
    });
  });

  describe('portal mounting', () => {
    it('listbox is in document.body, NOT inside render container', async () => {
      cleanup = render(() => <Select options={OPTS} placeholder="Choose…" />, container);

      click(container.querySelector('button')!);
      await waitFor(() => document.body.querySelector('[role="listbox"]') !== null);

      const listbox = document.body.querySelector('[role="listbox"]')!;
      expect(document.body.contains(listbox)).toBe(true);
      expect(container.contains(listbox)).toBe(false);
    });
  });

  describe('compound mode', () => {
    it('Select.Trigger + Select.Content render without error', () => {
      expect(() => {
        cleanup = render(
          () => (
            <Select options={OPTS} placeholder="Compound…">
              <Select.Trigger data-testid="compound-trigger">
                <Select.Value />
              </Select.Trigger>
              <Select.Content />
            </Select>
          ),
          container,
        );
      }).not.toThrow();

      expect(container.querySelector('[data-testid="compound-trigger"]')).not.toBeNull();
    });
  });
});
