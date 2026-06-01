import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { MockFooter, MockHeader, MockMain, MockRightBar, MockSidebar } from '../../_mocks';
import { Button } from '../../button';
import { Matrix } from './matrix';

/**
 * # Matrix stories
 *
 * **ВАЖНО** про `render`-форму. Storybook отправляет `args` между manager- и
 * preview-фреймами через `postMessage` (structured clone). Solid JSX-ноды
 * (HTMLElement / реактивные функции) этой сериализации не переживают — на
 * preview-стороне `args.slots.sidebar` превратится в `{}`. Поэтому **нельзя**
 * писать `args: { slots: { sidebar: <X/> } }` — слот придёт пустым.
 *
 * Решение: строим JSX внутри `render: (args) => <Matrix {...args} slots={...} />`
 * — там JSX-ноды конструируются непосредственно в preview iframe и до
 * сериализации не доходят.
 */
const meta = {
  title: 'Components/Matrix',
  component: Matrix,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div class="h-[600px] w-full overflow-hidden border border-dashed border-white/15">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Matrix>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===========================================================================
// Preset='app-shell' stories — friendly API
// ===========================================================================

/**
 * Auto-centroid: preset='app-shell' with only `main`. Single cell, no chrome.
 */
export const OnlyMain: Story = {
  name: 'preset · auto-centroid (only main)',
  render: () => <Matrix preset="app-shell" slots={{ main: <Button>Centroid content</Button> }} />,
};

/**
 * Auto-centroid with animated main.
 */
export const OnlyMainAnimated: Story = {
  name: 'preset · auto-centroid · animated',
  render: () => (
    <Matrix
      preset="app-shell"
      animated="fade"
      slots={{ main: <Button>Fade in on mount</Button> }}
    />
  ),
};

/**
 * Header + main + footer. No sidebar/rightBar.
 *
 * Preset 'app-shell' always makes the middle row resizable; here middle row has
 * a single main cell so no horizontal handle appears, but footer-row is
 * resizable vertically (footer.height defaults to 0.3).
 */
export const HeaderMainFooter: Story = {
  name: 'preset · header + main + footer',
  render: () => (
    <Matrix
      preset="app-shell"
      slots={{
        header: <MockHeader />,
        main: <MockMain />,
        footer: <MockFooter />,
      }}
    />
  ),
};

/**
 * Full app-shell: header / sidebar | main | rightBar / footer.
 * Default sizes from preset: main=0.8, sidebar=0.2, rightBar=0.2, footer-height=0.3.
 */
export const FullAppShell: Story = {
  name: 'preset · full app-shell (all 5 slots)',
  render: () => (
    <Matrix
      preset="app-shell"
      slots={{
        header: <MockHeader />,
        sidebar: <MockSidebar />,
        main: <MockMain />,
        rightBar: <MockRightBar />,
        footer: <MockFooter />,
      }}
    />
  ),
};

/**
 * App-shell with size overrides via object-form SlotValue.
 */
export const AppShellWithOverrides: Story = {
  name: 'preset · app-shell with size overrides',
  render: () => (
    <Matrix
      preset="app-shell"
      slots={{
        header: <MockHeader />,
        sidebar: { children: <MockSidebar />, initialSize: 0.15, minSize: 0.1 },
        main: { children: <MockMain />, initialSize: 0.65, minSize: 0.3 },
        rightBar: { children: <MockRightBar />, initialSize: 0.2, minSize: 0.15 },
        footer: { children: <MockFooter />, initialSize: 0.2, minSize: 0.08 },
      }}
    />
  ),
};

/**
 * Sandbox-like layout: header + main (scrollable rows) + rightBar + footer.
 * Verifies:
 *   1. Scroll inside main (50 rows × 36px > panel height)
 *   2. No overlap on resize (drag handles work, footer/main don't overlap)
 *   3. Panel content clipped at panel boundary (overflow-hidden)
 */
export const InteractiveResize: Story = {
  name: 'preset · interactive (scroll + resize)',
  render: () => (
    <Matrix
      preset="app-shell"
      slots={{
        header: <MockHeader />,
        main: {
          children: (
            <div class="h-full w-full overflow-auto">
              <div class="sticky top-0 border-b bg-card px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Users — 30 rows · scroll me · drag handles
              </div>
              {Array.from({ length: 30 }, (_, i) => (
                <div class="flex items-center border-b px-4 py-2 text-sm hover:bg-muted/40">
                  <span class="w-12 font-mono text-muted-foreground">{i + 1}</span>
                  <span class="flex-1">User {i + 1}</span>
                  <span class="text-muted-foreground">user{i + 1}@example.com</span>
                </div>
              ))}
            </div>
          ),
          initialSize: 0.8,
          minSize: 0.3,
        },
        rightBar: { children: <MockRightBar />, initialSize: 0.2, minSize: 0.12 },
        footer: { children: <MockFooter />, initialSize: 0.3, minSize: 0.06 },
      }}
    />
  ),
};

// ===========================================================================
// Raw rows stories — escape-hatch API
// ===========================================================================

/**
 * Raw rows: two rows, no preset. First row has a single header cell, second
 * row has two resizable cells (left/right). Shows the generic engine without
 * preset semantics.
 */
export const RawRowsTwoColumns: Story = {
  name: 'rows · two columns + header',
  render: () => (
    <Matrix
      rows={[
        {
          id: 'top',
          height: 'auto',
          resizable: false,
          cells: [{ id: 'header', tag: 'header', children: <MockHeader /> }],
        },
        {
          id: 'middle',
          resizable: true,
          cells: [
            {
              id: 'left',
              tag: 'aside',
              children: <MockSidebar />,
              width: 0.3,
              resizable: true,
            },
            {
              id: 'right',
              tag: 'main',
              children: <MockMain />,
              width: 0.7,
              resizable: true,
            },
          ],
        },
      ]}
    />
  ),
};

/**
 * Raw rows: dashboard-grid pattern (3 rows × N cells of equal width).
 * Demonstrates use case "N widgets in arbitrary arrangement" — closes the gap
 * where 5-slot app-shell could not express grid-of-widgets layout.
 */
export const RawRowsDashboard: Story = {
  name: 'rows · dashboard-grid (2-1-3)',
  render: () => {
    const tile = (label: string) => (
      <div class="flex h-full w-full items-center justify-center border bg-card text-sm">
        {label}
      </div>
    );
    return (
      <Matrix
        rows={[
          {
            id: 'row-1',
            resizable: true,
            cells: [
              { id: 'a', children: tile('A'), width: 0.5, resizable: true },
              { id: 'b', children: tile('B'), width: 0.5, resizable: true },
            ],
          },
          {
            id: 'row-2',
            resizable: true,
            cells: [{ id: 'c', children: tile('C (full)') }],
          },
          {
            id: 'row-3',
            resizable: true,
            cells: [
              { id: 'd', children: tile('D'), width: 0.33, resizable: true },
              { id: 'e', children: tile('E'), width: 0.33, resizable: true },
              { id: 'f', children: tile('F'), width: 0.34, resizable: true },
            ],
          },
        ]}
      />
    );
  },
};

// ===========================================================================
// Swap-mode DnD stories (Phase 1.2)
// ===========================================================================

/**
 * Swap mode controlled: layoutMode='edit' forced from outside, sidebar and
 * rightBar are in the same swapGroup ('aside') — drag one onto the other to
 * swap their contents. main is NOT draggable so it cannot be moved.
 *
 * Open the actions panel to watch onLayoutChange events fire.
 */
export const SwapModeControlled: Story = {
  name: 'preset · swap mode (controlled, layoutMode=edit)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => (
    <Matrix
      layoutMode="edit"
      dndMode="swap"
      onLayoutChange={(e) => args.onLayoutChange?.(e)}
      preset="app-shell"
      slots={{
        header: <MockHeader />,
        sidebar: { children: <MockSidebar />, draggable: true, initialSize: 0.2 },
        main: <MockMain />,
        rightBar: { children: <MockRightBar />, draggable: true, initialSize: 0.2 },
        footer: { children: <MockFooter />, initialSize: 0.3 },
      }}
    />
  ),
};

