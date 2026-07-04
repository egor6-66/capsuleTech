// ---------------------------------------------------------------------------
// Static imports — critical-path, cheap, always on the render waterfall.
// Known to Vite at build time → emits modulepreload hints → loads in parallel.
// ---------------------------------------------------------------------------

import { Button } from '@capsuletech/web-ui/button';
// Card and Field: each subpath index already assembles the compound (Card.Header etc.)
// so a single static import gives the full compound without any Object.assign here.
import { Card } from '@capsuletech/web-ui/card';
import { Field } from '@capsuletech/web-ui/field';
import { Flex } from '@capsuletech/web-ui/flex';
import { Grid } from '@capsuletech/web-ui/grid';
import { Group as GroupBase, GroupSeparator } from '@capsuletech/web-ui/group';
import { Icons } from '@capsuletech/web-ui/icons';
import { Input } from '@capsuletech/web-ui/input';
import { Label } from '@capsuletech/web-ui/label';
import { type ILayoutNamespace, Layout as KitLayout } from '@capsuletech/web-ui/layout';
import { List } from '@capsuletech/web-ui/list';
import { Separator } from '@capsuletech/web-ui/separator';
import { Skeleton } from '@capsuletech/web-ui/skeleton';
import { Spinner } from '@capsuletech/web-ui/spinner';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Index, lazy, Match, Show, Switch } from 'solid-js';
import { Dynamic } from 'solid-js/web';

// Re-export static critical-path primitives
/**
 * Curated icon namespace for app-layer global access via `Ui.Icons.*`.
 *
 * Apps cannot import @capsuletech/web-ui/icons directly — the widget/view/page
 * compliance allowlist permits only solid-js imports. This namespace gives
 * app authors `<Ui.Icons.GripVertical />` through UiProxy injection without
 * any import keyword in their View/Widget/Page factories.
 *
 * UiProxy bypasses wrapComponent for this namespace (see RAW_PASSTHROUGH_KEYS
 * in engine/ui-proxy.tsx) — icons are pure SVG renders, no meta/store binding.
 *
 * Tree-shaking: only the icons in `iconRegistry` are imported — no full
 * lucide-solid bundle in app chunks.
 */
export { Button, Icons, Input, Label, Separator, Toggle, Typography };

// Layout namespace: Grid + Flex (static). Heavy variants (Matrix etc.) live
// in @capsuletech/boost-layout and augment this object at app boot via ADR 033
// capsule.ts manifests (per ADR 046 D5).
export const Layout: ILayoutNamespace = { Grid, Flex, Resizable: KitLayout.Resizable };

// List, Skeleton, Spinner (static)
export { List, Skeleton, Spinner };

// Group: web-ui/group exports flat Group + GroupSeparator; assemble compound here (static)
export const Group = Object.assign(GroupBase, {
  Separator: GroupSeparator,
});

// Card and Field: sub-components are already attached by web-ui/card and
// web-ui/field index files, so the static import gives the full compound.
export { Card, Field };

// ---------------------------------------------------------------------------
// Lazy imports — heavy / optional / route-specific.
// These are NOT on the critical shell path and would bloat the initial bundle.
// ---------------------------------------------------------------------------

// 1. Хелпер для сокращения записи
const createLazy = (importer: () => Promise<any>, name: string) =>
  lazy(() => importer().then((m) => ({ default: m[name] })));

// Resizable — motionone, only used in specific resizable sections
export const Resizable = createLazy(() => import('@capsuletech/web-ui/wrappers'), 'Resizable');

// PreviewCard — single-item renderer, optional; separate chunk
export const PreviewCard = createLazy(
  () => import('@capsuletech/web-ui/previewCard'),
  'PreviewCard',
);

// DropdownMenu — declarative composite, kobalte-heavy
export const DropdownMenu = createLazy(
  () => import('@capsuletech/web-ui/dropdownMenu'),
  'DropdownMenu',
);

// Menu — data-driven menu composite (canonical rows + Menu.Dropdown), kobalte-heavy.
// Base 'Menu' is the container-agnostic list; '.Dropdown' is the ready dropdown.
const MenuBase = createLazy(() => import('@capsuletech/web-ui/menu'), 'Menu');
export const Menu = Object.assign(MenuBase, {
  Dropdown: createLazy(() => import('@capsuletech/web-ui/menu'), 'MenuDropdown'),
});

