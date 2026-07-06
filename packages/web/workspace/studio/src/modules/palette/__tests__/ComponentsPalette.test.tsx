/* @vitest-environment jsdom */
import { getAllManifests, getPresets, hasPresets } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocument } from '../../../core';
import { ComponentsPalette } from '../ComponentsPalette';
import { groupManifests } from '../groups';

// Сбрасываем shared document-singleton между тестами.
afterEach(() => {
  useDocument().reset();
});

describe('ComponentsPalette — smoke', () => {
  it('groupManifests разделяет на primitives и compositions', () => {
    const groups = groupManifests(getAllManifests());
    expect(groups.primitives.length).toBeGreaterThan(0);
    expect(groups.compositions.length).toBeGreaterThan(0);
    expect(
      [...groups.primitives, ...groups.compositions].every((m) => m.category !== 'composite'),
    ).toBe(true);
  });

  it('рендерится без Provider и показывает L1 заголовки', () => {
    const host = document.createElement('div');
    const dispose = render(() => <ComponentsPalette />, host);
    try {
      expect(host.textContent).toContain('Примитивы');
      expect(host.textContent).toContain('Композиции');
    } finally {
      dispose();
    }
  });

  it('содержит хотя бы один известный компонент (Button) без Provider', () => {
    const host = document.createElement('div');
    const dispose = render(() => <ComponentsPalette />, host);
    try {
      expect(host.textContent).toContain('Button');
    } finally {
      dispose();
    }
  });
});

describe('Palette — presets registry', () => {
  it('Button (ui.Button) имеет зарегистрированные пресеты', () => {
    expect(hasPresets('ui.Button')).toBe(true);
    const presets = getPresets('ui.Button');
    expect(presets.length).toBeGreaterThanOrEqual(2);
    expect(presets.map((p) => p.id)).toEqual(expect.arrayContaining(['default', 'icon']));
  });

  it('у незарегистрированного типа пресетов нет', () => {
    expect(hasPresets('ui.Unknown')).toBe(false);
    expect(getPresets('ui.Unknown')).toEqual([]);
  });

  it('каждый Button-пресет имеет id / label / schema', () => {
    for (const p of getPresets('ui.Button')) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.label).toBe('string');
      expect(p.schema.components.root).toBeTruthy();
      expect(typeof p.schema.components.nodes).toBe('object');
    }
  });
});

describe('Preset click — loadPreset в document + emit (store-mode)', () => {
  /** Fires pointer-down + pointer-up + click (Kobalte trigger needs the full sequence). */
  const press = (el: Element) => {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  };
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

  it('клик пресета грузит document + выбирает root и НЕ бросает вне host-scope', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const dispose = render(() => <ComponentsPalette />, host);
    try {
      // Пресеты Button лежат в collapsed Accordion.Item — раскрываем триггером.
      const trigger = Array.from(host.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Button'),
      );
      expect(trigger).toBeTruthy();
      press(trigger!);

      await waitFor(() => host.querySelector('[data-testid="preset-default"]') !== null);
      const btn = host.querySelector<HTMLButtonElement>('[data-testid="preset-default"]');
      expect(btn).toBeTruthy();

      // Standalone (нет Controller/Feature выше) — emit('onPresetSelect') уходит
      // в no-op, document обновляется, ошибки нет.
      expect(() => press(btn!)).not.toThrow();
      const doc = useDocument();
      expect(doc.loadedPresetId()).toBe('default');
      // document загружен из пресета, выбран его root.
      const def = getPresets('ui.Button').find((p) => p.id === 'default')!;
      expect(doc.selectedNodeId()).toBe(def.schema.components.root);
    } finally {
      dispose();
      host.remove();
    }
  });
});

describe('Document singleton', () => {
  it('useDocument работает без Provider (singleton сигнал)', () => {
    const { loadedPresetId, loadPreset, selectedNode } = useDocument();
    expect(loadedPresetId()).toBeNull();
    const p = getPresets('ui.Button').find((x) => x.id === 'default')!;
    loadPreset(p);
    expect(loadedPresetId()).toBe(p.id);
    expect(selectedNode()?.type).toBe('ui.Button');
  });
});
