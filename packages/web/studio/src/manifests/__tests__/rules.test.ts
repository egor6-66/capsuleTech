import { canAcceptChild } from '@capsuletech/web-ui/manifest';
import { describe, expect, it } from 'vitest';
import { acceptsChildren, presetsForNode } from '../rules';

const rootType = (schema: {
  components: { root: string; nodes: Record<string, { type: string }> };
}) => schema.components.nodes[schema.components.root].type;

describe('acceptsChildren — container-gate (реальный isLeaf-сигнал)', () => {
  it('контейнеры принимают детей', () => {
    expect(acceptsChildren('ui.Layout.Flex')).toBe(true);
    expect(acceptsChildren('ui.Layout.Grid')).toBe(true);
    expect(acceptsChildren('ui.Card')).toBe(true);
    expect(acceptsChildren('ui.Field')).toBe(true);
  });

  it('leaf-примитивы не принимают детей', () => {
    expect(acceptsChildren('ui.Button')).toBe(false);
    expect(acceptsChildren('ui.Input')).toBe(false);
    expect(acceptsChildren('ui.Typography')).toBe(false);
    expect(acceptsChildren('ui.Label')).toBe(false);
  });

  it('undefined / неизвестный тип → false', () => {
    expect(acceptsChildren(undefined)).toBe(false);
    expect(acceptsChildren('ui.Nope')).toBe(false);
  });
});

describe('presetsForNode — accept-фильтрация пресетов', () => {
  it('leaf-узел не принимает никаких пресетов', () => {
    expect(presetsForNode('ui.Button')).toEqual([]);
  });

  it('Flex принимает пресеты, и все они реально accepted', () => {
    const list = presetsForNode('ui.Layout.Flex');
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p) => canAcceptChild('ui.Layout.Flex', rootType(p.schema)))).toBe(true);
  });

  it('Card фильтрует по своему accepts (только Card-parts) — все возвращённые accepted', () => {
    const list = presetsForNode('ui.Card');
    expect(list.every((p) => canAcceptChild('ui.Card', rootType(p.schema)))).toBe(true);
    // Card принимает строго меньше, чем Flex (accepts-предикат уже общего).
    expect(list.length).toBeLessThan(presetsForNode('ui.Layout.Flex').length);
  });
});
