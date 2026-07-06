/**
 * Registry helpers tests:
 *   - `getContract` (item B) — manifest-co-located contract resolution.
 *   - `getPresets` / `hasPresets` / `applyFieldRule` (item C phase 2-3) —
 *     presets + fieldRule moved from studio palette into kit manifest.
 *
 * Canon: docs/_meta/web-ui.md.
 */

import { describe, expect, it } from 'vitest';
import { ButtonContract } from '../../primitives/button/button.contract';
import { CardContract } from '../../primitives/card/card.contract';
import { applyFieldRule, getContract, getPresets, hasPresets } from '../registry';

describe('getContract', () => {
  it('returns ButtonContract for "ui.Button"', () => {
    const result = getContract('ui.Button');
    expect(result).toBe(ButtonContract);
  });

  it('returns CardContract for "ui.Card"', () => {
    const result = getContract('ui.Card');
    expect(result).toBe(CardContract);
  });

  it('returns undefined for a registered type without a contract ("ui.Card.Footer")', () => {
    // CardFooterManifest exists in registry but has no contract field (composite part).
    const result = getContract('ui.Card.Footer');
    expect(result).toBeUndefined();
  });

  it('returns undefined for an unknown type ("nonexistent.Type")', () => {
    const result = getContract('nonexistent.Type');
    expect(result).toBeUndefined();
  });
});

describe('getPresets', () => {
  it('returns 7 presets for ui.Button (default/secondary/outline/ghost/destructive/link/icon)', () => {
    const presets = getPresets('ui.Button');
    expect(presets).toHaveLength(7);
    const ids = presets.map((p) => p.id);
    expect(ids).toContain('default');
    expect(ids).toContain('secondary');
    expect(ids).toContain('outline');
    expect(ids).toContain('ghost');
    expect(ids).toContain('destructive');
    expect(ids).toContain('link');
    expect(ids).toContain('icon');
  });

  it('each button preset has id, label and schema', () => {
    const presets = getPresets('ui.Button');
    for (const p of presets) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.schema).toBeDefined();
      expect(p.schema.components.root).toBe('btn');
      expect(p.schema.components.nodes.btn).toBeDefined();
    }
  });

  it('returns [] for ui.Card.Footer (no presets defined)', () => {
    const presets = getPresets('ui.Card.Footer');
    expect(presets).toEqual([]);
  });

  it('returns [] for unknown type', () => {
    expect(getPresets('ui.NonExistent')).toEqual([]);
  });
});

describe('getPresets — palette batch (label/separator/spinner/skeleton/group/grid/list)', () => {
  it('returns 1 preset for ui.Label (default)', () => {
    const ids = getPresets('ui.Label').map((p) => p.id);
    expect(ids).toEqual(['default']);
  });

  it('returns 2 presets for ui.Separator (horizontal/vertical)', () => {
    const ids = getPresets('ui.Separator').map((p) => p.id);
    expect(ids).toEqual(['horizontal', 'vertical']);
  });

  it('returns 4 presets for ui.Spinner (small/medium/large/with-label)', () => {
    const ids = getPresets('ui.Spinner').map((p) => p.id);
    expect(ids).toEqual(['small', 'medium', 'large', 'with-label']);
  });

  it('returns 5 presets for ui.Skeleton (text/list/card/table/map)', () => {
    const ids = getPresets('ui.Skeleton').map((p) => p.id);
    expect(ids).toEqual(['text', 'list', 'card', 'table', 'map']);
  });

  it('returns 3 presets for ui.Group (attached/separate/vertical) with button children', () => {
    const presets = getPresets('ui.Group');
    expect(presets.map((p) => p.id)).toEqual(['attached', 'separate', 'vertical']);
    for (const p of presets) {
      const root = p.schema.components.root;
      const rootNode = p.schema.components.nodes[root];
      expect(rootNode?.type).toBe('ui.Group');
      // container preset: children resolve to ui.Button nodes
      expect(rootNode?.children.length).toBeGreaterThan(0);
      for (const childId of rootNode!.children) {
        expect(p.schema.components.nodes[childId]?.type).toBe('ui.Button');
      }
    }
  });

  it('returns 3 presets for ui.Layout.Grid (2-col/3-col/auto-fit) with 6 neutral tiles each', () => {
    const presets = getPresets('ui.Layout.Grid');
    expect(presets.map((p) => p.id)).toEqual(['two-col', 'three-col', 'auto-fit']);
    for (const p of presets) {
      const root = p.schema.components.root;
      const rootNode = p.schema.components.nodes[root];
      expect(rootNode?.type).toBe('ui.Layout.Grid');
      // container preset: 6 tiles reflow when cols/gap change in the inspector
      expect(rootNode?.children.length).toBe(6);
      for (const childId of rootNode!.children) {
        // neutral flat box, NOT ui.Card — Card chrome (shadow/border/padding) distorts tile size
        expect(p.schema.components.nodes[childId]?.type).toBe('ui.Layout.Flex');
      }
    }
  });

  it('returns 3 presets for ui.List (vertical/flush/horizontal) with button rows', () => {
    const presets = getPresets('ui.List');
    expect(presets.map((p) => p.id)).toEqual(['vertical', 'flush', 'horizontal']);
    for (const p of presets) {
      const root = p.schema.components.root;
      const rootNode = p.schema.components.nodes[root];
      expect(rootNode?.type).toBe('ui.List');
      // semantic preset: rows resolve to ui.Button nodes
      expect(rootNode?.children.length).toBeGreaterThan(0);
      for (const childId of rootNode!.children) {
        expect(p.schema.components.nodes[childId]?.type).toBe('ui.Button');
      }
    }
  });

  it('every batch-1 preset has id, label, schema with single resolvable root node', () => {
    for (const type of ['ui.Label', 'ui.Separator', 'ui.Spinner', 'ui.Skeleton']) {
      for (const p of getPresets(type)) {
        expect(p.id).toBeTruthy();
        expect(p.label).toBeTruthy();
        const root = p.schema.components.root;
        expect(p.schema.components.nodes[root]?.type).toBe(type);
      }
    }
  });
});

