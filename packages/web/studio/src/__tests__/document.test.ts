/* @vitest-environment jsdom */

import { getPresets } from '@capsuletech/web-ui/manifest';
import { afterEach, describe, expect, it } from 'vitest';
import { COMPOSITION_ROOT_ID, useDocument } from '../document';

const buttonPreset = () => getPresets('ui.Button').find((p) => p.id === 'default')!;
const iconPreset = () => getPresets('ui.Button').find((p) => p.id === 'icon')!;
const flexPreset = () => getPresets('ui.Layout.Flex')[0];
const cardPreset = () => getPresets('ui.Card')[0];

afterEach(() => {
  useDocument('store').reset();
  useDocument('creator').reset();
});

describe('document — initial', () => {
  it('пустой корневой ui.Flex, ничего не выбрано', () => {
    const { schema, selectedNodeId, selectedNode, loadedPresetId } = useDocument();
    expect(schema().components.root).toBe(COMPOSITION_ROOT_ID);
    expect(schema().components.nodes[COMPOSITION_ROOT_ID]?.type).toBe('ui.Layout.Flex');
    expect(selectedNodeId()).toBeNull();
    expect(selectedNode()).toBeNull();
    expect(loadedPresetId()).toBeNull();
  });
});

describe('document — loadPreset (store-mode)', () => {
  it('заменяет document на клон пресета + выбирает root + фиксирует provenance', () => {
    const { loadPreset, schema, selectedNodeId, selectedNode, loadedPresetId } = useDocument();
    const p = buttonPreset();
    loadPreset(p);
    expect(schema().components.root).toBe(p.schema.components.root);
    expect(selectedNodeId()).toBe(p.schema.components.root);
    expect(selectedNode()?.type).toBe('ui.Button');
    expect(loadedPresetId()).toBe('default');
  });

  it('смена пресета = replace (root предыдущего исчезает)', () => {
    const { loadPreset, schema } = useDocument();
    const a = buttonPreset();
    const b = iconPreset();
    loadPreset(a);
    loadPreset(b);
    expect(schema().components.root).toBe(b.schema.components.root);
  });

  it('клон независим — правки не текут в registry-пресет', () => {
    const { loadPreset, patchProps, selectedNodeId } = useDocument();
    const p = buttonPreset();
    loadPreset(p);
    patchProps(selectedNodeId()!, { children: 'Mutated' });
    const original = p.schema.components.nodes[p.schema.components.root]?.props as Record<
      string,
      unknown
    >;
    expect(original?.children).toBe('Default');
  });
});

describe('document — insertPreset (creator-mode)', () => {
  it('вставляет пресет ребёнком в указанный узел с уникальными id', () => {
    const { insertPreset, schema } = useDocument();
    insertPreset(buttonPreset(), COMPOSITION_ROOT_ID);
    const root = schema().components.nodes[COMPOSITION_ROOT_ID];
    expect(root.children.length).toBe(1);
    const childId = root.children[0];
    expect(childId).not.toBe(buttonPreset().schema.components.root); // ремап id
    expect(schema().components.nodes[childId]?.type).toBe('ui.Button');
    expect(schema().components.nodes[childId]?.parentId).toBe(COMPOSITION_ROOT_ID);
  });

  it('дефолтный parentId = корень document', () => {
    const { insertPreset, schema } = useDocument();
    insertPreset(buttonPreset());
    expect(schema().components.nodes[COMPOSITION_ROOT_ID].children.length).toBe(1);
  });

  it('повторная вставка не даёт id-коллизий', () => {
    const { insertPreset, schema } = useDocument();
    insertPreset(buttonPreset());
    insertPreset(buttonPreset());
    const root = schema().components.nodes[COMPOSITION_ROOT_ID];
    expect(root.children.length).toBe(2);
    expect(root.children[0]).not.toBe(root.children[1]);
  });

  it('вставка в несуществующий узел — no-op', () => {
    const { insertPreset, schema } = useDocument();
    insertPreset(buttonPreset(), 'ghost');
    expect(schema().components.nodes[COMPOSITION_ROOT_ID].children.length).toBe(0);
  });

  it('вставка в произвольный (не-root) узел', () => {
    const { insertPreset, schema } = useDocument();
    // Card-пресет как контейнер, затем вставим Button внутрь его корня.
    const card = getPresets('ui.Card')[0];
    if (!card) return; // нет Card-пресета в registry — пропускаем
    insertPreset(card);
    const cardChildId = schema().components.nodes[COMPOSITION_ROOT_ID].children[0];
    const before = schema().components.nodes[cardChildId].children.length;
    insertPreset(buttonPreset(), cardChildId);
    expect(schema().components.nodes[cardChildId].children.length).toBe(before + 1);
  });
});

describe('document — selectNode / patchNodeType', () => {
  it('selectNode резолвит selectedNode; null сбрасывает', () => {
    const { insertPreset, schema, selectNode, selectedNode } = useDocument();
    insertPreset(buttonPreset());
    const childId = schema().components.nodes[COMPOSITION_ROOT_ID].children[0];
    selectNode(childId);
    expect(selectedNode()?.id).toBe(childId);
    selectNode(null);
    expect(selectedNode()).toBeNull();
  });

  it('patchNodeType меняет тип узла (icon-picker)', () => {
    const { loadPreset, patchNodeType, schema, selectedNodeId } = useDocument();
    loadPreset(iconPreset());
    // у icon-пресета есть child ui.Icons.*; найдём его.
    const rootId = selectedNodeId()!;
    const iconChildId = schema().components.nodes[rootId].children.find((c) =>
      schema().components.nodes[c]?.type.startsWith('ui.Icons.'),
    );
    if (!iconChildId) return;
    patchNodeType(iconChildId, 'ui.Icons.Settings');
    expect(schema().components.nodes[iconChildId].type).toBe('ui.Icons.Settings');
  });
});

