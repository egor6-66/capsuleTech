import type { JSX, ValidComponent } from 'solid-js';

import type { BuiltinMode } from '../modeToggle/interfaces';

/**
 * A single custom action item in the Header menu.
 *
 * Rendered as `Dropdown.Item`. Unlike built-in mode-toggles (which manage
 * web-style state directly), custom items carry no bound state — the caller
 * decides what to do on activation.
 *
 * Binding pattern (ADR 032): the app wraps `onSelect` with `useEmit` so the
 * click reaches the nearest Controller/Feature in the tree:
 *
 * ```tsx
 * const emit = useEmit();
 * <Shell.Header
 *   menu={{
 *     items: [
 *       {
 *         label: 'Logout',
 *         onSelect: () => emit('onClick', { payload: { tags: ['logout'] } }),
 *       },
 *     ],
 *   }}
 * />
 * ```
 *
 * This keeps `/ui` free of `@capsuletech/web-core` while still routing events
 * through the HCA dispatch path.
 */
export interface IHeaderMenuItem {
  /** Visible label rendered inside the `Dropdown.Item`. */
  label: string;
  /** Called when the item is selected (click or keyboard Enter/Space). */
  onSelect?: () => void;
}

/**
 * A single navigation item in the Header bar.
 *
 * `to` is passed through to the link component. The nav button receives active
 * styling via `aria-[current=page]` — TanStack Router sets this attribute when
 * the route is active, so no explicit `active` prop is needed.
 *
 * `linkComponent` defaults to a native `<a>` element; pass a TanStack Router
 * `<Link>` (or any other routing component) to enable client-side navigation:
 *
 * ```tsx
 * import { Link } from '@tanstack/solid-router';
 * <Shell.Header nav={[{ label: 'Dashboard', to: '/dashboard', linkComponent: Link }]} />
 * ```
 */
export interface IHeaderNavItem {
  /** Visible label for the navigation button. */
  label: string;
  /**
   * Destination — forwarded to `linkComponent` as `to` (for router links) or
   * `href` (for native anchors). Header does not interpret this value.
   */
  to: string;
  /**
   * The polymorphic component used to render the nav link.
   * Defaults to a native `<a>` element (`href` = `to` value).
   * Pass a TanStack Router `Link` for SPA navigation.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkComponent?: ValidComponent;
}

export interface IHeaderMenuProps {
  /**
   * Which built-in mode-toggles to show.
   * Defaults to all four: `['dnd', 'resize', 'settings', 'dark']`.
   */
  modes?: BuiltinMode[];
  /**
   * Whether to include the `ThemePicker` sub-menu.
   * Defaults to `true`.
   */
  theme?: boolean;
  /**
   * Additional action items appended after the Theme group (e.g. Logout).
   * Each item is rendered as a `Dropdown.Item` in its own group.
   */
  items?: IHeaderMenuItem[];
}

export interface IHeaderProps {
  /** Optional leading slot — rendered to the left of the nav links (e.g. a logo). */
  brand?: JSX.Element;
  /**
   * Navigation links rendered as routing buttons.
   * Each entry becomes a `Button` with a configurable link component.
   * Active-state styling uses `aria-[current=page]` set by the router.
   */
  nav?: IHeaderNavItem[];
  /** Menu configuration for the right-side hamburger dropdown. */
  menu?: IHeaderMenuProps;
}
