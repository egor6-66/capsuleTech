import { describe, expect, it } from 'vitest';
import { buildTemplate, getAllTemplates, listTemplatesFor } from '../templates';
import '../../manifests/registry'; // ensures registry initialization for variant assertions

describe('getAllTemplates', () => {
  it('возвращает непустой массив', () => {
    expect(getAllTemplates().length).toBeGreaterThan(0);
  });

  it('все id уникальны', () => {
    const ids = getAllTemplates().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('каждый темплейт имеет корректную форму ITemplate', () => {
    for (const t of getAllTemplates()) {
      expect(typeof t.id).toBe('string');
      expect(t.id).toMatch(/^[a-z][a-z0-9-]*$/); // kebab-case
      expect(typeof t.label).toBe('string');
      expect(t.label.length).toBeGreaterThan(0);
      expect(typeof t.forType).toBe('string');
      expect(t.forType.length).toBeGreaterThan(0);
      expect(typeof t.group).toBe('string');
      expect(typeof t.previewSeed).toBe('number');
      expect(t.preset).toBeDefined();
      expect(typeof t.preset.name).toBe('string');
      expect(Array.isArray(t.preset.rootCandidates)).toBe(true);
    }
  });
});

describe('listTemplatesFor', () => {
  it('возвращает только темплейты для заданного forType', () => {
    const cardTemplates = listTemplatesFor('ui.Card');
    expect(cardTemplates.length).toBeGreaterThan(0);
    for (const t of cardTemplates) {
      expect(t.forType).toBe('ui.Card');
    }
  });

  it('возвращает пустой массив для неизвестного forType', () => {
    expect(listTemplatesFor('ui.NonExistent')).toEqual([]);
  });

  it('фильтрует темплейты для ui.Button (только button-*)', () => {
    const btnTemplates = listTemplatesFor('ui.Button');
    expect(btnTemplates.length).toBeGreaterThanOrEqual(2);
    for (const t of btnTemplates) {
      expect(t.forType).toBe('ui.Button');
    }
  });

  it('фильтрует темплейты для ui.Typography', () => {
    const typoTemplates = listTemplatesFor('ui.Typography');
    expect(typoTemplates.length).toBeGreaterThanOrEqual(2);
  });

  it('фильтрует темплейты для ui.Layout.Grid', () => {
    const layoutTemplates = listTemplatesFor('ui.Layout.Grid');
    expect(layoutTemplates.length).toBeGreaterThanOrEqual(1);
  });
});

describe('buildTemplate', () => {
  it('возвращает IEditorTree с root и nodes', () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      const tree = buildTemplate(t);
      expect(typeof tree.root).toBe('string');
      expect(tree.nodes).toBeTypeOf('object');
      expect(tree.nodes[tree.root]).toBeDefined();
    }
  });

  it('без seed использует previewSeed (детерминизм)', () => {
    for (const t of getAllTemplates()) {
      const a = buildTemplate(t);
      const b = buildTemplate(t);
      expect(a).toEqual(b);
    }
  });

  it('кастомный seed переопределяет previewSeed', () => {
    const t = listTemplatesFor('ui.Card')[0]!;
    const withPreview = buildTemplate(t);
    const withCustom = buildTemplate(t, t.previewSeed + 1);
    // Разные seed → как правило разный результат (не всегда — но для сложного
    // FORM_PRESET вероятность совпадения пренебрежимо мала)
    expect(withPreview).not.toEqual(withCustom);
  });

  it('card-form: root — ui.Card', () => {
    const t = getAllTemplates().find((t) => t.id === 'card-form')!;
    const tree = buildTemplate(t);
    expect(tree.nodes[tree.root]?.type).toBe('ui.Card');
  });

  it('card-product: root — ui.Card, содержит Header+Content+Footer', () => {
    const t = getAllTemplates().find((t) => t.id === 'card-product')!;
    const tree = buildTemplate(t);
    expect(tree.nodes[tree.root]?.type).toBe('ui.Card');
    const types = Object.values(tree.nodes).map((n) => n.type);
    expect(types).toContain('ui.Card.Header');
    expect(types).toContain('ui.Card.Content');
    expect(types).toContain('ui.Card.Footer');
  });

  it('layout-2col: root — ui.Layout.Grid, два Flex-ребёнка', () => {
    const t = getAllTemplates().find((t) => t.id === 'layout-2col')!;
    const tree = buildTemplate(t);
    expect(tree.nodes[tree.root]?.type).toBe('ui.Layout.Grid');
    const flexNodes = Object.values(tree.nodes).filter((n) => n.type === 'ui.Layout.Flex');
    expect(flexNodes.length).toBe(2);
  });

  it('button-primary: root — ui.Button, variant:default', () => {
    const t = getAllTemplates().find((t) => t.id === 'button-primary')!;
    const tree = buildTemplate(t);
    const btn = tree.nodes[tree.root];
    expect(btn?.type).toBe('ui.Button');
    expect(btn?.props.variant).toBe('default');
  });

  it('button-outline: root — ui.Button, variant:outline', () => {
    const t = getAllTemplates().find((t) => t.id === 'button-outline')!;
    const tree = buildTemplate(t);
    const btn = tree.nodes[tree.root];
    expect(btn?.type).toBe('ui.Button');
    expect(btn?.props.variant).toBe('outline');
  });

  it('typography-h1: root — ui.Typography, variant:h1', () => {
    const t = getAllTemplates().find((t) => t.id === 'typography-h1')!;
    const tree = buildTemplate(t);
    const node = tree.nodes[tree.root];
    expect(node?.type).toBe('ui.Typography');
    expect(node?.props.variant).toBe('h1');
  });

  it('typography-paragraph: root — ui.Typography, variant:p', () => {
    const t = getAllTemplates().find((t) => t.id === 'typography-paragraph')!;
    const tree = buildTemplate(t);
    const node = tree.nodes[tree.root];
    expect(node?.type).toBe('ui.Typography');
    expect(node?.props.variant).toBe('p');
  });

  it('все ноды в сгенерированном дереве достижимы из root (нет orphan)', () => {
    for (const t of getAllTemplates()) {
      const tree = buildTemplate(t);
      const reachable = new Set<string>();
      const walk = (id: string) => {
        if (reachable.has(id)) return;
        reachable.add(id);
        const node = tree.nodes[id];
        if (node) for (const c of node.children) walk(c);
      };
      walk(tree.root);
      expect(reachable.size).toBe(Object.keys(tree.nodes).length);
    }
  });
});
