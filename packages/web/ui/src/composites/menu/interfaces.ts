import type { DropdownMenuRootProps } from '@kobalte/core/dropdown-menu';
import type { JSX } from 'solid-js';

import type { IconName } from '../../icons';

/**
 * HCA target meta carried by a menu item. `tags` drive named-event binding when
 * the item is rendered inside a Controller/Feature — web-core's events wrapper
 * (injected via CompositeProxyContext) reads it off the row props and emits the
 * matching HCA event. Standalone (Storybook / unit tests) it is a harmless no-op.
 */
export interface IMenuItemMeta {
  /** Event tags — resolved to a named handler by the parent Controller/Feature. */
  tags: string[];
  [k: string]: unknown;
}

/** Fields shared by every interactive (non-structural) menu item. */
interface IMenuItemBase {
  /** Stable key for list reconciliation. */
  id: string;
  /**
   * Leading icon — a typed string name resolved from `web-ui/icons` (NOT a
   * component / SVG). Keeps the descriptor serializable for config-driven and
   * alternative-renderer use.
   */
  icon?: IconName;
  /** Primary row text. */
  label?: JSX.Element;
  /** Render the row but block interaction. */
  disabled?: boolean;
  /** HCA tags — bound to a named event when rendered inside a Controller. */
  meta?: IMenuItemMeta;
  /** Extra payload forwarded with the HCA event. */
  payload?: Record<string, unknown>;
}

/**
 * A clickable action row — the item IS the button. Fires `onSelect` on activation
 * and, when `meta` is set, emits a named HCA event via the events wrapper.
 */
export interface IMenuActionItem extends IMenuItemBase {
  type: 'action';
  /** Direct activation handler (click / Enter / Space). */
  onSelect?: (event: Event) => void;
  /** Keep the menu open after selecting. Defaults to closing. */
  closeOnSelect?: boolean;
}

/** A controlled switch row — `[icon] label … [Toggle]`. State lives outside. */
export interface IMenuToggleItem extends IMenuItemBase {
  type: 'toggle';
  /** Controlled checked state. */
  checked: boolean;
  /** Called with the next state on toggle. */
  onChange?: (checked: boolean) => void;
}

/** A nested submenu — recursive `items[]` rendered into a side panel. */
export interface IMenuSubmenuItem extends IMenuItemBase {
  type: 'submenu';
  /** Nested items (recursive). */
  items: MenuItem[];
}

/**
 * A submenu with a free-form body (render slot) rather than recursive items —
 * for rich panels (sliders, editors). Optionally controlled via `open`.
 */
export interface IMenuExpandableItem extends IMenuItemBase {
  type: 'expandable';
  /** Render the panel body. */
  render: () => JSX.Element;
  /** Controlled open state of the side panel. */
  open?: boolean;
  /** Open-state change callback (controlled mode). */
  onOpenChange?: (open: boolean) => void;
}

/** A non-interactive visual divider. */
export interface IMenuSeparatorItem {
  type: 'separator';
  /** Stable key for list reconciliation. */
  id: string;
}

/** A non-interactive section heading. */
export interface IMenuLabelItem {
  type: 'label';
  /** Stable key for list reconciliation. */
  id: string;
  /** Heading text. */
  label: JSX.Element;
}

/** Discriminated union of every menu item descriptor. */
export type MenuItem =
  | IMenuActionItem
  | IMenuToggleItem
  | IMenuSubmenuItem
  | IMenuExpandableItem
  | IMenuSeparatorItem
  | IMenuLabelItem;

/**
 * Props for the container-agnostic `Menu` list. Renders the canonical rows for
 * `items` with no surrounding chrome — place inside any panel
 * (`Dropdown.Content`, a popover, a sidebar) yourself, or use `Menu.Dropdown`.
 */
export interface IMenuProps {
  /** Declarative item tree. */
  items: MenuItem[];
}

/**
 * Props for the `Menu.Dropdown` convenience — a ready dropdown that wraps the
 * `Menu` list in a web-ui `Dropdown` container with the given `trigger`.
 */
export interface IMenuDropdownProps
  extends Pick<
    DropdownMenuRootProps,
    'open' | 'defaultOpen' | 'onOpenChange' | 'placement' | 'gutter'
  > {
  /** The element that opens the menu (typically a `<Button>`). */
  trigger: JSX.Element;
  /** Declarative item tree. */
  items: MenuItem[];
}
