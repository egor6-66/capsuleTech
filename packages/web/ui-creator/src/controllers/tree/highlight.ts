/**
 * highlight.ts — утилиты визуальной подсветки строк/боксов Editor.Tree.
 *
 * boxStyle — inline-стиль box-shadow + background-color через color-mix.
 * colorOf  — выбирает цвет (метка > primary).
 * fill     — полупрозрачная заливка через color-mix.
 */

import type { JSX } from 'solid-js';
import type { TreeZone } from '../../state/dnd';

/** Палитра цветных меток узлов (пользователь помечает блоки для наглядности). */
export const MARK_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

/** Полупрозрачная заливка из цвета (hex или var(...)). */
export const fill = (c: string, pct: number): string =>
  `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/** Цвет обводки: цветная метка доминирует, иначе — primary. */
export const colorOf = (mark: string | undefined): string => mark ?? 'var(--primary)';

/**
 * Единая подсветка бокса-контейнера через box-shadow (не border/outline —
 * не влияет на лайаут).
 */
export const boxStyle = (opts: {
  spec: unknown;
  boxZone: TreeZone | null;
  isDropTarget: boolean;
  isInsideCandidate: boolean;
  mark: string | undefined;
  selectedId: string | null;
  nodeId: string;
}): JSX.CSSProperties | undefined => {
  const { spec, boxZone, isDropTarget, isInsideCandidate, mark, selectedId, nodeId } = opts;
  const c = colorOf(mark);
  if (spec != null) {
    if (boxZone === 'inside' || isDropTarget)
      return { 'box-shadow': `inset 0 0 0 2px ${c}`, 'background-color': fill(c, 12) };
    if (isInsideCandidate)
      return { 'box-shadow': `inset 0 0 0 1px ${c}`, 'background-color': fill(c, 6) };
    if (mark) return { 'box-shadow': `inset 0 0 0 1px ${mark}`, 'background-color': fill(mark, 8) };
    return undefined;
  }
  if (selectedId === nodeId)
    return { 'box-shadow': `inset 0 0 0 2px ${c}`, 'background-color': fill(c, 16) };
  if (mark) return { 'box-shadow': `inset 0 0 0 1px ${mark}`, 'background-color': fill(mark, 8) };
  return undefined;
};

/**
 * Inline-стиль строки-заголовка (лист или заголовок контейнера).
 */
export const headerStyle = (opts: {
  isSelected: boolean;
  isContainer: boolean;
  mark: string | undefined;
  color: string;
}): JSX.CSSProperties => {
  const { isSelected, isContainer, mark, color } = opts;
  if (isSelected && !isContainer)
    return { 'box-shadow': `inset 0 0 0 2px ${color}`, 'background-color': fill(color, 20) };
  if (mark) return { 'box-shadow': `inset 0 0 0 1px ${mark}`, 'background-color': fill(mark, 8) };
  return {};
};
