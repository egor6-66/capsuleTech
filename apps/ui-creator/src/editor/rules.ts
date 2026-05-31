/**
 * Editor rules — общие правила drop/move для Canvas и Tree (чтобы не дублировать).
 *
 * Поверх манифестов (`canAcceptChild`) добавляем редакторскую строгость:
 * составную часть (`composite`) пускаем только в контейнер, который её ЯВНО
 * принимает (root-`Grid` без манифеста её отвергнет).
 */
import { canAcceptChild, getManifest } from '@capsuletech/web-ui-creator/manifests';
import type { IEditorNode, IEditorTree, NodeId } from '@capsuletech/web-ui-creator/state';

/** Может ли нода держать детей (не leaf и не текстовый узел). */
export const acceptsChildren = (n: IEditorNode): boolean =>
  getManifest(n.type)?.isLeaf !== true && typeof n.props.children !== 'string';

/** Можно ли положить `childType` в `parentType` (с учётом composite-строгости). */
export const canDropInto = (parentType: string, childType: string): boolean => {
  if (getManifest(childType)?.category === 'composite') {
    return getManifest(parentType)?.accepts?.(childType) === true;
  }
  return canAcceptChild(parentType, childType);
};

/** `nodeId` лежит внутри поддерева `ancestorId` (включая равенство)? */
export const isInside = (tree: IEditorTree, ancestorId: NodeId, nodeId: NodeId): boolean => {
  let cur: NodeId | null = nodeId;
  while (cur) {
    if (cur === ancestorId) return true;
    cur = tree.nodes[cur]?.parentId ?? null;
  }
  return false;
};

/**
 * Валиден ли move ноды `dragId` ВНУТРЬ `targetId`: не root, не сам в себя, не в
 * собственное поддерево, и target принимает тип по `canDropInto`.
 */
export const canMoveInto = (tree: IEditorTree, dragId: NodeId, targetId: NodeId): boolean => {
  const drag = tree.nodes[dragId];
  const target = tree.nodes[targetId];
  if (!drag || !target || dragId === tree.root || dragId === targetId) return false;
  if (isInside(tree, dragId, targetId)) return false;
  return canDropInto(target.type, drag.type);
};
