---
name: "@capsuletech/web-ui"
owner-agent: owner-web-ui
group: web_base
zone: kit
status: stable
priority: P0
last-updated: 2026-07-04
---

# @capsuletech/web-ui

Stateless UI-kit для capsule: 16 primitives (Button, Input, Card, Field, Toggle, Tooltip, Typography, ...) + layout-namespace (`Layout.Grid`, `Layout.Flex`, `Layout.Matrix`). Polymorphic через Slot (Kobalte), CVA + createStyle (из web-style), themed tokens only.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `kit` — единственный пакет zone'ы; внутренний weight-gradient L0/L1 (см. [[web-ui]] раздел «Weight gradient»).
- **Status:** `stable` — пользуется во всех capsule-аппах + публикуется в release-group `web_base`.
- **Priority:** **P0** — критичный путь; любой capsule-апп зависит на web-ui.
- **Maturity bar (до 1.0):**
  - L0/L1 gradient формализован bundle-size assertion'ом (W4 — pending).
  - manifest.json генерится build-time'ом для studio palette badge (W4 — pending).
  - Все primitives имеют DOM/render unit-test покрытие (сейчас structural-only из-за vitest Solid transform gap).
  - Visual regression CI (Chromatic / Playwright).
- **Active blockers:** Vitest Solid transform — `.tsx` файлы не импортируются в jsdom unit'ах (см. План рефакторинга). Не блокирует фичи, блокирует unit coverage.
- **Roadmap (3-5):**
  1. W4 — bundle-size assertions + manifest.json (per [[web-rework-plan]] Phase W).
  2. Ui.Map/Flow/Chart placeholder'ы (после W6 boost-renames).
  3. Vitest Solid transform → разблокировать DOM-render unit-coverage.
  4. Visual regression CI.
- **Last activity:** 2026-07-04 (Resizable `handleActive` + `handleVariant='ghost'`, briefs web-ui-resizable-handle-contract / web-ui-resizable-ghost-handle).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@kobalte/core`** (`^0.13.0`, peerDep) — a11y-headless. Tree-shakeable per primitive. Используется для interactive primitives (Dropdown/Tooltip/Slider/Accordion/Select) + Polymorphic Slot. https://kobalte.dev/
- **class-variance-authority** (`^0.7.1`, dep) — variant API. Используется через `web-style/createStyle`. https://cva.style/
- **`@corvu/resizable`** (`^0.2.5`, dep) — resize-handles внутри Flex/Matrix. https://corvu.dev/
- **`@tanstack/solid-table`** (`^8.21.3`, peerDep) — head-less table engine для composite `DataTable`. https://tanstack.com/table/
- **`@tanstack/solid-virtual`** (`^3.13.24`, peerDep) — virtual-scroll для `DataTable infinite`. https://tanstack.com/virtual/
- **lucide-solid** (`^1.16.0`, dep) — icon-set. Owned in `src/icons/registry.ts` (2026-06-09 — не отдельный пакет).
- **Tailwind v4** (через web-style peerDep) — token CSS. https://tailwindcss.com/

## Зона ответственности

### Категории src/

| Категория | Что | Примеры |
|---|---|---|
| `primitives/` | Atoms — stateless semantic wrappers над HTML-элементами. Не знают о TanStack/Kobalte внутри. | Button, Input, Card, Table, Field, Layout/* |
| `composites/` | Higher-level assembled components с встроенным smart-flow. Инкапсулируют library deps (e.g. TanStack Table внутри DataTable). Stateful (createSignal внутри), но stateless в смысле бизнес-логики (только UI-state). | DataTable |
| `wrappers/` | Internal animation/status wrappers. | animate, status |

### Owns

- `packages/web/ui/src/primitives/` — все primitives: button, input, label, card, field, flex, grid, list, separator, slot, table, toggle, typography, matrix, image, avatar, wrappers/* (animate, resizable как internal `flex/_resize/`).
- `packages/web/ui/src/composites/` — assembled higher-level components: DataTable (инкапсулирует `@tanstack/solid-table`).
- `packages/web/ui/.storybook/` — Storybook config (`main.ts`, `vite.config.ts`, `preview.ts`).
- `packages/web/ui/.babelrc` — Babel config для CVA.
- `packages/web/ui/vite.config.mts` — build config (multi-entry, один subpath per primitive).
- `packages/web/ui/package.json` — exports / deps / peerDeps.
- Все `*.stories.tsx` рядом с primitives.

### Не трогает

- Theme tokens, createStyle, cn, merge — `owner-web-style`.
- `Ui` namespace registry — `web-core/src/ui-kit/imports.tsx` (`owner-web-core`). При добавлении нового primitive нужно **согласовать**: web-ui экспортит → web-core добавляет lazy-импорт в imports.tsx.
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework scope).

## Публичный API

Каждый primitive имеет собственный subpath export для tree-shaking:

```ts
// Main barrel (всё одной строкой, удобно для типов)
import { Button, Input, Card, Layout, Matrix, ... } from '@capsuletech/web-ui';

