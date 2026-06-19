/**
 * DraggablePresetItem — preset как drag-source для creator-режима палитры.
 *
 * Тот же визуал что у click-`PresetItem` (тот же layout/padding/typography),
 * но pointer-down инициирует drag через `@capsuletech/web-dnd` вместо
 * мутации selection-store'а. Drag-data: `{ source: 'palette-preset', preset }`
 * — будущий Tree/Canvas drop-target прочитает и вставит preset.schema в
 * композицию.
 *
 * Cursor `grab`/`grabbing` + opacity 40% во время drag'а — visual feedback,
 * без дополнительных hover-стилей (preset либо тащим, либо нет; click-select
 * в creator-режиме намеренно не работает).
 *
 * Требует обёртки `<DnDProvider>` выше по дереву — `ComponentsPalette`
 * монтирует его сам в creator-режиме.
 */

import { createDraggable } from '@capsuletech/web-dnd';
import type { IPreset } from '@capsuletech/web-ui/manifest';

export const DraggablePresetItem = (props: { p: IPreset }) => {
  const drag = createDraggable({
    id: `palette-preset:${props.p.id}`,
    data: () => ({ source: 'palette-preset', preset: props.p }),
  });

  return (
    <button
      type="button"
      ref={drag.ref}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs text-muted-foreground cursor-grab active:cursor-grabbing"
      classList={{ 'opacity-40': drag.isDragging() }}
      data-testid={`preset-draggable-${props.p.id}`}
    >
      {props.p.label}
    </button>
  );
};
