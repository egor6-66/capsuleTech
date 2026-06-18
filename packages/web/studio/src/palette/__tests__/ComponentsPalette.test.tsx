/* @vitest-environment jsdom */
import { getAllManifests } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { useSelectedPreset } from '../../selection';
import { ComponentsPalette } from '../ComponentsPalette';
import { groupManifests } from '../groups';
import { getPresets, hasPresets } from '@capsuletech/web-ui/manifest';

// Сбрасываем shared selection-singleton между тестами.
afterEach(() => {
  useSelectedPreset().setSelected(null);
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

describe('Selection singleton', () => {
  it('useSelectedPreset работает без Provider (singleton сигнал)', () => {
    const { selected, setSelected } = useSelectedPreset();
    expect(selected()).toBeNull();
    const p = getPresets('ui.Button').find((x) => x.id === 'default');
    expect(p).toBeTruthy();
    setSelected(p ?? null);
    expect(selected()).toEqual(p);
  });
});