// Subpath (для tree-shake в bundler'е)
import { Button } from '@capsuletech/web-ui/button';
import { Matrix } from '@capsuletech/web-ui/matrix';
import { Flex } from '@capsuletech/web-ui/flex';
import { Grid } from '@capsuletech/web-ui/grid';
```

### Subpath exports (через `package.json.exports`)

`./button`, `./card`, `./field`, `./flex`, `./grid`, `./input`, `./label`, `./layout` (deprecated alias на matrix), `./list`, `./matrix`, `./select`, `./separator`, `./slot`, `./table`, `./textarea`, `./toggle`, `./tooltip`, `./typography`, `./wrappers`, `./dataTable`, `./previewCard`, `./image`, `./avatar`.

### Layout namespace

`Layout` экспортирован НЕ как single component — это **namespace через web-core**: `Ui.Layout.Grid`, `Ui.Layout.Flex`, `Ui.Layout.Matrix`. Сборка namespace происходит в `web-core/src/ui-kit/imports.tsx`.

### Matrix v2 — rows-engine + presets + DnD (BREAKING v0.7.0, 2026-05-23)

**API:** discriminated union `{ rows: IRow[] } | { preset: P; slots: LayoutPresets[P] }`.

**Two modes:**
1. **Preset mode:** `preset="app-shell"` + typed `slots={{ header?, sidebar?, main, rightBar?, footer? }}`
2. **Raw rows mode:** explicit `rows: IRow[]` for full control

**IRow/ICell structure:**
- Row: `id?`, `height?: number | 'auto' | 'fr'`, `resizable?: boolean`, `cells: ICell[]`
- Cell: `id`, `children`, `tag?`, `width?: number | 'auto' | 'fr'`, `resizable?`, `draggable?`, `swapGroup?`, `skeleton?`

**SlotValue (preset-mode):**
- Either `JSX.Element` or `{ children, initialSize?, minSize?, maxSize?, draggable?, swapGroup?, skeleton? }`

**DnD (swap mode, Phase 1.2 v2):**
- Badge-triggered UX: cell registered as `disabled: true` draggable, badge calls `dnd.startDrag()` programmatically
- 2-stage drop highlight (z-30 overlay): soft (canAccept) → strong (canDrop)
- **Badge visible only when 2+ draggable+resizable cells in same swapGroup** (no point swapping if 1 cell)
- Default swapGroups from preset: header/footer → `'band'`, sidebar/rightBar → `'aside'`, main → undefined
- `swapGroup` override in SlotValue expands zone to any cells with same group
- `onLayoutChange` fires `{ kind: 'swap', a, b }` after drop
- DnD integration via `@capsuletech/web-dnd` (createDraggable + createDroppable)

**Resize persist (session-only):**
- `sizesSnapshot` mutable object in `MatrixContent`, keyed by `"v"` (vertical) + `"h:<rowKey>"` (per-row horizontal)
- Guards against corvu cleanup-time calls where Panel unmount fires onSizesChange with shrinking arrays
- Guard: `if (prev !== undefined && sizes.length < prev.length) return;`

**Props:**
- `dndMode?: 'swap' | 'insert'` (default: `'swap'`)
- `layoutMode?: 'view' | 'edit'` (default: `'view'` — uncontrolled local signal also available)
- `onLayoutChange?: (e: LayoutChangeEvent) => void`
- `animated?: boolean | AnimateVariant`

**Preset `'app-shell'` (built-in):**
- Auto-centroid when only `main` slot provided
- Middle-row height auto-computed: `1 - footerInitialSize` or `'fr'` if no footer
- Sidebar/rightBar default width: 0.2
- Footer default height: 0.3
- Main width: remainder of `1 - sidebarWidth - rightBarWidth`

**Per-slot Suspense (v0.7.x additive):**
- Every cell's content is wrapped in its own `<Suspense>` boundary. A suspended lazy Widget blanks only that cell — not the whole Matrix.
- Fallback resolution: `cell.skeleton ?? MatrixCellFallback` (full-cell `animate-pulse bg-muted` div by default).
- `skeleton?: JSX.Element` is available on `ICell` and on the `SlotValue` object-form — it flows through `normalizeSlotValue → INormalizedSlot → preset resolver → ICell`.
- Backward compatible: existing usages without `skeleton` get the neutral default.

Migration from v0.3.0: `slots={{ header, main, rightBar, footer }}` → `preset="app-shell" slots={{ header, main, rightBar, footer }}`

**Это контракт.** Изменение API Matrix — breaking change для всех consumer'ов (currently только sandbox).

### Resizable — per-handle реактивный enable `handleActive` (2026-07-04)

По брифу `docs/_meta/briefs/web-ui-resizable-handle-contract.md` (owner-boost-layout, приоритеты resize в Matrix):

- **`IResizableItem.handleActive?: boolean | Accessor<boolean>`** (default `true`) — реактивная активность ручки. Handle между i и i+1 активен ⇔ `active(i) && active(i+1) && !handleDisabled`. `resizable` остаётся **структурным** (панель в corvu, handle в DOM); `handleActive` — **реактивным**: флип Accessor'а меняет только классы/поведение handle-элемента, панели и их children НЕ ремоунтятся (DOM-идентичность проверена unit-тестом).
- **Неактивная ручка не рисует hairline** — `bg-transparent` вместо `bg-border`, `pointer-events-none`, corvu `disabled`, grip скрыт. Разделитель-«бордер» ячеек — забота консьюмера (в Matrix — проп `bordered`), не handle'а. Это **намеренное visual-изменение** для `handleDisabled` (раньше линия оставалась): бордер ≠ resize-аффорданс.
- `withHandle` / `handleDisabled` — глобальные гейты (AND с per-item), grip показывается только на активной ручке.
- Механика: cva-вариант `active` в `resizableHandleCva` (`_resize/variants.ts`), проп `active` на internal `ResizableHandle` (getter-пропсы в `createStyle` для реактивности), резолв per-pair в `resizable.tsx`. Тесты: `resizable/__tests__/resizable.test.tsx` («handleActive per-item contract», 5 тестов). Stories: `resizable.stories.tsx` (Basic / MixedHandles / LiveToggle / AllDisabled).
- **`IResizableProps.handleVariant?: 'line' | 'ghost'`** (default `'line'`, follow-up бриф `web-ui-resizable-ghost-handle.md`) — визуал ручек контейнер-левел. `'line'` — активная ручка рисует `bg-border` hairline (shadcn-конвенция, бит-в-бит back-compat). `'ghost'` — ручка НИКОГДА не рисует свою линию (для консьюмеров с собственной бордер-системой: Matrix `bordered`); остаются хит-зона (`after:w-1`), pointer/drag при active, grip при `withHandle && active`, focus-ring. Ось `variant` в `resizableHandleCva` композитится с `active` через compoundVariant (`active:true + variant:'line'` → `bg-border`), поведение active не трогает. Тесты: «handleVariant ghost contract» (4). Story: LineVsGhost.

### Dropdown — HTML-passthrough для data-* / title / style (2026-06-03)

`IDropdownTriggerProps`, `IDropdownItemProps`, `IDropdownSubTriggerProps`, `IDropdownContentProps`, `IDropdownSubContentProps` теперь включают `IHtmlDataAttrs` (template-literal `[K in \`data-${string}\`]?: boolean | string | undefined`). `IDropdownTriggerProps` дополнительно получил явные `title?: string` и `style?: JSX.CSSProperties | string`. Причина: `DropdownMenuTriggerProps` Kobalte (`MenuTriggerOptions & Partial<MenuTriggerCommonProps>`) не пробрасывает `ComponentProps<'button'>`, поэтому произвольные `data-*` (включая boolean-маркеры DnD вроде `data-dnd-cancel`) и `title` отклонялись TS. Решение: явный index-type `IHtmlDataAttrs` (файл-локальный helper) вместо generic PolymorphicProps — не меняет runtime, только типы. Тесты: 494 passed, typecheck clean.

