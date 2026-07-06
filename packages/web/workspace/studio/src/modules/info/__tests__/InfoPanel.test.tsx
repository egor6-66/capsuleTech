/* @vitest-environment jsdom */

import { getPresets } from '@capsuletech/web-ui/manifest';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocument } from '../../../core';
import { InfoPanel } from '../InfoPanel';

afterEach(() => {
  useDocument().reset();
});

describe('InfoPanel — по selectedNode()', () => {
  it('EmptyState когда узел не выбран', () => {
    const host = document.createElement('div');
    const dispose = render(() => <InfoPanel />, host);
    try {
      expect(host.textContent).toContain('Выберите компонент');
    } finally {
      dispose();
    }
  });

  it('store-mode: реальный пресет загружен → контракт/манифест + описание пресета', () => {
    const host = document.createElement('div');
    const def = getPresets('ui.Button').find((p) => p.id === 'default')!;
    useDocument().loadPreset(def);
    const dispose = render(() => <InfoPanel />, host);
    try {
      expect(host.textContent).toContain('Контракт');
      expect(host.textContent).toContain('Манифест');
      expect(host.textContent).toContain('Button');
    } finally {
      dispose();
    }
  });

  it('creator-mode: выбран узел дерева → манифест этого типа (без реального пресета)', () => {
    const host = document.createElement('div');
    const doc = useDocument();
    doc.insertPreset(getPresets('ui.Button').find((p) => p.id === 'default')!);
    const childId = doc.schema().components.nodes[doc.schema().components.root].children[0];
    doc.selectNode(childId);
    const dispose = render(() => <InfoPanel />, host);
    try {
      expect(host.textContent).toContain('Манифест');
      expect(host.textContent).toContain('Button');
    } finally {
      dispose();
    }
  });
});