/**
 * Swap mode uncontrolled: no layoutMode prop. An EditBadge appears in the
 * top-right corner — click it to enter edit mode, then drag sidebar↔rightBar.
 * Click "✓ Done" to exit edit mode.
 */
export const SwapModeUncontrolled: Story = {
  name: 'preset · swap mode (uncontrolled, badge toggle)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => (
    <Matrix
      onLayoutChange={(e) => args.onLayoutChange?.(e)}
      preset="app-shell"
      slots={{
        header: <MockHeader />,
        sidebar: { children: <MockSidebar />, draggable: true, initialSize: 0.2 },
        main: <MockMain />,
        rightBar: { children: <MockRightBar />, draggable: true, initialSize: 0.2 },
        footer: { children: <MockFooter />, draggable: true, initialSize: 0.3 },
      }}
    />
  ),
};

/**
 * Swap mode raw rows: 4 tiles in two rows, all in the same swapGroup so any
 * tile can be swapped with any other. Demonstrates rows-of-cells swap UX
 * without preset semantics.
 */
export const SwapModeRawRows: Story = {
  name: 'rows · swap mode (4 tiles, single swapGroup)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const tile = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center text-lg font-bold text-foreground"
        style={{ background: bg }}
      >
        {label}
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="swap"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'row-1',
            resizable: true,
            cells: [
              {
                id: 'a',
                children: tile('A', 'rgba(99, 102, 241, 0.18)'),
                width: 0.5,
                resizable: true,
                draggable: true,
                swapGroup: 'tiles',
              },
              {
                id: 'b',
                children: tile('B', 'rgba(34, 197, 94, 0.18)'),
                width: 0.5,
                resizable: true,
                draggable: true,
                swapGroup: 'tiles',
              },
            ],
          },
          {
            id: 'row-2',
            resizable: true,
            cells: [
              {
                id: 'c',
                children: tile('C', 'rgba(244, 114, 182, 0.18)'),
                width: 0.5,
                resizable: true,
                draggable: true,
                swapGroup: 'tiles',
              },
              {
                id: 'd',
                children: tile('D', 'rgba(251, 146, 60, 0.18)'),
                width: 0.5,
                resizable: true,
                draggable: true,
                swapGroup: 'tiles',
              },
            ],
          },
        ]}
      />
    );
  },
};