### Tooltip — cursor-anchored positioning (2026-06-03)

Compound: `Tooltip` + `Tooltip.Trigger` + `Tooltip.Content` + `Tooltip.Arrow` (optional).
Built on `@kobalte/core/tooltip`. Named re-exports: `TooltipTrigger`, `TooltipContent`, `TooltipArrow`.

**Key feature:** `cursorTracking` (default: `true`) — panel anchors to the cursor position frozen
at open time, not to the trigger element's bounding box. Uses Kobalte's `getAnchorRect` on Root.

**API:**
- `cursorTracking?: boolean` (default `true`) — cursor-anchored vs element-anchored.
- `openDelay?`, `closeDelay?`, `disabled?`, `open?`, `defaultOpen?`, `onOpenChange?` — forwarded to Kobalte Root.
- `gutter` defaults to 8px.
- `Tooltip.Trigger` — `as` polymorphic; pointer-move tracking wired via internal Context.
- `Tooltip.Content` — `portalProps?` for custom Portal mount target.
- `Tooltip.Arrow` — optional; must be inside `Tooltip.Content`.

**Implementation note:** cursor position is tracked via `createSignal` in Root + internal
`TooltipCursorContext` shared with Trigger. Position freezes on open (`onOpenChange(true)`)
so floating-ui doesn't recompute while cursor moves inside an open tooltip.

