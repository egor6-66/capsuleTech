/**
 * Editor DnD — общий слой перетаскивания для Canvas и Tree.
 *
 * Любая поверхность приводит drag к нормализованному `DropIntent`
 * (`{ parentId, beforeId }`), а применение (add из палитры / move существующей
 * ноды) делает `applyDrop` поверх pure-операций `@capsuletech/web-ui-creator/state`.
 *
 * Surface-specific остаётся ТОЛЬКО hit-testing: канвас считает цель геометрией
 * (`canvasIntent`), дерево — зонами строки (`treeIntent`). Валидность —
 * единые `canInto` / `canBeside`. Так add/move/reorder/palette→tree живут в
 * одном месте, а виджеты только определяют «куда показывает курсор».
 */
import {
  addNode,
  type IEditorTree,
  insertSubtree,
  moveNode,
  type NodeId,
} from '@capsuletech/web-ui-creator/state';
import { canDropInto, canMoveInto } from './rules';

/**
 * Что тащим:
 *  - `add` — новый одиночный компонент из палитры (по типу);
 *  - `addTree` — готовый темплейт-фрагмент (материализованный preset);
 *  - `move` — существующая нода дерева/канваса.
 */
export type DragSpec =
  | { kind: 'add'; type: string }
  | { kind: 'addTree'; fragment: IEditorTree }
  | { kind: 'move'; nodeId: NodeId };

/** Куда вставить: в `parentId` ПЕРЕД `beforeId` (или в конец, если null). */
export interface DropIntent {
  parentId: NodeId;
  beforeId: NodeId | null;
}

/** Зона drop'а на строке дерева. */
export type TreeZone = 'before' | 'after' | 'inside';

type RawData = {
  source?: unknown;
  type?: unknown;
  nodeId?: unknown;
  template?: unknown;
} | null;

/** Распознать DragSpec из payload web-dnd. palette → add/addTree, tree/canvas → move. */
export const dragSpec = (data: RawData): DragSpec | null => {
  if (!data) return null;
  if (data.source === 'palette') {
    if (data.template && typeof data.template === 'object') {
      return { kind: 'addTree', fragment: data.template as IEditorTree };
    }
    if (typeof data.type === 'string') return { kind: 'add', type: data.type };
    return null;
  }
  if ((data.source === 'tree' || data.source === 'canvas') && typeof data.nodeId === 'string') {
    return { kind: 'move', nodeId: data.nodeId };
  }
  return null;
};

/** Тип root-ноды для add/addTree (для проверки accepts). */
const intoType = (spec: DragSpec): string =>
  spec.kind === 'add'
    ? spec.type
    : spec.kind === 'addTree'
      ? (spec.fragment.nodes[spec.fragment.root]?.type ?? '')
      : '';

/** Можно ли поместить spec ВНУТРЬ `parentId`. */
export const canInto = (tree: IEditorTree, spec: DragSpec, parentId: NodeId): boolean =>
  spec.kind === 'move'
    ? canMoveInto(tree, spec.nodeId, parentId)
    : canDropInto(tree.nodes[parentId]?.type ?? '', intoType(spec));

/** Можно ли поместить spec СОСЕДОМ узла `siblingId` (в его родителя). */
export const canBeside = (tree: IEditorTree, spec: DragSpec, siblingId: NodeId): boolean => {
  const parentId = tree.nodes[siblingId]?.parentId;
  return parentId != null && canInto(tree, spec, parentId);
};

/** Применить drop — вернуть новое дерево (или прежнее при ошибке операции). */
export const applyDrop = (tree: IEditorTree, spec: DragSpec, intent: DropIntent): IEditorTree => {
  try {
    if (spec.kind === 'add') {
      const kids = tree.nodes[intent.parentId].children;
      const index = intent.beforeId ? kids.indexOf(intent.beforeId) : kids.length;
      return addNode(tree, { type: spec.type, parentId: intent.parentId, index }).tree;
    }
    if (spec.kind === 'addTree') {
      const kids = tree.nodes[intent.parentId].children;
      const index = intent.beforeId ? kids.indexOf(intent.beforeId) : kids.length;
      return insertSubtree(tree, spec.fragment, { parentId: intent.parentId, index });
    }
    // move: индекс считаем в детях БЕЗ перемещаемой ноды (как ждёт moveNode).
    const kids = tree.nodes[intent.parentId].children.filter((c) => c !== spec.nodeId);
    const index = intent.beforeId ? kids.indexOf(intent.beforeId) : kids.length;
    return moveNode(tree, { nodeId: spec.nodeId, newParentId: intent.parentId, index });
  } catch {
    return tree;
  }
};

/** Первый ребёнок, чья середина ниже `y` (вставить перед ним), иначе null (в конец). */
const beforeChildAt = (
  tree: IEditorTree,
  scope: ParentNode,
  containerId: NodeId,
  y: number,
  spec: DragSpec,
): NodeId | null => {
  for (const cid of tree.nodes[containerId].children) {
    if (spec.kind === 'move' && cid === spec.nodeId) continue;
    const cel = scope.querySelector(`[data-node-id="${cid}"]`);
    if (!cel) continue;
    const r = cel.getBoundingClientRect();
    if (y < r.top + r.height / 2) return cid;
  }
  return null;
};

/**
 * Геометрический резолвер канваса: innermost валидный контейнер под (x,y) +
 * позиция. Если под курсором нет ноды (пустой root или поля канваса) — fallback
 * на root (позиционный), чтобы первый drop работал без раздувания root по высоте.
 */
export const canvasIntent = (
  tree: IEditorTree,
  spec: DragSpec,
  x: number,
  y: number,
): DropIntent | null => {
  let el = document.elementFromPoint(x, y) as HTMLElement | null;
  while (el) {
    const id = el.dataset?.nodeId;
    if (id && tree.nodes[id] && canInto(tree, spec, id)) {
      return { parentId: id, beforeId: beforeChildAt(tree, el, id, y, spec) };
    }
    el = el.parentElement;
  }
  if (canInto(tree, spec, tree.root)) {
    return { parentId: tree.root, beforeId: beforeChildAt(tree, document, tree.root, y, spec) };
  }
  return null;
};

/** Резолвер дерева: зона строки `targetId` → DropIntent. */
export const treeIntent = (
  tree: IEditorTree,
  spec: DragSpec,
  targetId: NodeId,
  zone: TreeZone,
): DropIntent | null => {
  const node = tree.nodes[targetId];
  if (!node) return null;
  if (zone === 'inside') {
    return canInto(tree, spec, targetId) ? { parentId: targetId, beforeId: null } : null;
  }
  const parentId = node.parentId;
  if (parentId == null || !canInto(tree, spec, parentId)) return null;
  if (zone === 'before') return { parentId, beforeId: targetId };
  const sibs = tree.nodes[parentId].children;
  return { parentId, beforeId: sibs[sibs.indexOf(targetId) + 1] ?? null };
};
