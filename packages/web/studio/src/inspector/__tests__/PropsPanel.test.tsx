/* @vitest-environment jsdom */

import { getPresets } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocument } from '../../document';
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

  it('рендерит поля Inspector для выбранного узла (Button-пресет загружен)', () => {
    const host = document.createElement('div');
    const { loadPreset } = useDocument();
    loadPreset(getPresets('ui.Button').find((p) => p.id === 'default')!);
    const dispose = render(() => <PropsPanel />, host);
    try {
      const text = host.textContent ?? '';
      const hasFields = host.querySelector('input, select, button[role="switch"]') !== null;
      const hasFallback = text.includes('нет редактируемых пропсов');
      expect(hasFields || hasFallback).toBe(true);
    } finally {
      dispose();
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
