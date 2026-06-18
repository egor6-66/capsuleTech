/* @vitest-environment jsdom */

import { getPresets } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { useSelectedPreset } from '../../selection';
import { WebStudioCanvas } from '../WebStudioCanvas';

afterEach(() => {
  useSelectedPreset().setSelected(null);
});

/**
 * Canvas рендерится внутри iframe (см. canvas-frame/CanvasFrame). Тесты лезут
 * через `iframe.contentDocument.body` — а если iframe ещё не успел проинициться
 * (Portal mount'ится по signal'у после `onMount`), fallback'аемся на host.
 */
const canvasRoot = (host: HTMLElement): HTMLElement | Document => {
  const frame = host.querySelector('iframe');
  return frame?.contentDocument?.body ?? host;
};
const canvasText = (host: HTMLElement): string =>
  (canvasRoot(host) as HTMLElement).textContent ?? '';

describe('WebStudioCanvas', () => {
  it('показывает empty state когда ничего не выбрано', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      expect(canvasText(host)).toContain('Выберите компонент в палитре');
    } finally {
      dispose();
      host.remove();
    }
  });

  it('рендерит default-пресет Button через Renderer', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const { setSelected } = useSelectedPreset();
    setSelected(getPresets('ui.Button').find((p) => p.id === 'default') ?? null);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      const root = canvasRoot(host);
      expect(root.querySelector('button')).not.toBeNull();
      expect(canvasText(host)).toContain('Default');
    } finally {
      dispose();
      host.remove();
    }
  });

  it('реактивно обновляется при смене пресета (Default → Ghost)', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const { setSelected } = useSelectedPreset();
    const defPreset = getPresets('ui.Button').find((p) => p.id === 'default');
    const ghostPreset = getPresets('ui.Button').find((p) => p.id === 'ghost');
    setSelected(defPreset ?? null);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      expect(canvasText(host)).toContain('Default');
      setSelected(ghostPreset ?? null);
      expect(canvasText(host)).toContain('Ghost');
      expect(canvasText(host)).not.toContain('Default');
    } finally {
      dispose();
      host.remove();
    }
  });

  it('реактивно отражает patchProps (variant change)', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const { setSelected, patchProps, schema } = useSelectedPreset();
    setSelected(getPresets('ui.Button').find((p) => p.id === 'default') ?? null);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      const rootId = schema()?.components.root ?? '';
      patchProps(rootId, { variant: 'destructive' });
      const btn = (canvasRoot(host) as HTMLElement).querySelector('button');
      expect(btn).not.toBeNull();
      expect(btn?.className).toContain('destructive');
    } finally {
      dispose();
      host.remove();
    }
  });

  it('рендерит icon-пресет с дочерней Icons.Plus', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const { setSelected } = useSelectedPreset();
    setSelected(getPresets('ui.Button').find((p) => p.id === 'icon') ?? null);
    const dispose = render(() => <WebStudioCanvas />, host);
    try {
      const root = canvasRoot(host) as HTMLElement;
      expect(root.querySelector('button')).not.toBeNull();
      expect(root.querySelector('svg')).not.toBeNull();
    } finally {
      dispose();
      host.remove();
    }
  });
});