describe('document — removeNode', () => {
  it('сносит узел + поддерево, root неудаляем', () => {
    const { insertPreset, removeNode, schema } = useDocument();
    insertPreset(buttonPreset());
    const childId = schema().components.nodes[COMPOSITION_ROOT_ID].children[0];
    removeNode(childId);
    expect(schema().components.nodes[COMPOSITION_ROOT_ID].children.length).toBe(0);
    expect(schema().components.nodes[childId]).toBeUndefined();
    // root неудаляем
    removeNode(COMPOSITION_ROOT_ID);
    expect(schema().components.nodes[COMPOSITION_ROOT_ID]).toBeTruthy();
  });

  it('сбрасывает selection если удалён выбранный узел', () => {
    const { insertPreset, removeNode, schema, selectNode, selectedNodeId } = useDocument();
    insertPreset(buttonPreset());
    const childId = schema().components.nodes[COMPOSITION_ROOT_ID].children[0];
    selectNode(childId);
    removeNode(childId);
    expect(selectedNodeId()).toBeNull();
  });
});

describe('document — insertPreset: layout-контейнер пустой в creator', () => {
  it('Flex-пресет вставляется БЕЗ детей-плейсхолдеров (root пустой)', () => {
    const doc = useDocument('creator');
    const p = flexPreset();
    // сам пресет несёт детей (store-превью-плитки).
    expect(p.schema.components.nodes[p.schema.components.root].children.length).toBeGreaterThan(0);

    doc.insertPreset(p);
    const childId = doc.schema().components.nodes[COMPOSITION_ROOT_ID].children[0];
    const inserted = doc.schema().components.nodes[childId];
    expect(inserted.type).toBe('ui.Layout.Flex');
    expect(inserted.children).toEqual([]);
    // плитки-плейсхолдеры не протекли: только creator-root + пустой flex.
    expect(Object.keys(doc.schema().components.nodes).length).toBe(2);
  });

  it('composition (Card) вставляется целиком — части сохранены', () => {
    const doc = useDocument('creator');
    const p = cardPreset();
    if (!p) return;
    const partCount = p.schema.components.nodes[p.schema.components.root].children.length;
    doc.insertPreset(p);
    const childId = doc.schema().components.nodes[COMPOSITION_ROOT_ID].children[0];
    expect(doc.schema().components.nodes[childId].children.length).toBe(partCount);
  });

  it('loadPreset (store) сохраняет детей layout-контейнера', () => {
    const doc = useDocument('store');
    doc.loadPreset(flexPreset());
    const root = doc.schema().components.nodes[doc.schema().components.root];
    expect(root.children.length).toBeGreaterThan(0);
  });
});

describe('document — expand state (persist, default closed)', () => {
  it('по дефолту всё закрыто', () => {
    const { isExpanded } = useDocument('creator');
    expect(isExpanded(COMPOSITION_ROOT_ID)).toBe(false);
    expect(isExpanded('anything')).toBe(false);
  });

  it('setExpanded запоминает open/closed', () => {
    const { setExpanded, isExpanded } = useDocument('creator');
    setExpanded('n1', true);
    expect(isExpanded('n1')).toBe(true);
    setExpanded('n1', false);
    expect(isExpanded('n1')).toBe(false);
  });

  it('removeNode чистит open-состояние удалённых нод', () => {
    const doc = useDocument('creator');
    doc.insertPreset(buttonPreset());
    const childId = doc.schema().components.nodes[COMPOSITION_ROOT_ID].children[0];
    doc.setExpanded(childId, true);
    doc.removeNode(childId);
    expect(doc.isExpanded(childId)).toBe(false);
  });

  it('open-состояние живёт в слайсе своего режима', () => {
    useDocument('creator').setExpanded('x', true);
    expect(useDocument('creator').isExpanded('x')).toBe(true);
    // store-слайс не видит creator open-состояния.
    expect(useDocument('store').isExpanded('x')).toBe(false);
  });
});

describe('document — режимы независимы (store ↔ creator)', () => {
  it('loadPreset(store) и insertPreset(creator) не мешают друг другу', () => {
    const store = useDocument('store');
    const creator = useDocument('creator');
    const p = buttonPreset();

    store.loadPreset(p);
    creator.insertPreset(p);

    // store: активный пресет, root выбран, provenance зафиксирован.
    expect(store.loadedPresetId()).toBe('default');
    expect(store.schema().components.root).toBe(p.schema.components.root);
    expect(store.selectedNodeId()).toBe(p.schema.components.root);

    // creator: композиция в COMPOSITION_ROOT, store'ом НЕ обнулена.
    expect(creator.schema().components.root).toBe(COMPOSITION_ROOT_ID);
    expect(creator.schema().components.nodes[COMPOSITION_ROOT_ID].children.length).toBe(1);
    expect(creator.loadedPresetId()).toBeNull();
  });

  it('смена store-пресета не трогает creator-дерево', () => {
    const store = useDocument('store');
    const creator = useDocument('creator');
    creator.insertPreset(buttonPreset());
    const treeChildren = creator.schema().components.nodes[COMPOSITION_ROOT_ID].children.length;

    store.loadPreset(buttonPreset());
    store.loadPreset(iconPreset());

    expect(creator.schema().components.nodes[COMPOSITION_ROOT_ID].children.length).toBe(
      treeChildren,
    );
  });
});
