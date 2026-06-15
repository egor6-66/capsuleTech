import { describe, expect, it } from 'vitest';
import { FORM_PRESET, generate, LAYOUT_2COL_PRESET } from '@capsuletech/data-gen';
import type { DragSpec, DropIntent } from '../dnd';
import { applyDrop, canBeside, canInto, canvasIntent, dragSpec, treeIntent } from '../dnd';
import { addNode, createEmptyTree } from '../operations';
import type { IWebStudioTree } from '../types';

// ── helpers ────────────────────────────────────────────────────────────────

const flexTree = (): IWebStudioTree => createEmptyTree('ui.Layout.Flex');
const gridTree = (): IWebStudioTree => createEmptyTree('ui.Layout.Grid');

/** Строит: root(Flex) → child → (optional) grandchild. */
const twoLevelTree = () => {
  const base = flexTree();
  const { tree: t1, nodeId: child } = addNode(base, {
    type: 'ui.Card.Content',
    parentId: 'root',
  });
  const { tree: t2, nodeId: grandchild } = addNode(t1, {
    type: 'ui.Button',
    parentId: child,
  });
  return { tree: t2, child, grandchild };
};

// ── dragSpec ───────────────────────────────────────────────────────────────

describe('dragSpec', () => {
  it('null data → null', () => {
    expect(dragSpec(null)).toBeNull();
  });

  it('palette + type → add', () => {
    expect(dragSpec({ source: 'palette', type: 'ui.Button' })).toEqual({
      kind: 'add',
      type: 'ui.Button',
    });
  });

  it('palette + template object → addTree', () => {
    const fragment = generate(FORM_PRESET, { seed: 1 });
    const result = dragSpec({ source: 'palette', template: fragment });
    expect(result?.kind).toBe('addTree');
    if (result?.kind === 'addTree') {
      expect(result.fragment).toBe(fragment);
    }
  });

  it('palette без type/template → null', () => {
    expect(dragSpec({ source: 'palette' })).toBeNull();
  });

  it('tree + nodeId → move', () => {
    expect(dragSpec({ source: 'tree', nodeId: 'abc' })).toEqual({
      kind: 'move',
      nodeId: 'abc',
    });
  });

  it('canvas + nodeId → move', () => {
    expect(dragSpec({ source: 'canvas', nodeId: 'xyz' })).toEqual({
      kind: 'move',
      nodeId: 'xyz',
    });
  });

  it('неизвестный source → null', () => {
    expect(dragSpec({ source: 'unknown', nodeId: 'abc' })).toBeNull();
  });
});

// ── canInto ────────────────────────────────────────────────────────────────

describe('canInto', () => {
  it('add: Button → Flex root → true', () => {
    const tree = flexTree();
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    expect(canInto(tree, spec, 'root')).toBe(true);
  });

  it('add: composite Card.Header → Flex root → false', () => {
    const tree = flexTree();
    const spec: DragSpec = { kind: 'add', type: 'ui.Card.Header' };
    expect(canInto(tree, spec, 'root')).toBe(false);
  });

  it('addTree: fragment root = Grid → Flex root → true', () => {
    const tree = flexTree();
    const fragment = generate(LAYOUT_2COL_PRESET, { seed: 1 });
    const spec: DragSpec = { kind: 'addTree', fragment };
    expect(canInto(tree, spec, 'root')).toBe(true);
  });

  it('move: валидная нода → другой контейнер → true', () => {
    const { tree, grandchild } = twoLevelTree();
    const spec: DragSpec = { kind: 'move', nodeId: grandchild };
    // grandchild = Button, перемещаем в root (Flex принимает Button)
    expect(canInto(tree, spec, 'root')).toBe(true);
  });

  it('move: нельзя переместить ноду в своё поддерево', () => {
    const { tree, child, grandchild } = twoLevelTree();
    const spec: DragSpec = { kind: 'move', nodeId: child };
    // child → grandchild: grandchild внутри child → false
    expect(canInto(tree, spec, grandchild)).toBe(false);
  });
});

// ── canBeside ──────────────────────────────────────────────────────────────

describe('canBeside', () => {
  it('sibling в том же Flex → Button → true', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: child1 } = addNode(tree, {
      type: 'ui.Button',
      parentId: 'root',
    });
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    expect(canBeside(t1, spec, child1)).toBe(true);
  });

  it('нода без parentId (root) → false', () => {
    const tree = flexTree();
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    expect(canBeside(tree, spec, 'root')).toBe(false);
  });
});

// ── applyDrop ─────────────────────────────────────────────────────────────

