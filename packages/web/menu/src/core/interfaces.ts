/**
 * @capsuletech/web-menu — `/core` contract (ADR 044).
 *
 * The data model for a data-driven menu: you pass `items` (data) + actions, and
 * the menu renders every row with one canonical style, container-agnostic. This
 * file is the CONTRACT (types only); the renderer lives in `/core` impl and the
 * Kobalte wiring in `/dropdown`. web-menu is **zero-Kobalte** — it composes
 * web-ui's a11y bricks; nothing here imports `@kobalte/core`.
 *
 * @see docs/01-architecture/adr/044-web-menu-package.md
 */
import type { JSX, ValidComponent } from 'solid-js';

/** A leading-icon component (e.g. a lucide icon re-exported by web-ui/icons). */
export type MenuIcon = ValidComponent;

/**
 * HCA event hook carried by an item.
 *
 * In an app the menu is a `Shape`; items carry `meta` so the UiProxy binds the
 * activation and it surfaces as a named event in `Features` (ADR 032/033) — the
 * exemplary app stays import-less (e.g. logout = an `action` item with
 * `meta: { tags: ['logout'] }`). Exact shape is coordinated with the UiProxy
 * meta convention and may grow.
 */
export interface IMenuMeta {
  /** Raw tags bound by the UiProxy → matched on the query side. */
  tags?: string[];
}

/** Fields shared by every visible (non-divider) row. */
interface IMenuItemCommon {
  /** Stable identity for keying / `<Index>`-style rendering. */
  id: string;
  /** Optional leading icon — the only affordance (no directional arrows). */
  icon?: MenuIcon;
  /** Primary row text. */
  label: JSX.Element;
  /** Disable interaction while keeping the row visible. */
  disabled?: boolean;
  /** HCA event hook (tags) for app-level wiring. */
  meta?: IMenuMeta;
}

/**
 * A leaf command. The row ITSELF is the button — no nested `<Button>`.
 * `closeOnSelect` defaults to true (set false for sticky rows).
 */
export interface IMenuActionItem extends IMenuItemCommon {
  type: 'action';
  onSelect?: () => void;
  closeOnSelect?: boolean;
}

/**
 * A controlled toggle row: `[icon] [label] … [switch]`.
 * State is owned by the data (`checked`); the menu stays stateless.
 */
export interface IMenuToggleItem extends IMenuItemCommon {
  type: 'toggle';
  checked: boolean;
  onChange?: (next: boolean) => void;
}

/**
 * A row that opens a side panel with its own items — recursive.
 * The submenu panel is positioned by web-ui's Popover/SubContent; placement may
 * flip to either side, which is why rows carry no directional arrow.
 */
export interface IMenuSubmenuItem extends IMenuItemCommon {
  type: 'submenu';
  items: MenuItem[];
}

/**
 * Escape hatch for rich bodies (e.g. the «Фон» glow editor, «Глэс» sliders):
 * the header row stays canonical, the body is rendered via the `render` slot.
 * Controlled open-state keeps the menu stateless.
 */
export interface IMenuExpandableItem extends IMenuItemCommon {
  type: 'expandable';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Body content shown while expanded. */
  render: () => JSX.Element;
}

/** A non-interactive divider between groups. */
export interface IMenuSeparatorItem {
  type: 'separator';
  id: string;
}

/** A non-interactive group heading. */
export interface IMenuLabelItem {
  type: 'label';
  id: string;
  label: JSX.Element;
}

/**
 * The discriminated union of everything a menu can render. The menu picks the
 * renderer + canonical style per `type` — consumers never pass raw children.
 */
export type MenuItem =
  | IMenuActionItem
  | IMenuToggleItem
  | IMenuSubmenuItem
  | IMenuExpandableItem
  | IMenuSeparatorItem
  | IMenuLabelItem;

/** Props for the data-driven menu body (placed inside any overlay container). */
export interface IMenuProps {
  /** Ordered list of rows. */
  items: MenuItem[];
  /** Extra classes merged onto the menu root. */
  class?: string;
}
