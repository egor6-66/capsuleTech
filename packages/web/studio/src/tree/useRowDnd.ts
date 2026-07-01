/**
 * useRowDnd — привязка DnD к строке дерева (creator).
 *
 * Строка = одновременно **draggable** (тащим этот узел) и **droppable** (кладём
 * на него). Зона (before/after/inside) считается из вертикальной доли курсора
 * внутри строки. Корень не draggable (неподвижен), но остаётся droppable.
 *
 * Живой индикатор (`zone()`): пока курсор над строкой (`overId`), считаем зону
 * по live-`pointer` из `useDnD` + rect строки. Валидность (не в себя/потомка,
 * accept контейнера) уже отражена — невалидный inside падает в before/after.
 *
 * DnD-инфра (`DnDProvider`) монтируется в `WebStudio.Provider` выше дерева.
 */

import { createDraggable, createDroppable, useDnD } from '@capsuletech/web-dnd';
import type { IEditorNode } from '@capsuletech/web-renderer';
import type { Accessor } from 'solid-js';
import type { DropZone } from '../document';
import { acceptsChildren, canAcceptChild } from '../manifests';
import { isSelfOrDescendant, zoneFromRatio } from './dndHelpers';

interface ITreeDragData {
  src: 'tree';
  nodeId: string;
  nodeType: string;
  [key: string]: unknown;
}

export interface IUseRowDndOptions {
  nodeId: string;
  /** Реактивный тип узла (для accept-проверки inside-зоны). */
  nodeType: Accessor<string | undefined>;
  /** Корень не таскаем. */
  isRoot: boolean;
  /** Реактивный доступ к nodes-мапе (для проверки «в себя/потомка»). */
  nodes: Accessor<Record<string, IEditorNode>>;
  onMove: (dragId: string, targetId: string, zone: DropZone) => void;
}

export interface IRowDnd {
  setRef: (el: HTMLElement) => void;
  isDragging: Accessor<boolean>;
  /** Активная зона под курсором (для индикатора) или null. */
  zone: Accessor<DropZone | null>;
}

export const useRowDnd = (opts: IUseRowDndOptions): IRowDnd => {
  // DnDProvider монтируется в WebStudio.Provider. Вне его (standalone-рендер
  // дерева, unit-тесты) useDnD бросает — деградируем в no-op, дерево рендерится.
  let dnd: ReturnType<typeof useDnD> | null;
  try {
    dnd = useDnD();
  } catch {
    dnd = null;
  }
  if (!dnd) {
    return { setRef: () => {}, isDragging: () => false, zone: () => null };
  }
  const ctx = dnd;
  let el: HTMLElement | undefined;

  const canInsideFor = (dragType: string): boolean =>
    acceptsChildren(opts.nodeType()) && canAcceptChild(opts.nodeType() ?? '', dragType);

  const drag = createDraggable<ITreeDragData>({
    id: `tree-drag:${opts.nodeId}`,
    data: () => ({ src: 'tree', nodeId: opts.nodeId, nodeType: opts.nodeType() ?? '' }),
    disabled: () => opts.isRoot,
  });

  const drop = createDroppable<ITreeDragData>({
    id: `tree-drop:${opts.nodeId}`,
    accepts: (data) =>
      data.src === 'tree' && !isSelfOrDescendant(opts.nodes(), data.nodeId, opts.nodeId),
    onDrop: (data, info) => {
      const zone = zoneFromRatio(info.ratio.y, canInsideFor(data.nodeType));
      opts.onMove(data.nodeId, opts.nodeId, zone);
    },
  });

  const setRef = (node: HTMLElement) => {
    el = node;
    drag.ref(node);
    drop.ref(node);
  };

  const zone = (): DropZone | null => {
    if (ctx.state.overId() !== `tree-drop:${opts.nodeId}`) return null;
    const data = ctx.state.activeData() as ITreeDragData | null;
    if (!data || data.src !== 'tree') return null;
    if (isSelfOrDescendant(opts.nodes(), data.nodeId, opts.nodeId)) return null;
    const p = ctx.state.pointer();
    if (!p || !el) return null;
    const r = el.getBoundingClientRect();
    if (!r.height) return null;
    return zoneFromRatio((p.y - r.top) / r.height, canInsideFor(data.nodeType));
  };

  return { setRef, isDragging: drag.isDragging, zone };
};
