import type { JSX, ValidComponent } from 'solid-js';
import type { ISlotProps } from '../../slot';

export type FlexDirection = 'row' | 'row-reverse' | 'col' | 'col-reverse';
export type FlexWrap = 'wrap' | 'nowrap' | 'wrap-reverse';
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export type FlexGap = number | string;

/**
 * Ориентация Flex/Resizable группы. `'horizontal'` = row direction.
 * Используется как в CSS-flex-mode, так и в resizable-mode (передаётся в corvu).
 */
export type FlexOrientation = 'horizontal' | 'vertical';

/**
 * Один item в массиве `items` для resizable-режима Flex.
 *
 * Если `resizable: true` — item становится corvu Panel. Handle ставится между
 * двумя соседними items с `resizable !== false`.
 *
 * Если `resizable: false` или не задан — item рендерится статическим блоком,
 * но участвует в layout (handle к нему не примыкает).
 */
export interface IFlexItem {
  /** Содержимое панели. */
  children: JSX.Element;
  /** По умолчанию `true`. Если `false` — handle к этой панели не ставится. */
  resizable?: boolean;
  /** Начальный размер панели в долях `(0..1)`. */
  initialSize?: number;
  /** Минимальный размер `(0..1)`. */
  minSize?: number;
  /** Максимальный размер `(0..1)`. */
  maxSize?: number;
  /** Может ли панель схлопнуться в 0. corvu-flag. */
  collapsible?: boolean;
}

/**
 * Собственные пропсы `<Flex>` — низкоуровневая Flexbox-обёртка. Числовые
 * варианты (`direction`/`wrap`/`align`/`justify`) маппятся в Tailwind-классы
 * (списки фиксированные → purge видит), а `gap` идёт inline-стилем, потому что
 * значение может быть произвольным числом или CSS-строкой.
 *
 * **Три режима:**
 *
 * 1. **CSS-flex mode** (default) — передай `children` как обычно. Никаких `items`.
 *
 * 2. **Static items mode** — передай `items`, все без `resizable: true`.
 *    Каждый item рендерится в `<div>` обёртку. Corvu не подключается.
 *
 * 3. **Resizable mode** — передай `items`, хотя бы один с `resizable: true`.
 *    Рендерится через corvu (ResizableRoot + Panel + Handle).
 *    Corvu-mode включается **только** по явному `resizable: true`; факт наличия
 *    массива `items` сам по себе corvu не активирует.
 *
 * **Edge case:** если `items` передан, но ни один объект не содержит поля
 * `children` или `resizable` — считается случайным prop-collision с доменными
 * данными. Flex выдаёт `console.warn` (dev) и падает обратно в children-mode.
 *
 * **Sizing props** (`h`, `minH`, `maxH`, `w`, `minW`, `maxW`): числовой шаг
 * spacing-шкалы (1:1 с Tailwind). `minH={6}` ≡ `min-h-6` ≡
 * `min-height: calc(var(--spacing) * 6)`. Применяются через inline-style.
 * Явный `minH` переопределяет авто `min-height: var(--size-slot)` пустого контейнера.
 */
export interface IFlexOwnProps {
  /**
   * Ориентация: `'horizontal'` (default) = flex-row, `'vertical'` = flex-col.
   * В resizable-mode передаётся в corvu Root как `orientation`.
   * В CSS-mode: `'horizontal'` → `flex-row`, `'vertical'` → `flex-col`.
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
  /**
   * **Items-режим.** Массив `IFlexItem` вместо свободных `children`.
   *
   * - Без `resizable: true` на любом item → статический CSS flex (div-обёртки).
   * - С хотя бы одним `resizable: true` → corvu ResizableRoot + Panel + Handle.
   *
   * Corvu-режим активируется **только** по явному флагу `resizable: true`, а не
   * по факту наличия массива.
   *
   * Если массив передан, но ни один объект не имеет `children` или `resizable`,
   * Flex выдаёт предупреждение (dev) и рендерит `children` prop как fallback.
   *
   * Взаимоисключает с `children` (если оба заданы и `items` валиден — `items` имеет приоритет).
   */
  items?: IFlexItem[];
  /**
   * Показывать визуальный grip на handle (только в resizable-mode).
   */
  withHandle?: boolean;
  /**
   * Отключить интерактивность всех resize-handles (только в resizable-mode).
   * Layout остаётся живым (panels рендерятся, размеры применены), но pointer-drag
   * по разделителю не сработает — handle получает `disabled` от corvu +
   * `pointer-events: none` дополнительно, чтобы блокировать hover-cursor.
   *
   * Use case: Matrix `layoutMode='view'` — статичный layout без resize-affordance.
   */
  handleDisabled?: boolean;
  /**
   * Callback, fired whenever corvu panel sizes change (только в resizable-mode).
   * Forwarded to corvu ResizableRoot as `onSizesChange`.
   */
  onSizesChange?: (sizes: number[]) => void;

  // ---------------------------------------------------------------------------
  // Sizing props (CSS-flex mode only)
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
