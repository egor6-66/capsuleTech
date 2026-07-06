/* @vitest-environment jsdom */

import { getManifest, getPresets, type IPreset } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { ComponentSegments } from '../ComponentSegments';

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

const buttonManifest = () => getManifest('ui.Button')!;

describe('ComponentSegments', () => {
  it('рендерит manifests и вызывает onSelect(preset) по клику', async () => {
    let picked: IPreset | null = null;
    const { host, cleanup } = mount(() => (
      <ComponentSegments manifests={[buttonManifest()]} onSelect={(p) => (picked = p)} />
    ));
    try {
      const seg = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Button',
      );
      expect(seg).toBeTruthy();
      press(seg!);
      await waitFor(() => host.querySelector('[data-testid="preset-default"]') !== null);
      host.querySelector<HTMLButtonElement>('[data-testid="preset-default"]')!.click();
      expect(picked).not.toBeNull();
      expect((picked as unknown as IPreset).id).toBe('default');
    } finally {
      cleanup();
    }
  });

  it('подсвечивает selectedId', async () => {
    const { host, cleanup } = mount(() => (
      <ComponentSegments manifests={[buttonManifest()]} onSelect={() => {}} selectedId="default" />
    ));
    try {
      const seg = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Button',
      );
      press(seg!);
      await waitFor(() => host.querySelector('[data-testid="preset-default"]') !== null);
      const active = host.querySelector<HTMLButtonElement>('[data-testid="preset-default"]');
      // Подсветка активного пресета = kit Button variant="secondary"
      // (стабильный сигнал data-variant, не raw-класс).
      expect(active?.getAttribute('data-variant')).toBe('secondary');
    } finally {
      cleanup();
    }
  });

  it('кастомный testIdPrefix', async () => {
    const { host, cleanup } = mount(() => (
      <ComponentSegments
        manifests={[buttonManifest()]}
        onSelect={() => {}}
        testIdPrefix="node-preset"
      />
    ));
    try {
      const seg = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Button',
      );
      press(seg!);
      await waitFor(() => host.querySelector('[data-testid="node-preset-default"]') !== null);
      expect(host.querySelector('[data-testid="node-preset-default"]')).toBeTruthy();
      expect(getPresets('ui.Button').length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });
});
