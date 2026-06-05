import { DISCOVERED_THEMES, setTheme, useTheme } from '@capsuletech/web-style';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { For, Show, splitProps } from 'solid-js';

import type { IThemePickerProps } from './interfaces';

/**
 * Dropdown-based theme picker. A connected control — theme state lives in the
 * `@capsuletech/web-style` module-level signal. The active theme is marked with
 * a checkmark inside the list.
 *
 * @example
 * ```tsx
 * // Standalone — own dropdown root (default):
 * <ThemePicker />
 *
 * // Sub mode — inside a parent Dropdown.Content:
 * <Dropdown>
 *   <Dropdown.Trigger>Menu</Dropdown.Trigger>
 *   <Dropdown.Content>
 *     <ThemePicker mode="sub" />
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 */
export const ThemePicker = (props: IThemePickerProps) => {
  const [local] = splitProps(props, [
    'themes',
    'target',
    'onChange',
    'triggerLabel',
    'class',
    'mode',
  ]);
  const current = useTheme();
  const themes = () => local.themes ?? DISCOVERED_THEMES;
  const mode = () => local.mode ?? 'standalone';

  const renderItems = () => (
    <For each={themes()}>
      {(name) => (
        <Dropdown.Item
          onSelect={() => {
            setTheme(name, local.target);
            local.onChange?.(name);
          }}
        >
          <span class="inline-block w-4 text-primary">
            <Show when={current() === name}>&#x2713;</Show>
          </span>
          <span>{name}</span>
        </Dropdown.Item>
      )}
    </For>
  );

  if (mode() === 'standalone') {
    return (
      <Dropdown>
        <Dropdown.Trigger
          class={`inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring ${local.class ?? ''}`}
        >
          <Show
            when={local.triggerLabel !== undefined}
            fallback={
              <>
                <span class="text-muted-foreground">Theme:</span>
                <span>{current()}</span>
              </>
            }
          >
            {local.triggerLabel}
          </Show>
          <span class="text-muted-foreground" aria-hidden="true">
            &#9662;
          </span>
        </Dropdown.Trigger>
        <Dropdown.Content>{renderItems()}</Dropdown.Content>
      </Dropdown>
    );
  }

  return (
    <Dropdown.Sub>
      <Dropdown.SubTrigger class={local.class}>
        <Show
          when={local.triggerLabel !== undefined}
          fallback={
            <>
              <span class="text-muted-foreground">Theme:</span>
              <span class="ml-1.5">{current()}</span>
            </>
          }
        >
          {local.triggerLabel}
        </Show>
        <span class="ml-auto text-muted-foreground" aria-hidden="true">
          &#9658;
        </span>
      </Dropdown.SubTrigger>
      <Dropdown.SubContent>{renderItems()}</Dropdown.SubContent>
    </Dropdown.Sub>
  );
};
