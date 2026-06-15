/**
 * Editor rules — общие правила drop/move для Canvas и Tree.
 *
 * Поверх манифестов (`canAcceptChild`) добавляем редакторскую строгость:
 * составную часть (`composite`) пускаем только в контейнер, который её ЯВНО
 * принимает (root-`Grid` без манифеста её отвергнет).
 *
 * Перенесено из `apps/ui-creator/src/editor/rules.ts` (ADR 032, фаза 5, часть 1).
 */
import type { IWebStudioNode, IWebStudioTree, NodeId } from '../state/types';
import { canAcceptChild, getManifest } from './registry';

/** Может ли нода держать детей (не leaf и не текстовый узел). */
export const acceptsChildren = (n: IWebStudioNode): boolean =>
  getManifest(n.type)?.isLeaf !== true && typeof n.props.children !== 'string';

/** Можно ли положить `childType` в `parentType` (с учётом composite-строгости). */
export const canDropInto = (parentType: string, childType: string): boolean => {
  if (getManifest(childType)?.category === 'composite') {
    return getManifest(parentType)?.accepts?.(childType) === true;
  }
  return canAcceptChild(parentType, childType);
};

/** `nodeId` лежит внутри поддерева `ancestorId` (включая равенство)? */
export const isInside = (tree: IWebStudioTree, ancestorId: NodeId, nodeId: NodeId): boolean => {
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
export const canMoveInto = (tree: IWebStudioTree, dragId: NodeId, targetId: NodeId): boolean => {
  const drag = tree.nodes[dragId];
  const target = tree.nodes[targetId];
  if (!drag || !target || dragId === tree.root || dragId === targetId) return false;
  if (isInside(tree, dragId, targetId)) return false;
  return canDropInto(target.type, drag.type);
};
