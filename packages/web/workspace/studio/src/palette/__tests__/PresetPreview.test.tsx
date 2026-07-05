/* @vitest-environment jsdom */

import { getPresets } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { PresetPreview } from '../PresetPreview';

describe('PresetPreview — живой рендер схемы пресета', () => {
  it('рендерит Button-пресет через локальный registry (static)', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const p = getPresets('ui.Button').find((x) => x.id === 'default')!;
    const dispose = render(() => <PresetPreview schema={p.schema} />, host);
    try {
      // ui.Button резолвится в реальный <button> web-ui.
      expect(host.querySelector('button')).toBeTruthy();
    } finally {
      dispose();
      host.remove();
    }
  });

  it('рендерит layout-контейнер (Flex-пресет) без падения', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const p = getPresets('ui.Layout.Flex')[0];
    const dispose = render(() => <PresetPreview schema={p.schema} />, host);
    try {
      expect(host.querySelector('div')).toBeTruthy();
    } finally {
      dispose();
      host.remove();
    }
  });
});
