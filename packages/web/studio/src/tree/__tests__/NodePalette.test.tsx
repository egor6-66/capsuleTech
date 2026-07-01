/* @vitest-environment jsdom */

import type { IPreset } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { NodePalette } from '../NodePalette';

// host монтируется в document.body — Solid делегирует события на document,
// клик по detached-узлу до обработчика не долетает.
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

describe('NodePalette — мини-палитра узла', () => {
  it('контейнер: раскрывает пресеты, клик → onInsert(preset)', () => {
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
      const add = host.querySelector<HTMLButtonElement>('[data-testid="node-add-ui.Layout.Flex"]');
      expect(add).toBeTruthy();
      // Пресеты скрыты до раскрытия.
      expect(host.querySelector('[data-testid^="node-preset-"]')).toBeNull();

      add!.click();
      const preset = host.querySelector<HTMLButtonElement>('[data-testid^="node-preset-"]');
      expect(preset).toBeTruthy();

      preset!.click();
      expect(inserted).not.toBeNull();
      // Список закрылся после вставки.
      expect(host.querySelector('[data-testid^="node-preset-"]')).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('узел без подходящих пресетов → fallback-текст', () => {
    const { host, cleanup } = mount(() => (
      <NodePalette nodeType="ui.Button" depth={0} onInsert={() => {}} />
    ));
    try {
      host.querySelector<HTMLButtonElement>('[data-testid="node-add-ui.Button"]')!.click();
      expect(host.textContent).toContain('Нет подходящих компонентов');
    } finally {
      cleanup();
    }
  });
});