### List — три режима (2026-05-21)

`Ui.List` теперь поддерживает три режима:

1. **Render-prop (classic):** `items={array} children={(item, idx) => JSX}` — прежний render-prop паттерн. Рендерит `<div>`.
2. **Batch mode (новый):** `data={array} as={Component} itemProps?={(item) => propsObj}` — Shape-first; `<For>` внутри, рендерит `<ul>`.
3. **Semantic:** просто `children` (plain JSX) — рендерит `<ul>`.

Backward compat: существующий код с `items + children` продолжает работать.

### PreviewCard — single-item field renderer (2026-05-29)

Stateless composite for rendering one data object as an ordered list of label + value blocks. Atomic — does not wrap in a Card; consumer provides the outer chrome.

**API:**
- `data: TData | undefined | null` — item to preview; null/undefined triggers empty state.
- `fields: IPreviewCardField<TData>[]` — ordered field definitions.
- `emptyMessage?: string | JSX.Element` — shown when data is nullish.
- `class?: string` — applied to outer flex-col wrapper.

**IPreviewCardField:**
- `accessorKey?: keyof TData & string` — direct key accessor (typed to TData).
- `accessorFn?: (row: TData) => unknown` — custom extractor; wins over `accessorKey` when both present.
- `header: string` — field label (rendered as muted xs uppercase).
- `cell?: (info: { getValue, row }) => JSX.Element` — custom cell renderer; overrides default Typography.
- `id?: string` — stable key for `<For>` loop (required when using `accessorFn` without `accessorKey`).

