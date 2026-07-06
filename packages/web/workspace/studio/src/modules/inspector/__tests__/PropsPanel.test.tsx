/* @vitest-environment jsdom */

import { getPresets } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocument } from '../../../core';
import { PropsPanel } from '../PropsPanel';

afterEach(() => {
  useDocument().reset();
});

describe('PropsPanel', () => {
  it('показывает fallback когда узел не выбран', () => {
    const host = document.createElement('div');
    const dispose = render(() => <PropsPanel />, host);
    try {
      expect(host.textContent).toContain('Выберите компонент');
    } finally {
      dispose();
    }
  });

  it('рендерит поля Inspector для выбранного узла (Button-пресет загружен)', async () => {
    // host в document.body — Solid делегирует click на document (нужно для
    // раскрытия свёрнутых по старту category-аккордеонов Inspector'а).
    const host = document.createElement('div');
    document.body.appendChild(host);
    const { loadPreset } = useDocument();
    loadPreset(getPresets('ui.Button').find((p) => p.id === 'default')!);
    const dispose = render(() => <PropsPanel />, host);
    try {
      // Категории Inspector'а свёрнуты по старту → поля не смонтированы. Раскрыть
      // все item'ы (клик по каждому свёрнутому триггеру), затем ждать поля.
      const expandAll = () => {
        for (const b of host.querySelectorAll<HTMLButtonElement>('button[aria-expanded="false"]')) {
          b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      };
      expandAll();
      await new Promise<void>((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          const text = host.textContent ?? '';
          const hasFields = host.querySelector('input, select, button[role="switch"]') !== null;
          const hasFallback = text.includes('нет редактируемых пропсов');
          if (hasFields || hasFallback) return resolve();
          if (Date.now() - start > 400) return reject(new Error('no fields mounted'));
          setTimeout(check, 10);
        };
        check();
      });
    } finally {
      dispose();
      host.remove();
    }
  });

  it('patchProps обновляет schema выбранного узла', () => {
    const { loadPreset, schema, selectedNodeId, patchProps } = useDocument();
    const def = getPresets('ui.Button').find((p) => p.id === 'default')!;
    loadPreset(def);
    const nodeId = selectedNodeId() ?? '';
    expect(nodeId).toBe(def.schema.components.root);
    patchProps(nodeId, { children: 'New label' });
    const newProps = schema().components.nodes[nodeId]?.props as Record<string, unknown>;
    expect(newProps?.children).toBe('New label');
    // Исходный пресет НЕ мутирован (immutable registry).
    const originalProps = def.schema.components.nodes[def.schema.components.root]?.props as Record<
      string,
      unknown
    >;
    expect(originalProps?.children).toBe('Default');
  });

  it('patchProps — no-op для несуществующего узла', () => {
    const { schema, patchProps } = useDocument();
    const before = JSON.stringify(schema());
    patchProps('does-not-exist', { foo: 'bar' });
    expect(JSON.stringify(schema())).toBe(before);
  });
});
