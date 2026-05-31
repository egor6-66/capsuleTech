/**
 * Matrix settingsMode — settings strip rendering tests.
 *
 * Verifies that:
 * - The settings toolbar strip is NOT rendered when settingsMode is off.
 * - The settings toolbar strip IS rendered when settingsMode is on AND
 *   cell.settings is present.
 * - Cells without settings never render the strip, even with settingsMode on.
 * - Both preset mode and raw rows mode are covered.
 *
 * @capsuletech/web-style is mocked so we can control useSettingsMode()
 * without touching localStorage.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @capsuletech/web-style
// ---------------------------------------------------------------------------

vi.mock('@capsuletech/web-style', async () => {
  const { createSignal } = await import('solid-js');
  const [settingsEnabled, setSettingsEnabled] = createSignal<boolean>(false);
  const [layoutMode] = createSignal<'view' | 'edit'>('view');

  return {
    useSettingsMode: () => settingsEnabled,
    setSettingsMode: vi.fn((next: boolean) => setSettingsEnabled(next)),
    toggleSettingsMode: vi.fn(() => setSettingsEnabled((prev) => !prev)),
    useLayoutMode: () => layoutMode,
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
import { Matrix } from '../matrix';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  vi.mocked(setSettingsMode)(false);
  container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
});

const getSettingsStrips = () =>
  Array.from(container.querySelectorAll('[data-testid="settings-strip"]'));

// ---------------------------------------------------------------------------
// Raw rows mode
// ---------------------------------------------------------------------------

describe('Matrix settingsMode — raw rows mode', () => {
  it('does NOT render settings strip when settingsMode is off', () => {
    vi.mocked(setSettingsMode)(false);

    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'main',
                  children: <div>Content</div>,
                  settings: <span data-testid="settings-strip">My Settings</span>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(getSettingsStrips()).toHaveLength(0);
  });

  it('renders settings strip when settingsMode is on AND cell.settings present', () => {
    vi.mocked(setSettingsMode)(true);

    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'main',
                  children: <div>Content</div>,
                  settings: <span data-testid="settings-strip">My Settings</span>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(getSettingsStrips()).toHaveLength(1);
    expect(getSettingsStrips()[0]?.textContent).toContain('My Settings');
  });

  it('does NOT render strip for a cell without settings even when settingsMode is on', () => {
    vi.mocked(setSettingsMode)(true);

    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'main',
                  children: <div>Content without settings</div>,
                  // No settings prop
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(getSettingsStrips()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Preset mode (app-shell centroid — only main)
// ---------------------------------------------------------------------------

describe('Matrix settingsMode — preset mode (app-shell centroid)', () => {
  it('does NOT render strip in centroid when settingsMode is off', () => {
    vi.mocked(setSettingsMode)(false);

    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            main: {
              children: <div>Main content</div>,
              settings: <span data-testid="settings-strip">Widget Settings</span>,
            },
          }}
        />
      ),
      container,
    );

    expect(getSettingsStrips()).toHaveLength(0);
  });

  it('renders strip in centroid when settingsMode is on', () => {
    vi.mocked(setSettingsMode)(true);

    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            main: {
              children: <div>Main content</div>,
              settings: <span data-testid="settings-strip">Widget Settings</span>,
            },
          }}
        />
      ),
      container,
    );

    expect(getSettingsStrips()).toHaveLength(1);
    expect(getSettingsStrips()[0]?.textContent).toContain('Widget Settings');
  });
});

// ---------------------------------------------------------------------------
// Cell content still renders alongside the strip
// ---------------------------------------------------------------------------

describe('Matrix settingsMode — cell content preserved', () => {
  it('cell children still render when settingsMode is on with settings', () => {
    vi.mocked(setSettingsMode)(true);

    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'a',
                  children: <div data-testid="cell-content">Hello World</div>,
                  settings: <span data-testid="settings-strip">Settings</span>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="cell-content"]')).not.toBeNull();
    expect(getSettingsStrips()).toHaveLength(1);
  });
});
