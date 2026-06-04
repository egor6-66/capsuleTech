/**
 * `@capsuletech/web-dnd/controllers` — HCA-прослойка для web-dnd (ADR 032, фаза 4).
 *
 * Экспортирует meta-aware версии `createDroppable` и `createDraggable`, которые
 * сами эмитят HCA-события через `useEmit` из `@capsuletech/web-core`.
 *
 * Generic-ядро (`@capsuletech/web-dnd`) остаётся framework-agnostic.
 * Эта прослойка — opt-in: используется только внутри HCA-приложений.
 *
 * Граф зависимостей (ацикличный):
 *   web-dnd/controllers → web-core (useEmit)
 *   web-dnd/controllers → web-dnd (createDroppable, createDraggable)
 *   web-core ничего не знает про web-dnd
 *
 * @example
 * ```ts
 * import { createEmittingDroppable, createEmittingDraggable } from '@capsuletech/web-dnd/controllers';
 *
 * // В Widget/Controller-scope:
 * const drop = createEmittingDroppable({
 *   id: 'canvas-zone',
 *   accepts: (data) => data.kind === 'component',
 *   emits: { onDrop: 'onDrop', onDragOver: 'onDragOver' },
 * });
 *
 * const drag = createEmittingDraggable({
 *   id: 'node-42',
 *   data: () => ({ kind: 'component', nodeId: '42' }),
 *   emits: { onDragStart: 'onDragStart', onDragEnd: 'onDragEnd' },
 * });
 * ```
 */

export { createEmittingDroppable } from './emitting-droppable';
export { createEmittingDraggable } from './emitting-draggable';

export type { IEmittingDroppableOptions } from './emitting-droppable';
export type { IEmittingDraggableOptions } from './emitting-draggable';

export type {
  IDragPayload,
  IDropPayload,
  IDroppableEmitMap,
  IDraggableEmitMap,
} from './types';
