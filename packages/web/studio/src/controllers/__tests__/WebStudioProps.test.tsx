/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { getPresets } from '@capsuletech/web-ui/manifest';
import { useSelectedPreset } from '../../selection';
import { WebStudioProps } from '../WebStudioProps';

afterEach(() => {
  useSelectedPreset().setSelected(null);
});

describe('WebStudioProps', () => {
  it('показывает fallback когда ничего не выбрано', () => {
    const host = document.createElement('div');
    const dispose = render(() => <WebStudioProps />, host);
    try {
      expect(host.textContent).toContain('Выберите пресет в палитре');
    } finally {
      dispose();
    }
  });

  it('рендерит поля Inspector для выбранного Button-пресета', () => {
    const host = document.createElement('div');
    const { setSelected } = useSelectedPreset();
    setSelected(getPresets('ui.Button').find((p) => p.id === 'default') ?? null);
    const dispose = render(() => <WebStudioProps />, host);
    try {
      // Button-manifest имеет propsSchema с variant/size/disabled/... — какие-то
      // поля должны отрендериться (label) либо «нет редактируемых пропсов».
      const text = host.textContent ?? '';
      const hasFields = host.querySelector('input, select, button[role="switch"]') !== null;
      const hasFallback = text.includes('нет редактируемых пропсов');
      expect(hasFields || hasFallback).toBe(true);
    } finally {
      dispose();
    }
  });

  it('patchProps обновляет schema в singleton (изменение виден в schema())', () => {
    const { setSelected, schema, patchProps } = useSelectedPreset();
    const def = getPresets('ui.Button').find((p) => p.id === 'default');
    setSelected(def ?? null);
    const before = schema();
    expect(before).not.toBeNull();
    const rootId = before?.components.root ?? '';
    patchProps(rootId, { children: 'New label' });
    const after = schema();
    const newProps = after?.components.nodes[rootId]?.props as Record<string, unknown> | undefined;
    expect(newProps?.children).toBe('New label');
    // Исходный пресет НЕ мутирован (immutable registry).
    const originalProps = def?.schema.components.nodes[def.schema.components.root]?.props as
      | Record<string, unknown>
      | undefined;
    expect(originalProps?.children).toBe('Default');
  });

  it('patchProps — no-op если ничего не выбрано', () => {
    const { schema, patchProps } = useSelectedPreset();
    expect(schema()).toBeNull();
    patchProps('whatever', { foo: 'bar' });
    expect(schema()).toBeNull();
  });
});
