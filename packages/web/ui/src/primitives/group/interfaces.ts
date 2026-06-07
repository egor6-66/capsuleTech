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

  /** Batch mode: массив данных для итерации. Требует `item.use`. */
  data?: T[];
  /**
   * Batch mode: объект с компонентом-шаблоном и маппером props.
   *
   * ```tsx
   * <Group data={items} item={{ use: Button, props: (it) => ({ children: it.label }) }} />
   * ```
   *
   * `item.use` — компонент каждого элемента (ADR 036 §3, был `itemAs`).
   * `item.props` — маппер данных → props; опционален (по умолчанию сам item как Record).
   */
  item?: {
    use?: Component<any>;
    props?: (it: T) => Record<string, unknown>;
  };
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
