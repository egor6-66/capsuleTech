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

afterEach(() => {
  useCanvasTheme().reset();
});

describe('StylesPanel', () => {
  it('рендерит строку-кнопку на каждую тему из DISCOVERED_THEMES', () => {
    const host = document.createElement('div');
    const dispose = render(() => <StylesPanel />, host);
    try {
      for (const name of ['light', 'dark', 'ocean']) {
        expect(host.querySelector(`[data-testid="canvas-theme-${name}"]`)).toBeTruthy();
        expect(host.textContent).toContain(name);
      }
    } finally {
      dispose();
    }
  });

  it('без override отражает host-стейт (no-inversion): тоггл = host dark, чек = host тема', () => {
    // override пуст → activeTheme/activeDark должны равняться host (ocean / dark).
    const host = document.createElement('div');
    const dispose = render(() => <StylesPanel />, host);
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
      dispose();
    }
  });

  it('active-checkmark рисуется у темы === theme()', () => {
    useCanvasTheme().setTheme('ocean');
    const host = document.createElement('div');
    const dispose = render(() => <StylesPanel />, host);
    try {
      const active = host.querySelector('[data-testid="canvas-theme-ocean"]');
      const inactive = host.querySelector('[data-testid="canvas-theme-light"]');
      expect(active?.textContent).toContain(CHECK);
      expect(inactive?.textContent).not.toContain(CHECK);
    } finally {
      dispose();
    }
  });

  it('клик по теме → setTheme (override в singleton)', () => {
    // Solid делегирует click на document → host должен быть в DOM, иначе
    // событие не всплывёт до делегированного слушателя.
    const host = document.createElement('div');
    document.body.appendChild(host);
    const dispose = render(() => <StylesPanel />, host);
    try {
      const btn = host.querySelector<HTMLButtonElement>('[data-testid="canvas-theme-ocean"]');
      expect(btn).toBeTruthy();
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(useCanvasTheme().theme()).toBe('ocean');
    } finally {
      dispose();
      host.remove();
    }
  });

  it('toggle тёмного режима → setDark (флип от явного override)', () => {
    // Явный override false → детерминированный старт (не зависит от host-режима).
    useCanvasTheme().setDark(false);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const dispose = render(() => <StylesPanel />, host);
    try {
      const sw = host.querySelector<HTMLButtonElement>('[role="switch"]');
      expect(sw).toBeTruthy();
      expect(sw!.getAttribute('aria-checked')).toBe('false');
      sw!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(useCanvasTheme().dark()).toBe(true);
    } finally {
      dispose();
      host.remove();
    }
  });

  it('reset-кнопка → оба override undefined', () => {
    useCanvasTheme().setTheme('ocean');
    useCanvasTheme().setDark(true);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const dispose = render(() => <StylesPanel />, host);
    try {
      const reset = host.querySelector<HTMLButtonElement>('[data-testid="canvas-theme-reset"]');
      expect(reset).toBeTruthy();
      reset!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(useCanvasTheme().theme()).toBeUndefined();
      expect(useCanvasTheme().dark()).toBeUndefined();
    } finally {
      dispose();
      host.remove();
    }
  });
});