describe('getPresets — compositions (card/field)', () => {
  /** Every node referenced as a child must exist; parentId must back-link. */
  const assertTreeIntegrity = (schema: ReturnType<typeof getPresets>[number]['schema']) => {
    const { root, nodes } = schema.components;
    expect(nodes[root]).toBeDefined();
    expect(nodes[root].parentId).toBeNull();
    for (const node of Object.values(nodes)) {
      for (const childId of node.children) {
        const child = nodes[childId];
        expect(child).toBeDefined();
        expect(child.parentId).toBe(node.id);
      }
    }
  };

  it('returns 6 presets for ui.Card (3 compound trees + 3 entity single-node)', () => {
    const presets = getPresets('ui.Card');
    expect(presets.map((p) => p.id)).toEqual([
      'basic',
      'with-footer',
      'stat',
      'word-compact',
      'word-full',
      'entity-meta',
    ]);
    const compound = new Set(['basic', 'with-footer', 'stat']);
    for (const p of presets) {
      const rootNode = p.schema.components.nodes[p.schema.components.root];
      expect(rootNode?.type).toBe('ui.Card');
      if (compound.has(p.id)) {
        // Compound presets are nested ui.Card.* trees.
        expect(rootNode?.children.length).toBeGreaterThan(0);
      } else {
        // Entity presets are a single data-driven ui.Card node (no children).
        expect(rootNode?.children.length).toBe(0);
        expect(rootNode?.props?.title).toBeTruthy();
      }
      assertTreeIntegrity(p.schema);
    }
  });

  it('returns 3 presets for ui.Field (default/with-error/horizontal) as nested ui.Field.* trees', () => {
    const presets = getPresets('ui.Field');
    expect(presets.map((p) => p.id)).toEqual(['default', 'with-error', 'horizontal']);
    for (const p of presets) {
      const rootNode = p.schema.components.nodes[p.schema.components.root];
      expect(rootNode?.type).toBe('ui.Field');
      expect(rootNode?.children.length).toBeGreaterThan(0);
      assertTreeIntegrity(p.schema);
    }
  });
});

describe('hasPresets', () => {
  it('returns true for ui.Button', () => {
    expect(hasPresets('ui.Button')).toBe(true);
  });

  it('returns false for ui.Card.Footer', () => {
    expect(hasPresets('ui.Card.Footer')).toBe(false);
  });

  it('returns false for unknown type', () => {
    expect(hasPresets('ui.NonExistent')).toBe(false);
  });
});

describe('applyFieldRule', () => {
  it('returns { hidden: ["children"] } for ui.Button with size=icon', () => {
    const result = applyFieldRule('ui.Button', { size: 'icon' });
    expect(result).toEqual({ hidden: ['children'] });
  });

  it('returns {} for ui.Button with size=default', () => {
    const result = applyFieldRule('ui.Button', { size: 'default' });
    expect(result).toEqual({});
  });

  it('returns {} for ui.Button with no size', () => {
    const result = applyFieldRule('ui.Button', {});
    expect(result).toEqual({});
  });

  it('returns {} for ui.Card (no fieldRule defined)', () => {
    const result = applyFieldRule('ui.Card', {});
    expect(result).toEqual({});
  });

  it('returns {} for unknown type', () => {
    const result = applyFieldRule('ui.NonExistent', { size: 'icon' });
    expect(result).toEqual({});
  });
});
