import { canAcceptChild, hasPresets } from '@capsuletech/web-ui/manifest';
import { describe, expect, it } from 'vitest';
import { acceptsChildren, manifestsForNode } from '../rules';

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

describe('manifestsForNode — accept-фильтрация компонентов (с пресетами)', () => {
  it('leaf-узел не принимает никаких компонентов', () => {
    expect(manifestsForNode('ui.Button')).toEqual([]);
  });

  it('Flex принимает компоненты, все — с пресетами и реально accepted', () => {
    const list = manifestsForNode('ui.Layout.Flex');
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((m) => hasPresets(m.type))).toBe(true);
    expect(list.every((m) => canAcceptChild('ui.Layout.Flex', m.type))).toBe(true);
  });

  it('Card фильтрует по своему accepts — строго уже Flex', () => {
    const card = manifestsForNode('ui.Card');
    expect(card.every((m) => canAcceptChild('ui.Card', m.type))).toBe(true);
    expect(card.length).toBeLessThan(manifestsForNode('ui.Layout.Flex').length);
  });
});
