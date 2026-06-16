/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { getPresets } from '../../palette/presets';
import { useSelectedPreset } from '../../selection';
import { WebStudioCanvas } from '../WebStudioCanvas';

afterEach(() => {
  useSelectedPreset().setSelected(null);
});

describe('WebStudioCanvas', () => {
  it('показывает empty state когда ничего не выбрано', () => {
    const host = document.createElement('div');
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      expect(host.textContent).toContain('Выберите компонент в палитре');
    } finally {
      dispose();
    }
  });

  it('рендерит default-пресет Button через Renderer', () => {
    const host = document.createElement('div');
    const { setSelected } = useSelectedPreset();
    setSelected(getPresets('ui.Button').find((p) => p.id === 'default') ?? null);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      expect(host.querySelector('button')).not.toBeNull();
      expect(host.textContent).toContain('Default');
    } finally {
      dispose();
    }
  });

  it('реактивно обновляется при смене пресета (Default → Ghost)', () => {
    const host = document.createElement('div');
    const { setSelected } = useSelectedPreset();
    const defPreset = getPresets('ui.Button').find((p) => p.id === 'default');
    const ghostPreset = getPresets('ui.Button').find((p) => p.id === 'ghost');
    setSelected(defPreset ?? null);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      expect(host.textContent).toContain('Default');
      setSelected(ghostPreset ?? null);
      expect(host.textContent).toContain('Ghost');
      expect(host.textContent).not.toContain('Default');
    } finally {
      dispose();
    }
  });

  it('реактивно отражает patchProps (variant change)', () => {
    const host = document.createElement('div');
    const { setSelected, patchProps, schema } = useSelectedPreset();
    setSelected(getPresets('ui.Button').find((p) => p.id === 'default') ?? null);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      const rootId = schema()?.components.root ?? '';
      patchProps(rootId, { variant: 'destructive' });
      // Class change visible — destructive variant adds bg-destructive class
      const btn = host.querySelector('button');
      expect(btn).not.toBeNull();
      expect(btn?.className).toContain('destructive');
    } finally {
      dispose();
    }
  });

  it('рендерит icon-пресет с дочерней Icons.Plus', () => {
    const host = document.createElement('div');
    const { setSelected } = useSelectedPreset();
    setSelected(getPresets('ui.Button').find((p) => p.id === 'icon') ?? null);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      expect(host.querySelector('button')).not.toBeNull();
      expect(host.querySelector('svg')).not.toBeNull();
    } finally {
      dispose();
    }
  });
});
