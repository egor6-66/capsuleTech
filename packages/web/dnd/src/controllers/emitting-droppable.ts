/**
 * `createEmittingDroppable` — meta-aware droppable, эмитящий HCA-события (ADR 032, фаза 4).
 *
 * Оборачивает generic `createDroppable` из generic-ядра и добавляет emit-проводку
 * через `useEmit` из `@capsuletech/web-core`. При каждом lifecycle-событии
 * формирует стандартный `IDragPayload` / `IDropPayload` и зовёт:
 *
 *   emit(emits.onDrop, { payload: { data, pointer, dropInfo } })
 *
 * Generic-ядро (`src/index.ts`) web-core не импортирует — зависимость изолирована
 * в `/controllers` subpath. Ацикличный граф: controllers → web-core, web-core ничего
 * не знает про web-dnd.
 *
 * Использование (внутри Controller/Feature scope):
 * ```ts
 * import { createEmittingDroppable } from '@capsuletech/web-dnd/controllers';
 *
 * const drop = createEmittingDroppable({
 *   id: 'canvas-zone',
 *   accepts: (data) => data.kind === 'component',
 *   emits: { onDrop: 'onDrop', onDragOver: 'onDragOver' },
 * });
 * // <div ref={drop.ref} />
 * ```
 */

import { useEmit } from '@capsuletech/web-core';
import { createDroppable } from '../droppable';
import { useDnD } from '../context';
import type { DragData, IDropInfo, IDroppable, IDroppableOptions } from '../types';
import type { IDraggableEmitMap as _unused, IDropPayload, IDragPayload, IDroppableEmitMap } from './types';
import { createEffect } from 'solid-js';

export interface IEmittingDroppableOptions<T extends DragData = DragData>
  extends IDroppableOptions<T> {
  /**
   * Маппинг lifecycle → HCA handler-имена.
   * Если ключ не задан — соответствующий emit не происходит.
   */
  emits: IDroppableEmitMap;
}

/**
 * Создаёт meta-aware droppable.
 *
 * Возвращает тот же `IDroppable` интерфейс, что `createDroppable` — совместим.
 *
 * @throws если вызван вне Controller/Feature-scope (`useEmit` требует ControllerContext).
 *
 * Особенности:
 * - `onDrop` emit срабатывает ВМЕСТО / ВМЕСТЕ с `options.onDrop`. Если app-код
 *   хочет только HCA-путь — не передавай `options.onDrop`. Если хочет оба —
 *   передавай оба; emit происходит первым.
 * - `onDragOver` emit срабатывает на каждый pointermove пока `isOver && canDrop`.
 *   Дросселинга нет — Controller должен быть идемпотентен или делать дросселинг сам.
 */
export const createEmittingDroppable = <T extends DragData = DragData>(
  options: IEmittingDroppableOptions<T>,
): IDroppable => {
  const emit = useEmit();
  const dnd = useDnD();
  const { emits } = options;

  // Оборачиваем onDrop: сначала emit, потом оригинальный callback (если есть).
  const wrappedOnDrop =
    emits.onDrop || options.onDrop
      ? (data: T, info: IDropInfo) => {
          if (emits.onDrop) {
            const payload: IDropPayload<T> = {
              data,
              pointer: info.pointer,
              dropInfo: info,
            };
            emit(emits.onDrop, { payload });
          }
          options.onDrop?.(data, info);
        }
      : undefined;

  // Создаём базовый droppable с проксированным onDrop.
  const droppable = createDroppable<T>({
    ...options,
    onDrop: wrappedOnDrop,
  });

  // onDragOver: отслеживаем через реактивный `isOver` сигнал.
  // Каждый раз, когда isOver становится true И меняется pointer — эмитим.
  // Используем createEffect из Solid для реактивного отслеживания.
  if (emits.onDragOver) {
    const eventName = emits.onDragOver;
    createEffect(() => {
      if (!droppable.isOver()) return;
      const activeData = dnd.state.activeData() as T | null;
      const pointer = dnd.state.pointer();
      if (!activeData || !pointer) return;

      const payload: IDragPayload<T> = { data: activeData, pointer };
      emit(eventName, { payload });
    });
  }

  return droppable;
};
