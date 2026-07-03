/**
 * cell.tsx — renderCell, MatrixCellFallback, ICellDndState, NOOP_REF.
 */
import type { Accessor, JSX } from 'solid-js';
import { Show, Suspense } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { DragBadge } from './dnd/drag-badge';
import type { ICell } from './interfaces';
import { MatrixSlot, traceSlotRender } from './slot';
import { matrixSlots } from './variants';

// ---------------------------------------------------------------------------
// No-op ref helper — Solid's `ref={undefined}` on plain HTML elements throws
// "TypeError: fn is not a function" because the compiled JSX expects a callable.
// `<Dynamic>` tolerates undefined refs internally, but the centroid path uses
// a plain `<div>`. Use NOOP_REF as the default-no-bind ref.
// ---------------------------------------------------------------------------
export const NOOP_REF = (_el: HTMLElement): void => {};

// ---------------------------------------------------------------------------
// MatrixCellFallback — neutral default Suspense fallback for a Matrix cell.
//
// Full-cell pulse placeholder: fills h-full w-full so it occupies the slot's
// box while the lazy chunk streams in. Uses bg-muted + animate-pulse (same
// visual as Skeleton Block) without importing the full Skeleton primitive
// (avoids a kobalte dependency in this render path).
// ---------------------------------------------------------------------------

export const MatrixCellFallback = (): JSX.Element => (
  <div class="h-full w-full animate-pulse rounded-sm bg-muted" />
);

// ---------------------------------------------------------------------------
// Per-cell DnD state passed down from the swap engine.
// `undefined` when DnD is not active for this cell.
// ---------------------------------------------------------------------------

export interface ICellDndState {
  draggableId: string;
  isOver: Accessor<boolean>;
  canDrop: Accessor<boolean>;
  /** Drag is active AND this cell would accept the active payload (soft highlight). */
  canAccept: Accessor<boolean>;
  /**
   * Reactive: true when the drag-badge should be visible.
   * MUST be an accessor — toggling DnD off/on must not re-mount cells; the
   * badge visibility flips through Solid reactivity instead.
   */
  showBadge: Accessor<boolean>;
}

// ---------------------------------------------------------------------------
// Cell renderer — renders one ICell as the correct HTML5 element
// ---------------------------------------------------------------------------

export const renderCell = (
  cell: ICell,
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
   * Single source of truth for the cell divider. Independent of `resizable`/DnD —
   * a resizable cell only gets an interactive handle (+ badge), never a border by
   * itself. `bordered` alone toggles the `border-border/60` hairline on every cell.
   */
  bordered: Accessor<boolean>,
): JSX.Element => {
  const tag = cell.tag ?? 'div';
  const children = getSwappedChildren ? getSwappedChildren(cell.id) : cell.children;
  const content = children;
  traceSlotRender(cell.id);

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
  if (dndState) {
    const innerClass = rowIsAutoHeight
      ? 'relative overflow-auto w-full'
      : 'absolute inset-0 overflow-auto';

    // When DnD is active the outer wrapper must NOT carry overflow-auto/hidden.
    // overflow on the outer element creates a new stacking context that clips the
    // absolutely-positioned DragBadge (z-30) to the cell's scroll viewport — the
    // badge disappears behind DataTable rows whose sticky thead (z-index:1 inside
    // its own scroll container) also shares the same context.
    // Scroll is delegated entirely to the inner div (innerClass above); the outer
    // stays a clean `relative` container so DragBadge's z-30 wins globally.
    // `scrollbar-hover` mirrors matrixSlots.resizeMain/Slot visual parity for
    // draggable cells (parity is otherwise carried by the non-DnD branch below).
    return (
      <Dynamic
        component={tag}
        ref={cellRef}
        class="h-full w-full relative rounded-sm"
        classList={{ 'border-[0.5px] border-border/70': bordered() }}
      >
        {/* Inner scroll wrapper; pointer-events-none during drag prevents hover leaking
            into cell content (table row hover, map hover, etc.).
            DnD ref lives on the outer wrapper so elementFromPoint() always hits it. */}
        <div
          class={`${innerClass} scrollbar-hover`}
          classList={{ 'pointer-events-none': isDragging() }}
        >
          <MatrixSlot slot={cell.id}>
            <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>{content}</Suspense>
          </MatrixSlot>
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
        <Show when={dndState.showBadge()}>
          <DragBadge draggableId={dndState.draggableId} />
        </Show>
      </Dynamic>
    );
  }

  const isMain = cell.id === 'main';
  return (
    <Dynamic
      component={tag}
      ref={cellRef}
      class={`${isMain ? matrixSlots.resizeMain : matrixSlots.resizeSlot} relative overflow-hidden rounded-sm`}
      classList={{ 'border-[0.5px] border-border/70': bordered() }}
    >
      <div class="absolute inset-0 overflow-auto">
        <MatrixSlot slot={cell.id}>
          <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>{content}</Suspense>
        </MatrixSlot>
      </div>
    </Dynamic>
  );
};