**Accessor resolution order:** `accessorFn` → `accessorKey` → `undefined`.
**Key derivation order:** `id` → `accessorKey` → `undefined` (no key, jsdom still renders).

### DataTable — infinite scroll + IColumn (2026-05-21)

**Новый prop `infinite`:**
- `infinite?: boolean | { itemHeight?, overscan?, threshold? }` — opt-in virtual scroll через `@tanstack/solid-virtual`.
- По умолчанию: `itemHeight: 36, overscan: 5, threshold: 5`.
- Когда включён — `pagination` игнорируется на уровне TanStack Table.

**Новый callback `onLoadMore?: () => void`:**
- Триггерится когда виртуализатор доходит до последних `threshold` строк.
- Server-side pagination / "load more" pattern.

**Новый callback `onRowClick?: (row: TData, event: MouseEvent) => void`:**
- Вызывается при клике на строку. Получает `row.original` (raw TData) + MouseEvent.
- Работает в обоих режимах: standard (paginated) и infinite (virtual scroll).
- `cursor-pointer` добавляется автоматически через `classList` когда prop передан.
- Backward compatible — отсутствие prop не меняет поведение.

**Новый тип `IColumn<TData>`:**
- `accessorKey` сужен до `keyof TData & string` (не просто `string`).
- `IDataTableProps.columns` принимает `IColumn<TData>[]` вместо `ColumnDef<TData>[]`.
- Экспортируется из barrel'я: `import type { IColumn } from '@capsuletech/web-ui'`.

**`pagination` — deprecated (не удалён):**
- Продолжает работать для маленьких датасетов когда `infinite` не задан.
- Для больших датасетов предпочитать `infinite`.

## Browser tests (Vitest browser-mode)

**Config:** `packages/web/ui/vitest.browser.config.ts` (отдельный от `vitest.config.ts` jsdom-конфига).

**Запуск:**
```bash
# Первый раз — установить Chromium:
npx playwright install chromium

# Запускать:
pnpm --filter @capsuletech/web-ui test:browser
```

**Где лежат тесты:** `src/**/__browser__/**/*.browser.test.{ts,tsx}`
Пример: `src/primitives/button/__browser__/button.browser.test.tsx`

**Что сюда писать (browser-only checks):**
- `getComputedStyle` против дизайн-токенов — высота/padding/radius/цвет (матрица variant × size)
- `:focus-visible` ring — невозможно проверить в jsdom (не матчит `:focus-visible`); только реальный Chromium
- Реальные keyboard-события (Space / Enter → onClick)
- Polymorphic-rendering в живом DOM (`<Button as="a">` → реальный `<a>`)
- `aria-busy`, `data-slot`, `data-variant`, `data-size` после task 5 canon drift-fixes

**Что НЕ писать сюда:**
- Структурные ассерты (наличие классов, tagName) → jsdom `__tests__/`
- CVA-строки → jsdom `__tests__/`
- Контрактные проверки (types, interfaces) → jsdom `__tests__/`

**Провайдер:** `@vitest/browser-playwright` (именованный `playwright` factory), Chromium headless.
Vitest version lock: `@vitest/browser@4.1.6` + `@vitest/browser-playwright@4.1.6` синхронизированы с `vitest@4.1.6` монорепы.

**Ссылки:** `docs/_meta/canon-button.md` — browser-test чеклист (variant×size / focus-ring / keyboard / a11y).

## Quirks / gotchas

- **Matrix v2 corvu shrinking-array guard** — when Panel unmounts during swap, corvu fires onSizesChange with decreasing array length. `MatrixContent.saveSizes()` rejects updates where `sizes.length < prev.length` to avoid overwriting valid state with partial data. See `matrix.tsx:343-349`.

- **Matrix v2 no setPointerCapture** — pointer capture redirects `document.elementFromPoint()` to always return the captured element, breaking droppable hit-test in `findDroppableAt`. Window-level `pointermove`/`pointerup` listeners only (`dnd/context.tsx:167-171`).