// ===========================================================================
// Insert-mode DnD stories (Phase 1.3)
// ===========================================================================

/**
 * Insert mode controlled: layoutMode='edit' forced. 6 tiles distributed
 * across 2 rows. Drag within a row to reorder; drag across rows (top half →
 * row start, bottom half → row end) to move between rows.
 */
export const InsertModeControlled: Story = {
  name: 'rows · insert mode (controlled, layoutMode=edit)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const tile = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center text-lg font-bold text-foreground"
        style={{ background: bg }}
      >
        {label}
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="insert"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'row-1',
            resizable: true,
            cells: [
              {
                id: 'a',
                children: tile('A', 'rgba(99, 102, 241, 0.18)'),
                width: 0.33,
                resizable: true,
                draggable: true,
              },
              {
                id: 'b',
                children: tile('B', 'rgba(34, 197, 94, 0.18)'),
                width: 0.33,
                resizable: true,
                draggable: true,
              },
              {
                id: 'c',
                children: tile('C', 'rgba(244, 114, 182, 0.18)'),
                width: 0.34,
                resizable: true,
                draggable: true,
              },
            ],
          },
          {
            id: 'row-2',
            resizable: true,
            cells: [
              {
                id: 'd',
                children: tile('D', 'rgba(251, 146, 60, 0.18)'),
                width: 0.5,
                resizable: true,
                draggable: true,
              },
              {
                id: 'e',
                children: tile('E', 'rgba(56, 189, 248, 0.18)'),
                width: 0.5,
                resizable: true,
                draggable: true,
              },
            ],
          },
        ]}
      />
    );
  },
};

/**
 * Insert mode uncontrolled with mixed sizes: 3 tiles per row, all draggable.
 * Click the badge to enter edit mode, then reorder and migrate tiles.
 *
 * Note: when a tile crosses rows, layout re-flows because target row's
 * `width` ratios re-normalize via corvu Flex (e.g. 3 cells with 0.33 each
 * becomes 4 cells competing for the same horizontal space).
 */
