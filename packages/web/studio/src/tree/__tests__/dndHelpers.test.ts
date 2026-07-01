import type { IEditorNode } from '@capsuletech/web-renderer';
import { describe, expect, it } from 'vitest';
import { isSelfOrDescendant } from '../dndHelpers';

const nodes: Record<string, IEditorNode> = {
  root: { id: 'root', type: 'ui.Layout.Flex', parentId: null, children: ['a'], props: {} },
  a: { id: 'a', type: 'ui.Group', parentId: 'root', children: ['b'], props: {} },
  b: { id: 'b', type: 'ui.Button', parentId: 'a', children: [], props: {} },
  c: { id: 'c', type: 'ui.Button', parentId: 'root', children: [], props: {} },
};

describe('isSelfOrDescendant', () => {
  it('сам узел', () => {
    expect(isSelfOrDescendant(nodes, 'a', 'a')).toBe(true);
  });
  it('прямой/глубокий потомок', () => {
    expect(isSelfOrDescendant(nodes, 'a', 'b')).toBe(true);
    expect(isSelfOrDescendant(nodes, 'root', 'b')).toBe(true);
  });
  it('не потомок', () => {
    expect(isSelfOrDescendant(nodes, 'a', 'c')).toBe(false);
    expect(isSelfOrDescendant(nodes, 'b', 'a')).toBe(false);
  });
});
