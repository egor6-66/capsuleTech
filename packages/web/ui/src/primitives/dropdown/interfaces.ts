import type {
  DropdownMenuContentProps,
  DropdownMenuGroupLabelProps,
  DropdownMenuGroupProps,
  DropdownMenuItemProps,
  DropdownMenuPortalProps,
  DropdownMenuRootProps,
  DropdownMenuSeparatorProps,
  DropdownMenuSubContentProps,
  DropdownMenuSubProps,
  DropdownMenuSubTriggerProps,
} from '@kobalte/core/dropdown-menu';
import type { PolymorphicProps } from '@kobalte/core/polymorphic';
import type { JSX, ValidComponent } from 'solid-js';

/**
 * HTML passthrough: позволяет передавать произвольные `data-*` атрибуты
 * (включая boolean-маркеры вроде `data-dnd-cancel`) на полиморфные Kobalte-элементы,
 * у которых нет index-signature в своих Props.
 */
type IHtmlDataAttrs = {
  [K in `data-${string}`]?: boolean | string | undefined;
};

/**
 * Root dropdown container. Controls open/close state and positioning behaviour.
 * Wraps `DropdownMenu.Root` from Kobalte — forwards all Kobalte root options.
 */
export interface IDropdownProps extends DropdownMenuRootProps {
  /** Menu trigger + content. */
  children?: JSX.Element;
}

/**
 * Own (non-polymorphic) props for the Trigger wrapper.
 * Kept separate so the generic `IDropdownTriggerProps<T>` can overlay them
 * on top of `ComponentProps<T>` via `PolymorphicProps`.
 */
export interface IDropdownTriggerOwnProps extends IHtmlDataAttrs {
  /** Extra CSS classes forwarded to the trigger element. */
  class?: string;
  /** Accessible tooltip shown on hover. Forwarded to the underlying element. */
  title?: string;
  /** Inline styles forwarded to the trigger element. */
  style?: JSX.CSSProperties | string;
  /** Trigger label or child element. */
  children?: JSX.Element;
}

/**
 * The element that opens / closes the dropdown when interacted with.
 * Rendered as a `<button>` by default; polymorphic via `as` prop.
 *
 * When `as` is set to a component (e.g. `Button`), all props of that component
 * are accepted and forwarded — including `variant`, `size`, etc.
 *
 * @example
 * ```tsx
 * // Renders a ghost icon-button that opens the dropdown:
 * <Dropdown.Trigger as={Button} variant="ghost" size="icon"><Icon /></Dropdown.Trigger>
 *
 * // Plain anchor trigger:
 * <Dropdown.Trigger as="a" href="#open">Open</Dropdown.Trigger>
 * ```
 */
export type IDropdownTriggerProps<T extends ValidComponent = 'button'> = PolymorphicProps<
  T,
  IDropdownTriggerOwnProps
>;

/**
 * The dropdown panel rendered inside a Portal (teleported to `document.body`).
 * Kobalte handles collision detection and automatic flipping via Floating UI.
 */
export interface IDropdownContentProps extends DropdownMenuContentProps, IHtmlDataAttrs {
  /** Extra CSS classes merged with default panel styles. */
  class?: string;
  style?: JSX.CSSProperties | string;
  /** Props forwarded to the Portal wrapper. Useful for custom `mount` targets. */
  portalProps?: DropdownMenuPortalProps;
  /** Menu items rendered inside the panel. */
  children?: JSX.Element;
}

/**
 * An interactive menu item. Calls `onSelect` when activated (click or Enter/Space).
 * Set `disabled` to prevent interaction while keeping the item visible.
 */
export interface IDropdownItemProps extends DropdownMenuItemProps, IHtmlDataAttrs {
  /** Extra CSS classes merged with default item styles. */
  class?: string;
  /** Inline styles forwarded to the item element. */
  style?: JSX.CSSProperties | string;
  /** Item label or inner content. */
  children?: JSX.Element;
}

/**
 * A non-interactive visual divider between groups of items.
 * Renders an `<hr>` with appropriate ARIA `role="separator"`.
 */
export interface IDropdownSeparatorProps extends DropdownMenuSeparatorProps {
  /** Extra CSS classes merged with default separator styles. */
  class?: string;
}

/**
 * Semantic group container. Wraps a set of related items under a common
 * `aria-labelledby` label. Children should include a `Dropdown.Label` and
 * one or more `Dropdown.Item` elements.
 */
export interface IDropdownGroupProps extends DropdownMenuGroupProps {
  /** Group label + items. */
  children?: JSX.Element;
}

/**
 * Non-interactive heading for a group. Must be rendered inside `Dropdown.Group`.
 * Does NOT receive keyboard focus.
 */
export interface IDropdownLabelProps extends DropdownMenuGroupLabelProps {
  /** Extra CSS classes merged with default label styles. */
  class?: string;
  /** Label text. */
  children?: JSX.Element;
}

/**
 * Container for a nested submenu. Wraps `DropdownMenu.Sub` from Kobalte.
 * Children must include exactly one `Dropdown.SubTrigger` and one `Dropdown.SubContent`.
 */
export interface IDropdownSubProps extends DropdownMenuSubProps {
  /** SubTrigger + SubContent. */
  children?: JSX.Element;
}

/**
 * The item inside a parent menu that opens a nested submenu on hover / arrow-right.
 * Behaves like a regular item but has an implicit `aria-haspopup="menu"`.
 */
export interface IDropdownSubTriggerProps extends DropdownMenuSubTriggerProps, IHtmlDataAttrs {
  /** Extra CSS classes merged with default sub-trigger item styles. */
  class?: string;
  /** Inline styles forwarded to the sub-trigger element. */
  style?: JSX.CSSProperties | string;
  /** Sub-trigger label. */
  children?: JSX.Element;
}

/**
 * The panel for a nested submenu, rendered inside a Portal just like `Dropdown.Content`.
 * Kobalte handles positioning relative to the parent `SubTrigger`.
 */
export interface IDropdownSubContentProps extends DropdownMenuSubContentProps, IHtmlDataAttrs {
  /** Extra CSS classes merged with default panel styles. */
  class?: string;
  style?: JSX.CSSProperties | string;
  /** Props forwarded to the Portal wrapper. */
  portalProps?: DropdownMenuPortalProps;
  /** Nested submenu items. */
  children?: JSX.Element;
}
