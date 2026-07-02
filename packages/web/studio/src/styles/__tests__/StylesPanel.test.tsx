/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Мок DISCOVERED_THEMES + детерминированный host-стейт (useTheme/useDarkMode).
// Остальное (cn/createStyle/cva, используемые web-ui Button/Toggle) — реальное.
// host: тема 'ocean', тёмный режим включён — для проверки no-inversion.
vi.mock('@capsuletech/web-style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-style')>();
  return {
    ...actual,
    DISCOVERED_THEMES: ['light', 'dark', 'ocean'],
    useTheme: () => () => 'ocean',
    useDarkMode: () => () => true,
  };
});

import { useCanvasTheme } from '../canvas-theme';
import { StylesPanel } from '../StylesPanel';

const CHECK = '✓';

const click = (el: Element) =>
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

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

/**
 * StylesPanel — единственный `Accordion`-item «Тема канваса» свёрнут по старту
 * (решение USER). Kobalte НЕ монтирует `Accordion.Content` пока item свёрнут,
 * поэтому перед ассертами на inner-контент (тоггл/reset/темы) раскрываем item
 * кликом по триггеру. host в document.body — Solid делегирует click на document.
 */
const mountExpanded = async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const dispose = render(() => <StylesPanel />, host);
  click(host.querySelector('[data-testid="canvas-theme-trigger"]')!);
  await waitFor(() => host.querySelector('[data-testid="canvas-theme-ocean"]') !== null);
  return {
    host,
    cleanup: () => {
      dispose();
      host.remove();
    },
  };
};

afterEach(() => {
  useCanvasTheme().reset();
});

describe('StylesPanel', () => {
  it('рендерит строку-кнопку на каждую тему из DISCOVERED_THEMES', async () => {
    const { host, cleanup } = await mountExpanded();
    try {
      for (const name of ['light', 'dark', 'ocean']) {
        expect(host.querySelector(`[data-testid="canvas-theme-${name}"]`)).toBeTruthy();
        expect(host.textContent).toContain(name);
      }
    } finally {
      cleanup();
    }
  });

  it('без override отражает host-стейт (no-inversion): тоггл = host dark, чек = host тема', async () => {
    // override пуст → activeTheme/activeDark должны равняться host (ocean / dark).
    const { host, cleanup } = await mountExpanded();
    try {
      // dark-тоггл в положении host (true), а не false — иначе была бы инверсия.
      const sw = host.querySelector('[role="switch"]');
      expect(sw?.getAttribute('aria-checked')).toBe('true');
      // чек-маркер на host-теме 'ocean', не на первой в списке.
      const ocean = host.querySelector('[data-testid="canvas-theme-ocean"]');
      const light = host.querySelector('[data-testid="canvas-theme-light"]');
      expect(ocean?.textContent).toContain(CHECK);
      expect(light?.textContent).not.toContain(CHECK);
    } finally {
      cleanup();
    }
  });

  it('active-checkmark рисуется у темы === theme()', async () => {
    useCanvasTheme().setTheme('ocean');
    const { host, cleanup } = await mountExpanded();
    try {
      const active = host.querySelector('[data-testid="canvas-theme-ocean"]');
      const inactive = host.querySelector('[data-testid="canvas-theme-light"]');
      expect(active?.textContent).toContain(CHECK);
      expect(inactive?.textContent).not.toContain(CHECK);
    } finally {
      cleanup();
    }
  });

  it('клик по теме → setTheme (override в singleton)', async () => {
    const { host, cleanup } = await mountExpanded();
    try {
      const btn = host.querySelector<HTMLButtonElement>('[data-testid="canvas-theme-ocean"]');
      expect(btn).toBeTruthy();
      click(btn!);
      expect(useCanvasTheme().theme()).toBe('ocean');
    } finally {
      cleanup();
    }
  });

  it('toggle тёмного режима → setDark (флип от явного override)', async () => {
    // Явный override false → детерминированный старт (не зависит от host-режима).
    useCanvasTheme().setDark(false);
    const { host, cleanup } = await mountExpanded();
    try {
      const sw = host.querySelector<HTMLButtonElement>('[role="switch"]');
      expect(sw).toBeTruthy();
      expect(sw!.getAttribute('aria-checked')).toBe('false');
      click(sw!);
      expect(useCanvasTheme().dark()).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('reset-кнопка → оба override undefined', async () => {
    useCanvasTheme().setTheme('ocean');
    useCanvasTheme().setDark(true);
    const { host, cleanup } = await mountExpanded();
    try {
      const reset = host.querySelector<HTMLButtonElement>('[data-testid="canvas-theme-reset"]');
      expect(reset).toBeTruthy();
      click(reset!);
      expect(useCanvasTheme().theme()).toBeUndefined();
      expect(useCanvasTheme().dark()).toBeUndefined();
    } finally {
      cleanup();
    }
  });
});