- **Matrix v2 canvas snapshot for overlay** — WebGL canvas (e.g. maps) doesn't copy pixel buffer via `cloneNode()`. Fallback: `toDataURL()` with try/catch; if `preserveDrawingBuffer: false`, produces empty/tainted canvas, fallback to slate placeholder (`#94a3b8`). See `dnd/context.tsx:277-309`.

- **Storybook требует свои devDeps** — `@tailwindcss/vite`, `vite-tsconfig-paths`, `storybook`, `storybook-solidjs-vite`. Если `pnpm storybook:ui` падает на `Cannot find package` — добавь missing dep в `devDependencies`, **не** quick-fix через global install.

- **Matrix middle row `style={{height: '100%', width: '100%'}}`** — не `flex-1` / `h-full`. corvu Panel parent имеет `display: block`, поэтому `flex-1` collapses до content size. Inline-style надёжнее. Если будет рефактор — сохрани этот паттерн.

- **`class-variance-authority`** — в **direct dependencies**, не peer. cva вызывается на runtime внутри primitives, поэтому запекаем в каждый user'ский bundle. Это **dual-package hazard** на чистом ESM, но cva stateless — два экземпляра не конфликтуют.

- **`@kobalte/core`, `@tanstack/solid-virtual`, `@tanstack/solid-table`** — **peer dependencies** (singleton runtime). User должен иметь их в node_modules через CLI app template (`auto-install-peers=true`). `@tanstack/solid-table` также добавлен в devDependencies для Storybook stories (примеры с `createSolidTable`, sorting, pagination, row-selection).

- **`@corvu/resizable`** — в dependencies (запекается в dist). Внутреннее использование в Flex resize режиме (`flex/_resize/primitives.tsx`).

- **`lucide-solid`** — devDependency only. Используется в `_mocks.tsx` для storybook icons. НЕ в production dist.

- **Все primitives stateless.** Никаких signal'ов или effect'ов в самих компонентах. State держится в Controller через UiProxy (web-core).

- **Kobalte-first rule (2026-06-01).** Новые primitives обязаны оборачивать `@kobalte/core` если коответствующий компонент там есть, а не реализовывать механику с нуля. kobalte — прямой dep web-ui (0.13.11), уже подключён. Skeleton — первый прецедент: каждый блок-шард = `Skeleton.Root` из `@kobalte/core/skeleton` (a11y, data-animate/data-visible, role="group"); визуальный pulse и layout-пресеты — наш слой поверх. Импорт: `import { Root as SkeletonRoot } from '@kobalte/core/skeleton'` (именованный, не namespace — namespace-import не раскрывает `.Root` в типах TSC).

- **Polymorphic через Slot.** Через Kobalte's Polymorphic system. `<Button as="a" href="...">` валиден если CVA-настройки совпадают. Не делаем custom Slot — используем Kobalte.

- **Resizable namespace deprecated.** Раньше был `wrappers/resizable/`. Сейчас в `flex/_resize/` (internal). Public — через `<Flex resizable items={...}>` или `Ui.Layout.Matrix`. `Ui.Resizable` остался alias на `Flex` для backwards compat.

- **Flex corvu-mode trigger = `resizable: true`, не факт items.** Corvu активируется только когда хотя бы один `IFlexItem` имеет `resizable: true`. Простой массив `items` без флага → статический CSS flex. Если `items` передан, но ни один объект не содержит `children` или `resizable` (случайное связывание доменных данных) — Flex выдаёт `console.warn` в dev и падает обратно на `children`. См. `flex.tsx:204-270`. Тесты: `flex/__tests__/flex.test.tsx`.

## План рефакторинга / оптимизаций

