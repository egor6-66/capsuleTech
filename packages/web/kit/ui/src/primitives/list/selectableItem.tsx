import { cn } from '@capsuletech/web-style';
import { Show, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { useTrace } from '../../internal/useTrace';
import type { ISelectableItemProps } from './interfaces';
import { selectableItemCva } from './variants';

/**
 * Selectable list leaf — `Ui.List.Item`.
 *
 * Stateless, keyboard-accessible picker row: click / Enter / Space call
 * `onSelect`; `selected` toggles the accent highlight. All hover/selected/
 * focus styling is baked into the primitive (`selectableItemCva`), so the
 * consumer stays props-only — zero raw classes.
 *
 * `role="option"` + `aria-selected` model a single option inside a listbox-like
 * container; the parent list/accordion provides the grouping semantics.
 *
 * @example
 * ```tsx
 * <List.Item icon={LayoutGrid} selected={id === active} onSelect={() => pick(id)}>
 *   Button — primary
 * </List.Item>
 * ```
 */
export const SelectableItem = (props: ISelectableItemProps) => {
  useTrace('web-ui.list-item'); // ADR 062
  const [local, others] = splitProps(props, [
    'children',
    'icon',
    'selected',
    'onSelect',
    'trailing',
    'class',
  ]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      local.onSelect();
    }
  };

  return (
    <button
      type="button"
      role="option"
      aria-selected={local.selected ? 'true' : 'false'}
      data-selected={local.selected ? '' : undefined}
      onClick={() => local.onSelect()}
      onKeyDown={onKeyDown}
      class={cn(selectableItemCva({ selected: local.selected }), local.class)}
      {...(others as object)}
    >
      <Show when={local.icon}>
        {(icon) => <Dynamic component={icon()} class="size-4 shrink-0" aria-hidden="true" />}
      </Show>
      <span class="flex-1 truncate">{local.children}</span>
      <Show when={local.trailing}>
        <span class="shrink-0">{local.trailing}</span>
      </Show>
    </button>
  );
};
