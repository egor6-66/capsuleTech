import { cn } from '@capsuletech/web-style';
import { DropdownMenu as KobalteDropdown } from '@kobalte/core/dropdown-menu';
import type { ValidComponent } from 'solid-js';
import { Match, Show, Switch, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { useTrace } from '../../internal/useTrace';
import { createFinish } from '../../lib/finish';
import { useMountTarget } from '../../lib/mountTarget';

import type {
  IDropdownContentProps,
  IDropdownGroupProps,
  IDropdownItemProps,
  IDropdownLabelProps,
  IDropdownProps,
  IDropdownRowProps,
  IDropdownSeparatorProps,
  IDropdownSubContentProps,
  IDropdownSubProps,
  IDropdownSubTriggerProps,
  IDropdownTriggerProps,
} from './interfaces';
import {
  dropdownContentCva,
  dropdownItemCva,
  dropdownLabelCva,
  dropdownRowCva,
  dropdownSeparatorCva,
} from './variants';

/**
 * Root dropdown container — thin pass-through to `KobalteDropdown.Root`.
 * Manages open/close state. Accepts all Kobalte root props (open, defaultOpen,
 * onOpenChange, placement, gutter, …).
 */
const DropdownImpl = (props: IDropdownProps) => {
  useTrace('web-ui.dropdown'); // ADR 062
  return <KobalteDropdown {...props} />;
};

/**
 * Button (or any element via `as`) that opens the dropdown on click.
 *
 * Polymorphic via `as` prop — pass any component (e.g. `Button`) and all of
 * its props become available on `Dropdown.Trigger`. Kobalte injects the
 * required ARIA + event attributes on top of the component's own props.
 *
 * @example
 * ```tsx
 * <Dropdown.Trigger as={Button} variant="ghost" size="icon"><Icon /></Dropdown.Trigger>
 * ```
 */
const Trigger = <T extends ValidComponent = 'button'>(props: IDropdownTriggerProps<T>) => {
  const [local, others] = splitProps(props, ['class']);
  return <KobalteDropdown.Trigger class={cn(local.class)} {...(others as object)} />;
};

/**
 * Dropdown panel teleported into a Portal (mounted on `document.body` by default).
 * Kobalte uses Floating UI internally for viewport-safe collision detection + flip.
 *
 * Enter + exit animations are applied via the `popover-animate` class (from web-style
 * `@keyframes popover-in`/`popover-out`) using Kobalte's native `data-[expanded]` /
 * `data-[closed]` attributes — no forceMount or motionone required.
 *
 * ## Finish effect
 * Activated via the reactive `useFinishMode()` signal (read inside `createFinish`);
 * no DOM walk / `closest()` / ref needed.
 */
const Content = (props: IDropdownContentProps) => {
  const [local, others] = splitProps(props, ['class', 'style', 'portalProps']);

  const finish = createFinish({ opaque: true });
  const mountFromCtx = useMountTarget();

  // Portal mount: explicit prop > context > Kobalte default (undefined → body).
  const portalProps = () => {
    const raw = local.portalProps;
    if (raw?.mount !== undefined) return raw;
    return { ...raw, mount: mountFromCtx() };
  };

  return (
    <KobalteDropdown.Portal {...portalProps()}>
      <KobalteDropdown.Content
        class={cn(dropdownContentCva(), 'popover-animate', local.class)}
        style={{
          ...(typeof local.style === 'object' ? local.style : {}),
          ...finish.surfaceStyle(),
        }}
        {...(others as object)}
      />
    </KobalteDropdown.Portal>
  );
};

/**
 * Interactive menu item. Calls `onSelect` when activated.
 * Kobalte sets `data-[highlighted]` on keyboard/hover focus and `data-[disabled]`
 * when disabled — both are styled via `dropdownItemCva`.
 */
const Item = (props: IDropdownItemProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteDropdown.Item class={cn(dropdownItemCva(), local.class)} {...(others as object)} />
  );
};

/**
 * Canonical icon + label (+ trailing) menu row — the consistent row shape for a
 * dropdown. Renders an `Item`, a `SubTrigger`, or a static `<div>` depending on
 * `variant`, all sharing `dropdownRowCva` (one height/padding). The leading icon
 * is the only affordance — submenu rows carry no directional arrow.
 *
 * @example
 * ```tsx
 * <Dropdown.Row icon={LogOut} label="Выйти" onSelect={logout} />
 *
 * <Dropdown.Sub>
 *   <Dropdown.Row variant="sub" icon={Palette} label="Тема" />
 *   <Dropdown.SubContent>…</Dropdown.SubContent>
 * </Dropdown.Sub>
 *
 * <Dropdown.Row variant="static" icon={Moon} label="Dark mode"
 *   trailing={<Toggle checked={dark()} onChange={toggleDark} />} />
 * ```
 */
const Row = (props: IDropdownRowProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'icon',
    'label',
    'trailing',
    'children',
    'variant',
  ]);
  const variant = () => local.variant ?? 'item';
  const cls = () => cn(dropdownRowCva(), local.class);

  const inner = () => (
    <>
      <Show when={local.icon}>
        {(icon) => (
          <Dynamic
            component={icon()}
            class="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </Show>
      <span class="flex-1 truncate text-left">{local.label ?? local.children}</span>
      <Show when={local.trailing}>
        <span class="ml-auto flex shrink-0 items-center">{local.trailing}</span>
      </Show>
    </>
  );

  return (
    <Switch
      fallback={
        <KobalteDropdown.Item class={cls()} {...(others as object)}>
          {inner()}
        </KobalteDropdown.Item>
      }
    >
      <Match when={variant() === 'sub'}>
        <KobalteDropdown.SubTrigger class={cls()} {...(others as object)}>
          {inner()}
        </KobalteDropdown.SubTrigger>
      </Match>
      <Match when={variant() === 'static'}>
        <div class={cls()} {...(others as object)}>
          {inner()}
        </div>
      </Match>
    </Switch>
  );
};

/**
 * Non-interactive visual divider. Renders `role="separator"` for accessibility.
 */
const Separator = (props: IDropdownSeparatorProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteDropdown.Separator
      class={cn(dropdownSeparatorCva(), local.class)}
      {...(others as object)}
    />
  );
};