- [ ] **Завести `docs/_meta/web-ui.md` AI anchor** — без него Claude-инстансы перечитывают весь README. (priority: high)
- [ ] **Покрытие unit-тестами** — сейчас опираемся на Storybook visual + capsule-test smoke. Unit-тестов для CVA variants практически нет. (priority: medium)
- [ ] **Vitest Solid transform** — `vitest.config.ts` не конфигурирует `vite-plugin-solid`, поэтому `.tsx` файлы (JSX) нельзя импортировать в тестах. Нужно добавить `plugins: [solidPlugin()]` в vitest config чтобы разблокировать DOM-рендер тесты для Table (createSolidTable smoke) и других compound primitives. (priority: medium)
- [ ] **Visual regression через Chromatic / Playwright** — Storybook есть, но visual diff'ы не запускаются. (priority: low)
- [ ] **A11y audit primitives** — Kobalte даёт базу, но Card / Field / Layout — наши, требуют проверки. (priority: medium)
- [x] **Layout → Matrix rename + namespace** — Grid/Flex/Matrix объединены под `Ui.Layout` (2026-05-20).
- [x] **Flex получил resize mode** — corvu wrapped, deprecate'нул отдельный Resizable (2026-05-20).
- [x] **Matrix.slot() helper удалён** — symbol-brand discriminator на inline objects (2026-05-20).
- [x] **Matrix.SlotValue → только IResizableSlotConfig** — JSX-shorthand удалён, union убран, IDE-autocomplete исправлен (2026-05-21).
- [x] **List batch mode** — `data + as + itemProps` opt-in; backward compat сохранён (2026-05-21).
- [x] **DataTable infinite scroll** — `@tanstack/solid-virtual` virtualizer, `onLoadMore` callback, `IColumn<TData>` typed wrapper (2026-05-21).
- [x] **Table scroll context removed (BREAKING v0.5.0, 2026-05-22)** — `overflow-auto scrollbar-hover` убраны из wrapper'а `Table` primitive. Scroll context теперь ответственность parent'а. Standalone `<Table>` без outer scroll container — оберни в `<div class="overflow-auto">`. `DataTable` infinite mode (`InfiniteTable`) имеет собственный `overflow-auto` для виртуализации — не затронут.
- [x] **Navigation primitive removed (BREAKING v0.6.0, 2026-05-22)** — `Ui.Navigation`, `Ui.NavigationList`, `Ui.NavigationItem` удалены. Используй `Ui.List` batch mode (`data + as + itemProps`) с `as: Ui.Button` для навигационных flows. Subpath `./navigation` удалён из `package.json`. Parallel: owner-web-core unregister'ит `Ui.Navigation` из imports.tsx.
- [x] **Skeleton rewrite: kobalte-backed (2026-06-01)** — каждый шард теперь `Root` из `@kobalte/core/skeleton`. Публичный API (`ISkeletonProps`) не изменился. Пресеты text/table/list/card/map сохранены. TS clean, 281 tests green.
- [x] **Image + Avatar primitives (2026-07-03)** — Image = generic stateless picture primitive backed by @kobalte/core/image, circle/square shape, size tokens; Avatar = thin composed sub-component over Image, circle-shape forced, string-fallback convenience (initials wrapped in Typography), not a duplicate implementation.
- [x] **Design tokens migration (Phase 2)** — все primitives + composites переведены на design-system tokens (2026-05-22).
  - Button: `px-button py-1.5` (sm: `px-button-sm py-cell-tight`, lg: `px-button-lg py-button`) — default vertical padding tightened from `py-button-sm` (8px) to `py-1.5` (6px) for more compact UI rhythm. 2026-05-28.
  - Input: `px-input py-input` — density-aware, убрано `h-9` fixed height.
  - Card parts: `px-card pb-card / py-card-tight` — density-aware card padding.
  - Table.Head / Table.Cell: `px-cell py-cell-tight` — плотность стола управляется density.
  - Navigation item: `px-button py-cell` (sm) / `px-button-lg py-cell-loose` (lg).
  - List items: `px-cell py-cell-tight`.
  - Matrix slots: `px-layout py-component` / `p-component` / `p-layout` — убраны `px-[--layout-padding]` arbitrary.
  - DataTable toolbar/pagination gaps: `mb-component` / `mt-component`.
  - Typography: текстовые классы `text-4xl/3xl/base/xl` + `leading-tight/normal/relaxed`.
  - Transitions: везде `transition-colors duration-200` (numeric-канон; `--motion-fast = 200ms`), убрано `transition-all`. Утилита `duration-fast` не существует — используется числовой `duration-200`.
  - Radii: унифицированы — Button = `rounded-md`, Card = `rounded-lg` (раньше `rounded-xl`).
  - Storybook: добавлен **density toolbar** (`default / compact / comfortable`) — переключает `.compact`/`.comfortable` на `<html>`.
  - Typography variants: мигрированы с `--font-size-h1/h2/p` старых aliases на `text-4xl/3xl/base` Tailwind.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Stories | `src/primitives/**/*.stories.tsx` | visual + interactive по всем primitives и variants |
