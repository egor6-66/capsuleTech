import { describe, expect, it } from 'vitest';
import { generate } from '../../generators/engine';
import { FORM_PRESET } from '../../generators/presets/form';
import { LAYOUT_2COL_PRESET } from '../../generators/presets/layout-2col';
import { createEmptyTree, EditorOpError, insertSubtree } from '../operations';

// Вспомогательная функция: дерево с одним Grid-root (принимает любых детей кроме Card-parts)
const makeGridTree = () => createEmptyTree('ui.Layout.Grid');

// Вспомогательная функция: дерево с одним Flex-root
const makeFlexTree = () => createEmptyTree('ui.Layout.Flex');

describe('insertSubtree', () => {
  it('вставляет фрагмент как ребёнка root (в конец, без index)', () => {
    const tree = makeGridTree();
    const fragment = generate(LAYOUT_2COL_PRESET, { seed: 1 });

    // Grid → Grid = Grid принимает любого ребёнка (нет accepts-правила)
    // Для теста используем ui.Layout.Flex-fragment (root фрагмента = Flex)
    const flexFrag = generate(LAYOUT_2COL_PRESET, { seed: 1 });
    // root фрагмента — ui.Layout.Grid; вставим в Flex-root дерево
    const flexTree = makeFlexTree();

    const result = insertSubtree(flexTree, flexFrag, { parentId: 'root' });

    // root остался тем же
    expect(result.root).toBe('root');

    // Ребёнок добавлен в root.children
    const rootNode = result.nodes.root;
    expect(rootNode?.children.length).toBe(1);

    const insertedRootId = rootNode?.children[0] as string;
    const insertedRoot = result.nodes[insertedRootId];

    // Тип root фрагмента
    expect(insertedRoot?.type).toBe('ui.Layout.Grid');

    // parentId вставленного root = 'root'
    expect(insertedRoot?.parentId).toBe('root');
  });

  it('вставляет фрагмент на заданный index', () => {
    // Строим дерево: Flex с двумя детьми
    const baseTree = makeFlexTree();
    const frag1 = generate(LAYOUT_2COL_PRESET, { seed: 1 });
    const frag2 = generate(LAYOUT_2COL_PRESET, { seed: 2 });

    const after1 = insertSubtree(baseTree, frag1, { parentId: 'root' });
    const after2 = insertSubtree(after1, frag2, { parentId: 'root' });

    // Теперь вставляем третий на index 1 (между первым и вторым)
    const frag3 = generate(LAYOUT_2COL_PRESET, { seed: 3 });
    const result = insertSubtree(after2, frag3, { parentId: 'root', index: 1 });

    const children = result.nodes.root?.children ?? [];
    expect(children.length).toBe(3);

    // На index 1 — новый фрагмент (Grid)
    const atIndex1 = result.nodes[children[1] as string];
    expect(atIndex1?.type).toBe('ui.Layout.Grid');
  });

  it('ремапит все id фрагмента — нет коллизий между двумя вставками', () => {
    const tree = makeFlexTree();
    const fragment = generate(FORM_PRESET, { seed: 42 });

    const after1 = insertSubtree(tree, fragment, { parentId: 'root' });
    // Вставляем тот же fragment повторно (тот же объект, те же seeded id)
    const after2 = insertSubtree(after1, fragment, { parentId: 'root' });

    const allIds = Object.keys(after2.nodes);
    const uniqueIds = new Set(allIds);

    // Все id уникальны — нет коллизий
    expect(uniqueIds.size).toBe(allIds.length);

    // В дереве должны быть оба вставленных root-фрагмента (оба ui.Card)
    const rootChildren = after2.nodes.root?.children ?? [];
    expect(rootChildren.length).toBe(2);

    const cardNodes = Object.values(after2.nodes).filter((n) => n.type === 'ui.Card');
    expect(cardNodes.length).toBe(2);
  });

  it('сохраняет структуру (parentId / children) после ремапа', () => {
    const tree = makeFlexTree();
    const fragment = generate(FORM_PRESET, { seed: 7 });

    const result = insertSubtree(tree, fragment, { parentId: 'root' });

    // Проверяем консистентность: для каждой ноды все её дети указывают parentId обратно на неё
    for (const node of Object.values(result.nodes)) {
      for (const childId of node.children) {
        const child = result.nodes[childId];
        expect(child).toBeDefined();
        expect(child?.parentId).toBe(node.id);
      }
    }
  });

  it('дерево остаётся достижимым из root после вставки (нет orphan-нод)', () => {
    const tree = makeFlexTree();
    const fragment = generate(FORM_PRESET, { seed: 5 });

    const result = insertSubtree(tree, fragment, { parentId: 'root' });

    const reachable = new Set<string>();
    const walk = (id: string) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      const node = result.nodes[id];
      if (node) for (const c of node.children) walk(c);
    };
    walk(result.root);
    expect(reachable.size).toBe(Object.keys(result.nodes).length);
  });

  it('бросает EditorOpError если parent не принимает root фрагмента', () => {
    // ui.Card принимает только Card.* детей
    const cardTree = createEmptyTree('ui.Card');
    // Фрагмент с root = ui.Layout.Grid — не принимается ui.Card
    const fragment = generate(LAYOUT_2COL_PRESET, { seed: 1 });

    expect(() => insertSubtree(cardTree, fragment, { parentId: 'root' })).toThrow(EditorOpError);
  });

  it('бросает EditorOpError если parentId не найден', () => {
    const tree = makeFlexTree();
    const fragment = generate(LAYOUT_2COL_PRESET, { seed: 1 });

    expect(() => insertSubtree(tree, fragment, { parentId: 'nonexistent-id' })).toThrow(
      EditorOpError,
    );
  });

  it('ремапленные id не совпадают с исходными id фрагмента', () => {
    const tree = makeFlexTree();
    const fragment = generate(FORM_PRESET, { seed: 1 });
    const originalIds = new Set(Object.keys(fragment.nodes));

    const result = insertSubtree(tree, fragment, { parentId: 'root' });

    // Все новые id нод фрагмента (всё кроме 'root') — не равны исходным
    for (const id of Object.keys(result.nodes)) {
      if (id === 'root') continue;
      // Ни один из новых id не должен совпадать с оригинальным seeded id
      expect(originalIds.has(id)).toBe(false);
    }
  });
});
