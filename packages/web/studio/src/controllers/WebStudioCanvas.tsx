/**
 * WebStudio.Canvas — рабочая область конструктора (ADR 032, фаза 6).
 *
 * Пакетный surface, параметризуемый китом через `useWebStudioKit()`.
 * Монтируется внутри `<WebStudio.Provider kit={Ui}>` — там же живёт
 * WebStudioController, поэтому `useWebStudio()` и `useEmit()` доступны.
 *
 * Что делает:
 *  - читает дерево из `useWebStudio()` (без кастов);
 *  - добавляет `data-node-id` в props каждой ноды (для геометрического hit-testing
 *    в `canvasIntent`);
 *  - рендерит `<Renderer editOverlay={WebStudioOverlay} mode="static">`;
 *  - управляет drop-зоной через `createEmittingDroppable` из
 *    `@capsuletech/web-dnd/controllers`;
 *  - эмитит `onCanvasDragOver` (живой резолв intent), `onDrop`, `onDragEnd`,
 *    `onSelect` через `useEmit`.
 *
 * Инъекция `data-node-id` и drop-механика — edit-специфика пакета,
 * app-код видит только `<WebStudio.Canvas />`.
 *
 * DnD payload-shape:
 *  - `onCanvasDragOver` → `IOnDragOverCanvasPayload` (`{ spec, pointer }`)
 *  - `onDrop` → `IOnDropPayload` (`{ spec, intent }`)
 *  - `onDragEnd` → `{}` (пустой payload, сбросить drag-стейт)
 *  - `onSelect` → `null` (снять выделение)
 *
 * `createEmittingDroppable` используется для управления drop-зоной (ref, isOver).
 * Для payload'ов с кастомной формой (spec+intent вместо raw DnD-data) используем
 * прямой `onDrop` callback + `createEffect` для dragOver — вместо `emits.*`,
 * которые производят `IDropPayload`-shape несовместимый с WebStudioController.
 */

import { useEmit } from '@capsuletech/web-core';
import { useDnD } from '@capsuletech/web-dnd';
import { createEmittingDroppable } from '@capsuletech/web-dnd/controllers';
import type { Registry } from '@capsuletech/web-renderer';
import { Renderer } from '@capsuletech/web-renderer';
import { Flex } from '@capsuletech/web-ui/flex';
import { createEffect, createMemo, Show } from 'solid-js';
import { dragSpec } from '../state/dnd';
import type { IOnDragOverCanvasPayload, IOnDropPayload } from './WebStudioController';
import { WebStudioOverlay } from './WebStudioOverlay';
import { useWebStudioKit } from './WebStudioProvider';
import { useWebStudio } from './useWebStudio';

/**
 * WebStudio.Canvas — монтируется внутри `<WebStudio.Provider>`.
 *
 * Нет внешних props — всё читается из context (kit + editor-state).
 */
export const WebStudioCanvas = () => {
  const ws = useWebStudio();
  const emit = useEmit();
  const dnd = useDnD();
  const kit = useWebStudioKit();

  // registry для Renderer: { ui: kit }.
  // Каст `as unknown as Registry` необходим: kit — это Registry (тот же тип),
  // но TypeScript не может вывести вложенный shape из WebStudioKit (alias Registry).
  const registry = (): Registry => ({ ui: kit }) as unknown as Registry;

  const spec = () => dragSpec(dnd.state.activeData());

  // ── DnD drop-зона ─────────────────────────────────────────────────────────
  // Используем createEmittingDroppable для управления drop-зоной (ref, isOver,
  // accepts-фильтр). Payload WebStudioController-специфичный — формируем вручную
  // через onDrop callback и createEffect (вместо emits.* которые дают IDropPayload).
  const drop = createEmittingDroppable({
    id: 'canvas-root',
    accepts: (d) => dragSpec(d) != null,
    // onDrop — callback, payload конвертируется в IOnDropPayload для WebStudioController.
    onDrop: (data) => {
      const s = dragSpec(data);
      const intent = ws.intent;
      if (s && intent) {
        const payload: IOnDropPayload = { spec: s, intent };
        emit('onDrop', { payload });
      }
    },
    // emits.onDrop не задаём — используем callback выше для правильного shape.
    emits: {},
  });

  // Пока курсор над канвасом — эмитим onCanvasDragOver (контроллер резолвит intent).
  createEffect(() => {
    const s = spec();
    const pt = dnd.state.pointer();
    if (!s || !pt || !drop.isOver()) return;
    const payload: IOnDragOverCanvasPayload = { spec: s, pointer: { x: pt.x, y: pt.y } };
    emit('onCanvasDragOver', { payload });
  });

  // По концу drag — сбросить drag-состояние в контроллере.
  createEffect(() => {
    if (!dnd.state.activeData()) {
      emit('onDragEnd', {});
    }
  });

  /**
   * renderSchema: добавляем data-node-id в props каждой ноды.
   * data-node-id необходим canvasIntent для геометрического hit-testing
   * (elementFromPoint). Подсветка целиком в WebStudioOverlay.
   */
  const renderSchema = createMemo(() => {
    const src = ws.tree;
    const nodes: typeof src.nodes = {};
    for (const [id, n] of Object.entries(src.nodes)) {
      nodes[id] = { ...n, props: { ...n.props, 'data-node-id': id } };
    }
    return { components: { root: src.root, nodes } };
  });

  const isEmpty = () => {
    const tree = ws.tree;
    return tree.nodes[tree.root].children.length === 0;
  };

  return (
    <Flex orientation="vertical" class="h-full">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: editor affordance — клик по пустому канвасу снимает выделение (pointer-driven редактор) */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: editor affordance — клавиатурное взаимодействие на уровне canvas TBD */}
      <div
        ref={drop.ref}
        class="relative min-h-0 flex-1 overflow-auto"
        classList={{ 'bg-primary/5': spec() != null }}
        onClick={(e) => {
          // Снять выделение по клику в пустую область канваса.
          // Срабатывает только если клик не всплыл из оверлея ноды
          // (WebStudioOverlay вызывает e.stopPropagation() → сюда не доходит).
          if (e.target === e.currentTarget) emit('onSelect', { payload: null });
        }}
      >
        <div class="relative min-h-full w-full">
          <Renderer
            schema={renderSchema()}
            registry={registry()}
            mode="static"
            editOverlay={WebStudioOverlay}
          />

          <Show when={isEmpty()}>
            <Flex class="pointer-events-none absolute inset-0 items-center justify-center text-sm text-foreground/40">
              Перетащите компонент из палитры
            </Flex>
          </Show>
        </div>
      </div>
    </Flex>
  );
};
