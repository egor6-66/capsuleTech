import { FLOW_NODE_MIME } from '@capsuletech/web-flow';
import type { Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';

/**
 * PaletteItem — draggable-айтем палитры (иконка + лейбл). `itemAs` для
 * `Shapes.Palette`. Drag несёт node-`type` через `FLOW_NODE_MIME` → канвас
 * (`<Flow createNode>`) материализует ноду в точке дропа. Сам drag-старт —
 * присущая айтему drag-аффорданс (не бизнес-логика).
 */
const PaletteItem = View(
  (_Ui, props: { type: string; label?: string; icon?: Component<{ class?: string }> }) => (
    <button
      type="button"
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer?.setData(FLOW_NODE_MIME, props.type);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      }}
      class="flex cursor-grab items-center gap-2 rounded-md border border-border bg-card p-2 text-sm hover:bg-muted active:cursor-grabbing"
    >
      <Dynamic component={props.icon} class="size-4 shrink-0" />
      <span class="truncate">{props.label}</span>
    </button>
  ),
);

export default PaletteItem;
