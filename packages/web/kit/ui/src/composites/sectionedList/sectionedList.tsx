import { createSignal, For, type JSX, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { useTrace } from '../../internal/useTrace';
import { Accordion } from '../../primitives/accordion';
import { List } from '../../primitives/list';
import { Tooltip } from '../../primitives/tooltip';
import type { ISectionedListItem, ISectionedListProps } from './interfaces';

/**
 * SectionedList — «accordion of groups → selectable list».
 *
 * The single kit home for the pattern shared by learn `Concepts`/`Rules` and
 * studio `ComponentSegments`: collapsible sections, each holding a list of
 * picker rows. Studio-look accordion — **no `bordered`, no `rounded`** (no
 * boxes; mirrors studio `ComponentSegments`). All structure/chrome lives here;
 * consumers feed only data — zero raw classes leak out.
 *
 * Open state: pass `open`/`onOpenChange` for controlled; otherwise an internal
 * signal seeds from `defaultOpen` (`'all'` = every section).
 *
 * @example
 * ```tsx
 * <SectionedList
 *   sections={groups}
 *   selectedId={active()}
 *   onSelect={setActive}
 *   defaultOpen="all"
 * />
 * ```
 */
export function SectionedList(props: ISectionedListProps) {
  useTrace('web-ui.sectioned-list'); // ADR 062

  // Uncontrolled seed — computed once. `'all'` expands every section.
  const seed = (): string[] => {
    if (props.defaultOpen === 'all') return props.sections.map((s) => s.value);
    return props.defaultOpen ?? [];
  };
  const [openLocal, setOpenLocal] = createSignal<string[]>(seed());

  const isControlled = () => props.open !== undefined;
  const openValue = (): string[] => (isControlled() ? (props.open ?? []) : openLocal());
  const handleChange = (value: string[]) => {
    if (!isControlled()) setOpenLocal(value);
    props.onOpenChange?.(value);
  };

  const renderRow = (item: ISectionedListItem): JSX.Element => {
    const row = (
      <List.Item selected={item.id === props.selectedId} onSelect={() => props.onSelect?.(item.id)}>
        {item.label}
      </List.Item>
    );
    return (
      <Show when={props.itemPreview} fallback={row}>
        {/* cursorTracking (kit default) anchors the panel to the cursor;
            placement="right" keeps it off the list. Trigger as a plain `div`
            so the leaf's own `<button>` is not nested inside another button. */}
        <Tooltip placement="right" gutter={12} openDelay={250}>
          <Tooltip.Trigger as="div" class="w-full">
            {row}
          </Tooltip.Trigger>
          <Tooltip.Content class="p-0">{props.itemPreview?.(item.id)}</Tooltip.Content>
        </Tooltip>
      </Show>
    );
  };

  return (
    <Accordion multiple value={openValue()} onChange={handleChange} class={props.class}>
      <For each={props.sections}>
        {(section) => (
          <Accordion.Item value={section.value}>
            <Accordion.Trigger subtitle={section.subtitle}>
              <Show when={section.icon} fallback={section.label}>
                {(icon) => (
                  <span class="inline-flex items-center gap-2">
                    <Dynamic component={icon()} class="size-4 shrink-0" aria-hidden="true" />
                    {section.label}
                  </span>
                )}
              </Show>
            </Accordion.Trigger>
            <Accordion.Content>
              <List>
                <For each={section.items}>{(item) => renderRow(item)}</For>
              </List>
            </Accordion.Content>
          </Accordion.Item>
        )}
      </For>
    </Accordion>
  );
}