// Dropdown — 126KB, kobalte-heavy, only used where explicit dropdown menus appear
const DropdownBase = createLazy(() => import('@capsuletech/web-ui/dropdown'), 'Dropdown');
export const Dropdown = Object.assign(DropdownBase, {
  Trigger: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownTrigger'),
  Content: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownContent'),
  Item: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownItem'),
  Separator: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownSeparator'),
  Group: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownGroup'),
  Label: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownLabel'),
  Sub: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownSub'),
  SubTrigger: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownSubTrigger'),
  SubContent: createLazy(() => import('@capsuletech/web-ui/dropdown'), 'DropdownSubContent'),
});

// Tooltip — kobalte-heavy, only used where tooltips appear
const TooltipBase = createLazy(() => import('@capsuletech/web-ui/tooltip'), 'Tooltip');
export const Tooltip = Object.assign(TooltipBase, {
  Trigger: createLazy(() => import('@capsuletech/web-ui/tooltip'), 'TooltipTrigger'),
  Content: createLazy(() => import('@capsuletech/web-ui/tooltip'), 'TooltipContent'),
  Arrow: createLazy(() => import('@capsuletech/web-ui/tooltip'), 'TooltipArrow'),
});

// Select — kobalte-heavy, compound (Trigger/Content/Value); data-driven via options[]
const SelectBase = createLazy(() => import('@capsuletech/web-ui/select'), 'Select');
export const Select = Object.assign(SelectBase, {
  Trigger: createLazy(() => import('@capsuletech/web-ui/select'), 'SelectTrigger'),
  Content: createLazy(() => import('@capsuletech/web-ui/select'), 'SelectContent'),
  Value: createLazy(() => import('@capsuletech/web-ui/select'), 'SelectValue'),
});

// Textarea — multiline text input, mirrors Input in styling conventions
export const Textarea = createLazy(() => import('@capsuletech/web-ui/textarea'), 'Textarea');

// Image — kobalte-backed responsive image with fallback; not on the critical shell path
export const Image = createLazy(() => import('@capsuletech/web-ui/image'), 'Image');

// Avatar — thin composition over Image (circular, string-fallback convenience)
export const Avatar = createLazy(() => import('@capsuletech/web-ui/avatar'), 'Avatar');

// ---------------------------------------------------------------------------
// Augmentation-ready namespaces for boost-* extensions (per ADR 046 D5).
// Kit ships a basic member in each namespace as a light placeholder; boost-*
// packages augment the same namespace with heavy variants at app boot via
// ADR 033 capsule.ts. Single user-facing API path Ui.<Element>.* for both.
//
// Examples:
//   <Ui.Map.View />         (kit basic)
//   <Ui.Map.3D />           (boost-map augmentation — requires @capsuletech/boost-map)
//   <Ui.Chart.Basic />      (kit basic)
//   <Ui.Chart.Line />       (boost-chart augmentation)
//   <Ui.FlowDiagram.Static />     (kit basic)
//   <Ui.FlowDiagram.Reactive />   (boost-flow augmentation)
//
// NB: `Ui.FlowDiagram` (NOT `Ui.Flow`) — `Ui.Flow.*` namespace is reserved for
// Solid control-flow primitives (For/Show/Switch/Match/Index/Dynamic) defined
// further below.
// ---------------------------------------------------------------------------
// Local name avoids shadowing built-in `Map` (biome noShadowRestrictedNames);
// re-exported as `Map` for the canonical Ui.Map.* namespace.
const MapNs = {
  View: createLazy(() => import('@capsuletech/web-ui/map'), 'MapView'),
};

export { MapNs as Map };
export const FlowDiagram = {
  Static: createLazy(() => import('@capsuletech/web-ui/flow-diagram'), 'FlowDiagram'),
};
export const Chart = {
  Basic: createLazy(() => import('@capsuletech/web-ui/chart'), 'Chart'),
};

// NB: connected mode-toggles + theme picker moved to `@capsuletech/web-shell`
// (tier-2, ADR 032). They hold web-style state, so they are no longer part of
// the stateless `Ui` namespace — apps import them from `@capsuletech/web-shell/ui`.

// Реэкспорт сторонних утилит
export { Link } from '@tanstack/solid-router';

/**
 * Solid control-flow primitives namespaced under `Flow` so app authors can
 * write `<Ui.Flow.For each={...}>` / `<Ui.Flow.Show when={...}>` without
 * importing from solid-js directly in View/Widget factories.
 *
 * These are raw Solid components — NOT wrapped by UiProxy. The UiProxy `get`
 * trap recognises the 'Flow' key and returns this object verbatim (see
 * engine/ui-proxy.tsx). Wrapping would break render-prop children patterns
 * (For's function child, Show's fallback, Switch/Match nesting).
 */
export const Flow = {
  For,
  Show,
  Switch,
  Match,
  Index,
  Dynamic,
};
