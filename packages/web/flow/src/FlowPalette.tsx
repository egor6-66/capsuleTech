import { For, type JSX, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { FLOW_NODE_MIME } from './dnd';

export interface IFlowPaletteItem {
  /** Node `type` carried to the Flow drop handler — your `createNode` maps it. */
  type: string;
  label: string;
  /** Optional leading icon component (e.g. a lucide-solid icon). */
  icon?: (props: { class?: string }) => JSX.Element;
}

export interface IFlowPaletteProps {
  items: IFlowPaletteItem[];
  class?: string;
}

/**
 * FlowPalette — a simple draggable list of node types. Drag an item onto a
 * `<Flow createNode={…} />` to materialize a node at the drop position.
 *
 * Place it anywhere (incl. a `Layout.Matrix` slot beside the Flow) — HTML5 drag
 * isn't provider-scoped, so palette and canvas can be in different containers.
 */
export const FlowPalette = (props: IFlowPaletteProps): JSX.Element => {
  const onDragStart = (e: DragEvent, type: string): void => {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData(FLOW_NODE_MIME, type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div class={`flex h-full w-full flex-col gap-2 overflow-auto p-2 ${props.class ?? ''}`}>
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            draggable={true}
            onDragStart={(e) => onDragStart(e, item.type)}
            class="flex cursor-grab items-center gap-2 rounded-md border border-border bg-card p-2 text-sm hover:bg-muted active:cursor-grabbing"
          >
            <Show when={item.icon}>
              {(icon) => <Dynamic component={icon()} class="h-4 w-4 shrink-0" />}
            </Show>
            <span class="truncate">{item.label}</span>
          </button>
        )}
      </For>
    </div>
  );
};
