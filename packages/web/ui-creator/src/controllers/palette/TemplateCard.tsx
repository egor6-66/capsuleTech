/**
 * TemplateCard — карточка-превью одного темплейта: рендерит фрагмент + draggable.
 *
 * Draggable через нативный div (не через Button): TemplateCard не является
 * кнопкой по семантике (интерактивный элемент-карточка с превью), поэтому
 * ref идёт на обёрточный div напрямую.
 *
 * GAP: Button не используется для draggable-карточки, т.к. card-layout
 * с превью — не кнопочная семантика. Для draggable-карточки нативный div ок.
 */

import { createDraggable } from '@capsuletech/web-dnd';
import { Renderer } from '@capsuletech/web-renderer';
import type { Registry } from '@capsuletech/web-renderer';
import { Flex } from '@capsuletech/web-ui/flex';
import { buildTemplate, type ITemplate } from '../../generators';

export const TemplateCard = (props: { t: ITemplate; registry: Registry }) => {
  const fragment = buildTemplate(props.t);
  const drag = createDraggable({
    id: `tmpl:${props.t.id}`,
    data: () => ({ source: 'palette', template: fragment }),
  });
  return (
    <div
      ref={drag.ref}
      title="Перетащите в холст"
      class="cursor-grab rounded-md border p-1 transition-colors hover:border-primary active:cursor-grabbing"
      classList={{ 'opacity-50': drag.isDragging() }}
    >
      <div class="mb-1 px-1 text-xs font-medium">{props.t.label}</div>
      <div class="pointer-events-none max-h-40 overflow-hidden rounded bg-background p-1">
        <Flex class="origin-top-left scale-[0.85]">
          <Renderer schema={{ components: fragment }} registry={props.registry} mode="static" />
        </Flex>
      </div>
    </div>
  );
};
