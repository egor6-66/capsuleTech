import { cn } from '@capsuletech/web-style';
import { Button } from '@capsuletech/web-ui/button';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { Menu } from '@capsuletech/web-ui/icons';
import { For, Show } from 'solid-js';

import { ModeToggle } from '../modeToggle';
import { ThemePicker } from '../themePicker';
import type { IHeaderNavItem, IHeaderProps } from './interfaces';

/**
 * Header — configurable app-shell chrome bar (tier-2 connected block).
 *
 * Two-zone layout (full-width, `h-full`):
 *  - Left:  optional `brand` slot + `nav` routing buttons.
 *  - Right: hamburger dropdown with mode-toggles, theme picker, and custom items.
 *
 * The bar does NOT set its own height — that is owned by the Matrix slot
 * (`initialSize`) in the parent Page. `h-full` fills whatever the slot gives.
 *
 * **Nav routing:** each nav item defaults to a native `<a>` element. To get
 * client-side SPA navigation pass `linkComponent: Link` from `@tanstack/solid-router`:
 * ```tsx
 * import { Link } from '@tanstack/solid-router';
 * <Shell.Header nav={[{ label: 'Dashboard', to: '/dashboard', linkComponent: Link }]} />
 * ```
 * Active styling is driven by `aria-[current=page]` which TanStack Router sets
 * automatically — no explicit active prop needed.
 *
 * **Custom item binding (ADR 032):** `menu.items` carry an `onSelect` callback.
 * To route a click through HCA, wrap the callback with `useEmit` in the app:
 * ```tsx
 * const emit = useEmit();
 * <Shell.Header
 *   menu={{ items: [{ label: 'Logout', onSelect: () => emit('onClick', { payload: { tags: ['logout'] } }) }] }}
 * />
 * ```
 * This keeps `/ui` free of `@capsuletech/web-core` (tree-shakeable), while the
 * event travels the ControllerProxy dispatch path.
 *
 * @example
 * ```tsx
 * import { Link } from '@tanstack/solid-router';
 * <Shell.Header
 *   brand={<Logo />}
 *   nav={[
 *     { label: 'Dashboard', to: '/workspace/dashboard', linkComponent: Link },
 *     { label: 'Reports',   to: '/workspace/reports',   linkComponent: Link },
 *   ]}
 *   menu={{
 *     modes: ['dnd', 'resize', 'settings', 'dark'],
 *     theme: true,
 *     items: [{ label: 'Logout', onSelect: handleLogout }],
 *   }}
 * />
 * ```
 */
export const Header = (props: IHeaderProps) => {
  // Resolved defaults
  const modes = () => props.menu?.modes ?? (['dnd', 'resize', 'settings', 'dark'] as const);
  const showTheme = () => props.menu?.theme ?? true;
  const customItems = () => props.menu?.items ?? [];

  // Mode group helpers
  const layoutModes = () => modes().filter((m) => m === 'dnd' || m === 'resize');
  const settingsModes = () => modes().filter((m) => m === 'settings');
  const themeModes = () => modes().filter((m) => m === 'dark');

  const hasLayoutGroup = () => layoutModes().length > 0;
  const hasSettingsGroup = () => settingsModes().length > 0;
  const hasThemeGroup = () => themeModes().length > 0 || showTheme();
  const hasCustomGroup = () => customItems().length > 0;

  return (
    <div
      class={cn(
        'flex h-full items-center justify-between',
        'border-b bg-background px-cell',
      )}
    >
      {/* Left zone: brand + nav */}
      <div class="flex items-center gap-2">
        <Show when={props.brand}>{(brand) => <>{brand()}</>}</Show>

        <Show when={props.nav && props.nav.length > 0}>
          <div class="flex items-center gap-1">
            <For each={props.nav}>
              {(item: IHeaderNavItem) => (
                <Button
                  as={item.linkComponent ?? 'a'}
                  {...(item.linkComponent
                    ? { to: item.to }
                    : { href: item.to })}
                  variant="outline"
                  size="sm"
                  class={cn(
                    'aria-[current=page]:bg-accent',
                    'aria-[current=page]:text-accent-foreground',
                    'aria-[current=page]:font-semibold',
                    'aria-[current=page]:pointer-events-none',
                  )}
                >
                  {item.label}
                </Button>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Right zone: hamburger menu */}
      <Dropdown modal={false}>
        <Dropdown.Trigger
          as={Button}
          variant="ghost"
          size="icon"
          aria-label="Меню"
        >
          <Menu class="size-5" aria-hidden="true" />
        </Dropdown.Trigger>

        <Dropdown.Content>
          {/* Layout group: dnd + resize toggles */}
          <Show when={hasLayoutGroup()}>
            <Dropdown.Group>
              <Dropdown.Label>Layout</Dropdown.Label>
              <div class="flex flex-col gap-1.5 px-2 py-1.5">
                <For each={layoutModes()}>
                  {(mode) => <ModeToggle mode={mode} />}
                </For>
              </div>
            </Dropdown.Group>
            <Show when={hasSettingsGroup() || hasThemeGroup() || hasCustomGroup()}>
              <Dropdown.Separator />
            </Show>
          </Show>

          {/* Widget settings group: settings toggle */}
          <Show when={hasSettingsGroup()}>
            <Dropdown.Group>
              <Dropdown.Label>Widget settings</Dropdown.Label>
              <div class="px-2 py-1.5">
                <For each={settingsModes()}>
                  {(mode) => <ModeToggle mode={mode} />}
                </For>
              </div>
            </Dropdown.Group>
            <Show when={hasThemeGroup() || hasCustomGroup()}>
              <Dropdown.Separator />
            </Show>
          </Show>

          {/* Theme group: dark toggle + ThemePicker */}
          <Show when={hasThemeGroup()}>
            <Dropdown.Group>
              <Dropdown.Label>Theme</Dropdown.Label>
              <Show when={themeModes().length > 0}>
                <div class="px-2 py-1.5">
                  <For each={themeModes()}>
                    {(mode) => <ModeToggle mode={mode} />}
                  </For>
                </div>
              </Show>
              <Show when={showTheme()}>
                <ThemePicker mode="sub" />
              </Show>
            </Dropdown.Group>
            <Show when={hasCustomGroup()}>
              <Dropdown.Separator />
            </Show>
          </Show>

          {/* Custom items group (e.g. Logout) */}
          <Show when={hasCustomGroup()}>
            <Dropdown.Group>
              <For each={customItems()}>
                {(item) => (
                  <Dropdown.Item onSelect={item.onSelect}>
                    {item.label}
                  </Dropdown.Item>
                )}
              </For>
            </Dropdown.Group>
          </Show>
        </Dropdown.Content>
      </Dropdown>
    </div>
  );
};