| Stories | `src/composites/dataTable/dataTable.stories.tsx` | Basic / WithSorting / WithPagination / WithPaginationCustomSize / WithSelection / WithToolbar / Full / EmptyState / EmptyStateDefault / WithInfinite / WithInfiniteCustomHeight / WithInfiniteLoading |
| Unit | `src/primitives/layout/flex/__tests__/flex.test.tsx` | children mode / items-no-resizable → CSS flex / items-with-resizable → corvu / mixed items / plain-object fallback + warning (15 tests, jsdom render). |
| Unit | `src/primitives/layout/matrix/__tests__/normalizeSlot.test.ts` | normalizeSlot: undefined/null/object-form/resizable/type-level |
| Unit | `src/primitives/layout/matrix/__tests__/matrix-suspense.test.tsx` | Per-slot Suspense: structural (Suspense present in source, 4+ instances, MatrixCellFallback, animate-pulse), cell isolation (resolved cells render alongside null-sibling), skeleton prop flow (normalizeSlotValue, SlotValue→ICell, preset paths), default fallback no-crash (14 tests). |
| Unit | `src/primitives/table/__tests__/table.test.ts` | interface structural contracts, data-state sentinel documentation (7 tests). Full DOM/render coverage pending vitest Solid transform (see backlog). |
| Unit | `src/primitives/list/__tests__/list.test.ts` | IListRenderProps / IListBatchProps / IListSemanticProps / IListProps union / IVirtualListProps structural contracts (18 tests). |
| Unit | `src/composites/dataTable/__tests__/dataTable.test.ts` | IDataTableProps structural contracts, IColumn typed wrapper, ColumnDef re-export, infinite options, onLoadMore callback, onRowClick contract + cursor-pointer UX, pagination defaults (24 tests). Full DOM/render coverage pending vitest Solid transform. |
| Unit | `src/composites/previewCard/__tests__/previewCard.test.ts` | IPreviewCardField/IPreviewCardProps structural contracts, resolveValue (accessorKey / accessorFn / win order / falsy values), fieldKey derivation, cell override contract, multiple fields order + unique keys (35 tests). DOM render coverage pending vitest Solid transform. |
| E2E (косвенно) | `packages/cli/e2e/smoke.mjs` | bootstrap + базовый рендер через capsule-test |

**Перед изменением primitive contract'а:**
1. `pnpm storybook:ui` — open `http://localhost:6006/`, visual smoke.
2. `pnpm --filter @capsuletech/web-ui build` — green.
3. Capsule-test app (e.g. `ewc-client`) рендерит без 503/runtime-error.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| Theme tokens, createStyle, cn, merge | owner-web-style |
| `Ui.*` namespace registry (lazy imports) | owner-web-core |
| Slot Polymorphic (Kobalte adapter) | owner-web-style |
| Wrapper definitions (Entity/Widget/Page) | owner-web-core |
| Storybook viewerFinal config | owner-builders (если использует vite-builder plugins) |

## Release group

`web_base` (fixed): web-core + web-dnd + web-ui-creator + web-profiler + web-query + web-remote + web-renderer + web-router + web-state + web-style + web-ui + shared-zod.

После изменений web-ui — координировать release через главного (`pnpm release:local:web` или `--group=all`).

Связанные:
- `docs/_meta/web-ui.md` — AI-anchor (когда заведём).
- Storybook на `http://localhost:6006/` — live доки.
