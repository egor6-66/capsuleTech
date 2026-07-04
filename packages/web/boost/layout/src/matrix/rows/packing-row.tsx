/**
 * packing-row.tsx — renderPackingRow, isPackingZone, CellSizeMap.
 *
 * Packing render-path для zones с wrap/vertical/min-size (ADR 022).
 */
import type { ISortableZone } from '@capsuletech/web-dnd';
import type { Accessor, JSX } from 'solid-js';
import { For, Suspense } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { MatrixCellFallback, NOOP_REF } from '../cell';
import type { ICell, IRow } from '../interfaces';
import { MatrixSlot, traceSlotRender } from '../slot';
import { matrixSlots } from '../variants';

// ---------------------------------------------------------------------------
// Per-cell explicit size map — session-only, keyed by cellId.
// Used in packing zones for manual resize: when the user drags a handle the
// cell gets an explicit px width (horizontal) or height (vertical). Cells
// that have not been resized remain flex:1 so they auto-fill the line.
// Stored as a reactive signal so the handle can write and the cell style
// getter can read reactively within the <For> computation.
// ---------------------------------------------------------------------------

export type CellSizeMap = Map<string, number>;

/**
 * Returns true when a row should use the packing render-path instead of
 * corvu fractional. Criteria (any one is sufficient):
 *   - `row.wrap === true`
 *   - `row.orientation === 'vertical'`
 *   - any cell has `minW` or `minH`
 */
