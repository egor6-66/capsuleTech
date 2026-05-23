import type { Component, JSX } from 'solid-js';

import type { FlexGap, FlexOrientation } from '../layout/flex/interfaces';

export interface IGroupProps<T = unknown> {
  /** Направление группы. `'horizontal'` = row (default), `'vertical'` = col. */
  orientation?: FlexOrientation;
  /**
   * `'separate'` (default) — items с gap.
   * `'attached'` — items прижаты, внутренние border-radius срезаются, borders объединяются через -ml-px/-mt-px.
   */
  variant?: 'separate' | 'attached';
  /** Gap между items в режиме `separate`. Default = 2 (0.5rem). */
  gap?: FlexGap;
  class?: string;
  style?: JSX.CSSProperties | string;

  /** Batch mode: массив данных для итерации. Требует `itemAs`. */
  data?: T[];
  /**
   * Batch mode: компонент-шаблон для каждого item. Имя выбрано `itemAs`
   * (не `as`), чтобы не конфликтовать с Shape-wrapper'ом `as` — он
   * extract'ит `as` как batch-template, и synonym поломал бы chain
   * `Shape({ as: Ui.Group, itemAs: Ui.Button })`.
   */
  itemAs?: Component<any>;
  /**
   * Batch mode: маппер данных → props для `itemAs` компонента.
   * По умолчанию сам item кастуется как Record (подходит для plain objects).
   */
  itemProps?: (item: T) => Record<string, unknown>;
  /**
   * Batch mode: фильтр по тегам — оставляет только items, у которых
   * `item.tags ∩ props.tags ≠ ∅`. Требует `item.tags: string[]`.
   */
  tags?: string[];

  /**
   * Если `true`, items в batch mode получают `resizable: true` → Flex рендерит через corvu.
   */
  resizable?: boolean;
  /** Показывать визуальный grip на resize-handle (только при `resizable: true`). */
  withHandle?: boolean;

  children?: JSX.Element;
}

export interface IGroupSeparatorProps {
  orientation?: FlexOrientation;
  class?: string;
  style?: JSX.CSSProperties | string;
}
