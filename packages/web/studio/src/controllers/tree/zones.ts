/**
 * zones.ts — pure-функции резолва DnD-зон для WebStudio.Tree.
 *
 * Принимают rect/spec/tree параметрами — без side-effects, без DOM-доступа.
 * DOM-замеры передаются снаружи как clientY / ratioY.
 */

import { canBeside, canInto, type DragSpec, type TreeZone } from '../../state/dnd';
import type { IWebStudioTree } from '../../state/types';

/** Толщина краевых полос «before»/«after» у контейнера (px). */
export const EDGE = 6;

export type NodeId = string;

/**
 * Зона контейнера по позиции курсора:
 *  - before/after — если курсор в краевой полосе EDGE px
 *  - inside — если компонент принимает потомка
 *  - null — нельзя ни рядом ни внутрь
 */
export const containerZone = (
  tree: IWebStudioTree,
  spec: DragSpec,
  nodeId: NodeId,
  clientY: number,
  headerTop: number,
  boxBottom: number,
): TreeZone | null => {
  const sib = canBeside(tree, spec, nodeId);
  if (sib && clientY < headerTop + EDGE) return 'before';
  if (sib && clientY > boxBottom - EDGE) return 'after';
  if (canInto(tree, spec, nodeId)) return 'inside';
  return sib ? 'after' : null;
};

/**
 * Зона листа: пополам before/after.
 * Возвращает null если сосед не допускается.
 */
export const leafZone = (
  tree: IWebStudioTree,
  spec: DragSpec,
  nodeId: NodeId,
  ratioY: number,
): TreeZone | null => {
  if (!canBeside(tree, spec, nodeId)) return null;
  return ratioY < 0.5 ? 'before' : 'after';
};

/**
 * Является ли нода кандидатом для drop «внутрь» (слабая подсветка пока тащим).
 */
export const insideCandidate = (tree: IWebStudioTree, spec: DragSpec, nodeId: NodeId): boolean =>
  canInto(tree, spec, nodeId);
