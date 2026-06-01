import { DnDProvider, useDnD } from '@capsuletech/web-dnd';
import { type ICapsuleRouter, RouterContext } from '@capsuletech/web-router';
import { createStyle, useLayoutMode, useSettingsMode } from '@capsuletech/web-style';
import {
  type Accessor,
  createMemo,
  createSignal,
  For,
  type JSX,
  Show,
  splitProps,
  Suspense,
  useContext,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { Animate, type AnimateVariant } from '../../wrappers/animate';
import { Flex } from '../flex/flex';
import type { IFlexItem } from '../flex/interfaces';
import { DragBadge } from './dnd/drag-badge';
import { createInsertEngine, rowAcceptsGroup } from './dnd/insert';
import { createSwapEngine } from './dnd/swap';
import type { ICell, IMatrixProps, IRow } from './interfaces';
import { resolvePreset } from './presets';
import { matrixCva, matrixSlots } from './variants';

// ---------------------------------------------------------------------------
// No-op ref helper — Solid's `ref={undefined}` on plain HTML elements throws
// "TypeError: fn is not a function" because the compiled JSX expects a callable.
// `<Dynamic>` tolerates undefined refs internally, but the centroid path uses
// a plain `<div>`. Use NOOP_REF as the default-no-bind ref.
// ---------------------------------------------------------------------------
const NOOP_REF = (_el: HTMLElement): void => {};

// ---------------------------------------------------------------------------
// animateMain helper — wraps content in <Animate> if `animated` is set
// ---------------------------------------------------------------------------

const animateMain = (
  content: JSX.Element,
  animated: boolean | AnimateVariant | undefined,
  router: ICapsuleRouter | null,
): JSX.Element => {
  if (!animated) return content;
  const variant: AnimateVariant = typeof animated === 'string' ? animated : 'fade';
  if (router) {
    return (
      <Animate variant={variant} keyed={router.current()}>
        {content}
      </Animate>
    );
  }
  return <Animate variant={variant}>{content}</Animate>;
};

// ---------------------------------------------------------------------------
// MatrixCellFallback — neutral default Suspense fallback for a Matrix cell.
//
// Full-cell pulse placeholder: fills h-full w-full so it occupies the slot's
// box while the lazy chunk streams in. Uses bg-muted + animate-pulse (same
// visual as Skeleton Block) without importing the full Skeleton primitive
// (avoids a kobalte dependency in this render path).
// ---------------------------------------------------------------------------

const MatrixCellFallback = (): JSX.Element => (
  <div class="h-full w-full animate-pulse rounded-sm bg-muted" />
);

// ---------------------------------------------------------------------------
// Cell renderer — renders one ICell as the correct HTML5 element
// ---------------------------------------------------------------------------

/**
 * Per-cell DnD state passed down from the swap engine.
 * `undefined` when DnD is not active for this cell.
 */
interface ICellDndState {
  draggableId: string;
  isOver: Accessor<boolean>;
  canDrop: Accessor<boolean>;
  /** Drag is active AND this cell would accept the active payload (soft highlight). */
  canAccept: Accessor<boolean>;
  showBadge: boolean;
}

const renderCell = (
  cell: ICell,
  animated: boolean | AnimateVariant | undefined,
  router: ICapsuleRouter | null,
  /** Reactive children override from swap engine (undefined → use cell.children directly). */
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  /** Ref to apply drag+drop binding (undefined → no binding). */
  cellRef: ((el: HTMLElement) => void) | undefined,
  /** DnD state for badge rendering + drop highlight. undefined = no DnD on this cell. */
  dndState: ICellDndState | undefined,
  /** Reactive: true when any drag is active — suppresses hover events on cell content. */
  isDragging: Accessor<boolean>,
  /**
   * True when this cell lives inside a row with `height === 'auto'`.
   * In that case the outer element is content-driven (no explicit height), so the
   * inner DnD wrapper MUST NOT use `absolute inset-0` (→ 0×0 box).
   * Instead it renders inline-relative so the parent grows to fit content.
   */
  rowIsAutoHeight: boolean,
  /**
   * Reactive layout mode. В `'edit'` показываем edit-affordances (dashed border
   * на interactive cells + drag-badges). В `'view'` — чистый рендер без какого
   * либо UI-намёка на возможность ресайза/переноса.
   */
  layoutMode: Accessor<'view' | 'edit'>,
  /**
   * True если эта cell хоть как-то interactive (draggable | cell.resizable |
   * родительский row.resizable). Только interactive-cells получают edit-border.
   */
  isInteractive: boolean,
  /**
   * Reactive global settingsMode. When true AND cell.settings is present,
   * renders a toolbar strip at the top of the cell.
   */
  settingsMode: Accessor<boolean>,
): JSX.Element => {
  const tag = cell.tag ?? 'div';
  const isMain = cell.id === 'main';
  const children = getSwappedChildren ? getSwappedChildren(cell.id) : cell.children;
  const content = isMain ? animateMain(children, animated, router) : children;

  // Settings toolbar strip — rendered when settingsMode is ON and cell.settings present.
  // Positioned ABSOLUTE so it overlays the top of the cell without perturbing the
  // content wrapper's height. Fixed height h-9 (36px) matches the content top offset.
  // z-10 ensures the strip renders above scrollable content (tables, maps, etc.).
  const settingsStrip = (): JSX.Element =>
    settingsMode() && cell.settings ? (
      <div class="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-1 border-b border-border bg-card/80 px-2 text-sm">
        {cell.settings}
      </div>
    ) : null;

  // Cells with DnD need `position: relative` to host the absolute badge.
  // The badge must live outside the scroll container so it stays pinned to
  // the top-right corner even when cell content (e.g. DataTable) scrolls.
  //
  // Two nesting strategies depending on whether the row has a fixed height:
  //
  //   fixed-height row (default): outer relative → inner `absolute inset-0 overflow-auto`
  //     The inner div fills the outer exactly, enabling overflow-scroll.
  //
  //   auto-height row (e.g. header with draggable=true): outer relative →
  //     inner `relative overflow-auto` (inline, content-driven).
  //     `absolute inset-0` would collapse to 0×0 because the outer has no
  //     explicit height — the content would be invisible.
  //
  // The badge and drop overlay are `absolute` siblings to the inner wrapper in
  // both cases; they rely on the outer `relative` container, not the inner.
  //
  // When settingsMode is on and cell.settings is present the strip renders as an
  // absolute overlay (z-10, pinned top-0, h-9) so the content wrapper always keeps
  // an absolute inset-0 box — giving the virtualizer a definite height synchronously.
  if (dndState) {
    // In the DnD branch the outer Dynamic element handles position:relative and the
    // full-cell footprint. The strip is absolutely positioned (z-10) so the content
    // wrapper always gets a definite height via absolute inset-0 — this is critical
    // for the virtualizer: InfiniteTable's scroll element must get its real height
    // synchronously at mount, not via flex computation a frame later.
    // When settings are active the content is offset by top-9 (36px = strip height)
    // so the strip does not cover the table header / first row.
    const withSettings = settingsMode() && !!cell.settings;
    const innerClass = withSettings
      ? 'absolute inset-0 overflow-auto'
      : rowIsAutoHeight
        ? 'relative overflow-auto w-full'
        : 'absolute inset-0 overflow-auto';

    return (
      <Dynamic
        component={tag}
        ref={cellRef}
        class={`${isMain ? matrixSlots.resizeMain : matrixSlots.resizeSlot} relative`}
      >
        {/* Settings strip — absolute overlay at top, z-10, only when settingsMode ON */}
        <Show when={withSettings}>{settingsStrip()}</Show>
        {/* Inner scroll wrapper; pointer-events-none during drag prevents hover leaking
            into cell content (table row hover, map hover, etc.).
            DnD ref lives on the outer wrapper so elementFromPoint() always hits it. */}
        <div class={innerClass} classList={{ 'pointer-events-none': isDragging() }}>
          <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>{content}</Suspense>
        </div>
        {/* Absolute overlay renders above canvas / GPU layers — ring/box-shadow do not. */}
        <Show when={dndState.canAccept() || dndState.canDrop() || dndState.isOver()}>
          <div
            class="pointer-events-none absolute inset-0 z-30 transition-colors duration-150"
            classList={{
              // Soft: drag active, cell is a valid target but pointer not over it yet
              'border-2 border-primary/30 bg-primary/5':
                dndState.canAccept() && !dndState.canDrop(),
              // Strong: pointer is over this cell and it accepts the payload
              'border-2 border-primary bg-primary/15': dndState.canDrop(),
              // Wrong group: hovering a cell that cannot accept the active drag
              'border-2 border-border':
                dndState.isOver() && !dndState.canDrop() && !dndState.canAccept(),
            }}
          />
        </Show>
        {dndState.showBadge && <DragBadge draggableId={dndState.draggableId} />}
      </Dynamic>
    );
  }

  // Non-DnD path: when settings are active render strip as absolute overlay.
  // Content wrapper stays absolute inset-0 (immediate definite height) with top-9
  // offset so the strip does not cover the first row/header.
  if (settingsMode() && cell.settings) {
    return (
      <Dynamic
        component={tag}
        ref={cellRef}
        class={`${isMain ? matrixSlots.resizeMain : matrixSlots.resizeSlot} relative`}
      >
        {settingsStrip()}
        <div class="absolute inset-0 overflow-auto">
          <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>{content}</Suspense>
        </div>
      </Dynamic>
    );
  }

  return (
    <Dynamic
      component={tag}
      ref={cellRef}
      class={`${isMain ? matrixSlots.resizeMain : matrixSlots.resizeSlot} relative`}
    >
      <div class="absolute inset-0 overflow-auto">
        <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>{content}</Suspense>
      </div>
    </Dynamic>
  );
};

// ---------------------------------------------------------------------------
// Packing-zone helpers (ADR 022)
// ---------------------------------------------------------------------------

/**
 * Returns true when a row should use the packing render-path instead of
 * corvu fractional. Criteria (any one is sufficient):
 *   - `row.wrap === true`
 *   - `row.orientation === 'vertical'`
 *   - any cell has `minW` or `minH`
 */
const isPackingZone = (row: IRow): boolean => {
  if (row.wrap) return true;
  if (row.orientation === 'vertical') return true;
  return row.cells.some((c) => c.minW !== undefined || c.minH !== undefined);
};

// ---------------------------------------------------------------------------
// Per-cell explicit size map — session-only, keyed by cellId.
// Used in packing zones for manual resize: when the user drags a handle the
// cell gets an explicit px width (horizontal) or height (vertical). Cells
// that have not been resized remain flex:1 so they auto-fill the line.
// Stored as a reactive signal so the handle can write and the cell style
// getter can read reactively within the <For> computation.
// ---------------------------------------------------------------------------

type CellSizeMap = Map<string, number>;

/**
 * renderPackingRow — packing render-path for zones with wrap/vertical/min-size.
 *
 * Layout strategy:
 *   - `orientation:'horizontal'` (default) + `wrap:true`:
 *       CSS `display:flex; flex-wrap:wrap` — cells flow left→right,
 *       wrap to next line when minW is exceeded. Vertical overflow → scroll.
 *   - `orientation:'vertical'` + `wrap:true`:
 *       CSS `display:flex; flex-direction:column; flex-wrap:wrap` —
 *       cells stack top→bottom, wrap to next column.
 *   - Without `wrap`: no CSS wrap, but min-size constraints still apply.
 *
 * Each cell gets `min-width: minW px` (horizontal) or `min-height: minH px`
 * (vertical) so the browser enforces the minimum during resize/reflow.
 * Cells that have been manually resized via the handle get an explicit px
 * `width`/`height` written into a reactive signal; unresized cells stay
 * `flex:1`. Because the container is `flex-wrap`, cells that no longer fit
 * reflow automatically onto the next line — no JS geometry math needed.
 *
 * Resize handle:
 *   - Visible only when `layoutMode==='edit'`.
 *   - Trailing edge: right side for horizontal cells, bottom for vertical.
 *   - Pointer-drag (pointerdown → pointermove → pointerup) writes the new
 *     px size into the reactive CellSizeMap signal.
 *   - Floor is `cell.minW` / `cell.minH` (cannot resize below minimum).
 *
 * This is a pure CSS approach for the layout itself — no JS reflow
 * measurement. Geometry verification requires a real browser (jsdom does
 * not measure layout).
 *
 * The row-level drop ref (for cross-row insert) is attached to the outer div.
 */
const renderPackingRow = (
  row: IRow,
  animated: boolean | AnimateVariant | undefined,
  router: ICapsuleRouter | null,
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  bindCell: ((cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void) | undefined,
  bindRow: ((rowId: string) => (el: HTMLElement) => void) | undefined,
  isDragging: Accessor<boolean>,
  layoutMode: Accessor<'view' | 'edit'>,
  settingsMode: Accessor<boolean>,
  /** True when a drag is active AND this row rejects it (accepts-constraint). */
  rowRejectsDrag: Accessor<boolean>,
  /** Reactive getter for the per-cell explicit px sizes (set via resize handle). */
  getCellSize: (cellId: string) => number | undefined,
  /** Setter called by the resize handle to persist a new explicit px size. */
  setCellSize: (cellId: string, px: number) => void,
): JSX.Element => {
  const isVertical = row.orientation === 'vertical';
  const hasWrap = row.wrap === true;
  const rowDropRef = bindRow && row.id ? bindRow(row.id) : NOOP_REF;

  // CSS flex direction + wrap
  const containerClass = [
    'relative w-full',
    // Vertical overflow scroll for horizontal packing (wrap may grow zone height)
    isVertical ? 'h-full overflow-x-auto' : 'h-full overflow-y-auto',
    'flex',
    isVertical ? 'flex-col' : 'flex-row',
    hasWrap ? 'flex-wrap' : 'flex-nowrap',
    // Gap between cells — small visual breathing room
    'gap-px',
  ].join(' ');

  return (
    <div
      ref={rowDropRef}
      class={containerClass}
      classList={{
        // «cannot-drop» highlight when accepts-constraint rejects active drag
        'ring-2 ring-inset ring-destructive/50': rowRejectsDrag(),
      }}
    >
      <For each={row.cells}>
        {(cell) => {
          const cellRef = cell.draggable && bindCell ? bindCell(cell, row.id) : NOOP_REF;
          const isMain = cell.id === 'main';
          const children = getSwappedChildren ? getSwappedChildren(cell.id) : cell.children;
          const content = isMain ? animateMain(children, animated, router) : children;

          // Reactive cell style: explicit px size when set via handle,
          // otherwise flex:1 with min constraints applied.
          const cellStyle = (): JSX.CSSProperties => {
            const explicit = getCellSize(cell.id);
            const s: JSX.CSSProperties = {};
            if (!isVertical) {
              if (explicit !== undefined) {
                // Explicit width set via handle — disables flex-grow so CSS
                // flex-wrap can reflow the cell onto the next line if the
                // container shrinks below the explicit width + its minW.
                s.width = `${explicit}px`;
                s['flex-shrink'] = '0';
                s['flex-grow'] = '0';
              } else {
                s.flex = '1';
              }
              if (cell.minW !== undefined) s['min-width'] = `${cell.minW}px`;
            } else {
              if (explicit !== undefined) {
                s.height = `${explicit}px`;
                s['flex-shrink'] = '0';
                s['flex-grow'] = '0';
              } else {
                s.flex = '1';
              }
              if (cell.minH !== undefined) s['min-height'] = `${cell.minH}px`;
            }
            return s;
          };

          const tag = cell.tag ?? 'div';
          const withSettings = settingsMode() && !!cell.settings;

          // Settings strip (same pattern as renderCell)
          const settingsStrip = (): JSX.Element =>
            withSettings ? (
              <div class="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-1 border-b border-border bg-card/80 px-2 text-sm">
                {cell.settings}
              </div>
            ) : null;

          // Resize handle — visible only in edit mode.
          // Trailing edge: right for horizontal cells, bottom for vertical.
          // Pointer-drag writes explicit px size into the CellSizeMap signal.
          // Floor = minW / minH so the cell cannot be dragged below minimum.
          const resizeHandle = (): JSX.Element => {
            if (layoutMode() !== 'edit') return null;

            const onPointerDown = (e: PointerEvent): void => {
              e.preventDefault();
              e.stopPropagation();
              const handle = e.currentTarget as HTMLElement;
              // setPointerCapture not available in all environments (jsdom).
              handle.setPointerCapture?.(e.pointerId);

              // Snapshot the cell element's current size at drag start.
              const cellEl = handle.parentElement;
              if (!cellEl) return;

              const startPx = isVertical ? cellEl.offsetHeight : cellEl.offsetWidth;
              const startCoord = isVertical ? e.clientY : e.clientX;
              const minFloor = isVertical ? (cell.minH ?? 0) : (cell.minW ?? 0);

              const onMove = (ev: PointerEvent): void => {
                const delta = (isVertical ? ev.clientY : ev.clientX) - startCoord;
                const newSize = Math.max(minFloor, startPx + delta);
                setCellSize(cell.id, newSize);
              };

              const onUp = (): void => {
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
              };

              handle.addEventListener('pointermove', onMove);
              handle.addEventListener('pointerup', onUp);
            };

            // Horizontal: right-edge handle (4px wide, full height, cursor ew-resize)
            // Vertical:   bottom-edge handle (full width, 4px tall, cursor ns-resize)
            const handleClass = isVertical
              ? 'absolute inset-x-0 bottom-0 z-20 h-1 cursor-ns-resize bg-border/0 hover:bg-primary/40 active:bg-primary/60 transition-colors'
              : 'absolute inset-y-0 right-0 z-20 w-1 cursor-ew-resize bg-border/0 hover:bg-primary/40 active:bg-primary/60 transition-colors';

            return <div class={handleClass} onPointerDown={onPointerDown} />;
          };

          return (
            <Dynamic
              component={tag}
              ref={cellRef}
              class={`${isMain ? matrixSlots.resizeMain : matrixSlots.resizeSlot} relative overflow-hidden`}
              style={cellStyle()}
            >
              <Show when={withSettings}>{settingsStrip()}</Show>
              <div
                class="absolute inset-0 overflow-auto"
                classList={{ 'pointer-events-none': isDragging() }}
              >
                <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>{content}</Suspense>
              </div>
              {resizeHandle()}
            </Dynamic>
          );
        }}
      </For>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Row renderer — turns one IRow into a horizontal Flex (resizable or static)
// ---------------------------------------------------------------------------

const rowToFlexItems = (
  row: IRow,
  animated: boolean | AnimateVariant | undefined,
  router: ICapsuleRouter | null,
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  bindCell: ((cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void) | undefined,
  getCellDndState: ((cell: ICell) => ICellDndState | undefined) | undefined,
  /** Saved sizes for this row's horizontal panels (index-aligned). */
  savedSizes: number[] | undefined,
  isDragging: Accessor<boolean>,
  layoutMode: Accessor<'view' | 'edit'>,
  settingsMode: Accessor<boolean>,
): IFlexItem[] => {
  const rowIsAutoHeight = row.height === 'auto';
  return row.cells.map((cell, i) => {
    const widthIsNumber = typeof cell.width === 'number';
    const cellRef = cell.draggable && bindCell ? bindCell(cell, row.id) : NOOP_REF;
    const dndState = getCellDndState ? getCellDndState(cell) : undefined;
    // Prefer session-persisted size; fall back to declared cell.width.
    const resolvedSize = savedSizes?.[i] ?? (widthIsNumber ? (cell.width as number) : undefined);
    const isInteractive = !!cell.draggable || !!cell.resizable || !!row.resizable;
    return {
      children: renderCell(
        cell,
        animated,
        router,
        getSwappedChildren,
        cellRef,
        dndState,
        isDragging,
        rowIsAutoHeight,
        layoutMode,
        isInteractive,
        settingsMode,
      ),
      // resizable не gate'ится по layoutMode: иначе все items станут resizable=false,
      // Flex переключится в StaticItemsFlex (без corvu Panel) и cells схлопнутся в 0.
      // Layout-mode выключает handle через `withHandle` + `handleDisabled` (см. вызовы Flex ниже).
      resizable: cell.resizable ?? false,
      initialSize: resolvedSize,
      minSize: undefined,
      maxSize: undefined,
    };
  });
};

const rowHasResizable = (row: IRow): boolean => row.cells.some((c) => c.resizable === true);

// ---------------------------------------------------------------------------
// renderRow
// ---------------------------------------------------------------------------

const renderRow = (
  row: IRow,
  animated: boolean | AnimateVariant | undefined,
  router: ICapsuleRouter | null,
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  bindCell: ((cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void) | undefined,
  bindRow: ((rowId: string) => (el: HTMLElement) => void) | undefined,
  getCellDndState: ((cell: ICell) => ICellDndState | undefined) | undefined,
  /** Saved horizontal panel sizes for this row (index-aligned, session-persisted). */
  savedSizes: number[] | undefined,
  /** Called when corvu reports new horizontal sizes for this row. */
  onRowSizesChange: ((sizes: number[]) => void) | undefined,
  isDragging: Accessor<boolean>,
  layoutMode: Accessor<'view' | 'edit'>,
  settingsMode: Accessor<boolean>,
  /**
   * ADR 022: Reactive accessor — true when a drag is active AND this row
   * rejects the dragged cell (accepts-constraint). Triggers «cannot-drop» highlight.
   */
  rowRejectsDrag: Accessor<boolean>,
  /** ADR 022: Getter for per-cell explicit px sizes (packing resize handle). */
  getCellSize: (cellId: string) => number | undefined,
  /** ADR 022: Setter for per-cell explicit px sizes (packing resize handle). */
  setCellSize: (cellId: string, px: number) => void,
): JSX.Element => {
  // ADR 022: Packing zones (wrap/vertical/min-size) use a separate render-path
  // instead of corvu fractional panels.
  if (isPackingZone(row)) {
    return renderPackingRow(
      row,
      animated,
      router,
      getSwappedChildren,
      bindCell,
      bindRow,
      isDragging,
      layoutMode,
      settingsMode,
      rowRejectsDrag,
      getCellSize,
      setCellSize,
    );
  }

  const hasResizable = rowHasResizable(row);
  // Cross-row drop target ref — only meaningful in insert mode (bindRow defined).
  const rowDropRef = bindRow && row.id ? bindRow(row.id) : NOOP_REF;

  if (hasResizable) {
    const items = rowToFlexItems(
      row,
      animated,
      router,
      getSwappedChildren,
      bindCell,
      getCellDndState,
      savedSizes,
      isDragging,
      layoutMode,
      settingsMode,
    );
    const isEdit = layoutMode() === 'edit';
    return (
      <div ref={rowDropRef} class="relative h-full min-h-0 flex-1 overflow-hidden">
        <div class="absolute inset-0">
          <Flex
            orientation="horizontal"
            items={items}
            withHandle={isEdit}
            handleDisabled={!isEdit}
            onSizesChange={onRowSizesChange}
          />
        </div>
      </div>
    );
  }

  const rowIsAutoHeight = row.height === 'auto';
  return (
    <div
      ref={rowDropRef}
      class="flex h-full min-h-0 w-full overflow-hidden"
      classList={{ 'flex-1': row.height === 'fr' || row.height === undefined }}
    >
      <For each={row.cells}>
        {(cell) => {
          const cellRef = cell.draggable && bindCell ? bindCell(cell, row.id) : NOOP_REF;
          const dndState = getCellDndState ? getCellDndState(cell) : undefined;
          const isInteractive = !!cell.draggable || !!cell.resizable || !!row.resizable;
          return renderCell(
            cell,
            animated,
            router,
            getSwappedChildren,
            cellRef,
            dndState,
            isDragging,
            rowIsAutoHeight,
            layoutMode,
            isInteractive,
            settingsMode,
          );
        }}
      </For>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Rows-engine
// ---------------------------------------------------------------------------

const rowsToVerticalItems = (
  rows: IRow[],
  animated: boolean | AnimateVariant | undefined,
  router: ICapsuleRouter | null,
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  bindCell: ((cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void) | undefined,
  bindRow: ((rowId: string) => (el: HTMLElement) => void) | undefined,
  getCellDndState: ((cell: ICell) => ICellDndState | undefined) | undefined,
  /** Saved vertical panel sizes (index-aligned). */
  savedVerticalSizes: number[] | undefined,
  /** Per-row saved horizontal sizes. Key = rowId ?? "r<index>". */
  getRowSavedSizes: ((rowKey: string) => number[] | undefined) | undefined,
  /** Called when a horizontal row's corvu sizes change. Key = rowId ?? "r<index>". */
  onRowSizesChange: ((rowKey: string, sizes: number[]) => void) | undefined,
  isDragging: Accessor<boolean>,
  layoutMode: Accessor<'view' | 'edit'>,
  settingsMode: Accessor<boolean>,
  /** ADR 022: Per-row reactive accessor factory for accepts-constraint rejection. */
  makeRowRejectsDrag: ((row: IRow) => Accessor<boolean>) | undefined,
  /** ADR 022: Getter for per-cell explicit px sizes (packing resize handle). */
  getCellSize: (cellId: string) => number | undefined,
  /** ADR 022: Setter for per-cell explicit px sizes (packing resize handle). */
  setCellSize: (cellId: string, px: number) => void,
): IFlexItem[] => {
  return rows.map((row, i) => {
    const heightIsNumber = typeof row.height === 'number';
    // resizable не gate'ится по layoutMode (см. комментарий в rowToFlexItems).
    const isResizable = row.resizable ?? true;
    const rowKey = row.id ?? `r${i}`;
    const rowSaved = getRowSavedSizes ? getRowSavedSizes(rowKey) : undefined;
    const rowOnChange = onRowSizesChange
      ? (sizes: number[]) => onRowSizesChange(rowKey, sizes)
      : undefined;
    // Prefer session-persisted vertical size; fall back to declared row.height.
    const resolvedHeight =
      savedVerticalSizes?.[i] ?? (heightIsNumber ? (row.height as number) : undefined);
    const rowRejectsDrag = makeRowRejectsDrag ? makeRowRejectsDrag(row) : () => false as boolean;
    return {
      children: renderRow(
        row,
        animated,
        router,
        getSwappedChildren,
        bindCell,
        bindRow,
        getCellDndState,
        rowSaved,
        rowOnChange,
        isDragging,
        layoutMode,
        settingsMode,
        rowRejectsDrag,
        getCellSize,
        setCellSize,
      ),
      resizable: isResizable,
      initialSize: resolvedHeight,
      // ADR 022: minHeight is a fraction (0..1) matching corvu minSize semantics.
      // Pass-through directly — no px→fraction conversion needed.
      minSize: row.minHeight,
    };
  });
};

const hasVerticalResizable = (rows: IRow[]): boolean =>
  rows.some((r) => r.resizable === true || typeof r.height === 'number');

// ---------------------------------------------------------------------------
// MatrixContent — inner component that lives INSIDE DnDProvider
//
// createDraggable / createDroppable call useDnD() which reads the DnD context.
// They must run inside the provider tree. By placing the swap engine here,
// we guarantee the context is available when createSwapEngine runs.
// ---------------------------------------------------------------------------

interface IMatrixContentProps {
  rows: Accessor<IRow[]>;
  animated: boolean | AnimateVariant | undefined;
  router: ICapsuleRouter | null;
  layoutMode: Accessor<'view' | 'edit'>;
  dndMode: Accessor<'swap' | 'insert'>;
  onLayoutChange: ((e: import('./interfaces').LayoutChangeEvent) => void) | undefined;
  settingsMode: Accessor<boolean>;
  /**
   * Matrix-level outer axis (ADR 022).
   * `'vertical'` (default) = rows stacked top→bottom.
   * `'horizontal'` = zones placed side-by-side left→right.
   */
  direction: 'vertical' | 'horizontal';
}

// ---------------------------------------------------------------------------
// SizesMap — session-only persistence of user-resized panel sizes.
// Key scheme:
//   "v"         → vertical flex (rows column)
//   "h:<rowKey>" → horizontal flex within a row (rowKey = rowId ?? "r<index>")
//
// Implemented as a plain mutable object (not a signal) for two reasons:
//   1. Reads must NOT be reactive — we deliberately read at rebuild time only,
//      so we never want sizesMap to be a dependency of renderContent().
//   2. corvu fires onSizesChange SYNCHRONOUSLY during panel unregistration
//      (cleanup/unmount). These calls carry shrinking arrays (panels removed
//      one-by-one) that would corrupt the snapshot if saved. We guard against
//      this by discarding updates where sizes.length < snapshot[key].length.
// ---------------------------------------------------------------------------

type SizesMap = Record<string, number[]>;

const MatrixContent = (props: IMatrixContentProps) => {
  // Reactive drag-active flag — suppresses pointer-events on cell content during drag.
  // useDnD() is safe here: MatrixContent always renders inside DnDProvider.
  const dnd = useDnD();
  const isDragging = createMemo(() => dnd.state.activeId() !== null);

  // Swap / insert / badges все gate'ятся по layoutMode. В 'view' — статичный
  // layout без DnD UI; в 'edit' — DnD активен и виден.
  const swapEnabled = createMemo(() => props.layoutMode() === 'edit' && props.dndMode() === 'swap');
  const insertEnabled = createMemo(
    () => props.layoutMode() === 'edit' && props.dndMode() === 'insert',
  );

  // Plain mutable store — intentionally NOT a signal.
  // Reads inside renderContent() must not create reactive dependencies.
  const sizesSnapshot: SizesMap = {};

  const getSavedSizes = (key: string): number[] | undefined => sizesSnapshot[key];

  const saveSizes = (key: string, sizes: number[]): void => {
    const prev = sizesSnapshot[key];
    // Guard against corvu's cleanup-time calls: when panels unregister one-by-one,
    // corvu fires onSizesChange with a shrinking array. Discard those calls so
    // we don't overwrite valid resize data with partial/empty arrays.
    if (prev !== undefined && sizes.length < prev.length) return;
    sizesSnapshot[key] = sizes;
  };

  const getRowSavedSizes = (rowKey: string): number[] | undefined => getSavedSizes(`h:${rowKey}`);

  const onRowSizesChange = (rowKey: string, sizes: number[]): void => {
    saveSizes(`h:${rowKey}`, sizes);
  };

  const onVerticalSizesChange = (sizes: number[]): void => {
    saveSizes('v', sizes);
  };

  // ---------------------------------------------------------------------------
  // ADR 022: Per-cell explicit px sizes for packing-zone resize handles.
  // Stored as a reactive signal (Map) so the resize handle can write and
  // the cell style getter reads reactively inside <For>.
  // Session-only: cleared on Matrix remount (same as sizesSnapshot).
  // ---------------------------------------------------------------------------
  const [cellSizeMap, setCellSizeMap] = createSignal<CellSizeMap>(new Map(), {
    equals: false, // always notify (Map mutations are not value-equal)
  });

  const getCellSize = (cellId: string): number | undefined => cellSizeMap().get(cellId);

  const setCellSize = (cellId: string, px: number): void => {
    setCellSizeMap((prev) => {
      const next = new Map(prev);
      next.set(cellId, px);
      return next;
    });
  };

  const swap = createSwapEngine({
    rows: props.rows,
    enabled: swapEnabled,
    onLayoutChange: props.onLayoutChange,
  });

  const insert = createInsertEngine({
    rows: props.rows,
    enabled: insertEnabled,
    onLayoutChange: props.onLayoutChange,
    direction: props.direction,
  });

  // Badge is shown on each draggable cell only when 2+ draggable cells exist
  // (otherwise there is nothing to swap with).
  const showBadges = createMemo(
    () => props.layoutMode() === 'edit' && swap.draggableCount >= 2 && props.dndMode() === 'swap',
  );

  // Effective rows: insert mode mutates layout structure; swap mode does not.
  const effectiveRows = createMemo(() =>
    props.dndMode() === 'insert' ? insert.rows() : props.rows(),
  );

  // Build getCellDndState — returns per-cell badge + highlight state.
  const getCellDndState = (cell: ICell): ICellDndState | undefined => {
    if (!cell.draggable || props.dndMode() !== 'swap') return undefined;
    const { isOver, canDrop, canAccept } = swap.getCellDropState(cell.id);
    return {
      draggableId: swap.getDraggableId(cell.id),
      isOver,
      canDrop,
      canAccept,
      showBadge: showBadges(),
    };
  };

  // ADR 022: Per-row reactive accessor for accepts-constraint rejection.
  // Returns true when a drag is active AND the given row rejects the active cell
  // (row.accepts defined AND active cell.group not in row.accepts).
  // Used by renderPackingRow for «cannot-drop» highlight.
  const makeRowRejectsDrag = (row: IRow): Accessor<boolean> =>
    createMemo((): boolean => {
      if (!insertEnabled()) return false;
      if (!row.accepts || row.accepts.length === 0) return false;
      const activeData = dnd.state.activeData();
      if (!activeData) return false;
      const d = activeData as { __sortable?: string; itemId?: string };
      if (typeof d.itemId !== 'string') return false;
      // Find the cell in current effective rows to get its group.
      const rows = effectiveRows();
      for (const r of rows) {
        const cell = r.cells.find((c) => c.id === d.itemId);
        if (cell) return !rowAcceptsGroup(row, cell.group);
      }
      return false;
    });

  const renderContent = (): JSX.Element => {
    const rows = effectiveRows();

    if (rows.length === 0) return null;

    const isSwap = props.dndMode() === 'swap';
    const isInsert = props.dndMode() === 'insert';
    const swapGetChildren = isSwap ? swap.getCellChildren : undefined;
    // For insert mode, bindCell must be called inside a <For> render scope so
    // that createItem (and its onCleanup for unregister) is owned by the cell's
    // DOM lifetime, not by an engine-level effect.
    // insertBindCell calls getSortable(rowId)?.createItem(cell.id) at the point
    // where the <For> item renders — giving it the correct Solid owner scope.
    const insertBindCell = isInsert
      ? (cell: ICell, rowId?: string): ((el: HTMLElement) => void) => {
          if (!cell.draggable || !rowId) return NOOP_REF;
          const sortable = insert.getSortable(rowId);
          if (!sortable) return NOOP_REF;
          return sortable.createItem(cell.id).ref;
        }
      : undefined;
    const swapBind = isSwap ? swap.bindCell : insertBindCell;
    const insertBindRow = isInsert ? insert.bindRow : undefined;
    const cellDndState = isSwap ? getCellDndState : undefined;
    // ADR 022: Only meaningful in insert mode (packing zones).
    const insertMakeRowRejectsDrag = isInsert ? makeRowRejectsDrag : undefined;

    // Single row, single cell (centroid shortcut)
    if (rows.length === 1 && rows[0].cells.length === 1 && !rows[0].resizable) {
      const cell = rows[0].cells[0];
      const isMain = cell.id === 'main';
      if (!rows[0].height || rows[0].height === 'fr') {
        const children = swapGetChildren ? swapGetChildren(cell.id) : cell.children;
        const cellRef = cell.draggable && swapBind ? swapBind(cell, rows[0].id) : NOOP_REF;
        const dndState = cellDndState ? cellDndState(cell) : undefined;
        // Centroid settings strip — absolute overlay, same pattern as renderCell.
        // Strip is pinned top/absolute (z-10) so the content wrapper keeps
        // absolute inset-0 → immediate definite height for the virtualizer.
        const centroidSettingsStrip = (): JSX.Element =>
          props.settingsMode() && cell.settings ? (
            <div class="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-1 border-b border-border bg-card/80 px-2 text-sm">
              {cell.settings}
            </div>
          ) : null;
        // Outer always relative; inner uses top-9 offset when strip is active.
        const withCentroidSettings = props.settingsMode() && !!cell.settings;
        const innerClass = withCentroidSettings
          ? 'absolute inset-0 overflow-auto flex items-center justify-center'
          : 'absolute inset-0 overflow-auto flex items-center justify-center';
        return (
          <div ref={cellRef} class="relative flex h-full w-full items-center justify-center">
            <Show when={withCentroidSettings}>{centroidSettingsStrip()}</Show>
            {/* Inner wrapper: overflow-auto allows content to scroll.
                pointer-events-none during drag prevents hover leaking into content.
                DnD ref is on the outer wrapper so elementFromPoint() always hits it. */}
            <div class={innerClass} classList={{ 'pointer-events-none': isDragging() }}>
              <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>
                {isMain ? animateMain(children, props.animated, props.router) : children}
              </Suspense>
            </div>
            {/* Absolute overlay renders above canvas / GPU layers */}
            <Show
              when={dndState && (dndState.canAccept() || dndState.canDrop() || dndState.isOver())}
            >
              <div
                class="pointer-events-none absolute inset-0 z-30 transition-colors duration-150"
                classList={{
                  'border-2 border-primary/30 bg-primary/5':
                    (dndState?.canAccept() ?? false) && !(dndState?.canDrop() ?? false),
                  'border-2 border-primary bg-primary/15': dndState?.canDrop() ?? false,
                  'border-2 border-border':
                    (dndState?.isOver() ?? false) &&
                    !(dndState?.canDrop() ?? false) &&
                    !(dndState?.canAccept() ?? false),
                }}
              />
            </Show>
            {dndState?.showBadge && <DragBadge draggableId={dndState.draggableId} />}
          </div>
        );
      }
    }

    // ---------------------------------------------------------------------------
    // ADR 022: direction='horizontal' — zones placed side-by-side (columns).
    //
    // Each IRow becomes a vertical column; rows sit LEFT→RIGHT via a horizontal
    // Flex. `row.height` is re-interpreted as the zone's width (fraction 0..1
    // or 'fr'). The resize handle between zones is horizontal (cursor ew-resize).
    //
    // Per-zone inner rendering is delegated to renderRow(), which handles the
    // packing/corvu paths for that zone's cells exactly as in vertical mode.
    //
    // This path is fully additive — direction default is 'vertical', so all
    // existing behaviour is unchanged when direction is omitted or 'vertical'.
    // ---------------------------------------------------------------------------
    if (props.direction === 'horizontal') {
      // Build Flex items: each row → one horizontal zone (column).
      // row.height doubles as the column's initial width fraction.
      // Only enter the corvu-Flex path when at least one zone actually opts into
      // resize (`resizable: true`). Zones with a numeric `height` (= width fraction)
      // but `resizable: false` MUST go through the colStyle() path below — otherwise
      // Flex.StaticItemsFlex renders a bare `flex flex-row` div (no h-full, no per-
      // zone flex sizing) because it ignores `initialSize` on non-resizable items.
      const hasResizableZones = rows.some((r) => r.resizable === true);

      const zoneItems = rows.map((row, i): IFlexItem => {
        const rowKey = row.id ?? `r${i}`;
        const rowRejectsDrag = insertMakeRowRejectsDrag
          ? insertMakeRowRejectsDrag(row)
          : () => false as boolean;
        const widthFraction = typeof row.height === 'number' ? row.height : undefined;
        return {
          children: (
            <div class="relative h-full min-w-0 flex-1 overflow-hidden">
              {renderRow(
                row,
                props.animated,
                props.router,
                swapGetChildren,
                swapBind,
                insertBindRow,
                cellDndState,
                getRowSavedSizes(rowKey),
                (sizes) => onRowSizesChange(rowKey, sizes),
                isDragging,
                props.layoutMode,
                props.settingsMode,
                rowRejectsDrag,
                getCellSize,
                setCellSize,
              )}
            </div>
          ),
          resizable: row.resizable ?? false,
          initialSize: getSavedSizes(`hz:${rowKey}`)?.[0] ?? widthFraction,
          minSize: row.minHeight, // minHeight reused as column minWidth fraction
        };
      });

      if (hasResizableZones) {
        return (
          <div class="relative h-full w-full overflow-hidden">
            <div class="absolute inset-0">
              <Flex
                orientation="horizontal"
                items={zoneItems}
                withHandle={props.layoutMode() === 'edit'}
                handleDisabled={props.layoutMode() !== 'edit'}
                onSizesChange={(sizes) => {
                  // Persist each zone's width under a per-zone key.
                  for (let k = 0; k < rows.length; k++) {
                    const rk = rows[k].id ?? `r${k}`;
                    if (sizes[k] !== undefined) saveSizes(`hz:${rk}`, [sizes[k]]);
                  }
                }}
              />
            </div>
          </div>
        );
      }

      // Non-resizable horizontal zones — plain flex row.
      // Wrap in relative h-full w-full + absolute inset-0 to give the flex-row a
      // definite height from its positioned ancestor instead of content-height.
      // Without this envelope the flex-row collapses to ~3px (content-height of
      // h-full children that have no definite pixel height to inherit from).
      // This mirrors the resizable horizontal path (relative/absolute inset-0 + Flex).
      return (
        <div class="relative h-full w-full overflow-hidden">
          <div class="absolute inset-0 flex flex-row overflow-hidden">
            <For each={rows}>
              {(row, i) => {
                const rowKey = row.id ?? `r${i()}`;
                const rowRejectsDrag = insertMakeRowRejectsDrag
                  ? insertMakeRowRejectsDrag(row)
                  : () => false as boolean;
                // Mapping of row.height → CSS flex in the non-resizable horizontal path:
                //   'auto'           → flex: 0 0 auto   (content-driven width, shrink-to-fit; for rail zones)
                //   number (0..1)    → flex: 0 0 {n}%   (explicit fraction)
                //   'fr' / undefined → flex: 1           (fills remaining space)
                const colStyle = (): JSX.CSSProperties => {
                  if (row.height === 'auto') {
                    return { flex: '0 0 auto', 'min-width': '0' };
                  }
                  if (typeof row.height === 'number') {
                    return { flex: `0 0 ${row.height * 100}%`, 'min-width': '0' };
                  }
                  return { flex: '1', 'min-width': '0' };
                };
                return (
                  <div class="relative h-full overflow-hidden" style={colStyle()}>
                    {renderRow(
                      row,
                      props.animated,
                      props.router,
                      swapGetChildren,
                      swapBind,
                      insertBindRow,
                      cellDndState,
                      getRowSavedSizes(rowKey),
                      (sizes) => onRowSizesChange(rowKey, sizes),
                      isDragging,
                      props.layoutMode,
                      props.settingsMode,
                      rowRejectsDrag,
                      getCellSize,
                      setCellSize,
                    )}
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      );
    }

    // ---------------------------------------------------------------------------
    // direction='vertical' (default) — existing behaviour, unchanged.
    // ---------------------------------------------------------------------------
    const useVertical = hasVerticalResizable(rows);

    if (useVertical) {
      // 'auto'-height rows (e.g. header) must not enter the corvu Resizable engine —
      // they have content-driven height and must be rendered as shrink-0 wrappers.
      // Only rows with numeric or 'fr' height participate in the resizable Flex so that
      // fillInitialSizes distributes space correctly among only the sized rows.
      const hasAutoRows = rows.some((r) => r.height === 'auto');

      if (!hasAutoRows) {
        // Fast path: no auto rows — feed all rows directly to vertical Flex.
        const verticalItems = rowsToVerticalItems(
          rows,
          props.animated,
          props.router,
          swapGetChildren,
          swapBind,
          insertBindRow,
          cellDndState,
          getSavedSizes('v'),
          getRowSavedSizes,
          onRowSizesChange,
          isDragging,
          props.layoutMode,
          props.settingsMode,
          insertMakeRowRejectsDrag,
          getCellSize,
          setCellSize,
        );
        return (
          <div class="relative h-full w-full overflow-hidden">
            <div class="absolute inset-0">
              <Flex
                orientation="vertical"
                items={verticalItems}
                withHandle={props.layoutMode() === 'edit'}
                handleDisabled={props.layoutMode() !== 'edit'}
                onSizesChange={onVerticalSizesChange}
              />
            </div>
          </div>
        );
      }

      // Mixed path: auto-height rows render as shrink-0, the resizable group renders
      // as a flex-1 block that fills the remaining space.
      // We build the resizable items from non-auto rows only.
      const resizableRows = rows.filter((r) => r.height !== 'auto');
      const verticalItems = rowsToVerticalItems(
        resizableRows,
        props.animated,
        props.router,
        swapGetChildren,
        swapBind,
        insertBindRow,
        cellDndState,
        getSavedSizes('v'),
        getRowSavedSizes,
        onRowSizesChange,
        isDragging,
        props.layoutMode,
        props.settingsMode,
        insertMakeRowRejectsDrag,
        getCellSize,
        setCellSize,
      );

      // Walk rows in order: emit shrink-0 divs for auto rows, and a single flex-1
      // resizable block at the position of the first non-auto row (skipping the rest).
      let resizableBlockEmitted = false;
      const elements: JSX.Element[] = rows.map((row, _i) => {
        if (row.height === 'auto') {
          const rowKey = row.id ?? `r${_i}`;
          const rowRejectsDrag = insertMakeRowRejectsDrag
            ? insertMakeRowRejectsDrag(row)
            : () => false as boolean;
          return (
            <div class="w-full shrink-0">
              {renderRow(
                row,
                props.animated,
                props.router,
                swapGetChildren,
                swapBind,
                insertBindRow,
                cellDndState,
                getRowSavedSizes(rowKey),
                (sizes) => onRowSizesChange(rowKey, sizes),
                isDragging,
                props.layoutMode,
                props.settingsMode,
                rowRejectsDrag,
                getCellSize,
                setCellSize,
              )}
            </div>
          );
        }
        if (resizableBlockEmitted) return null;
        resizableBlockEmitted = true;
        return (
          <div class="relative min-h-0 flex-1 overflow-hidden">
            <div class="absolute inset-0">
              <Flex
                orientation="vertical"
                items={verticalItems}
                withHandle={props.layoutMode() === 'edit'}
                handleDisabled={props.layoutMode() !== 'edit'}
                onSizesChange={onVerticalSizesChange}
              />
            </div>
          </div>
        );
      });

      return <div class="flex h-full w-full flex-col overflow-hidden">{elements}</div>;
    }

    return (
      <div class="flex h-full w-full flex-col overflow-hidden">
        <For each={rows}>
          {(row, i) => {
            const rowKey = row.id ?? `r${i()}`;
            const rowRejectsDrag = insertMakeRowRejectsDrag
              ? insertMakeRowRejectsDrag(row)
              : () => false as boolean;
            if (row.height === 'auto' || (row.height === undefined && rows.length > 1)) {
              return (
                <div class="w-full shrink-0">
                  {renderRow(
                    row,
                    props.animated,
                    props.router,
                    swapGetChildren,
                    swapBind,
                    insertBindRow,
                    cellDndState,
                    getRowSavedSizes(rowKey),
                    (sizes) => onRowSizesChange(rowKey, sizes),
                    isDragging,
                    props.layoutMode,
                    props.settingsMode,
                    rowRejectsDrag,
                    getCellSize,
                    setCellSize,
                  )}
                </div>
              );
            }
            return renderRow(
              row,
              props.animated,
              props.router,
              swapGetChildren,
              swapBind,
              insertBindRow,
              cellDndState,
              getRowSavedSizes(rowKey),
              (sizes) => onRowSizesChange(rowKey, sizes),
              isDragging,
              props.layoutMode,
              props.settingsMode,
              rowRejectsDrag,
              getCellSize,
              setCellSize,
            );
          }}
        </For>
      </div>
    );
  };

  return <>{renderContent()}</>;
};

// ---------------------------------------------------------------------------
// MatrixImpl — outer shell (provides DnDProvider + layout mode signals)
// ---------------------------------------------------------------------------

const MatrixImpl = (props: IMatrixProps) => {
  const [local, rest] = splitProps(props, [
    'class',
    'style',
    'ref',
    'animated',
    'preset',
    'slots',
    'rows',
    'dndMode',
    'layoutMode',
    'onLayoutChange',
    'direction',
  ]);

  const { className, style } = createStyle(matrixCva, {
    class: local.class,
    style: local.style,
  });

  const router = useContext(RouterContext);

  const getRows = createMemo((): IRow[] => {
    if (local.preset != null) {
      return resolvePreset(
        local.preset as keyof import('./interfaces').LayoutPresets,
        local.slots as never,
      );
    }
    return (local.rows as IRow[]) ?? [];
  });

  // Default: read global layoutMode store from @capsuletech/web-style — consumer
  // не обязан тянуть useLayoutMode сам. Если consumer всё-таки передал
  // `layoutMode` prop явно, его значение перекрывает глобал (= lock на
  // конкретный режим, не реагирует на global toggle). Use case: shell-layout
  // с `layoutMode="view"` остаётся статичным даже когда global edit включён.
  const globalLayoutMode = useLayoutMode();
  const layoutMode = createMemo(() => local.layoutMode ?? globalLayoutMode());
  const dndMode = createMemo(() => local.dndMode ?? 'swap');

  // settingsMode is orthogonal to layoutMode — read the global signal directly.
  const settingsMode = useSettingsMode();

  return (
    <DnDProvider showDefaultOverlay overlayMode="thumbnail">
      <div ref={local.ref} class={`${className()} relative`} style={style()} {...(rest as object)}>
        <MatrixContent
          rows={getRows}
          animated={local.animated}
          router={router}
          layoutMode={layoutMode}
          dndMode={dndMode}
          onLayoutChange={local.onLayoutChange}
          settingsMode={settingsMode}
          direction={local.direction ?? 'vertical'}
        />
      </div>
    </DnDProvider>
  );
};

/**
 * Matrix — rows-of-cells layout engine.
 *
 * **Два режима:**
 *
 * 1. **Preset** — именованный пресет + типизированные slots:
 *    ```tsx
 *    <Matrix preset="app-shell" slots={{
 *      header:  <Header />,
 *      main:    <Main />,
 *      footer:  <Footer />,
 *    }} />
 *    ```
 *
 * 2. **Raw rows** — явный массив IRow[]:
 *    ```tsx
 *    <Matrix rows={[
 *      { cells: [{ id: 'top', tag: 'header', children: <Header /> }] },
 *      { resizable: true, cells: [
 *        { id: 'a', children: <A />, width: 0.5, resizable: true, draggable: true, swapGroup: 'main-row' },
 *        { id: 'b', children: <B />, width: 0.5, resizable: true, draggable: true, swapGroup: 'main-row' },
 *      ]},
 *    ]} />
 *    ```
 *
 * **DnD / badge-UX (Phase 1.2 v2):**
 * - Each resizable draggable cell shows a DragBadge (grip icon) in its top-right corner.
 * - Badge is visible only when 2+ draggable cells exist in the same swapGroup.
 * - Mousedown on badge → activates drag for that cell (pointer captured).
 * - Drop targets highlight with inset box-shadow (renders above canvas/child layers) during an active drag.
 * - `onLayoutChange` called with `{ kind: 'swap', a, b }` after each successful swap.
 * - No global edit badge / no edit mode toggle — drag is always available via badge.
 * - `layoutMode` prop still accepted (for insert mode / controlled state future use).
 * - `dndMode` defaults to `'swap'`.
 *
 * **Per-slot Suspense boundaries:**
 * Every cell's content is wrapped in its own `<Suspense>` so a suspended lazy
 * Widget chunk blanks only that cell — not the whole Matrix. The fallback is
 * `cell.skeleton` if provided, otherwise a full-cell pulse placeholder
 * (`h-full w-full animate-pulse bg-muted`). Pass `skeleton` in SlotValue to
 * customise: `main: { children: <Lazy />, skeleton: <Skeleton variant="map" /> }`.
 */
export const Matrix = MatrixImpl;
