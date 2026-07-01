/* @vitest-environment jsdom */

import type { IPreset } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { NodePalette } from '../NodePalette';

// host монтируется в document.body — Solid/Kobalte делегируют события на document.
const mount = (ui: () => unknown) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const dispose = render(ui as never, host);
  return {
    host,
    cleanup: () => {
      dispose();
      host.remove();
    },
  };
};

/** pointer-down + up + click — Kobalte trigger нуждается в полной последовательности. */
const press = (el: Element) => {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

const waitFor = (predicate: () => boolean, ms = 500): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > ms) return reject(new Error('waitFor timeout'));
      setTimeout(check, 10);
    };
    check();
  });

describe('NodePalette — узловая мини-палитра (общий ComponentSegments)', () => {
  it('Accordion-вылет → сегменты компонентов → клик пресета → onInsert', async () => {
    let inserted: IPreset | null = null;
    const { host, cleanup } = mount(() => (
      <NodePalette
        nodeType="ui.Layout.Flex"
        depth={0}
        onInsert={(p) => {
          inserted = p;
        }}
      />
    ));
    try {
      const add = host.querySelector<HTMLElement>('[data-testid="node-add-ui.Layout.Flex"]');
      expect(add).toBeTruthy();
      // Пресеты скрыты до раскрытия.
      expect(host.querySelector('[data-testid^="node-preset-"]')).toBeNull();

      // 1. Раскрыть «＋ добавить компонент».
      press(add!);
      // 2. Раскрыть сегмент компонента Button.
      await waitFor(() =>
        Array.from(host.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Button'),
      );
      const buttonSeg = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Button',
      );
      expect(buttonSeg).toBeTruthy();
      press(buttonSeg!);

      // 3. Пресет с префиксом node-preset появился → клик.
      await waitFor(() => host.querySelector('[data-testid="node-preset-default"]') !== null);
      const preset = host.querySelector<HTMLButtonElement>('[data-testid="node-preset-default"]');
      expect(preset).toBeTruthy();
      preset!.click();
      expect(inserted).not.toBeNull();
    } finally {
      cleanup();
    }
  });

  it('узел без подходящих компонентов → fallback-текст', async () => {
    const { host, cleanup } = mount(() => (
      <NodePalette nodeType="ui.Button" depth={0} onInsert={() => {}} />
    ));
    try {
      const add = host.querySelector<HTMLElement>('[data-testid="node-add-ui.Button"]');
      press(add!);
      await waitFor(() => (host.textContent ?? '').includes('Нет подходящих компонентов'));
      expect(host.textContent).toContain('Нет подходящих компонентов');
    } finally {
      cleanup();
    }
  });
});
