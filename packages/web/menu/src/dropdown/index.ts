// @capsuletech/web-menu/dropdown — dropdown variant (TODO, ADR 044).
//
// `Menus.Dropdown` — composes web-ui's Kobalte a11y bricks (Item/SubTrigger/
// SubContent) with the `/core` renderer: keyboard nav, submenu-on-hover. Placed
// inside a web-ui Dropdown.Content / Popover by the consumer.
//
// web-menu is zero-Kobalte: it imports web-ui primitives, never @kobalte/core.

export type { IMenuProps, MenuItem } from '../core';

// TODO(web-menu): export const Menu = (props: IMenuProps) => …
