/**
 * Tests for insert-mode DnD in Matrix v2 (Phase 1.3).
 *
 * Contract tests only — actual cross-row drag-and-drop is verified visually
 * in Storybook (web-dnd's pointer-event handling is its own concern).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Matrix } from '../matrix';

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

describe('Matrix — insert-mode DnD', () => {
  it('renders cells in insert mode without errors', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            layoutMode="edit"
            dndMode="insert"
            rows={[
              {
                id: 'row-1',
                resizable: true,
                cells: [
                  {
                    id: 'a',
                    children: <div data-testid="cell-a">A</div>,
                    draggable: true,
                    width: 0.5,
                    resizable: true,
                  },
                  {
                    id: 'b',
                    children: <div data-testid="cell-b">B</div>,
                    draggable: true,
                    width: 0.5,
                    resizable: true,
                  },
                ],
              },
              {
                id: 'row-2',
                resizable: true,
                cells: [
                  {
                    id: 'c',
                    children: <div data-testid="cell-c">C</div>,
                    draggable: true,
                  },
                ],
              },
            ]}
          />
        ),
        container,
      );
    }).not.toThrow();

    expect(container.querySelector('[data-testid="cell-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="cell-b"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="cell-c"]')).not.toBeNull();
  });

  it('view mode does not invoke onLayoutChange (DnD is gated)', () => {
    const onLayoutChange = vi.fn();
    cleanup = render(
      () => (
        <Matrix
          // No layoutMode → uncontrolled, default 'view'
          dndMode="insert"
          onLayoutChange={onLayoutChange}
          rows={[
            {
              id: 'row-1',
              cells: [
                { id: 'a', children: <div>A</div>, draggable: true },
                { id: 'b', children: <div>B</div>, draggable: true },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // No swap-engine, no drop simulation — callback should NOT fire just on mount.
    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('no global edit-mode badge in insert mode (badge UX removed)', () => {
    // The old global "Toggle layout edit mode" EditBadge was removed in the
    // badge-UX redesign. Insert mode is gated by layoutMode prop — no toggle UI.
    cleanup = render(
      () => (
        <Matrix
          dndMode="insert"
          rows={[
            {
              id: 'row-1',
              cells: [
                { id: 'a', children: <div>A</div>, draggable: true },
                { id: 'b', children: <div>B</div>, draggable: true },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(container.querySelector('button[aria-label="Toggle layout edit mode"]')).toBeNull();
    // DragBadge (swap-mode only) not rendered in insert mode either
    expect(container.querySelector('[aria-label="Drag to swap cell"]')).toBeNull();
    // Cells still render
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('rows without id are silently skipped (no draggable bindings)', () => {
    // Cells in a row without id can't participate in insert mode (no sortable).
    // They still render — just no DnD.
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            layoutMode="edit"
            dndMode="insert"
            rows={[
              {
                // id intentionally omitted
                cells: [
                  {
                    id: 'a',
                    children: <div data-testid="orphan-a">A</div>,
                    draggable: true,
                  },
                ],
              },
            ]}
          />
        ),
        container,
      );
    }).not.toThrow();

    expect(container.querySelector('[data-testid="orphan-a"]')).not.toBeNull();
  });

  it('non-draggable cells in insert mode render without binding', () => {
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            layoutMode="edit"
            dndMode="insert"
            rows={[
              {
                id: 'row-1',
                cells: [
                  // Only first is draggable; second renders normally
                  { id: 'a', children: <div data-testid="drag-a">A</div>, draggable: true },
                  { id: 'b', children: <div data-testid="static-b">B</div> },
                ],
              },
            ]}
          />
        ),
        container,
      );
    }).not.toThrow();

    expect(container.querySelector('[data-testid="drag-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="static-b"]')).not.toBeNull();
  });

  it('cross-row multi-cell insert: all cells render in both rows', () => {
    // Regression: after the lifecycle fix, createItem is called in render
    // scope (not an engine effect), so all cells must appear regardless of
    // which row they are in.
    expect(() => {
      cleanup = render(
        () => (
          <Matrix
            layoutMode="edit"
            dndMode="insert"
            rows={[
              {
                id: 'row-a',
                cells: [
                  { id: 'cell-1', children: <div data-testid="c1">C1</div>, draggable: true },
                  { id: 'cell-2', children: <div data-testid="c2">C2</div>, draggable: true },
                ],
              },
              {
                id: 'row-b',
                cells: [
                  { id: 'cell-3', children: <div data-testid="c3">C3</div>, draggable: true },
                ],
              },
            ]}
          />
        ),
        container,
      );
    }).not.toThrow();

    // All three cells must be in the DOM — none dropped by stale ref bug.
    expect(container.querySelector('[data-testid="c1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="c2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="c3"]')).not.toBeNull();
  });

  it('IInsertEngine.getZone API: packing-zone insert renders after engine construction', () => {
    // ADR 025: new engine uses getZone(rowId) instead of getSortable(rowId).
    // This test verifies that multiple draggable cells in a packing zone
    // (wrap=true) all appear — none lost due to stale pointerdown listener.
    cleanup = render(
      () => (
        <Matrix
          layoutMode="edit"
          dndMode="insert"
          rows={[
            {
              id: 'pack-row',
              wrap: true,
              cells: [
                { id: 'p1', children: <div data-testid="p1">P1</div>, draggable: true, minW: 100 },
                { id: 'p2', children: <div data-testid="p2">P2</div>, draggable: true, minW: 100 },
                { id: 'p3', children: <div data-testid="p3">P3</div>, draggable: true, minW: 100 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // All three cells must be in the DOM.
    // In the new model, zone.createItem is called inside the <For> render scope
    // for each cell — ensuring correct Solid lifecycle ownership.
    expect(container.querySelector('[data-testid="p1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="p2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="p3"]')).not.toBeNull();
  });
});
