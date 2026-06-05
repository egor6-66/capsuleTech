/**
 * mode.ts — резолв режимов Matrix (resize / dnd / dndKind).
 *
 * Читает глобальные сигналы из @capsuletech/web-style и комбинирует
 * с локальными пропами Matrix. Вынесено из matrix.tsx для читаемости.
 */
import { useDndMode, useResizeMode } from '@capsuletech/web-style';
import { createMemo } from 'solid-js';
import type { MatrixDndKind } from './interfaces';

interface IModeOptions {
  resize: boolean | undefined;
  dnd: false | MatrixDndKind | undefined;
}

interface IMatrixModes {
  resizeEnabled: () => boolean;
  dndEnabled: () => boolean;
  dndKind: () => MatrixDndKind;
}

/**
 * Создаёт реактивные memo-accessor'ы для режимов Matrix.
 * Вызывается внутри компонента (требует reactive owner).
 */
export const createMatrixModes = (opts: IModeOptions): IMatrixModes => {
  const globalResize = useResizeMode();
  const globalDnd = useDndMode();

  // resizeEnabled: local.resize ?? globalResize()
  const resizeEnabled = createMemo(() => opts.resize ?? globalResize());

  // dndEnabled: prop=undefined → follow global; prop=false → locked off; 'swap'/'insert' → locked on
  const dndEnabled = createMemo(
    () => (opts.dnd === undefined ? globalDnd() : opts.dnd !== false),
  );

  // dndKind: prop='insert' → 'insert'; everything else (undefined/'swap') → 'swap'
  const dndKind = createMemo<MatrixDndKind>(() => (opts.dnd === 'insert' ? 'insert' : 'swap'));

  return { resizeEnabled, dndEnabled, dndKind };
};