export const InsertModeUncontrolled: Story = {
  name: 'rows · insert mode (uncontrolled, mixed sizes)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const tile = (label: string) => (
      <div class="flex h-full w-full items-center justify-center border bg-card text-sm text-foreground">
        {label}
      </div>
    );
    return (
      <Matrix
        dndMode="insert"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'top',
            resizable: true,
            cells: [
              { id: 't1', children: tile('Top-1'), width: 0.5, resizable: true, draggable: true },
              { id: 't2', children: tile('Top-2'), width: 0.5, resizable: true, draggable: true },
            ],
          },
          {
            id: 'mid',
            resizable: true,
            cells: [
              { id: 'm1', children: tile('Mid-1'), width: 0.33, resizable: true, draggable: true },
              { id: 'm2', children: tile('Mid-2'), width: 0.33, resizable: true, draggable: true },
              { id: 'm3', children: tile('Mid-3'), width: 0.34, resizable: true, draggable: true },
            ],
          },
          {
            id: 'bot',
            resizable: true,
            cells: [{ id: 'b1', children: tile('Bot-1'), draggable: true }],
          },
        ]}
      />
    );
  },
};

// ===========================================================================
// Packing-zones stories (ADR 022 — insert-mode v2)
// ===========================================================================

/**
 * Packing wrap (horizontal): 3 widgets with minW=220px in a wrap=true zone.
 * Resize the Storybook panel to below 660px width to trigger wrap reflow —
 * the third widget should move to the next line. Vertical overflow scrolls.
 */
export const PackingWrapHorizontal: Story = {
  name: 'insert v2 · packing wrap (horizontal, minW)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const widget = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center rounded text-sm font-bold text-foreground"
        style={{ background: bg, 'min-height': '120px' }}
      >
        {label}
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="insert"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'main',
            wrap: true,
            resizable: false,
            accepts: ['widget'],
            cells: [
              {
                id: 'map',
                children: widget('Map Widget', 'rgba(99,102,241,0.18)'),
                draggable: true,
                minW: 220,
                group: 'widget',
              },
              {
                id: 'chat',
                children: widget('Chat Widget', 'rgba(34,197,94,0.18)'),
                draggable: true,
                minW: 220,
                group: 'widget',
              },
              {
                id: 'stats',
                children: widget('Stats Widget', 'rgba(244,114,182,0.18)'),
                draggable: true,
                minW: 220,
                group: 'widget',
              },
            ],
          },
          {
            id: 'palette',
            height: 'auto',
            resizable: false,
            accepts: ['widget'],
            cells: [
              {
                id: 'palette-placeholder',
                children: (
                  <div class="flex items-center justify-center p-3 text-xs text-muted-foreground">
                    Palette (drop widget here to remove from main)
                  </div>
                ),
                draggable: false,
              },
            ],
          },
        ]}
      />
    );
  },
};

/**
 * Vertical zone (orientation='vertical'): rightbar with panels stacked top→bottom.
 * Panels have minH=100px. On narrow vertical space, excess panels would scroll.
 */
export const PackingVerticalZone: Story = {
  name: 'insert v2 · vertical zone (orientation=vertical, minH)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const panel = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center text-sm font-bold text-foreground"
        style={{ background: bg }}
      >
        {label}
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="insert"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'main',
            resizable: false,
            accepts: ['widget'],
            cells: [
              {
                id: 'main-content',
                children: (
                  <div class="flex h-full w-full items-center justify-center bg-muted/20 text-sm text-muted-foreground">
                    Main area — drag panels from rightbar here
                  </div>
                ),
                draggable: true,
                group: 'widget',
              },
            ],
          },
          {
            id: 'rightbar',
            orientation: 'vertical',
            wrap: false,
            resizable: false,
            accepts: ['panel'],
            cells: [
              {
                id: 'status',
                children: panel('Status', 'rgba(99,102,241,0.25)'),
                draggable: true,
                minH: 100,
                group: 'panel',
              },
              {
                id: 'logs',
                children: panel('Logs', 'rgba(34,197,94,0.25)'),
                draggable: true,
                minH: 100,
                group: 'panel',
              },
              {
                id: 'alerts',
                children: panel('Alerts', 'rgba(244,114,182,0.25)'),
                draggable: true,
                minH: 100,
                group: 'panel',
              },
            ],
          },
        ]}
      />
    );
  },
};

