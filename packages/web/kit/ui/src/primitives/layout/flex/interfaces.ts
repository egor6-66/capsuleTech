import type { JSX, ValidComponent } from 'solid-js';
import type { ISlotProps } from '../../slot';

export type FlexDirection = 'row' | 'row-reverse' | 'col' | 'col-reverse';
export type FlexWrap = 'wrap' | 'nowrap' | 'wrap-reverse';
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export type FlexGap = number | string;
export type FlexOverflow = 'auto' | 'hidden';
export type FlexBorder = 't' | 'b' | 'l' | 'r' | 'x' | 'y' | 'all';

/**
 * Ориентация Flex-группы. `'horizontal'` = row direction.
 * Используется в CSS-flex direction-mapping (ORIENTATION_DIR).
 */
export type FlexOrientation = 'horizontal' | 'vertical';

/**
 * Собственные пропсы `<Flex>` — низкоуровневая Flexbox-обёртка. Числовые
 * варианты (`direction`/`wrap`/`align`/`justify`) маппятся в Tailwind-классы
 * (списки фиксированные → purge видит), а `gap` идёт inline-стилем, потому что
 * значение может быть произвольным числом или CSS-строкой.
 *
 * **CSS-flex mode** — передай `children` как обычно.
 * Для resize-раскладок используй `<Layout.Resizable items={[...]} />`.
 *
 * **Sizing props** (`h`, `minH`, `maxH`, `w`, `minW`, `maxW`): числовой шаг
 * spacing-шкалы (1:1 с Tailwind). `minH={6}` ≡ `min-h-6` ≡
 * `min-height: calc(var(--spacing) * 6)`. Применяются через inline-style.
 * Явный `minH` переопределяет авто `min-height: var(--size-slot)` пустого контейнера.
 */
export interface IFlexOwnProps {
  /**
   * Ориентация: `'horizontal'` (default) = flex-row, `'vertical'` = flex-col.
   */
  orientation?: FlexOrientation;
  /** `flex-direction`. `col` = `column` (короткая Tailwind-форма). */
  direction?: FlexDirection;
  wrap?: FlexWrap;
  /** `align-items`. */
  align?: FlexAlign;
  /** `justify-content`. */
  justify?: FlexJustify;
  /** `gap`. `number` × 0.25rem (как Tailwind), `string` — сырое значение. */
  gap?: FlexGap;
  /** Column gap. Override для `gap` по горизонтали. */
  gapX?: FlexGap;
  /** Row gap. Override для `gap` по вертикали. */
  gapY?: FlexGap;
  /** `display: inline-flex` вместо `flex`. */
  inline?: boolean;
  class?: string;
  style?: JSX.CSSProperties | string;

  // ---------------------------------------------------------------------------
  // Sizing props (CSS-flex mode)
  // Числовой шаг spacing-шкалы → inline-style `calc(var(--spacing) * N)`.
  // Паритет с Tailwind: h={10} ≡ h-10, minH={6} ≡ min-h-6, и т.д.
  // Явные значения всегда переопределяют авто min-height пустого контейнера.
  // ---------------------------------------------------------------------------

  /**
   * `height`. Числовой шаг spacing-шкалы: `h={10}` → `height: calc(var(--spacing) * 10)`.
   * Литерал `'full'` → `height: 100%` (паритет с Tailwind `h-full`).
   */
  h?: number | 'full';
  /** `min-height`. `minH={6}` → `min-height: calc(var(--spacing) * 6)`.
   *  Переопределяет авто `min-height: var(--size-slot)` пустого контейнера. */
  minH?: number;
  /** `max-height`. `maxH={40}` → `max-height: calc(var(--spacing) * 40)`. */
  maxH?: number;
  /**
   * `width`. Числовой шаг spacing-шкалы: `w={20}` → `width: calc(var(--spacing) * 20)`.
   * Литерал `'full'` → `width: 100%` (паритет с Tailwind `w-full`).
   */
  w?: number | 'full';
  /** `min-width`. `minW={10}` → `min-width: calc(var(--spacing) * 10)`. */
  minW?: number;
  /** `max-width`. `maxW={80}` → `max-width: calc(var(--spacing) * 80)`. */
  maxW?: number;

  /** `padding` (all sides). `p={4}` → `padding: calc(var(--spacing) * 4)`. */
  p?: number;
  /** `padding-inline` (left+right). `px={4}` → `padding-inline: calc(var(--spacing) * 4)`. */
  px?: number;
  /** `padding-block` (top+bottom). `py={4}` → `padding-block: calc(var(--spacing) * 4)`. */
  py?: number;

  /**
   * `overflow` для скролл-контейнеров. `'auto'` — скролл при переполнении,
   * `'hidden'` — обрезка без скролла.
   */
  overflow?: FlexOverflow;

  /**
   * Chrome-разделитель по токену `border-border`. `'x'`/`'y'` — обе стороны
   * оси, `'all'` — со всех сторон.
   */
  border?: FlexBorder;

  /**
   * Canonical responsive-flex pattern. Applies `flex: 1 1 Npx` inline:
   * grows to fill parent's main-axis, shrinks when needed, basis = N (px).
   * Combined with parent's `wrap='wrap'`, wraps to new row/column when
   * container ≤ 2×N. Cross-axis stretches via default `align-self: stretch`.
   *
   * Replaces `w='full'` / `h='full'` for typical responsive widget roots.
   * For fixed sizes use `h={N}` / `w={N}`; for fluid use `fluid={N}`.
   */
  fluid?: number;
}

export type IFlexProps<T extends ValidComponent = 'div'> = ISlotProps<T> & IFlexOwnProps;