describe('applyDrop', () => {
  describe('kind=add', () => {
    it('добавляет ноду в конец при beforeId=null', () => {
      const tree = flexTree();
      const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
      const intent: DropIntent = { parentId: 'root', beforeId: null };
      const result = applyDrop(tree, spec, intent);
      expect(result.nodes.root!.children.length).toBe(1);
      const addedId = result.nodes.root!.children[0]!;
      expect(result.nodes[addedId]!.type).toBe('ui.Button');
    });

    it('добавляет ноду перед beforeId', () => {
      const tree = flexTree();
      const { tree: t1, nodeId: existing } = addNode(tree, {
        type: 'ui.Button',
        parentId: 'root',
      });
      const spec: DragSpec = { kind: 'add', type: 'ui.Typography' };
      const intent: DropIntent = { parentId: 'root', beforeId: existing };
      const result = applyDrop(t1, spec, intent);
      const children = result.nodes.root!.children;
      expect(children.length).toBe(2);
      // Новый Typography — на index 0 (перед existing)
      expect(result.nodes[children[0]!]!.type).toBe('ui.Typography');
      expect(children[1]).toBe(existing);
    });

    it('возвращает исходное дерево при ошибке (невалидный тип)', () => {
      const tree = createEmptyTree('ui.Card');
      // Card принимает только Card.* — Button должен вызвать ошибку в addNode
      const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
      const intent: DropIntent = { parentId: 'root', beforeId: null };
      const result = applyDrop(tree, spec, intent);
      // Вернулось исходное дерево (без изменений)
      expect(result).toBe(tree);
    });
  });

  describe('kind=addTree', () => {
    it('вставляет фрагмент в конец', () => {
      const tree = flexTree();
      const fragment = generate(FORM_PRESET, { seed: 1 });
      const spec: DragSpec = { kind: 'addTree', fragment };
      const intent: DropIntent = { parentId: 'root', beforeId: null };
      const result = applyDrop(tree, spec, intent);
      expect(result.nodes.root!.children.length).toBe(1);
      const inserted = result.nodes[result.nodes.root!.children[0]!]!;
      // FORM_PRESET root = ui.Card
      expect(inserted.type).toBe('ui.Card');
    });

    it('вставляет фрагмент перед beforeId', () => {
      const tree = flexTree();
      const { tree: t1, nodeId: existing } = addNode(tree, {
        type: 'ui.Button',
        parentId: 'root',
      });
      const fragment = generate(FORM_PRESET, { seed: 2 });
      const spec: DragSpec = { kind: 'addTree', fragment };
      const intent: DropIntent = { parentId: 'root', beforeId: existing };
      const result = applyDrop(t1, spec, intent);
      const children = result.nodes.root!.children;
      expect(children.length).toBe(2);
      // Новый фрагмент на index 0
      expect(result.nodes[children[0]!]!.type).toBe('ui.Card');
      expect(children[1]).toBe(existing);
    });
  });

  describe('kind=move', () => {
    it('перемещает ноду в другой контейнер', () => {
      // root(Flex) → child1(Card.Content) → grandchild(Button)
      //                child2(Card.Content)
      const tree = flexTree();
      const { tree: t1, nodeId: child1 } = addNode(tree, {
        type: 'ui.Card.Content',
        parentId: 'root',
      });
      const { tree: t2, nodeId: child2 } = addNode(t1, {
        type: 'ui.Card.Content',
        parentId: 'root',
      });
      const { tree: t3, nodeId: btn } = addNode(t2, {
        type: 'ui.Button',
        parentId: child1,
      });

      const spec: DragSpec = { kind: 'move', nodeId: btn };
      const intent: DropIntent = { parentId: child2, beforeId: null };
      const result = applyDrop(t3, spec, intent);

      // btn исчез из child1
      expect(result.nodes[child1]!.children).not.toContain(btn);
      // btn появился в child2
      expect(result.nodes[child2]!.children).toContain(btn);
    });

    it('возвращает исходное дерево если move невалиден (в своё поддерево)', () => {
      const { tree, child, grandchild } = twoLevelTree();
      // Пробуем переместить child внутрь grandchild (своё поддерево)
      const spec: DragSpec = { kind: 'move', nodeId: child };
      const intent: DropIntent = { parentId: grandchild, beforeId: null };
      const result = applyDrop(tree, spec, intent);
      expect(result).toBe(tree);
    });

    it('reorder в том же контейнере', () => {
      const tree = flexTree();
      const { tree: t1, nodeId: a } = addNode(tree, {
        type: 'ui.Button',
        parentId: 'root',
      });
      const { tree: t2, nodeId: b } = addNode(t1, {
        type: 'ui.Button',
        parentId: 'root',
      });

      // Перемещаем b перед a
      const spec: DragSpec = { kind: 'move', nodeId: b };
      const intent: DropIntent = { parentId: 'root', beforeId: a };
      const result = applyDrop(t2, spec, intent);

      const children = result.nodes.root!.children;
      expect(children[0]).toBe(b);
      expect(children[1]).toBe(a);
    });
  });
});

// ── treeIntent ─────────────────────────────────────────────────────────────

