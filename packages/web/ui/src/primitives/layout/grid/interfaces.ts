import type { JSX, ValidComponent } from 'solid-js';
import type { ISlotProps } from '../slot';
import type { GridGap, GridTrack } from './utils';

/**
 * Собственные пропсы `<Grid>` — низкоуровневая обёртка над CSS Grid.
 *
 * Все динамические значения (cols/rows/gap/areas) применяются через inline
 * `style`, чтобы не упираться в Tailwind purge (он не видит `gap-${n}` или
 * произвольные `[grid-template-columns:repeat(${n},...)]` сгенерированные в
 * рантайме). База + `inline-grid` идут через `class`.
 */
export interface IGridOwnProps {
  /**
   * `grid-template-columns`. `number` → `repeat(N, minmax(0,1fr))`,
   * `string[]` → join(' '), `string` → как есть.
   */
  cols?: GridTrack;
  /** `grid-template-rows`. Те же правила, что у `cols`. */
  rows?: GridTrack;
  /** Все gaps. `number` × 0.25rem (как Tailwind), `string` — сырое значение. */
  gap?: GridGap;
  /** Column gap. Override для `gap` по горизонтали. */
  gapX?: GridGap;
  /** Row gap. Override для `gap` по вертикали. */
  gapY?: GridGap;
  /**
   * Именованные области для `grid-template-areas`. Каждый элемент — одна
   * строка (без кавычек): `['header header', 'sidebar main']`.
   */
  areas?: string[];
  autoFlow?: JSX.CSSProperties['grid-auto-flow'];
  autoRows?: string;
  autoCols?: string;
  /** `display: inline-grid` вместо `grid`. */
  inline?: boolean;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export type IGridProps<T extends ValidComponent = 'div'> = ISlotProps<T> & IGridOwnProps;

/**
 * `<Grid.Item>` — опциональная обёртка над дочерним блоком grid'а. Без неё
 * можно ставить grid-области прямо через `style={{ 'grid-area': 'header' }}`
 * на любом теге, но Item даёт декларативный API.
 */
export interface IGridItemOwnProps {
  /** Сокращение для `grid-column: span N`. */
  span?: number | string;
  /** Сокращение для `grid-row: span N`. */
  rowSpan?: number | string;
  colStart?: number | string;
  colEnd?: number | string;
  rowStart?: number | string;
  rowEnd?: number | string;
  /** Имя area из `grid-template-areas` родителя. */
  area?: string;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export type IGridItemProps<T extends ValidComponent = 'div'> = ISlotProps<T> & IGridItemOwnProps;
