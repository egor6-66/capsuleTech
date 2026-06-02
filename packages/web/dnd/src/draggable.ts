import { type Accessor, createEffect, createMemo, onCleanup } from 'solid-js';
import { useDnD } from './context';
import type { DragData, IDraggable, IDraggableOptions } from './types';

const toAccessor = <T>(v: Accessor<T> | T): Accessor<T> =>
  typeof v === 'function' ? (v as Accessor<T>) : () => v;

/**
 * Primitive для draggable-источника. Применяется как `ref={drag.ref}` на
 * элементе, который должен быть перетаскиваемым.
 *
 * Старт drag'а — `pointerdown` (любая кнопка/палец). На draggable-элементе
 * проставляется `touch-action: none`, чтобы touch-drag не конфликтовал со
 * скроллом страницы.
 *
 * Текстовое выделение во время drag'а гасится глобально через `user-select:
 * none` пока `isDragging`.
 *
 * Opt-out convention: любой потомок с атрибутом `[data-dnd-cancel]` отменяет
 * старт drag'а, если `pointerdown` возник внутри него. Применяется для handle'ов
 * внутри draggable-ячейки (resize handle, кнопки), которым необходимо получить
 * собственный pointerdown без инициации drag'а. `stopPropagation()` на самом
 * handle не помогает: Solid делегирует pointerdown через единственный listener на
 * document, тогда как этот listener навешан нативно прямо на элемент — native
 * listener срабатывает раньше Solid-делегата во время DOM-bubble-фазы.
 * Аналогично маркеру `[data-dnd-draggable]` на самом draggable-элементе —
 * декларативное соглашение, не runtime-поведение.
 */
export const createDraggable = <T extends DragData = DragData>(
  options: IDraggableOptions<T>,
): IDraggable => {
  const dnd = useDnD();
  const data = toAccessor(options.data);
  const disabled = options.disabled ?? (() => false);

  let elRef: HTMLElement | null = null;

  const isDragging = createMemo(() => dnd.state.activeId() === options.id);

  const onPointerDown = (e: PointerEvent) => {
    if (disabled()) return;
    // Opt-out: a descendant marked [data-dnd-cancel] (e.g. a resize handle) must
    // not initiate a drag. Native-listener timing means the consumer's
    // stopPropagation cannot help (Solid delegates pointerdown via a single
    // document listener, while this listener is attached natively on the element —
    // the native listener fires during DOM bubble before Solid's delegated handler).
    // By NOT calling preventDefault here, the handle's own pointerdown proceeds
    // normally (e.g. initiating a resize interaction).
    const t = e.target as HTMLElement | null;
    if (t?.closest('[data-dnd-cancel]')) return;
    // Только основная кнопка (или touch — у touch button === 0)
    if (e.button !== 0) return;
    e.preventDefault();
    dnd.startDrag(options.id, e);
  };

  const ref = (el: HTMLElement) => {
    if (elRef) {
      elRef.removeEventListener('pointerdown', onPointerDown);
    }
    elRef = el;
    if (!el) return;
    el.style.touchAction = 'none';
    el.dataset.dndDraggable = '';
    el.addEventListener('pointerdown', onPointerDown);

    const unregister = dnd.registerDraggable({
      id: options.id,
      data: data as Accessor<DragData>,
      el,
    });

    onCleanup(() => {
      el.removeEventListener('pointerdown', onPointerDown);
      unregister();
    });
  };

  // Глобальное гашение text-selection пока тянем — иначе drag по тексту
  // выделяет случайные участки.
  createEffect(() => {
    if (!isDragging()) return;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    onCleanup(() => {
      document.body.style.userSelect = prev;
    });
  });

  return { ref, isDragging };
};
