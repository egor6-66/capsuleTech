/**
 * useRowDnd — доменный адаптер строки дерева над generic `createReorderable`
 * (`@capsuletech/web-dnd`). Тонкий: даёт web-dnd-примитиву domain-предикаты —
 * `accepts` (не в себя/потомка), `canInside` (цель принимает тип по манифесту),
 * `data` (nodeId/nodeType) — а зона/индикатор/связка draggable+droppable живут
 * в web-dnd. Сам DnD-визуал (`<DropIndicator>`) рисует TreeRow.
 *
 * Generic-часть (`zoneFromRatio`, draggable+droppable+zone) была перенесена в
 * web-dnd (`createReorderable`) — студия больше не размазывает DnD-механику.
 */

import { createReorderable, type DropZone, type IReorderable } from '@capsuletech/web-dnd';
import type { IEditorNode } from '@capsuletech/web-renderer';
import type { Accessor } from 'solid-js';
import { acceptsChildren, canAcceptChild } from '../manifests';
import { isSelfOrDescendant } from './dndHelpers';

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

export const useRowDnd = (opts: IUseRowDndOptions): IReorderable =>
  createReorderable<ITreeDragData>({
    id: `tree:${opts.nodeId}`,
    data: () => ({ src: 'tree', nodeId: opts.nodeId, nodeType: opts.nodeType() ?? '' }),
    disabled: () => opts.isRoot,
    // Доменный guard: tree-drag и не в себя/потомка.
    accepts: (data) =>
      data.src === 'tree' && !isSelfOrDescendant(opts.nodes(), data.nodeId, opts.nodeId),
    // Цель принимает как ребёнка → включает зону inside.
    canInside: (data) =>
      acceptsChildren(opts.nodeType()) && canAcceptChild(opts.nodeType() ?? '', data.nodeType),
    onDrop: (data, zone) => opts.onMove(data.nodeId, opts.nodeId, zone),
  });
