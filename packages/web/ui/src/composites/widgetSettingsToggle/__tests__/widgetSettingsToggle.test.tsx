/**
 * WidgetSettingsToggle composite tests.
 *
 * Tests render + interaction via solid-js/web render in jsdom.
 * The @capsuletech/web-style settingsMode module uses a module-level signal;
 * we mock the entire @capsuletech/web-style package to keep tests isolated
 * from localStorage and matchMedia side effects.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @capsuletech/web-style — vi.mock is hoisted, no outer-scope refs.
// ---------------------------------------------------------------------------

vi.mock('@capsuletech/web-style', async () => {
  const { createSignal } = await import('solid-js');
  const [enabled, setEnabled] = createSignal<boolean>(false);

  return {
    useSettingsMode: () => enabled,
    toggleSettingsMode: vi.fn(() => {
      setEnabled((prev) => !prev);
    }),
    setSettingsMode: vi.fn((next: boolean) => setEnabled(next)),
    // Stubs for other symbols imported transitively.
    useLayoutMode: () => () => 'view',
    toggleLayoutMode: vi.fn(),
    setLayoutMode: vi.fn(),
    useDarkMode: () => () => false,
    toggleDarkMode: vi.fn(),
    setDarkMode: vi.fn(),
    useTheme: () => () => 'black',
    setTheme: vi.fn(),
    DISCOVERED_THEMES: ['black', 'zen'],
    cva: vi.fn((_base: string, _config?: unknown) => () => ''),
    createStyle: vi.fn((_cva: unknown, _props: unknown) => ({
      className: () => '',
      style: () => undefined,
    })),
    cn: (...args: string[]) => args.filter(Boolean).join(' '),
  };
});

import { setSettingsMode } from '@capsuletech/web-style';
import { WidgetSettingsToggle } from '../widgetSettingsToggle';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  // Reset settingsMode to false so every test starts from the same initial state.
  vi.mocked(setSettingsMode)(false);
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
});

const getButton = () => container.querySelector('button')!;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WidgetSettingsToggle composite', () => {
  describe('rendering', () => {
    it('renders a button element', () => {
      cleanup = render(() => <WidgetSettingsToggle />, container);
      expect(getButton()).not.toBeNull();
    });

    it('shows Settings label in off state (initial)', () => {
      cleanup = render(() => <WidgetSettingsToggle />, container);
      expect(getButton().textContent).toContain('Settings');
    });

    it('has aria-label "Widget settings"', () => {
      cleanup = render(() => <WidgetSettingsToggle />, container);
      expect(getButton().getAttribute('aria-label')).toBe('Widget settings');
    });

    it('has aria-pressed="false" in off state', () => {
      cleanup = render(() => <WidgetSettingsToggle />, container);
      expect(getButton().getAttribute('aria-pressed')).toBe('false');
    });

    it('has aria-pressed="true" in on state', () => {
      vi.mocked(setSettingsMode)(true);
      cleanup = render(() => <WidgetSettingsToggle />, container);
      expect(getButton().getAttribute('aria-pressed')).toBe('true');
    });

    it('forwards extra class to the button', () => {
      cleanup = render(() => <WidgetSettingsToggle class="extra-cls" />, container);
      expect(getButton().className).toContain('extra-cls');
    });
  });

  describe('interaction', () => {
    it('click switches aria-pressed from false to true', () => {
      cleanup = render(() => <WidgetSettingsToggle />, container);
      const btn = getButton();
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      btn.click();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('second click switches aria-pressed back to false', () => {
      cleanup = render(() => <WidgetSettingsToggle />, container);
      const btn = getButton();
      btn.click(); // false → true
      btn.click(); // true → false
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('onChange callback fires with true after first click (off → on)', () => {
      const onChange = vi.fn();
      cleanup = render(() => <WidgetSettingsToggle onChange={onChange} />, container);
      getButton().click();
      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('onChange callback fires with false on second click (on → off)', () => {
      const onChange = vi.fn();
      cleanup = render(() => <WidgetSettingsToggle onChange={onChange} />, container);
      getButton().click(); // off → on
      getButton().click(); // on → off
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith(false);
    });

    it('re-render sees updated aria-pressed after second toggle (back to false)', () => {
      cleanup = render(() => <WidgetSettingsToggle />, container);
      const btn = getButton();
      btn.click(); // false → true
      btn.click(); // true → false
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });
});
