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
 * **Per-cell overrides (tri-state):**
 * - `cell.draggable`: `true` — DnD активен для cell всегда (оверрайдит `mode`/global);
 *   `false` — никогда; `undefined` — следует matrix-резолюции (`dnd` > `mode` > global).
 * - `cell.resizable`: та же tri-state семантика для resize-ручки (ручка между
 *   соседями активна когда активны оба; «эластичный центр» пресета всегда согласен).
 *
 * **DnD / badge-UX:**
 * - A cell shows a DragBadge (grip icon, top-right) only when DnD резолвится
 *   активным для неё И существует другая активная cell в той же swapGroup
 *   (т.е. drop-цель реально есть).
 * - `onLayoutChange` called with swap/insert/grid event after each successful layout change.
 *
 * **Border (divider-модель, 2026-07-05):**
 * - `bordered?: boolean | BorderSides` (opt-out, default `true`) — рисует
 *   ВНУТРЕННИЕ hairline-разделители между слотами. Слоты — общее пространство,
 *   разделённое линиями, не независимые карточки (внешних бордеров и скруглений
 *   у ячеек нет). Divider виден по either-rule со сторонами (kill-wins).
 * - **Resize-стык = один элемент:** на АКТИВНОЙ resize-ручке линию рисует сама
 *   ручка (`bg-border`, web-ui после снятия ghost) — Matrix гасит СВОЙ divider на
 *   этой стороне. На стыке одна линия, не две (см. img_9/img_10). Единый токен.
 * - Per-slot / per-side override: `slots.header.bordered` / `cell.bordered` —
 *   `boolean` (весь слот) либо `BorderSides` (точечно T/R/B/L, кейс: погасить
 *   ОДНУ сторону двойного шва у вложенного фрейма).
 */
export const Matrix = MatrixImpl;