/**
 * Accepts constraints: main accepts 'widget', rightbar accepts 'panel'.
 * Dragging a widget to rightbar → rejected (ring-destructive highlight).
 * Dragging a panel to main → rejected. Same-group drops → accepted.
 */
export const PackingAcceptsConstraints: Story = {
  name: 'insert v2 · accepts constraints (cross-group reject)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const widget = (label: string) => (
      <div class="flex h-full w-full items-center justify-center rounded bg-primary/15 text-sm font-bold">
        {label}
        <br />
        <span class="text-xs font-normal text-muted-foreground">group=widget</span>
      </div>
    );
    const panel = (label: string) => (
      <div class="flex h-full w-full items-center justify-center rounded bg-accent/30 text-sm font-bold">
        {label}
        <br />
        <span class="text-xs font-normal text-muted-foreground">group=panel</span>
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="insert"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'main',
            wrap: true,
            resizable: false,
            accepts: ['widget'],
            cells: [
              {
                id: 'w1',
                children: widget('Widget A'),
                draggable: true,
                minW: 180,
                group: 'widget',
              },
              {
                id: 'w2',
                children: widget('Widget B'),
                draggable: true,
                minW: 180,
                group: 'widget',
              },
            ],
          },
          {
            id: 'sidebar',
            orientation: 'vertical',
            wrap: false,
            resizable: false,
            accepts: ['panel'],
            cells: [
              {
                id: 'p1',
                children: panel('Panel X'),
                draggable: true,
                minH: 100,
                group: 'panel',
              },
              {
                id: 'p2',
                children: panel('Panel Y'),
                draggable: true,
                minH: 100,
                group: 'panel',
              },
            ],
          },
        ]}
      />
    );
  },
};

/**
 * Manual resize in packing zone (ADR 022 task 1).
 *
 * Each cell in the wrap=true packing zone has a 4px trailing-edge resize handle
 * (visible in edit mode — thin strip on the right of each cell). Drag the handle
 * to set an explicit px width; cells that no longer fit wrap to the next line
 * automatically via CSS flex-wrap. minW (200px) is the floor — handle stopsmoving
 * at 200px. Cells that have NOT been manually resized stay flex:1.
 *
 * Vertical orientation (orientation='vertical') uses a bottom-edge ns-resize handle
 * instead. See PackingVerticalZone story for the vertical variant.
 *
 * Geometry (wrap reflow, actual pixel snap) is only verifiable in a real browser;
 * jsdom does not measure layout.
 */
export const PackingManualResize: Story = {
  name: 'insert v2 · manual resize (handle + wrap reflow)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const widget = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center text-sm font-bold text-foreground"
        style={{ background: bg, 'min-height': '120px' }}
      >
        {label}
        <br />
        <span class="text-xs font-normal text-muted-foreground">drag right edge to resize</span>
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="insert"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'main',
            wrap: true,
            resizable: false,
            accepts: ['widget'],
            cells: [
              {
                id: 'alpha',
                children: widget('Alpha (resize me)', 'rgba(99,102,241,0.18)'),
                draggable: true,
                minW: 200,
                group: 'widget',
              },
              {
                id: 'beta',
                children: widget('Beta', 'rgba(34,197,94,0.18)'),
                draggable: true,
                minW: 200,
                group: 'widget',
              },
              {
                id: 'gamma',
                children: widget('Gamma', 'rgba(244,114,182,0.18)'),
                draggable: true,
                minW: 200,
                group: 'widget',
              },
            ],
          },
          {
            id: 'palette',
            height: 'auto',
            resizable: false,
            accepts: ['widget'],
            cells: [
              {
                id: 'palette-placeholder',
                children: (
                  <div class="flex items-center justify-center p-3 text-xs text-muted-foreground">
                    Palette — drop widgets here
                  </div>
                ),
                draggable: false,
              },
            ],
          },
        ]}
      />
    );
  },
};

