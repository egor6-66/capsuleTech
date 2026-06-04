/**
 * MarkPicker — цветная метка узла.
 *
 * Dropdown из @capsuletech/web-ui/dropdown (chrome-кит редактора).
 * Иконка сброса: X из @capsuletech/web-ui/icons (lucide).
 *
 * NOTE: Dropdown.Trigger пока НЕ принимает Button variant/size-пропы (известный gap кита).
 * Стилизация триггера через class напрямую (аналогично TemplatesTrigger в palette/).
 */

import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { X } from '@capsuletech/web-ui/icons';
import { For } from 'solid-js';
import { MARK_COLORS } from './highlight';

export interface IMarkPickerProps {
  nodeId: string;
  mark: string | undefined;
  onMark: (nodeId: string, color: string | null) => void;
}

export const MarkPicker = (props: IMarkPickerProps) => (
  <span class="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
    <Dropdown>
      <Dropdown.Trigger
        data-dnd-cancel
        title="Цветная метка"
        class="block size-3.5 rounded-full border border-foreground/30"
        style={props.mark ? { 'background-color': props.mark } : undefined}
      />
      <Dropdown.Content class="flex items-center gap-1 p-1">
        <For each={MARK_COLORS}>
          {(c) => (
            <Dropdown.Item
              class="size-4 cursor-pointer rounded-full p-0"
              style={{ 'background-color': c }}
              onSelect={() => props.onMark(props.nodeId, c)}
            />
          )}
        </For>
        <Dropdown.Item
          class="flex size-4 cursor-pointer items-center justify-center rounded-full border border-border p-0 text-foreground/60"
          onSelect={() => props.onMark(props.nodeId, null)}
        >
          <X size={10} aria-hidden="true" />
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown>
  </span>
);
