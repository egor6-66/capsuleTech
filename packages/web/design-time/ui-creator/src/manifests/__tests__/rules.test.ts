import { describe, expect, it } from 'vitest';
import { addNode, createEmptyTree } from '../../state/operations';
import { acceptsChildren, canDropInto, canMoveInto, isInside } from '../rules';

// ── Вспомогательные деревья ────────────────────────────────────────────────

/** Flex-root (принимает любых не-composite детей). */
const flexTree = () => createEmptyTree('ui.Layout.Flex');

/** Card-root (принимает только Card.*). */
const cardTree = () => createEmptyTree('ui.Card');

// ── acceptsChildren ────────────────────────────────────────────────────────

describe('acceptsChildren', () => {
  it('Button (isLeaf) → false', () => {
    const node = {
      id: 'n1',
      type: 'ui.Button',
      parentId: null,
      children: [],
      props: {},
      meta: {},
      styles: {},
    };
    expect(acceptsChildren(node)).toBe(false);
  });

  it('Layout.Flex (контейнер) → true', () => {
    const node = {
      id: 'n1',
      type: 'ui.Layout.Flex',
      parentId: null,
      children: [],
      props: {},
      meta: {},
      styles: {},
    };
    expect(acceptsChildren(node)).toBe(true);
  });

  it('нода с string-children (текстовый узел) → false', () => {
    const node = {
      id: 'n1',
      type: 'ui.Layout.Flex',
      parentId: null,
      children: [],
      props: { children: 'Hello' },
      meta: {},
      styles: {},
    };
    expect(acceptsChildren(node)).toBe(false);
  });
});

// ── canDropInto ────────────────────────────────────────────────────────────

describe('canDropInto', () => {
  it('Layout.Flex принимает Button (control) → true', () => {
    expect(canDropInto('ui.Layout.Flex', 'ui.Button')).toBe(true);
  });

  it('Card принимает Card.Header (composite, явно задан) → true', () => {
    expect(canDropInto('ui.Card', 'ui.Card.Header')).toBe(true);
  });

  it('Layout.Flex НЕ принимает Card.Header (composite без явного accepts) → false', () => {
    // Flex не декларирует accepts → canAcceptChild возвращает true,
    // НО composite-строгость: composite пускаем ТОЛЬКО если parentType.accepts() === true.
    // Flex.accepts = undefined → вернёт false для composite.
    expect(canDropInto('ui.Layout.Flex', 'ui.Card.Header')).toBe(false);
  });

  it('Card НЕ принимает Button → false (Card.accepts = только Card.*)', () => {
    expect(canDropInto('ui.Card', 'ui.Button')).toBe(false);
  });

  it('Button (isLeaf) не принимает ничего → false', () => {
    expect(canDropInto('ui.Button', 'ui.Typography')).toBe(false);
  });

  it('неизвестный parentType → true (pass-through)', () => {
    expect(canDropInto('unknown.Component', 'ui.Button')).toBe(true);
  });
});

// ── isInside ───────────────────────────────────────────────────────────────

describe('isInside', () => {
  it('нода равна ancestorId → true', () => {
    const tree = flexTree();
    expect(isInside(tree, 'root', 'root')).toBe(true);
  });

  it('дочерняя нода глубоко внутри ancestorId → true', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: child1 } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    // Card.Content принимает не-card-part → добавляем Button
    const { tree: t2, nodeId: grandchild } = addNode(t1, {
      type: 'ui.Button',
      parentId: child1,
    });
    expect(isInside(t2, 'root', grandchild)).toBe(true);
    expect(isInside(t2, child1, grandchild)).toBe(true);
  });

  it('sibling не является потомком → false', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: child1 } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    const { tree: t2, nodeId: child2 } = addNode(t1, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    expect(isInside(t2, child1, child2)).toBe(false);
  });

  it('несуществующий nodeId → false (не цикл)', () => {
    const tree = flexTree();
    expect(isInside(tree, 'root', 'nonexistent')).toBe(false);
  });
});

// ── canMoveInto ────────────────────────────────────────────────────────────

describe('canMoveInto', () => {
  it('нельзя переместить root', () => {
    const tree = flexTree();
    // Добавляем дочернюю ноду как target
    const { tree: t1, nodeId: child } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    expect(canMoveInto(t1, 'root', child)).toBe(false);
  });

  it('нельзя переместить ноду в саму себя', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: child } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    expect(canMoveInto(t1, child, child)).toBe(false);
  });

  it('нельзя переместить ноду в своё поддерево', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: child } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    const { tree: t2, nodeId: grandchild } = addNode(t1, {
      type: 'ui.Button',
      parentId: child,
    });
    // child → grandchild: grandchild лежит ВНУТРИ child → запрещено
    expect(canMoveInto(t2, child, grandchild)).toBe(false);
  });

  it('несуществующая нода drag → false', () => {
    const tree = flexTree();
    expect(canMoveInto(tree, 'nonexistent', 'root')).toBe(false);
  });

  it('несуществующая нода target → false', () => {
    const tree = flexTree();
    const { tree: t1, nodeId: child } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    expect(canMoveInto(t1, child, 'nonexistent')).toBe(false);
  });

  it('валидный move: Card.Content → root (Flex) → true', () => {
    // Строим: root(Flex) → child1(Card.Content) → grandchild(Button)
    // Пробуем переместить grandchild в root (Flex принимает Button)
    const tree = flexTree();
    const { tree: t1, nodeId: child1 } = addNode(tree, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    const { tree: t2, nodeId: grandchild } = addNode(t1, {
      type: 'ui.Button',
      parentId: child1,
    });
    // Button → перемещаем в root (Flex принимает Button) → true
    expect(canMoveInto(t2, grandchild, 'root')).toBe(true);
  });

  it('нельзя переместить Card.Header в Layout.Flex (composite-строгость)', () => {
    // Card.Header — composite, Flex не декларирует accepts → false
    const tree = createEmptyTree('ui.Card');
    // Card принимает Card.Header
    const { tree: t1, nodeId: header } = addNode(tree, {
      type: 'ui.Card.Header',
      parentId: 'root',
    });
    // Добавляем Flex ребёнком Card (через Card.Content)
    const { tree: t2, nodeId: content } = addNode(t1, {
      type: 'ui.Card.Content',
      parentId: 'root',
    });
    // Пробуем переместить header в content (Card.Content принимает не-card-part)
    // Card.Header — composite → проверка через canDropInto
    expect(canMoveInto(t2, header, content)).toBe(false);
  });
});
