import { setLocale, useLocale, useLocales } from '@capsuletech/web-intl';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { For, Show, splitProps } from 'solid-js';

import type { ILocalePickerProps } from './interfaces';

/**
 * Dropdown-based locale picker. A connected control — locale state lives in the
 * `@capsuletech/web-intl` module-level signal. The active locale is marked with
 * a checkmark inside the list.
 *
 * @example
 * ```tsx
 * // Standalone — own dropdown root (default):
 * <LocalePicker labels={{ en: 'English', ru: 'Русский' }} />
 *
 * // Sub mode — inside a parent Dropdown.Content:
 * <Dropdown>
 *   <Dropdown.Trigger>Menu</Dropdown.Trigger>
 *   <Dropdown.Content>
 *     <LocalePicker mode="sub" labels={{ en: 'English', ru: 'Русский' }} />
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 */
export const LocalePicker = (props: ILocalePickerProps) => {
  const [local] = splitProps(props, [
    'locales',
    'labels',
    'onChange',
    'triggerLabel',
    'class',
    'mode',
  ]);

  const current = useLocale();
  const registeredLocales = useLocales();
  const locales = () => local.locales ?? registeredLocales();
  const mode = () => local.mode ?? 'standalone';

  const displayName = (loc: string) => local.labels?.[loc] ?? loc;
  const currentDisplay = () => displayName(current());

  const renderItems = () => (
    <For each={locales()}>
      {(loc) => (
        <Dropdown.Item
          onSelect={() => {
            setLocale(loc);
            local.onChange?.(loc);
          }}
        >
          <span class="inline-block w-4 text-primary">
            <Show when={current() === loc}>&#x2713;</Show>
          </span>
          <span>{displayName(loc)}</span>
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
                <span class="text-muted-foreground">Язык:</span>
                <span>{currentDisplay()}</span>
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
              <span class="text-muted-foreground">Язык:</span>
              <span class="ml-1.5">{currentDisplay()}</span>
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
