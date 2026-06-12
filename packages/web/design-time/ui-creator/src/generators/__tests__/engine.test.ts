import { describe, expect, it } from 'vitest';
import { generate } from '../engine';
import { FORM_PRESET } from '../presets/form';
import type { IEditorNode, IPreset } from '../types';

describe('engine / generate', () => {
  it('throws if preset has no rootCandidates', () => {
    const preset: IPreset = { name: 'empty', rootCandidates: [] };
    expect(() => generate(preset, { seed: 1 })).toThrow(/no rootCandidates/);
  });

  it('returns IEditorTree with root and nodes', () => {
    const tree = generate(FORM_PRESET, { seed: 1 });
    expect(typeof tree.root).toBe('string');
    expect(tree.nodes).toBeTypeOf('object');
    expect(tree.nodes[tree.root]).toBeDefined();
  });

  it('same seed produces same tree (full determinism)', () => {
    const a = generate(FORM_PRESET, { seed: 12345 });
    const b = generate(FORM_PRESET, { seed: 12345 });
    expect(a).toEqual(b);
  });

  it('different seeds produce different trees', () => {
    const a = generate(FORM_PRESET, { seed: 12345 });
    const b = generate(FORM_PRESET, { seed: 67890 });
    expect(a).not.toEqual(b);
  });

  it('accepts custom rng (takes precedence over seed)', () => {
    let counter = 0;
    const rng = () => {
      counter += 0.1;
      return (counter % 1) + 0.001;
    };
    const tree = generate(FORM_PRESET, { rng, seed: 999 });
    expect(tree.root).toBeDefined();
  });

  it('all nodes have valid IEditorNode shape', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    for (const node of Object.values(tree.nodes)) {
      expect(node.id).toBeTypeOf('string');
      expect(node.type).toBeTypeOf('string');
      expect(Array.isArray(node.children)).toBe(true);
      expect(node.props).toBeTypeOf('object');
      expect(node.meta).toBeTypeOf('object');
      expect(node.styles).toBeTypeOf('object');
    }
  });

  it('parentId is consistent with children arrays', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    const rootNode = tree.nodes[tree.root] as IEditorNode;
    expect(rootNode.parentId).toBeNull();

    for (const node of Object.values(tree.nodes)) {
      for (const childId of node.children) {
        const child = tree.nodes[childId];
        expect(child).toBeDefined();
        expect(child?.parentId).toBe(node.id);
      }
    }
  });

  it('all node ids are unique', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    const ids = Object.keys(tree.nodes);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tree is reachable from root (no orphans)', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    const reachable = new Set<string>();
    const walk = (id: string) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      const node = tree.nodes[id];
      if (node) for (const c of node.children) walk(c);
    };
    walk(tree.root);
    expect(reachable.size).toBe(Object.keys(tree.nodes).length);
  });

  it('respects countRange [min, max] for slot children', () => {
    // Probe many seeds to verify countRange is honored.
    const cardContentChildrenCounts: number[] = [];
    for (let seed = 0; seed < 100; seed++) {
      const tree = generate(FORM_PRESET, { seed });
      const contentNode = Object.values(tree.nodes).find((n) => n.type === 'ui.Card.Content');
      if (contentNode) cardContentChildrenCounts.push(contentNode.children.length);
    }
    expect(cardContentChildrenCounts.length).toBeGreaterThan(0);
    for (const count of cardContentChildrenCounts) {
      // FORM_PRESET: Content.fields countRange [2, 5]
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(5);
    }
  });

  it('optional slots (probability < 1) sometimes appear, sometimes do not', () => {
    let hasHeader = 0;
    let noHeader = 0;
    for (let seed = 0; seed < 100; seed++) {
      const tree = generate(FORM_PRESET, { seed });
      const has = Object.values(tree.nodes).some((n) => n.type === 'ui.Card.Header');
      if (has) hasHeader++;
      else noHeader++;
    }
    // header has probability 0.7 — expect both outcomes within 100 seeds
    expect(hasHeader).toBeGreaterThan(10);
    expect(noHeader).toBeGreaterThan(10);
  });
});