export const isPackingZone = (row: IRow): boolean => {
  if (row.wrap) return true;
  if (row.orientation === 'vertical') return true;
  return row.cells.some((c) => c.minW !== undefined || c.minH !== undefined);
};

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
 *   - Visible only when `resizeEnabled()` is true.
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
export const renderPackingRow = (
  row: IRow,
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  bindCell: ((cell: ICell, rowId: string | undefined) => (el: HTMLElement) => void) | undefined,
  /**
   * Optional ISortableZone for this row (insert mode only).
   * When provided, containerRef is wired to the zone container and
   * rejects()/activeIndex() are used for the "cannot-drop" highlight and
   * insertion marker.
   */
  zone: ISortableZone | undefined,
  isDragging: Accessor<boolean>,
  resizeEnabled: Accessor<boolean>,
  dndEnabled: Accessor<boolean>,
  /** Reactive getter for the per-cell explicit px sizes (set via resize handle). */
  getCellSize: (cellId: string) => number | undefined,
  /** Setter called by the resize handle to persist a new explicit px size. */
  setCellSize: (cellId: string, px: number) => void,
  /** Single source of truth for the cell border — independent of resize/DnD. */
  bordered: Accessor<boolean> = () => true,
): JSX.Element => {
  const isVertical = row.orientation === 'vertical';
  const hasWrap = row.wrap === true;
  const rowContainerRef = zone ? zone.containerRef : NOOP_REF;
  const rowRejectsDrag: Accessor<boolean> = zone ? zone.rejects : () => false;
  const rowIsTarget: Accessor<boolean> = zone ? zone.isTarget : () => false;
  const rowCanAccept: Accessor<boolean> = zone ? zone.canAccept : () => false;
  const zoneActiveIndex: Accessor<number | null> = zone ? zone.activeIndex : () => null;

  // CSS flex direction + wrap
  const containerClass = [
    'relative w-full',
    // Vertical overflow scroll for horizontal packing (wrap may grow zone height)
    isVertical ? 'h-full overflow-x-auto' : 'h-full overflow-y-auto',
    'flex',
    isVertical ? 'flex-col' : 'flex-row',
    hasWrap ? 'flex-wrap' : 'flex-nowrap',
    // Gap between cells — subtle visual breathing room (was gap-px)
    'gap-1',
    // Padding so cells don't bleed to the zone edge
    'p-1',
  ].join(' ');

  return (
    <div
      ref={rowContainerRef}
      class={containerClass}
      classList={{
        // «cannot-drop» highlight when accepts-constraint rejects active drag
        'ring-2 ring-inset ring-destructive/50': rowRejectsDrag(),
        // Soft: drag active, this zone accepts, pointer not over it yet
        'ring-2 ring-inset ring-primary/40 bg-primary/5':
          rowCanAccept() && !rowIsTarget() && !rowRejectsDrag(),
        // Strong: pointer is over this zone (it's the drop target)
        'ring-2 ring-inset ring-primary bg-primary/10': rowIsTarget() && !rowRejectsDrag(),
      }}
    >
      <For each={row.cells}>
        {(cell, cellIndex) => {
          // Per-cell draggable: opt-out default true
          const isCellDraggable = dndEnabled() && (cell.draggable ?? true);

          // In insert mode, wire each cell's draggable ref through the zone.
          const cellRef: (el: HTMLElement) => void = (() => {
            if (isCellDraggable && zone) {
              return zone.createItem(cell.id).ref;
            }
            if (isCellDraggable && bindCell) {
              return bindCell(cell, row.id);
            }
            return NOOP_REF;
          })();
          // Accessor, НЕ снапшот — childrenMap-сигнал swap-движка должен читаться
          // в момент рендера (см. cell.tsx, drop-не-обновляет-DOM баг 2026-07-04).
          const content = (): JSX.Element =>
            getSwappedChildren ? getSwappedChildren(cell.id) : cell.children;
          traceSlotRender(cell.id);

          // Reactive cell style: explicit px size when set via handle,
          // otherwise flex:1 with min constraints applied.
          const cellStyle = (): JSX.CSSProperties => {
            const explicit = getCellSize(cell.id);
            const s: JSX.CSSProperties = {};
            if (!isVertical) {
              if (explicit !== undefined) {
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

          // Resize handle — visible only when resizeEnabled AND cell opts in (default true).
          // Trailing edge: right for horizontal cells, bottom for vertical.
          // Pointer-drag writes explicit px size into the CellSizeMap signal.
          // Floor = minW / minH so the cell cannot be dragged below minimum.
          const resizeHandle = (): JSX.Element => {
            // Tri-state: явный cell.resizable оверрайдит matrix-резолюцию.
            const isCellResizable = cell.resizable ?? resizeEnabled();
            if (!isCellResizable) return null;

            const onPointerDown = (e: PointerEvent): void => {
              e.preventDefault();
              e.stopPropagation();
              const handle = e.currentTarget as HTMLElement;
              handle.setPointerCapture?.(e.pointerId);

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

            const handleClass = isVertical
              ? 'absolute inset-x-0 bottom-0 z-20 h-1 cursor-ns-resize bg-border/0 hover:bg-primary/40 active:bg-primary/60 transition-colors'
              : 'absolute inset-y-0 right-0 z-20 w-1 cursor-ew-resize bg-border/0 hover:bg-primary/40 active:bg-primary/60 transition-colors';

            return <div class={handleClass} data-dnd-cancel="" onPointerDown={onPointerDown} />;
          };

          // Insertion marker — rendered BEFORE the cell at the active index.
          const insertionMarker = (): JSX.Element => {
            const idx = zoneActiveIndex();
            if (idx === null || idx !== cellIndex()) return null;
            const markerClass = isVertical
              ? 'h-0.5 w-full shrink-0 rounded-full bg-primary pointer-events-none'
              : 'h-full w-0.5 shrink-0 rounded-full bg-primary pointer-events-none';
            return <div class={markerClass} />;
          };

          // End-of-list insertion marker — rendered AFTER the last cell.
          const endMarker = (): JSX.Element => {
            const idx = zoneActiveIndex();
            if (idx === null || idx !== row.cells.length) return null;
            if (cellIndex() !== row.cells.length - 1) return null;
            const markerClass = isVertical
              ? 'h-0.5 w-full shrink-0 rounded-full bg-primary pointer-events-none'
              : 'h-full w-0.5 shrink-0 rounded-full bg-primary pointer-events-none';
            return <div class={markerClass} />;
          };

          return (
            <>
              {insertionMarker()}
              <Dynamic
                component={tag}
                ref={cellRef}
                class={`${cell.id === 'main' ? matrixSlots.resizeMain : matrixSlots.resizeSlot} relative overflow-hidden rounded-sm`}
                classList={{ 'border border-border/60': cell.bordered ?? bordered() }}
                style={cellStyle()}
              >
                <div
                  class="absolute inset-0 overflow-auto"
                  classList={{ 'pointer-events-none': isDragging() }}
                >
                  <MatrixSlot slot={cell.id}>
                    <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>
                      {content()}
                    </Suspense>
                  </MatrixSlot>
                </div>
                {resizeHandle()}
              </Dynamic>
              {endMarker()}
            </>
          );
        }}
      </For>
    </div>
  );
};