/**
 * Drag-back after cross-row move: demonstrates the re-bind fix (ADR 022).
 * Move a widget from row-1 to row-2, then move it back. Without the fix,
 * the second drag would silently no-op (cell was not re-bound to its new row's sortable).
 */
export const InsertModeRebindAfterMove: Story = {
  name: 'insert v2 · drag-back after cross-row move (re-bind fix)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const tile = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center text-base font-bold text-foreground"
        style={{ background: bg }}
      >
        {label}
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="insert"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'row-top',
            resizable: true,
            cells: [
              {
                id: 'alpha',
                children: tile('Alpha (drag me across)', 'rgba(99,102,241,0.22)'),
                width: 0.5,
                resizable: true,
                draggable: true,
              },
              {
                id: 'beta',
                children: tile('Beta', 'rgba(34,197,94,0.22)'),
                width: 0.5,
                resizable: true,
                draggable: true,
              },
            ],
          },
          {
            id: 'row-bottom',
            resizable: true,
            cells: [
              {
                id: 'gamma',
                children: tile('Gamma', 'rgba(244,114,182,0.22)'),
                width: 0.5,
                resizable: true,
                draggable: true,
              },
              {
                id: 'delta',
                children: tile('Delta', 'rgba(251,146,60,0.22)'),
                width: 0.5,
                resizable: true,
                draggable: true,
              },
            ],
          },
        ]}
      />
    );
  },
};

// ===========================================================================
// direction='horizontal' — side-by-side zones (ADR 022 §side-by-side)
// ===========================================================================

/**
 * Fixed-rail layout: main (flex:1, fills remaining space) + rightbar (fixed
 * narrow rail, content-driven width ~60px). Both zones are NON-resizable and
 * NON-draggable (no corvu handle between them, no DnD at zone level).
 *
 * `direction='horizontal'` lays zones LEFT→RIGHT.
 * `height:'auto'` on the rightbar row → `flex: 0 0 auto` in CSS, so the zone
 * shrinks to its content width (icon buttons ~60px) with no grow.
 * `height` omitted on main → `flex: 1`, fills all remaining space.
 *
 * Widgets INSIDE main still have packing resize handles (edit mode) because
 * `renderPackingRow` gates handle visibility on `layoutMode`, NOT `row.resizable`.
 * This demonstrates cell-level resize being independent of zone-level resizable.
 *
 * Verify in browser: rightbar should be exactly as wide as its icon content;
 * main should fill the rest. No drag handle (corvu splitter) appears between the zones.
 */
export const FixedRailZone: Story = {
  name: 'direction=horizontal · fixed-rail (main flex:1 + rightbar content-width)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const iconButton = (icon: string, label: string) => (
      <button
        type="button"
        class="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded hover:bg-muted/60"
        title={label}
      >
        <span class="text-lg leading-none">{icon}</span>
        <span class="text-[9px] text-muted-foreground">{label}</span>
      </button>
    );
    const widget = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center rounded text-sm font-bold text-foreground"
        style={{ background: bg, 'min-height': '120px' }}
      >
        {label}
        <br />
        <span class="text-xs font-normal text-muted-foreground">(drag right edge to resize)</span>
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="insert"
        direction="horizontal"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'main',
            // height omitted → flex: 1, fills remaining space.
            // resizable: false → no corvu handle at zone level.
            // wrap: true + minW → packing resize handles still work at cell level.
            resizable: false,
            wrap: true,
            accepts: ['widget'],
            cells: [
              {
                id: 'map-widget',
                children: widget('Map Widget', 'rgba(99,102,241,0.18)'),
                draggable: true,
                minW: 220,
                group: 'widget',
              },
              {
                id: 'chat-widget',
                children: widget('Chat Widget', 'rgba(34,197,94,0.18)'),
                draggable: true,
                minW: 220,
                group: 'widget',
              },
            ],
          },
          {
            id: 'rightbar',
            // height: 'auto' → flex: 0 0 auto → content-driven width (~60px icons).
            // resizable: false → no corvu handle at zone level.
            height: 'auto',
            resizable: false,
            orientation: 'vertical',
            accepts: [],
            cells: [
              {
                id: 'rail-content',
                children: (
                  <div class="flex h-full flex-col items-center gap-1 border-l border-border bg-card px-1 py-2">
                    {iconButton('', 'Nodes')}
                    {iconButton('', 'Map')}
                    {iconButton('', 'Chat')}
                    {iconButton('', 'Stats')}
                    {iconButton('', 'Settings')}
                  </div>
                ),
                draggable: false,
              },
            ],
          },
        ]}
      />
    );
  },
};

