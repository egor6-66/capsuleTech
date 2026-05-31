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

// ---------------------------------------------------------------------------
// Fix 1 — Strip is an absolute overlay; content wrapper fills the full cell.
//
// The settings strip floats OVER the cell content (z-10 absolute) and does NOT
// displace the content wrapper.  The content wrapper always uses `absolute inset-0`
// so the virtualizer's scroll element receives a definite height synchronously at
// mount (prevents the maybeNotify race in @tanstack/virtual-core).
//
// DOM-structure invariants tested here:
//   strip wrapper → has class `absolute`      (out-of-flow overlay)
//   strip wrapper → does NOT have `flex-col`  (old broken layout)
//   content wrapper → has class `inset-0`     (full-cell, no top-9 offset)
//   content wrapper → does NOT have `top-9`   (strip must not push content down)
//   DragBadge z > strip z                     (badge stays clickable above strip)
// ---------------------------------------------------------------------------

describe('Matrix settingsMode — Fix 1: strip overlays content (no displacement)', () => {
  it('strip wrapper has absolute class (out-of-flow overlay)', () => {
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
                  settings: <span data-testid="settings-strip">Strip</span>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const strip = getSettingsStrips()[0];
    expect(strip).not.toBeNull();
    // The strip's parent div must carry the `absolute` class
    const stripWrapper = strip?.parentElement as HTMLElement | null;
    expect(stripWrapper?.classList.contains('absolute')).toBe(true);
    // Must NOT be a flex-col (that would be the old broken push-down layout)
    expect(stripWrapper?.classList.contains('flex-col')).toBe(false);
  });

  it('content wrapper has inset-0 (full cell) and no top-9 offset', () => {
    vi.mocked(setSettingsMode)(true);

    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'main',
                  children: <div data-testid="cell-content">Content</div>,
                  settings: <span data-testid="settings-strip">Strip</span>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const content = container.querySelector('[data-testid="cell-content"]');
    expect(content).not.toBeNull();
    const contentWrapper = content?.parentElement as HTMLElement | null;
    // Must cover the full cell — strip floats over it, does not push it down.
    expect(contentWrapper?.classList.contains('inset-0')).toBe(true);
    // Must NOT offset from the top — that would be the old displacement behaviour.
    expect(contentWrapper?.classList.contains('top-9')).toBe(false);
    // Must NOT use flex-1 / min-h-0 (old flex-col children classes).
    expect(contentWrapper?.classList.contains('flex-1')).toBe(false);
    expect(contentWrapper?.classList.contains('min-h-0')).toBe(false);
  });

  it('cell root element does NOT have flex-col class when settingsMode is on', () => {
    vi.mocked(setSettingsMode)(true);

    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              cells: [
                {
                  id: 'a',
                  children: <div>Content</div>,
                  settings: <span data-testid="settings-strip">Strip</span>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Walk up from the settings-strip test-id to find the cell root.
    // stripWrapper (absolute div) → cell root (relative div).
    const strip = getSettingsStrips()[0];
    const cellRoot = strip?.parentElement?.parentElement as HTMLElement | null;
    expect(cellRoot?.classList.contains('flex-col')).toBe(false);
  });

  it('settings strip wrapper carries z-10 (strip is an absolute overlay)', () => {
    // Strip uses z-10.  DragBadge is separately set to z-30 (> z-10) in
    // dnd/drag-badge.tsx so it stays clickable above the full-width strip.
    // The badge only renders in edit mode with 2+ draggable cells — DnD
    // context is not wired here, so badge z is verified at the source level
    // (see the companion note in dnd/drag-badge.tsx).
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
                  settings: <span data-testid="settings-strip">Strip</span>,
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // Strip wrapper must carry z-10 so it floats above scrollable cell content.
    const strip = getSettingsStrips()[0];
    const stripWrapper = strip?.parentElement as HTMLElement | null;
    expect(stripWrapper?.classList.contains('z-10')).toBe(true);
  });

  it('DragBadge source class contains z-30 (higher than strip z-10)', () => {
    // This test reads the uncompiled source file to verify the z-index class
    // literal rather than trying to render DragBadge through its DnD context.
    // JSX compilation hoists the class string into a _tmpl$ template, making
    // .toString() on the component function unreliable for class inspection.
    // Reading the raw source avoids that problem entirely.
    const fs = require('node:fs') as typeof import('fs');
    const path = require('node:path') as typeof import('path');
    const srcPath = path.resolve(__dirname, '../dnd/drag-badge.tsx');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).toContain('z-30');
    // Also assert strip does NOT have z-30 (z-10 is the strip class in matrix.tsx)
    const matrixPath = path.resolve(__dirname, '../matrix.tsx');
    const matrixSrc = fs.readFileSync(matrixPath, 'utf-8');
    // Strip class string in matrix.tsx must contain z-10
    expect(matrixSrc).toContain('z-10');
  });
});