describe('treeIntent', () => {
  it('zone=inside, target принимает spec → { parentId: target, beforeId: null }', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: content } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    const result = treeIntent(t1, spec, content, 'inside');
    expect(result).toEqual({ parentId: content, beforeId: null });
  });

  it('zone=inside, target НЕ принимает spec → null', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: btn } = addNode(tree, {
      type: 'ui.Button',
      parentId: 'root',
    });
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    // Button isLeaf → не принимает детей
    const result = treeIntent(t1, spec, btn, 'inside');
    expect(result).toBeNull();
  });

  it('zone=before → { parentId: parent, beforeId: targetId }', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: child } = addNode(tree, {
      type: 'ui.Button',
      parentId: 'root',
    });
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    const result = treeIntent(t1, spec, child, 'before');
    expect(result).toEqual({ parentId: 'root', beforeId: child });
  });

  it('zone=after → beforeId = следующий sibling (или null если последний)', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: a } = addNode(tree, {
      type: 'ui.Button',
      parentId: 'root',
    });
    const { tree: t2, nodeId: b } = addNode(t1, {
      type: 'ui.Button',
      parentId: 'root',
    });
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };

    // after a → beforeId = b
    const after_a = treeIntent(t2, spec, a, 'after');
    expect(after_a).toEqual({ parentId: 'root', beforeId: b });

    // after b (последний) → beforeId = null
    const after_b = treeIntent(t2, spec, b, 'after');
    expect(after_b).toEqual({ parentId: 'root', beforeId: null });
  });

  it('несуществующий targetId → null', () => {
    const tree = flexTree();
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    expect(treeIntent(tree, spec, 'nonexistent', 'inside')).toBeNull();
  });

  it('parent не принимает spec → null для before/after', () => {
    // Card root → Card.Header (composite)
    // Card принимает Card.Header, но не Button
    const tree = createEmptyTree('ui.Card');
    const { tree: t1, nodeId: header } = addNode(tree, {
      type: 'ui.Card.Header',
      parentId: 'root',
    });
    // Пробуем поставить Button beside header → parent=Card не принимает Button
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    expect(treeIntent(t1, spec, header, 'before')).toBeNull();
  });
});

// ── canvasIntent (DOM, jsdom) ──────────────────────────────────────────────
// jsdom не реализует layout-методы (elementFromPoint, getBoundingClientRect).
// Мокаем document.elementFromPoint чтобы проверить логику fallback и hit-testing.

describe('canvasIntent (jsdom)', () => {
  const origElementFromPoint = document.elementFromPoint?.bind(document);

  it('fallback на root когда elementFromPoint возвращает null', () => {
    // Мокаем: всегда null (нет DOM-элемента под курсором)
    document.elementFromPoint = () => null;
    const tree = flexTree();
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    // root (Flex) принимает Button → fallback → parentId = root
    const result = canvasIntent(tree, spec, 0, 0);
    expect(result).not.toBeNull();
    expect(result?.parentId).toBe('root');
    expect(result?.beforeId).toBeNull();
    document.elementFromPoint = origElementFromPoint ?? (() => null);
  });

  it('fallback на root: spec невалиден для root → null', () => {
    document.elementFromPoint = () => null;
    // Дерево с Card root (принимает только Card.*)
    const tree = createEmptyTree('ui.Card');
    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    // elementFromPoint=null, fallback → Card не принимает Button → null
    const result = canvasIntent(tree, spec, 0, 0);
    expect(result).toBeNull();
    document.elementFromPoint = origElementFromPoint ?? (() => null);
  });

  it('находит ноду по data-node-id через DOM', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: child } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });

    // Создаём DOM-элемент и мокаем elementFromPoint чтобы вернуть его
    const el = document.createElement('div');
    el.dataset.nodeId = child;
    el.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      width: 100,
      height: 100,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(el);
    document.elementFromPoint = () => el;

    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    const result = canvasIntent(t1, spec, 50, 50);
    // Card.Content принимает Button → parentId = child
    expect(result?.parentId).toBe(child);

    document.body.removeChild(el);
    document.elementFromPoint = origElementFromPoint ?? (() => null);
  });

  it('поднимается по DOM-цепочке когда первый элемент не node-id', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: content } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });

    // Родитель с data-node-id, дочерний без
    const parent = document.createElement('div');
    parent.dataset.nodeId = content;
    parent.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      width: 100,
      height: 100,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const inner = document.createElement('span');
    parent.appendChild(inner);
    document.body.appendChild(parent);
    document.elementFromPoint = () => inner;

    const spec: DragSpec = { kind: 'add', type: 'ui.Button' };
    const result = canvasIntent(t1, spec, 50, 50);
    // inner не имеет nodeId → поднимаемся к parent → content принимает Button
    expect(result?.parentId).toBe(content);

    document.body.removeChild(parent);
    document.elementFromPoint = origElementFromPoint ?? (() => null);
  });
});
