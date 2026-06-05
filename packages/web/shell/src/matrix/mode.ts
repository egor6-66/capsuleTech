/**
 * mode.ts — резолв режимов Matrix (resize / dnd / dndKind).
 *
 * Читает глобальные сигналы из @capsuletech/web-style и комбинирует
 * с локальными пропами Matrix. Вынесено из matrix.tsx для читаемости.
 *
 * Precedence (highest → lowest):
 *   1. Granular `resize` / `dnd` props (per-axis explicit override).
 *   2. `mode` prop ('view' → both off, 'edit' → both on).
 *   3. Global useResizeMode() / useDndMode() signals.
 */
import { useDndMode, useResizeMode } from '@capsuletech/web-style';
import { createMemo } from 'solid-js';
import type { MatrixDndKind } from './interfaces';

interface IModeOptions {
  resize: boolean | undefined;
  dnd: false | MatrixDndKind | undefined;
  mode: 'view' | 'edit' | undefined;
}

interface IMatrixModes {
  resizeEnabled: () => boolean;
  dndEnabled: () => boolean;
  dndKind: () => MatrixDndKind;
}

/**
 * Создаёт реактивные memo-accessor'ы для режимов Matrix.
 * Вызывается внутри компонента (требует reactive owner).
 *
 * Precedence:
 *   resizeEnabled = resize ?? (mode !== undefined ? mode === 'edit' : globalResize())
 *   dndEnabled    = dnd !== undefined ? dnd !== false
 *                 : mode !== undefined ? mode === 'edit'
 *                 : globalDnd()
 *   dndKind       = dnd === 'insert' ? 'insert' : 'swap'   // без изменений
 */
export const createMatrixModes = (opts: IModeOptions): IMatrixModes => {
  const globalResize = useResizeMode();
  const globalDnd = useDndMode();

  // resizeEnabled: granular prop wins; otherwise mode sugar; otherwise global signal
  const resizeEnabled = createMemo(
    () => opts.resize ?? (opts.mode !== undefined ? opts.mode === 'edit' : globalResize()),
  );

  // dndEnabled: granular prop wins; otherwise mode sugar; otherwise global signal
  const dndEnabled = createMemo(() => {
    if (opts.dnd !== undefined) return opts.dnd !== false;
    if (opts.mode !== undefined) return opts.mode === 'edit';
    return globalDnd();
  });

  // dndKind: prop='insert' → 'insert'; everything else (undefined/'swap') → 'swap'
  const dndKind = createMemo<MatrixDndKind>(() => (opts.dnd === 'insert' ? 'insert' : 'swap'));

  return { resizeEnabled, dndEnabled, dndKind };
};
