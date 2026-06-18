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

  it('returns undefined for a registered type without a contract ("ui.Spinner")', () => {
    // SpinnerManifest exists in registry but has no contract field.
    const result = getContract('ui.Spinner');
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

  it('returns [] for ui.Spinner (no presets defined)', () => {
    const presets = getPresets('ui.Spinner');
    expect(presets).toEqual([]);
  });

  it('returns [] for unknown type', () => {
    expect(getPresets('ui.NonExistent')).toEqual([]);
  });
});

describe('hasPresets', () => {
  it('returns true for ui.Button', () => {
    expect(hasPresets('ui.Button')).toBe(true);
  });

  it('returns false for ui.Spinner', () => {
    expect(hasPresets('ui.Spinner')).toBe(false);
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