/**
 * Semantic group wrapper. Provides `aria-labelledby` linkage between `Label`
 * and the items it annotates. Use together with `Dropdown.Label`:
 *
 * ```tsx
 * <Dropdown.Group>
 *   <Dropdown.Label>Account</Dropdown.Label>
 *   <Dropdown.Item>Profile</Dropdown.Item>
 * </Dropdown.Group>
 * ```
 */
const Group = (props: IDropdownGroupProps) => <KobalteDropdown.Group {...props} />;

/**
 * Non-interactive heading for a group. Must be rendered inside `Dropdown.Group`.
 * Does not receive keyboard focus.
 */
const Label = (props: IDropdownLabelProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteDropdown.GroupLabel
      class={cn(dropdownLabelCva(), local.class)}
      {...(others as object)}
    />
  );
};

/**
 * Container for a nested submenu. Must contain exactly one `SubTrigger` and one `SubContent`.
 */
const Sub = (props: IDropdownSubProps) => <KobalteDropdown.Sub {...props} />;

/**
 * An item that opens a nested submenu when hovered or when the right-arrow key is pressed.
 */
const SubTrigger = (props: IDropdownSubTriggerProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteDropdown.SubTrigger
      class={cn(dropdownItemCva(), local.class)}
      {...(others as object)}
    />
  );
};

/**
 * Panel for a nested submenu — same Portal + collision-detection behaviour as `Content`.
 *
 * Inherits the same enter + exit animations via `popover-animate` (`data-[expanded]` /
 * `data-[closed]` Kobalte attributes) — nested submenus animate independently.
 *
 * ## Finish effect
 * Activated via the reactive `useFinishMode()` signal (read inside `createFinish`);
 * no DOM walk / `closest()` / ref needed.
 */
const SubContent = (props: IDropdownSubContentProps) => {
  const [local, others] = splitProps(props, ['class', 'style', 'portalProps']);

  const finish = createFinish({ opaque: true });
  const mountFromCtx = useMountTarget();

  // Portal mount: explicit prop > context > Kobalte default (undefined → body).
  const portalProps = () => {
    const raw = local.portalProps;
    if (raw?.mount !== undefined) return raw;
    return { ...raw, mount: mountFromCtx() };
  };

  return (
    <KobalteDropdown.Portal {...(portalProps() as object)}>
      <KobalteDropdown.Content
        class={cn(dropdownContentCva(), 'popover-animate', local.class)}
        style={{
          ...(typeof local.style === 'object' ? local.style : {}),
          ...finish.surfaceStyle(),
        }}
        {...(others as object)}
      />
    </KobalteDropdown.Portal>
  );
};

/**
 * Accessible dropdown menu primitive built on `@kobalte/core/dropdown-menu`.
 *
 * Features:
 * - Keyboard navigation (arrow keys, Enter, Escape, Tab).
 * - Auto-positioning via Floating UI — never clips beyond the viewport.
 * - Portal-based content (mounted on `document.body`) to avoid z-index/overflow issues.
 * - Nested submenus via `Dropdown.Sub` + `Dropdown.SubTrigger` + `Dropdown.SubContent`.
 *
 * @example
 * ```tsx
 * <Dropdown>
 *   <Dropdown.Trigger as={Button} variant="outline">Open</Dropdown.Trigger>
 *   <Dropdown.Content>
 *     <Dropdown.Group>
 *       <Dropdown.Label>Account</Dropdown.Label>
 *       <Dropdown.Item onSelect={() => logout()}>Logout</Dropdown.Item>
 *     </Dropdown.Group>
 *     <Dropdown.Separator />
 *     <Dropdown.Sub>
 *       <Dropdown.SubTrigger>Color scheme</Dropdown.SubTrigger>
 *       <Dropdown.SubContent>
 *         <Dropdown.Item onSelect={() => setTheme('black')}>Black</Dropdown.Item>
 *         <Dropdown.Item onSelect={() => setTheme('ocean')}>Ocean</Dropdown.Item>
 *       </Dropdown.SubContent>
 *     </Dropdown.Sub>
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 */
export const Dropdown = Object.assign(DropdownImpl, {
  Trigger,
  Content,
  Item,
  Row,
  Separator,
  Group,
  Label,
  Sub,
  SubTrigger,
  SubContent,
});

// Named re-exports под Table-pattern (web-core lazy uses individual symbols).
// `Dropdown.Trigger`-style стабильный compound — выше, эти aliases — для
// `createLazy(..., 'DropdownTrigger')` в web-core/ui-kit/imports.tsx.
export {
  Content as DropdownContent,
  Group as DropdownGroup,
  Item as DropdownItem,
  Label as DropdownLabel,
  Row as DropdownRow,
  Separator as DropdownSeparator,
  Sub as DropdownSub,
  SubContent as DropdownSubContent,
  SubTrigger as DropdownSubTrigger,
  Trigger as DropdownTrigger,
};
