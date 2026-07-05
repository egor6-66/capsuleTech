/**
 * DragChip — кастомный drag-overlay студии: чёткий чип с иконкой + названием
 * таскаемого узла дерева, следует за курсором. Заменяет еле заметный дефолтный
 * ghost (`showDefaultOverlay`) на читаемую подпись «что тащим».
 *
 * Рендерится через `<DragOverlay>` (web-dnd) внутри `WebStudio.Provider`.
 * Реагирует только на tree-drag'и (`data.src === 'tree'`).
 */

import type { DragData } from '@capsuletech/web-dnd';
import { getManifest } from '@capsuletech/web-ui/manifest';
import { Show } from 'solid-js';

export const DragChip = (props: { data: DragData }) => {
  const type = () => String(props.data.nodeType ?? '');
  const manifest = () => getManifest(type());
  const label = () => manifest()?.label ?? type();

  return (
    <Show when={props.data.src === 'tree'}>
      <div class="flex items-center gap-2 rounded-md border border-primary bg-popover px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg">
        <Show when={manifest()?.icon}>
          <span class="text-muted-foreground">{manifest()!.icon()}</span>
        </Show>
        <span class="truncate">{label()}</span>
      </div>
    </Show>
  );
};