/**
 * Side-by-side zones: main (horizontal wrap-packing zone) on the left +
 * rightbar (vertical packing column) on the right. DnD between zones via
 * insert mode.
 *
 * `direction='horizontal'` lays zones out LEFT→RIGHT instead of the default
 * TOP→BOTTOM. `row.height` is re-used as the zone's **width** fraction:
 *   main:     height=0.72 → takes 72% of the horizontal space.
 *   rightbar: height=0.28 → takes 28% of the horizontal space.
 *
 * Each zone keeps its own inner `orientation` for cell packing:
 *   main     → `wrap:true` (horizontal wrap grid, minW=220px)
 *   rightbar → `orientation:'vertical'` (vertical column, minH=100px)
 *
 * Drag a widget from main to rightbar → rejected (accepts-constraint).
 * Drag a panel from rightbar to main → rejected.
 * Drag within the same zone → accepted, reorder.
 *
 * The resize handle between the two zones is a vertical splitter (ew-resize)
 * that redistributes their widths. Geometry is verifiable only in a real browser.
 */
export const SideBySideZones: Story = {
  name: 'direction=horizontal · side-by-side (main | rightbar)',
  argTypes: {
    onLayoutChange: { action: 'layoutChange' },
  },
  render: (args) => {
    const widget = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center rounded text-sm font-bold text-foreground"
        style={{ background: bg, 'min-height': '120px' }}
      >
        {label}
        <br />
        <span class="text-xs font-normal text-muted-foreground">group=widget</span>
      </div>
    );
    const panel = (label: string, bg: string) => (
      <div
        class="flex h-full w-full items-center justify-center text-sm font-bold text-foreground"
        style={{ background: bg }}
      >
        {label}
        <br />
        <span class="text-xs font-normal text-muted-foreground">group=panel</span>
      </div>
    );
    return (
      <Matrix
        layoutMode="edit"
        dndMode="insert"
        direction="horizontal"
        onLayoutChange={(e) => args.onLayoutChange?.(e)}
        rows={[
          {
            id: 'main',
            // In direction='horizontal', row.height is re-interpreted as the zone width fraction.
            height: 0.72,
            resizable: true,
            wrap: true,
            accepts: ['widget'],
            cells: [
              {
                id: 'map-widget',
                children: widget('Map Widget', 'rgba(99,102,241,0.18)'),
                draggable: true,
                minW: 220,
                group: 'widget',
              },
              {
                id: 'chat-widget',
                children: widget('Chat Widget', 'rgba(34,197,94,0.18)'),
                draggable: true,
                minW: 220,
                group: 'widget',
              },
              {
                id: 'stats-widget',
                children: widget('Stats Widget', 'rgba(244,114,182,0.18)'),
                draggable: true,
                minW: 220,
                group: 'widget',
              },
            ],
          },
          {
            id: 'rightbar',
            // In direction='horizontal', row.height is re-interpreted as the zone width fraction.
            height: 0.28,
            resizable: true,
            orientation: 'vertical',
            accepts: ['panel'],
            cells: [
              {
                id: 'status-panel',
                children: panel('Status', 'rgba(99,102,241,0.25)'),
                draggable: true,
                minH: 100,
                group: 'panel',
              },
              {
                id: 'logs-panel',
                children: panel('Logs', 'rgba(34,197,94,0.25)'),
                draggable: true,
                minH: 100,
                group: 'panel',
              },
              {
                id: 'alerts-panel',
                children: panel('Alerts', 'rgba(244,114,182,0.25)'),
                draggable: true,
                minH: 100,
                group: 'panel',
              },
            ],
          },
        ]}
      />
    );
  },
};
