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
import { Input } from '@capsuletech/web-ui/input';
import { Label } from '@capsuletech/web-ui/label';
import { List } from '@capsuletech/web-ui/list';
import { Separator } from '@capsuletech/web-ui/separator';
import { Skeleton } from '@capsuletech/web-ui/skeleton';
import { Spinner } from '@capsuletech/web-ui/spinner';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Index, lazy, Match, Show, Switch } from 'solid-js';
import { Dynamic } from 'solid-js/web';

// Re-export static critical-path primitives
export { Button, Input, Label, Separator, Toggle, Typography };

// Layout namespace: Grid + Flex (static). Matrix переехал в @capsuletech/web-shell.
export const Layout = { Grid, Flex };

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

// ---------------------------------------------------------------------------
// Light placeholders for heavy boost-* mirrors.
// Zero-engine-dep visuals shipped via web-ui (kit) per ADR 044 / 046 D3.
// Apps without boost-{map,flow,charts} in their bundle can still render these
// as preview / pre-mount skeletons. Heavy mirrors override at the global
// registry level (Maps.* / Flows.* / Charts.*) via ADR 033 manifests.
//
// Naming notes:
//   - `Ui.MapView` (NOT `Ui.Map`) — `Map` is a built-in JS class; shadowing
//     it is flagged by lint. `MapView` also mirrors heavy boost-map root.
//   - `Ui.FlowDiagram` (NOT `Ui.Flow`) — `Ui.Flow.*` namespace is reserved
//     for Solid control-flow (For/Show/Switch/Match/Index/Dynamic) defined
//     further below.
//   - `Ui.Chart` — no naming conflict (no built-in Chart class).
// ---------------------------------------------------------------------------
export const MapView = createLazy(() => import('@capsuletech/web-ui/map'), 'MapView');
export const FlowDiagram = createLazy(
  () => import('@capsuletech/web-ui/flow-diagram'),
  'FlowDiagram',
);
export const Chart = createLazy(() => import('@capsuletech/web-ui/chart'), 'Chart');

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
