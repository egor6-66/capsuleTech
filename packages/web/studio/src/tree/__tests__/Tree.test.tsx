/* @vitest-environment jsdom */

import type { IEditorNode } from '@capsuletech/web-renderer';
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { Tree } from '../Tree';

const nodes: Record<string, IEditorNode> = {
  root: { id: 'root', type: 'ui.Layout.Flex', parentId: null, children: ['leaf'], props: {} },
  leaf: { id: 'leaf', type: 'ui.Button', parentId: 'root', children: [], props: {} },
};

const renderTree = (isExpanded: (id: string) => boolean) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const dispose = render(
    () => (
      <Tree
        nodes={nodes}
        rootId="root"
        selectedNodeId={null}
        onSelect={() => {}}
        onInsert={() => {}}
        isExpanded={isExpanded}
        onToggleExpand={() => {}}
        onMove={() => {}}
      />
    ),
    host,
  );
  return {
    host,
    cleanup: () => {
      dispose();
      host.remove();
    },
  };
};

describe('Tree — корень всегда открыт', () => {
  it('дети + мини-палитра корня видны без раскрытия (isExpanded → false)', () => {
    // Даже если стор говорит «всё закрыто», корень раскрыт.
    const { host, cleanup } = renderTree(() => false);
    try {
      // ребёнок-лист виден сразу.
      expect(host.querySelector('[data-testid="tree-row-leaf"]')).toBeTruthy();
      // мини-палитра корня видна сразу.
      expect(host.querySelector('[data-testid="node-add-ui.Layout.Flex"]')).toBeTruthy();
    } finally {
      cleanup();
    }
  });
});
