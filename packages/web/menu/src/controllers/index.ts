// @capsuletech/web-menu/controllers — HCA adapter (TODO, ADR 032/044).
//
// `Controllers.Menu` — wires item activation to named events via `useEmit`, so
// app `Features` catch them as `Feature<Menus.Events>` (ADR 033). Landing with
// the renderer.

export type { MenuItem } from '../core';

// TODO(web-menu): export const MenuController = …  (useEmit-based)
