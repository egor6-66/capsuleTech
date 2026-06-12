---
tags: [meta, web-ui, ai-context]
updated: 2026-05-23
status: documented
type: ai-anchor
audience: claude
---

# web-ui AI anchor

Quick orientation for Claude instances working in `packages/web/ui/`.

## Owner prompt {#owner-prompt}

Full context: `.claude/agents/owner-web-ui.md` (system prompt of owner agent).
Conventions canon: `docs/09-packages/ui/conventions.md`.
Storybook guide: `docs/09-packages/ui/storybook.md`.

## Primitives registry

**New (2026-06-01):**
- **Skeleton** (`packages/web/ui/src/primitives/skeleton/`) — placeholder loader заглушка, 5 вариантов (text, table, list, card, map). Subpath: `@capsuletech/web-ui/skeleton`. User guide: `docs/09-packages/ui/primitives/skeleton.md`.
- **Spinner** (`packages/web/ui/src/primitives/spinner/`) — крутящийся индикатор, 3 размера (sm/md/lg). Subpath: `@capsuletech/web-ui/spinner`. User guide: `docs/09-packages/ui/primitives/spinner.md`.

**Existing:**
- Button, Card, Field, Group, Input, List, Table, DataTable, Layout, Dropdown, DropdownMenu, DarkModeToggle, LayoutModeToggle, ThemePicker, WidgetSettingsToggle, PreviewCard, MapView, Typography, Link.

## Matrix v2 — rows-engine + presets + DnD (Phase 1.2 v2)

**API:** discriminated union `{ rows: IRow[] } | { preset: P; slots: LayoutPresets[P] }`.

**IRow structure:**
- `id?`, `height?: number | 'auto' | 'fr'`, `resizable?: boolean`, `cells: ICell[]`

**ICell structure:**
- `id` (required), `children`, `tag?`, `width?: number | 'auto' | 'fr'`, `resizable?`, `draggable?`, `swapGroup?`

**SlotValue (preset-mode):**
- Either `JSX.Element` (auto-wrapped to `{ children }`)
- Or `{ children, initialSize?, minSize?, maxSize?, draggable?, swapGroup? }`

**Preset `'app-shell'` (built-in):**
- Slots: `header?`, `sidebar?`, `main` (required), `rightBar?`, `footer?`
- Auto-centroid: only `main` → single-row single-cell layout
- Default swapGroups: header/footer → `'band'`, sidebar/rightBar → `'aside'`, main → undefined (no swap)
- Middle-row height = `1 - footerInitialSize` or `'fr'`

**DnD (swap mode, Phase 1.2 v2 active):**
- Badge-triggered UX: drag starts via top-right badge, cell surface disabled (`disabled: true`)
- **2-stage highlight (z-30 overlay):**
  - `canAccept` (soft): drag active + valid swapGroup + not source → border-2 border-primary/30 bg-primary/5
  - `canDrop` (strong): canAccept + pointer over → border-2 border-primary bg-primary/15
  - `isOver` (wrong group): border-2 border-border (neutral)
- **Badge visibility:** shown when 2+ draggable+resizable cells exist in same swapGroup
- **Resize persist (session-only):** `sizesSnapshot` mutable object, keyed `"v"` (vertical) + `"h:<rowKey>"` (per-row)
  - Guards against corvu cleanup-time shrinking arrays via length check
- `onLayoutChange` fires `{ kind: 'swap', a, b }` after successful swap
- DnD uses `@capsuletech/web-dnd` `createDraggable` + `createDroppable` (see [[web-dnd]])

**No setPointerCapture:** window-level listeners only (set/release capture breaks `elementFromPoint` for droppable hit-test).

## New components (PR #169–#177)

### Dropdown primitive + DropdownMenu composite

