/**
 * Чистые хелперы DnD дерева (без Solid/DOM) — тестируются изолированно.
 */

import type { IEditorNode } from '@capsuletech/web-renderer';
import type { DropZone } from '../document';

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

/**
 * Зона по вертикальной доле курсора внутри строки (`ratioY` 0..1):
 *  - НЕ-контейнер (или контейнер, не принимающий тип drag'а): верх → `before`,
 *    низ → `after` (порог 0.5) — вставка соседом;
 *  - контейнер, принимающий drag: верхние 30% → `before`, нижние 30% → `after`,
 *    середина → `inside` (вложить ребёнком).
 */
export const zoneFromRatio = (ratioY: number, canInside: boolean): DropZone => {
  if (!canInside) return ratioY < 0.5 ? 'before' : 'after';
  if (ratioY < 0.3) return 'before';
  if (ratioY > 0.7) return 'after';
  return 'inside';
};
