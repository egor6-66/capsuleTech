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
import { Matrix } from '@capsuletech/web-ui/matrix';
import { Separator } from '@capsuletech/web-ui/separator';
import { Skeleton } from '@capsuletech/web-ui/skeleton';
import { Spinner } from '@capsuletech/web-ui/spinner';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Index, lazy, Match, Show, Switch } from 'solid-js';
import { Dynamic } from 'solid-js/web';

// Re-export static critical-path primitives
export { Button, Input, Label, Separator, Toggle, Typography };

// Layout namespace: Grid + Flex + Matrix (static)
export const Layout = { Grid, Flex, Matrix };

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

// Animate / Resizable — motionone (~46KB), only used in specific animated sections
export const Animate = createLazy(() => import('@capsuletech/web-ui/wrappers'), 'Animate');
export const Resizable = createLazy(() => import('@capsuletech/web-ui/wrappers'), 'Resizable');

// DataTable — 126KB (tanstack-table + virtual), not in every page
export const DataTable = createLazy(() => import('@capsuletech/web-ui/dataTable'), 'DataTable');

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

// Table — raw HTML table primitives (used for custom table layouts, not every page)
const TableBase = createLazy(() => import('@capsuletech/web-ui/table'), 'Table');
export const Table = Object.assign(TableBase, {
  Header: createLazy(() => import('@capsuletech/web-ui/table'), 'TableHeader'),
  Body: createLazy(() => import('@capsuletech/web-ui/table'), 'TableBody'),
  Row: createLazy(() => import('@capsuletech/web-ui/table'), 'TableRow'),
  Head: createLazy(() => import('@capsuletech/web-ui/table'), 'TableHead'),
  Cell: createLazy(() => import('@capsuletech/web-ui/table'), 'TableCell'),
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

// Switcher widgets — tiny but pull web-style hooks; header-only, not critical path
export const DarkModeToggle = createLazy(
  () => import('@capsuletech/web-ui/darkModeToggle'),
  'DarkModeToggle',
);
export const LayoutModeToggle = createLazy(
  () => import('@capsuletech/web-ui/layoutModeToggle'),
  'LayoutModeToggle',
);
export const ThemePicker = createLazy(
  () => import('@capsuletech/web-ui/themePicker'),
  'ThemePicker',
);
export const WidgetSettingsToggle = createLazy(
  () => import('@capsuletech/web-ui/widgetSettingsToggle'),
  'WidgetSettingsToggle',
);

// MapView — ~1.5MB maplibre-gl; always lazy
const MapViewBase = createLazy(() => import('@capsuletech/web-map'), 'MapView');
export const MapView = Object.assign(MapViewBase, {
  Source: createLazy(() => import('@capsuletech/web-map'), 'Source'),
  Layer: createLazy(() => import('@capsuletech/web-map'), 'Layer'),
  Terrain: createLazy(() => import('@capsuletech/web-map'), 'Terrain'),
  Sky: createLazy(() => import('@capsuletech/web-map'), 'Sky'),
  Marker: createLazy(() => import('@capsuletech/web-map'), 'Marker'),
  TerrainPreset: createLazy(() => import('@capsuletech/web-map'), 'TerrainPreset'),
  BuildingsPreset: createLazy(() => import('@capsuletech/web-map'), 'BuildingsPreset'),
});

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
