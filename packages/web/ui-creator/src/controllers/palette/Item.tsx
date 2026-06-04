/**
 * Item — один draggable-элемент палитры (обычный компонент).
 *
 * Использует Button из @capsuletech/web-ui (ghost, cursor-grab).
 * Ref-forward: Button → Slot → Kobalte Polymorphic → нативный <button>
 * — drag.ref получает DOM-узел корректно.
 */

import { createDraggable } from '@capsuletech/web-dnd';
import { Button } from '@capsuletech/web-ui/button';
import type { IComponentManifest } from '../../manifests';

export const Item = (props: { m: IComponentManifest }) => {
  const drag = createDraggable({
    id: `palette:${props.m.type}`,
    data: () => ({ source: 'palette', type: props.m.type }),
  });
  return (
    <Button
      ref={drag.ref}
      variant="ghost"
      title={props.m.description}
      class="w-full justify-start gap-2 cursor-grab active:cursor-grabbing"
      classList={{ 'opacity-40': drag.isDragging() }}
    >
      <span class="shrink-0 text-foreground/60">{props.m.icon()}</span>
      <span>{props.m.label}</span>
    </Button>
  );
};
