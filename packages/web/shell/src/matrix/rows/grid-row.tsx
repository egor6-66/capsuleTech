/**
 * grid-row.tsx — renderGridRow, IGridOpts, GRID-consts.
 *
 * Grid render-path (ADR 026 Phase 2b).
 * Active only when dndEnabled() && dndKind()==='insert' && row.grid is present.
 */
import type { ISortableZone } from '@capsuletech/web-dnd';
import type { Accessor, JSX } from 'solid-js';
import { For, Suspense } from 'solid-js';
import { MatrixCellFallback } from '../cell';
import type { IInsertEngine } from '../dnd/insert';
import type { IRow } from '../interfaces';

// ---------------------------------------------------------------------------
// Grid-zone bindings threaded from MatrixContent → renderRow → renderGridRow.
// ---------------------------------------------------------------------------

/** Grid-zone bindings threaded from MatrixContent → renderRow → renderGridRow. */
export interface IGridOpts {
  registerGridContainer: IInsertEngine['registerGridContainer'];
  commitGridMove: IInsertEngine['commitGridMove'];
  commitGridResize: IInsertEngine['commitGridResize'];
  finalizeGridResize: IInsertEngine['finalizeGridResize'];
  getLiveGridCoords: IInsertEngine['getLiveGridCoords'];
}

// Default grid config constants (mirrors defaults in insert.tsx — keep in sync)
export const GRID_DEFAULT_COLS = 24;
export const GRID_DEFAULT_ROW_HEIGHT = 20;

/**
 * renderGridRow — CSS Grid render-path for insert-mode grid zones (ADR 026).
 */
