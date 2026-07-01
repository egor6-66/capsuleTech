/**
 * Доменный DnD-хелпер дерева (топология). Generic-часть (zone-математика) живёт
 * в `@capsuletech/web-dnd` (`zoneFromRatio`); здесь только то, что знает про
 * структуру дерева студии.
 */

import type { IEditorNode } from '@capsuletech/web-renderer';

/**
 * `targetId` совпадает с `dragId` ИЛИ лежит внутри его поддерева — такой drop
 * запрещён (перемещение узла в самого себя / своего потомка = цикл). Идём вверх
 * по `parentId` от target'а: встретили drag — значит target под ним.
 */
export const isSelfOrDescendant = (
  nodes: Record<string, IEditorNode>,
  dragId: string,
  targetId: string,
): boolean => {
  for (let a: string | null = targetId; a; a = nodes[a]?.parentId ?? null) {
    if (a === dragId) return true;
  }
  return false;
};