**Dropdown** (PR #173/#174):
- Kobalte-based compound via `@kobalte/core/dropdown-menu`
- Sub-components: `Dropdown.{Trigger, Content, Item, Separator, Group, Label, Sub, SubTrigger, SubContent}`
- Keyboard nav (Arrow keys, Enter, Escape), ARIA compliance, Floating UI positioning
- Portal-mounted Content/SubContent into document.body
- Available in ViewUi + WidgetUi via named re-exports (`DropdownTrigger`, `DropdownContent`, etc.)

**DropdownMenu** (PR #175):
- Higher-level composite for declarative menus
- Discriminated union API: `IDropdownMenuItem` → `item | sub | separator | group`
- Props: `trigger: JSX.Element`, `data: IDropdownMenuItem[]`, event handlers
- Symmetry with DataTable for Shape-pattern usage
- Replaces imperative nested `<Dropdown>` chaining

### DarkModeToggle, LayoutModeToggle, ThemePicker

**State split** (PR #176):
- `web-style`: state-only stores (`useTheme()`, `useDarkMode()`, `useLayoutMode()`, setters, `DISCOVERED_THEMES`)
- Module-level apply on import (no onMount flicker)
- `web-ui`: visual composites (`DarkModeToggle`, `LayoutModeToggle`, `ThemePicker`)

**ThemePicker** (PR #177):
- `mode='standalone'` (default): own Dropdown root
- `mode='sub'`: renders `Dropdown.Sub/SubTrigger/SubContent` for nesting in parent Dropdown

### DataTable + Layout improvements

**DataTable** (PR #170):
- Infinite-mode: spacer-padding pattern replaced with corvu-native (column alignment fixed)
- Container: `h-full overflow-auto`, root: `h-full flex flex-col min-h-0` (stretches to parent)
- Sticky `<thead>`, cells: `whitespace-nowrap overflow-hidden text-ellipsis`
- Horizontal scroll on width overflow, fixed row height (36px default, customizable)

**Matrix** (PR #172):
- `layoutMode='view'` (default): DnD/resize affordances OFF (no badges, dashed borders, swap engine)
- `layoutMode='edit'`: all edit-affordances ON
- Flex `handleDisabled?: boolean` prop → forwards to corvu Handle (opacity, pointer-events)

## Changelog (notable breaks)

### 0.7.1 — Polish + bug fixes (2026-05-28)

**Button**: `default` size `py` changed `py-button-sm` (8px) → `py-1.5` (6px). Buttons less "thick" in dense layouts. `sm` size stays `py-cell-tight` (8px), `lg` unchanged. Precedent: ewc nav-buttons feedback. File: `packages/web/ui/src/primitives/button/variants.ts`.

**Group separator**: orientation names now match visual line shape (were inverted). `orientation='vertical'` ⇒ `'w-px h-auto self-stretch'` (1×∞ vertical line for horizontal Group); `orientation='horizontal'` ⇒ `'h-px w-auto'` (∞×1 for vertical Group). `aria-orientation` in `GroupSeparator` no longer inverted (was compensation for CVA bug). Regression story `HorizontalAttachedWithVisibleSeparators` added. Precedent: ewc segmented `<Group variant='attached'>` feedback. Files: `group/variants.ts`, `group/group.tsx`, `group/group.stories.tsx`.

**Dropdown.Trigger**: `as?: ValidComponent` now explicitly typed in `IDropdownTriggerProps`. Runtime forwarding already worked via Kobalte + `{...others}`; this is **types-only** addition for `<Dropdown.Trigger as={Button} variant="outline">` autocomplete + type-check. Precedent: ewc Menu uses `as={Button}`. File: `dropdown/interfaces.ts`.

**Dropdown.Content**: `outline-none focus:outline-none focus-visible:outline-none` added to `dropdownContentCva`. Kobalte focuses Content panel on open for keyboard-nav; on first open, browser `:focus-visible` heuristic drew white ring. Cut at CVA level — no ring ever (Content still accessible via items focus + aria-activedescendant). Precedent: ewc Menu first-open ring complaint. File: `dropdown/variants.ts`.

**Matrix `layoutMode` prop semantics**: prop now optional with **fallback to global `useLayoutMode()`** from `@capsuletech/web-style`. If consumer passes explicit `layoutMode="view"|"edit"` — overrides global (lock instance to regime). Use case: shell-layouts staying in view even when user globally switched edit elsewhere. Old fallback was dead local signal never changing — consumer had to manually pull `useLayoutMode()` and pass through prop. Precedent: ewc dashboard simplified from manual `layoutMode={layoutMode()}` to just no prop; workspace shell locked `layoutMode='view'`. File: `layout/matrix/matrix.tsx`.

### 0.7.0 — Matrix v2: rows-engine + presets + DnD (2026-05-23)

**Breaking: `Layout.Matrix` API overhaul** (see ADR 016).

Old API (5 fixed slots, no DnD):
```tsx
<Ui.Layout.Matrix slots={{ header, main, rightBar, footer }} />
```

New API (two modes):
```tsx
// Preset mode
<Ui.Layout.Matrix preset="app-shell" slots={{ header?, main, rightBar?, footer? }} />

// Raw rows mode
<Ui.Layout.Matrix rows={[
  { cells: [{ id: 'header', tag: 'header', children: <H /> }] },
  { resizable: true, cells: [...] },
]} />
```

**Changes:**
- Rows-of-cells engine replaces hardcoded 5-slot layout
- DnD swap-mode via badge (Phase 1.2 v2): `dndMode="swap"` (default) enables drag-via-badge UX
- SlotValue now supports `swapGroup` override (preset default: `'band'` for header/footer, `'aside'` for sidebar/rightBar)
- `onLayoutChange?: (event: { kind: 'swap'; a: string; b: string }) => void`
- Resize persist: session-only `sizesSnapshot` (keyed by `"v"` / `"h:<rowKey>"`)
- Auto-centroid when only `main` slot provided (preset mode)
- Implemented in PR #132, #135

Migration: 5 fixed slots → `preset="app-shell"` (one-line change for existing code).

### 0.2.0 — Layout refactor (2026-05-20)

**Breaking: `variant` prop removed from `<Layout>`.**

Old API (4 variants):
```tsx
<Ui.Layout variant="holy-grail" slots={{ header, left, main, right, footer }} />
<Ui.Layout variant="dashboard"  slots={{ header?, sidebar, main, rightBar? }} />
<Ui.Layout variant="standard"   slots={{ header, main, footer }} />
<Ui.Layout variant="centroid"   slots={{ main }} />
```

New API (single component, 5 optional slots):
```tsx
<Ui.Layout
  slots={{
    main: <X />,         // REQUIRED
    header?: <Y />,
    sidebar?: <Y />,     // left column (replaces "left" from holy-grail)
    rightBar?: <Y />,    // right column (replaces "right" from holy-grail)
    footer?: <Y />,
  }}
/>
```

Migration guide:
- `centroid` → omit all optional slots (only `main`). Auto-centroid mode activates automatically.
- `standard` → `{ header, main, footer }` (same names).
- `dashboard` → `{ header?, sidebar, main, rightBar? }` (same names).
- `holy-grail` → `{ header, sidebar, main, rightBar, footer }` (`left` → `sidebar`, `right` → `rightBar`).

Resize behaviour is unchanged — `Layout.slot({ resizable: true, initialSize, minSize, maxSize })`.

Bug fixed: fixed (non-resizable) header/footer are no longer pushed into the corvu Resizable
group, so `fillInitialSizes` no longer steals height from them.

Deleted files: `standard.tsx`, `dashboard.tsx`, `holy-grail.tsx`, `switch.tsx`.

### 0.4.0 — List batch mode + DataTable infinite scroll (2026-05-21)

**New: `List` batch mode (opt-in, backward compat).**

Three modes now supported:

```tsx
// 1. Render-prop (existing — unchanged)
<List items={array} children={(item, idx) => <div>{item.label}</div>} />

// 2. Batch mode (new) — Shape-first, <For> inside
<List data={array} as={NavItem} itemProps={(item) => ({ label: item.label })} />

// 3. Semantic (new) — plain children, no iteration
<List><li>Home</li><li>Inbox</li></List>
```

Modes 1 & 3 render a `<div>` / `<ul>` respectively. Mode 2 renders `<ul>` with `<For>` iterating over `data`. `items + children` code is unchanged.

**New: `IColumn<TData>` typed column wrapper.**

```ts
import type { IColumn } from '@capsuletech/web-ui';

// accessorKey now constrained to keyof TData & string
const columns: IColumn<IUser>[] = [
  { accessorKey: 'id', header: 'ID' },      // valid
  // { accessorKey: 'unknown', header: 'X' }  ← TS error
];
<DataTable data={users} columns={columns} />
```

`IDataTableProps.columns` accepts `IColumn<TData>[]`. `ColumnDef<TData>[]` still accepted via structural compatibility.

**New: `DataTable` infinite scroll.**

```tsx
// Basic infinite (1000 rows, virtualizer)
<DataTable data={rows} columns={cols} infinite />

// Tuned options
<DataTable data={rows} columns={cols} infinite={{ itemHeight: 48, overscan: 10 }} />

// Server-side load-more
<DataTable
  data={rows()}
  columns={cols}
  infinite={{ threshold: 10 }}
  onLoadMore={handleLoadMore}
/>
```

When `infinite` is active:
- `@tanstack/solid-virtual` `createVirtualizer` renders only visible rows.
- Sticky `<thead>` at top of scroll container.
- `onLoadMore` fires when within `threshold` rows of the end.
- `pagination` prop is ignored (TanStack `getPaginationRowModel` not wired).

Defaults: `itemHeight: 36`, `overscan: 5`, `threshold: 5`.

`pagination` remains working for small datasets (non-deprecated in API; deprecated in JSDoc only).

### 0.6.0 — Navigation primitive removed (2026-05-22)

**Breaking: `Ui.Navigation`, `Ui.NavigationList`, `Ui.NavigationItem` removed.**

Old API:
```tsx
<Navigation orientation="horizontal">
  <Navigation.List items={items}>
    {(item) => <Navigation.Item active={item.active}>{item.label}</Navigation.Item>}
  </Navigation.List>
</Navigation>
```

New pattern — `Ui.List` batch mode + `as: Ui.Button`:
```tsx
<List data={items} as={Button} itemProps={(item) => ({
  variant: item.active ? 'secondary' : 'ghost',
  children: item.label,
})} />
```

Or via Shape batch flow: `as: Views.Nav.Item` for custom navigation item templates.

Subpath `@capsuletech/web-ui/navigation` removed from `package.json`.

Migration: replace all `<Navigation>`, `<Navigation.List>`, `<Navigation.Item>` usages with `<List batch>` pattern. No `INavigation` type imports needed — use `IList` or `IButton` as appropriate.

### 0.5.0 — Table scroll context removed (2026-05-22)

**Breaking: `Table` primitive no longer owns its scroll context.**

Old behaviour: `TableImpl` rendered `<div class="relative w-full overflow-auto scrollbar-hover">` — always created a scroll container.

New behaviour: `<div class="relative w-full">` — no overflow. Scroll is parent responsibility.

Migration for standalone `<Table>` usage (without an outer scrollable parent):
```tsx
// Before (Table self-scrolled)
<Table>...</Table>

// After — wrap in explicit scroll container
<div class="overflow-auto">
  <Table>...</Table>
</div>
```

No change needed when `<Table>` is inside `<Ui.Layout.Matrix>` main slot (already `overflow-auto`), `InfiniteTable` scroll div (its own `overflow-auto`), or any other established scroll container.

`DataTable` non-infinite mode: scroll provided by parent (Matrix main slot / story decorator).
`DataTable` infinite mode (`InfiniteTable`): has its own `overflow-auto` wrapper for virtualizer — unchanged.

Storybook stories updated: `table.stories.tsx` and `dataTable.stories.tsx` decorators now use `<div class="overflow-auto p-4">`.

### 0.3.0 — composites/ category + DataTable (2026-05-21)

**New: `src/composites/` category.** Third category alongside `primitives/` and `wrappers/`.

Purpose: higher-level assembled components with built-in smart-flow (internal `createSignal`).
They encapsulate library deps so Widget code stays clean (no `@tanstack/solid-table` import in Widget).

```
src/
  primitives/   atoms — stateless semantic wrappers
  composites/   assembled higher-level, encapsulate deps (TanStack etc.)
  lib/          internal helpers
```

**New: `DataTable` composite.**

```ts
import { DataTable } from '@capsuletech/web-ui';
import type { ColumnDef } from '@capsuletech/web-ui'; // re-exported from @tanstack/solid-table

<DataTable
  data={users}
  columns={columns}
  sorting                      // opt-in: getSortedRowModel + ↑/↓/↕ icons
  pagination={{ pageSize: 5 }} // opt-in: getPaginationRowModel + Prev/Next controls
  selection                    // opt-in: getFilteredSelectedRowModel
  filtering                    // opt-in: getFilteredRowModel (global filter)
  emptyMessage="No users."     // shown when data.length === 0
  toolbar={<Input ... />}      // rendered above table (consumer controls signal)
/>
```

All opt-in features default off. Each feature is an independent prop — adding future props (column resizing, virtualization, group/expand rows) won't break existing API.

Subpath export: `@capsuletech/web-ui/dataTable`.

### 0.3.0 — Matrix SlotValue union removed (2026-05-21)

**Breaking: JSX-shorthand slot form removed.**

Old API (union — JSX shorthand worked):
```tsx
slots={{ main: <X />, header: <Y /> }}
```

New API (only object form):
```tsx
slots={{ main: { children: <X /> }, header: { children: <Y /> } }}
```

Migration: wrap every bare JSX slot in `{ children: ... }`.

Why: `SlotValue = IResizableSlotConfig | JSX.Element` broke TS narrowing — IDE offered `Node.children` (HTMLCollection) instead of `resizable`/`initialSize`/etc. Removing the union fixes autocomplete without a factory helper.

Also removed: `declare const __slotConfigBrand: unique symbol` + `readonly [__slotConfigBrand]?: true` from `IResizableSlotConfig` (symbol-brand was invisible in autocomplete and optional — it didn't actually discriminate).

`normalizeSlot` in `utils.ts` is now a simple identity-with-default: no `typeof slot === 'object'` branch needed.

---

## Weight gradient & size manifest (canon, 2026-06-11)

> Канон-источники: [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] (zone canon), [[044-web-menu-package|ADR 044]] (heavy=pkg / light=kit), [[web-zone-kit]] (kit invariants).

### Контекст

`@capsuletech/web-ui` — единственный пакет zone `kit`. Внутри пакета — внутренний **weight-gradient L0/L1**: одни примитивы можно тащить в визитку без bandwidth-цены, другие несут a11y-overhead (floating-ui / focus-trap / keyboard navigation), который оправдан только в формах / меню / диалогах. Гарантия gradient'а — subpath-tree-shake + bundle-size assertions, **не отдельный пакет** (отдельный leaf web-primitives отвергнут: peerDep+treeshake закрывают use-case бесплатно, а второй Button = fragmentation, anti-ADR 047).

L0/L1 — **внутренняя конвенция web-ui**, не публичная классификация (потребитель видит реальные `sizeKB` в studio через manifest, см. ниже). Categorical-tag нужен для:
1. Доки/landing нарратив («3 уровня прокачки: kit-L0 → kit-L1 → boost»).
2. Bundle-size assertion: L0-subpath не имеет права тянуть `@kobalte/core/<interactive-set>` в граф.
3. Studio palette сортировка / фильтрация.

### Критерий L0 / L1

**L0 — presentational + native control:**
- Никакого floating-ui (Popper/positioner).
- Никакого focus-trap'а.
- Никакого keyboard-navigation поверх native focus/tabindex.
- Никакого portal'а.
- Featherweight Kobalte (`@kobalte/core/polymorphic`, `@kobalte/core/separator`, `@kobalte/core/skeleton`) допустимо — это разметка с role-атрибутом, не behavior.
- Bandwidth-cost: единицы kB per primitive (gzip).

**L1 — interactive с pattern overhead:**
- Floating-ui, popover, focus-trap, keyboard pattern (roving tabindex, arrow-keys), portal.
- Bandwidth-cost: десятки kB при первом включении (Kobalte interactive base + floating-ui).

### Initial seed list (на момент 2026-06-11)

На основе grep'а `packages/web/ui/src/primitives/` — owner-web-ui уточняет конкретные строчки через bundle-test (W4 plan-doc). Это **seed**, не final.

**L0 (presentational + native + featherweight Kobalte):** (финальный seed list 2026-06-12)
- `typography`, `card`, `layout`, `list`, `group`, `field`, `widget-frame`
- `separator` (Kobalte separator — featherweight role-prim)
- `skeleton`, `spinner` (skeleton — Kobalte skeleton featherweight)
- `slot` (Kobalte polymorphic — featherweight)
- `label`, `button`, `input`, `textarea`, `table` (native HTML + CVA classes; никакого floating/focus-trap'а)
- `flex`, `grid` (layout primitives; corvu external)

**L1 (interactive Kobalte / floating / focus-trap):**
- `accordion` (Kobalte accordion)
- `dropdown` (Kobalte dropdown-menu)
- `select` (Kobalte select / combobox)
- `slider` (Kobalte slider)
- `toggle` (Kobalte toggle — state pattern)
- `tooltip` (Kobalte tooltip — popover+timing)
- `dropdownMenu`, `menu`, `dataTable`, `previewCard`, `wrappers`, `compositeProxy` — composites над interactive базовыми / motionone

### Размеры (gzip kB, calibrated 2026-06-12)

Числа — **наш wrapper-код** (peer deps externalized). Consumer платит peer dep cost отдельно.

| Subpath | sizeKB | weight | Kobalte deps |
|---|---|---|---|
| slot | 0.23 | L0 | polymorphic ✓ |
| label | 0.49 | L0 | — |
| separator | 0.49 | L0 | separator ✓ |
| spinner | 0.63 | L0 | — |
| table | 0.68 | L0 | — |
| input | 0.88 | L0 | — |
| typography | 0.92 | L0 | — |
| textarea | 0.94 | L0 | — |
| grid | 1.14 | L0 | — |
| skeleton | 1.25 | L0 | skeleton ✓ |
| list | 1.82 | L0 | — |
| button | 2.09 | L0 | — |
| card | 2.14 | L0 | — |
| field | 2.15 | L0 | — |
| widgetFrame | 2.47 | L0 | — |
| flex | 10.60 | L0 | — (corvu inside but external) |
| layout | 11.34 | L0 | — |
| group | 11.69 | L0 | — |
| **L0 ceiling** | **12.00** | — | (test-enforced) |
| compositeProxy | 0.13 | L1 | — |
| tooltip | 0.95 | L1 | tooltip |
| accordion | 0.99 | L1 | accordion |
| toggle | 1.11 | L1 | toggle |
| slider | 1.17 | L1 | slider |
| previewCard | 1.68 | L1 | — |
| dropdown | 2.13 | L1 | dropdown-menu |
| select | 2.29 | L1 | select |
| dropdownMenu | 2.39 | L1 | dropdown-menu |
| menu | 4.44 | L1 | dropdown-menu |
| dataTable | 5.74 | L1 | — (TanStack table inside) |
| wrappers | 10.89 | L1 | — (motionone inside) |

**Boost-mirror placeholders (light в kit, heavy в boost-zone):**
- `Ui.Grid` (light, существующий) ↔ `boost-matrix` / `boost-table` (heavy)
- `Ui.Map` (placeholder, добавляется в Phase B6) ↔ `boost-map`
- `Ui.Flow` (placeholder, добавляется) ↔ `boost-flow`
- `Ui.Chart` (placeholder, добавляется) ↔ `boost-charts`

### Manifest schema — для studio

Build-time из web-ui генерится `packages/web/ui/dist/manifest.json` — карта реальных bundle-цен per primitive. Studio palette/inspector читает manifest, рисует бейдж рядом с каждым примитивом.

```ts
// packages/web/ui/src/manifest/types.ts
export interface IPrimitiveManifestEntry {
  /** Primitive name (matches subpath: @capsuletech/web-ui/<name>) */
  name: string;
  /** Weight category — для нарратива/фильтра. Реальная цена в sizeKB. */
  weight: 'L0' | 'L1';
  /** Subpath import string */
  subpath: string; // e.g. '@capsuletech/web-ui/button'
  /** Real gzip-cost (kB) измеренный build-time'ом */
  sizeKB: number;
  /** External deps в graph'е этого subpath'а (после tree-shake'а) */
  externals: string[]; // e.g. ['@kobalte/core/dropdown-menu', 'solid-js']
  /** Slot tags (для UiProxy meta-routing) */
  slotTags?: string[];
  /** Variants (если CVA) — для inspector dropdown'а */
  variants?: Record<string, string[]>;
}

export interface IWebUiManifest {
  version: string;             // semver web-ui
  generatedAt: string;         // ISO timestamp
  primitives: IPrimitiveManifestEntry[];
}
```

### Bundle-size assertion (W4 — owner-web-ui)

Тест-сюита (vitest) импортит каждый L0-subpath отдельно, измеряет bundle, проверяет:

1. L0-subpath НЕ содержит `@kobalte/core/<interactive-set>` (allowlist: `polymorphic`, `separator`, `skeleton`). Регрессия = test failure.
2. L0-subpath bundle < N kB (gzip; точный N — owner-web-ui калибрует на seed list'е).
3. L1-subpath может содержать соответствующий Kobalte interactive — это ок.
4. Manifest регенерится при build'е (`pnpm --filter @capsuletech/web-ui build:manifest`), CI gates на отсутствие drift'а между manifest.json и actual subpath'ом.

### Studio palette UX

После W4 + manifest:

```
[Palette]
─ L0 — presentational ─────────────
  ◫  Card           0.8 kB
  Tab  Typography   0.4 kB
  ▭  Flex (Group)   0.5 kB
  ─  Separator      0.3 kB
  …

─ L1 — interactive ───────────────
  ◯  Dropdown      12.4 kB   ⓘ Kobalte DropdownMenu
  ⬚  Select        13.1 kB   ⓘ Kobalte Select
  …

─ Boost ─────────────────────────
  ▦  Tables.DataTable    62 kB   ⓘ @capsuletech/boost-table
  🗺  Maps.MapView       180 kB   ⓘ @capsuletech/boost-map
  …
```

User видит **реальную цену** при выборе примитива → принимает информированное решение. Это закрывает требование «при сборке в web-studio надо знать размер компонента».

### Migration notes (для будущих PR'ов)

- **W3 (этот раздел)** — convention + schema (это документ). Изменений в коде нет.
- **W4 — owner-web-ui** — implementation:
  1. Bundle-size assertion в vitest (`packages/web/ui/test/bundle-size.test.ts`).
  2. Build-step генерации `manifest.json` (`packages/web/ui/scripts/build-manifest.ts` или плагин Vite-builder'а).
  3. Subpath audit — какие из текущих subpath'ов соответствуют L0 critery (re-org если нужно).
  4. Update OWNERSHIP «Состояние» — manifest infra.
- **Studio consumer** — отдельный PR в `@capsuletech/studio` (после W4), реализует palette badge.

### Что НЕ делаем (отвергнутая альтернатива)

**Отдельный leaf-пакет `@capsuletech/web-primitives` (L0-only, zero Kobalte):**
- Структурно защитимо: жёсткий barrier между L0 и L1.
- Цена: +один пакет, риск «двух Button» при росте L0, fragmentation.
- Сейчас НЕ оправдано — peerDep + subpath-treeshake + bundle-test дают тот же эффект бесплатно. Anti-premature per ADR 047 «делаем максимально правильно, но не делаем чего не нужно сейчас».
- Если в будущем bundle-test поймает регулярную регрессию L0 → re-evaluate.

### Related

- [[web-zone-kit]] — zone canon (kit invariants).
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] — zones + vendor transparency.
- [[044-web-menu-package|ADR 044]] — heavy=pkg / light=kit principle.
- [[web-rework-plan]] — Phase W (W3 — этот раздел, W4 — implementation).
