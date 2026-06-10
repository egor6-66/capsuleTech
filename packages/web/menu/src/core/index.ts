// @capsuletech/web-menu/core — data model + (TODO) renderer.
//
// The contract (MenuItem union, IMenuProps) is the stable surface; the renderer
// that walks `items` and emits canonical rows lands here next (ADR 044).

export type {
  IMenuActionItem,
  IMenuExpandableItem,
  IMenuLabelItem,
  IMenuMeta,
  IMenuProps,
  IMenuSeparatorItem,
  IMenuSubmenuItem,
  IMenuToggleItem,
  MenuIcon,
  MenuItem,
} from './interfaces';

// TODO(web-menu): renderItems(items) — maps each MenuItem to its canonical
// renderer, composing web-ui a11y bricks (Item/SubTrigger). Stays stateless.