export const renderGridRow = (
  row: IRow,
  getSwappedChildren: ((cellId: string) => JSX.Element) | undefined,
  /** Zone provided by createInsertEngine (always defined in grid mode). */
  zone: ISortableZone,
  isDragging: Accessor<boolean>,
  resizeEnabled: Accessor<boolean>,
  gridOpts: IGridOpts,
): JSX.Element => {
  const cols = row.grid?.cols ?? GRID_DEFAULT_COLS;
  const rowHeight = row.grid?.rowHeight ?? GRID_DEFAULT_ROW_HEIGHT;
  const rowId = row.id!;

  const gridContainerRef = (el: HTMLElement | null): void => {
    if (el) {
      zone.containerRef(el);
      gridOpts.registerGridContainer(rowId, el);
    } else {
      gridOpts.registerGridContainer(rowId, null);
    }
  };

  const rowRejectsDrag: Accessor<boolean> = zone.rejects;
  const rowIsTarget: Accessor<boolean> = zone.isTarget;
  const rowCanAccept: Accessor<boolean> = zone.canAccept;

  return (
    <div
      ref={gridContainerRef}
      data-grid-zone={row.id}
      class="relative h-full w-full overflow-auto"
      style={{
        display: 'grid',
        'grid-template-columns': `repeat(${cols}, 1fr)`,
        'grid-auto-rows': `${rowHeight}px`,
      }}
      classList={{
        'ring-2 ring-inset ring-destructive/50': rowRejectsDrag(),
        'ring-2 ring-inset ring-primary/40 bg-primary/5':
          rowCanAccept() && !rowIsTarget() && !rowRejectsDrag(),
        'ring-2 ring-inset ring-primary bg-primary/10': rowIsTarget() && !rowRejectsDrag(),
      }}
    >
      <For each={row.cells}>
        {(cell) => {
          if (!cell.grid) return null;

          const zoneItem = zone.createItem(cell.id);

          const children = getSwappedChildren ? getSwappedChildren(cell.id) : cell.children;
          const content = children;

          const gridCoords = (): { x: number; y: number; w: number; h: number } =>
            gridOpts.getLiveGridCoords(cell.id) ?? cell.grid!;

          const gridStyle = (): JSX.CSSProperties => {
            const { x, y, w, h } = gridCoords();
            return {
              'grid-column': `${x + 1} / span ${w}`,
              'grid-row': `${y + 1} / span ${h}`,
            };
          };

          // Grid resize handles — visible only when resizeEnabled AND cell opts in (default true).
          const gridResizeHandles = (): JSX.Element => {
            const isCellResizable = resizeEnabled() && (cell.resizable ?? true);
            if (!isCellResizable) return null;

            const getContainerEl = (): HTMLElement | null =>
              document.querySelector(`[data-grid-zone="${rowId}"]`) as HTMLElement | null;

            const makePointerDown =
              (mode: 'se' | 'e' | 's') =>
              (e: PointerEvent): void => {
                e.preventDefault();
                e.stopPropagation();

                const handle = e.currentTarget as HTMLElement;
                handle.setPointerCapture?.(e.pointerId);

                const currentCoords = gridOpts.getLiveGridCoords(cell.id) ?? cell.grid!;
                const startW = currentCoords.w;
                const startH = currentCoords.h;
                const startClientX = e.clientX;
                const startClientY = e.clientY;

                const containerEl = getContainerEl();
                const containerRect = containerEl?.getBoundingClientRect() ?? {
                  width: 0,
                  height: 0,
                };
                const colWidthPx = containerRect.width > 0 ? containerRect.width / cols : 0;
                const rowHeightPx = rowHeight;

                const onMove = (ev: PointerEvent): void => {
                  const deltaX = ev.clientX - startClientX;
                  const deltaY = ev.clientY - startClientY;

                  const newW =
                    mode !== 's' && colWidthPx > 0
                      ? Math.max(1, Math.round((startW * colWidthPx + deltaX) / colWidthPx))
                      : startW;
                  const newH =
                    mode !== 'e' && rowHeightPx > 0
                      ? Math.max(1, Math.round((startH * rowHeightPx + deltaY) / rowHeightPx))
                      : startH;

                  gridOpts.commitGridResize(rowId, cell.id, { w: newW, h: newH });
                };

                const onUp = (): void => {
                  handle.removeEventListener('pointermove', onMove);
                  handle.removeEventListener('pointerup', onUp);
                  gridOpts.finalizeGridResize(rowId, cell.id);
                };

                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onUp);
              };

            const seHandle = (
              <div
                data-grid-resize="se"
                data-dnd-cancel=""
                class="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-nwse-resize rounded-tl-sm bg-border/0 hover:bg-primary/50 active:bg-primary/70 transition-colors"
                onPointerDown={makePointerDown('se')}
              />
            );

            const eHandle = (
              <div
                data-grid-resize="e"
                data-dnd-cancel=""
                class="absolute inset-y-0 right-0 z-20 w-1 cursor-ew-resize bg-border/0 hover:bg-primary/40 active:bg-primary/60 transition-colors"
                style={{ bottom: '12px' }}
                onPointerDown={makePointerDown('e')}
              />
            );

            const sHandle = (
              <div
                data-grid-resize="s"
                data-dnd-cancel=""
                class="absolute inset-x-0 bottom-0 z-20 h-1 cursor-ns-resize bg-border/0 hover:bg-primary/40 active:bg-primary/60 transition-colors"
                style={{ right: '12px' }}
                onPointerDown={makePointerDown('s')}
              />
            );

            return (
              <>
                {seHandle}
                {eHandle}
                {sHandle}
              </>
            );
          };

          return (
            <div
              ref={zoneItem.ref}
              data-grid-cell={cell.id}
              class="relative overflow-hidden rounded-sm border border-border"
              style={gridStyle()}
            >
              <div
                class="absolute inset-0 overflow-auto"
                classList={{ 'pointer-events-none': isDragging() }}
              >
                <Suspense fallback={cell.skeleton ?? <MatrixCellFallback />}>{content}</Suspense>
              </div>
              {gridResizeHandles()}
            </div>
          );
        }}
      </For>
    </div>
  );
};
