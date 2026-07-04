/**
 * matrix.tsx — MatrixImpl + export Matrix (+ DnDProvider wrapper).
 *
 * Tier 2 connected block: reads global web-style mode signals,
 * provides DnDProvider context, delegates rendering to MatrixContent.
 */
import { DnDProvider } from '@capsuletech/web-dnd';
import { createStyle } from '@capsuletech/web-style';
import { createMemo, splitProps } from 'solid-js';
import { MatrixContent } from './content';
import type { IMatrixProps, IRow } from './interfaces';
import { createMatrixModes } from './mode';
import { resolvePreset } from './presets';
import { matrixCva } from './variants';

// ---------------------------------------------------------------------------
// MatrixImpl — outer shell (provides DnDProvider + mode signals)
// ---------------------------------------------------------------------------

const MatrixImpl = (props: IMatrixProps) => {
  const [local, rest] = splitProps(props, [
    'class',
    'style',
    'ref',
    'preset',
    'slots',
    'rows',
    'dnd',
    'resize',
    'mode',
    'onLayoutChange',
    'direction',
    'bordered',
  ]);

  const { className, style } = createStyle(matrixCva, {
    class: local.class,
    style: local.style,
  });

  const getRows = createMemo((): IRow[] => {
    if (local.preset != null) {
      return resolvePreset(
        local.preset as keyof import('./interfaces').LayoutPresets,
        local.slots as never,
      );
    }
    return (local.rows as IRow[]) ?? [];
  });

  // Global signals from @capsuletech/web-style.
  // NOTE: pass getter-functions (not snapshots) so the mode-memos observe
  // live signal changes. Plain `{ resize: local.resize }` would evaluate the
  // splitProps getter once and freeze the value (regression 2026-06-16).
  const { resizeEnabled, dndEnabled, dndKind } = createMatrixModes({
    resize: () => local.resize,
    dnd: () => local.dnd,
    mode: () => local.mode,
  });

  // Single flag for the cell border — deliberately NOT part of createMatrixModes:
  // it has no relation to resize/dnd precedence, just a plain opt-out default.
  const bordered = createMemo(() => local.bordered ?? true);

  return (
    <DnDProvider showDefaultOverlay overlayMode="thumbnail">
      <div ref={local.ref} class={`${className()} relative`} style={style()} {...(rest as object)}>
        <MatrixContent
          rows={getRows}
          resizeEnabled={resizeEnabled}
          dndEnabled={dndEnabled}
          dndKind={dndKind}
          bordered={bordered}
          onLayoutChange={local.onLayoutChange}
          direction={local.direction ?? 'vertical'}
          preset={local.preset as string | undefined}
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
 *        { id: 'a', children: <A />, width: 0.5, resizable: true, swapGroup: 'main-row' },
 *        { id: 'b', children: <B />, width: 0.5, resizable: true, swapGroup: 'main-row' },
 *      ]},
 *    ]} />
 *    ```
 *
 * **Mode props:**
 * - `mode?: 'view' | 'edit'` — sugar shortcut: `'view'` → locks both resize+DnD off;
 *   `'edit'` → locks both on. Overridden per-axis by explicit `resize`/`dnd` props.
 * - `resize?: boolean` — `undefined` → follows `useResizeMode()` from web-style (or `mode`); `true`/`false` → locked.
 * - `dnd?: false | 'swap' | 'insert'` — `undefined` → follows `useDndMode()` from web-style (or `mode`);
 *   `false` → locked off; `'swap'`/`'insert'` → locked on with the specified kind.
 *
 * **Per-cell opt-out defaults:**
 * - `cell.draggable` defaults to `true` — set to `false` to lock a cell non-draggable.
 * - `cell.resizable` defaults to `true` — set to `false` to lock a cell non-resizable.
 *
 * **DnD / badge-UX:**
 * - Each draggable cell shows a DragBadge (grip icon) in its top-right corner when
 *   2+ draggable cells exist in the same swapGroup and DnD is enabled.
 * - `onLayoutChange` called with swap/insert/grid event after each successful layout change.
 *
 * **Border:**
 * - `bordered?: boolean` (default `true`) — Matrix-level default for the cell
 *   hairline border. Fully independent of `resize`/`dnd`: a resizable cell only
 *   gets the interactive handle (and a draggable cell only gets the badge) —
 *   neither implies a border on its own. Set `bordered={false}` to render
 *   edge-to-edge slots.
 * - Per-slot override: `slots.header.bordered` / `cell.bordered` (raw rows) wins
 *   over the Matrix-level default when explicitly set, e.g.
 *   `slots={{ header: { children, bordered: false }, main: {...} }}`.
 */
export const Matrix = MatrixImpl;
